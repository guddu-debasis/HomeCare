import { db } from "../../common/config/db.js";
import { orderBooking, orderItems, cartItems, service, sellerService, notifications, customers } from "../../db/schema.js";
import { eq, and, desc } from "drizzle-orm";
import ApiError from "../../common/utils/api-error.js";
import razorpay from "../../common/config/razorpay.js";

const createOrder = async ({ customerId, bookingDate }) => {
  // Joi.date().iso() coerces the incoming string into a JS Date object.
  // Normalize it back to a plain YYYY-MM-DD string so DB inserts and
  // notification messages don't show a full timezone-aware datetime string.
  const bookingDateStr =
    bookingDate instanceof Date
      ? bookingDate.toISOString().split("T")[0]
      : String(bookingDate).split("T")[0];

  // 1. Fetch items from the customer's cart with prices
  const itemsInCart = await db
    .select({
      serviceId: cartItems.serviceId,
      serviceName: service.serviceName,
      sellerId: cartItems.sellerId,
      quantity: cartItems.quantity,
      basePrice: service.basePrice,
      customPrice: sellerService.customPrice,
    })
    .from(cartItems)
    .innerJoin(service, eq(cartItems.serviceId, service.id))
    .leftJoin(
      sellerService,
      and(
        eq(sellerService.sellerId, cartItems.sellerId),
        eq(sellerService.serviceId, cartItems.serviceId)
      )
    )
    .where(eq(cartItems.customerId, customerId));

  if (!itemsInCart || itemsInCart.length === 0) {
    throw ApiError.badRequest("Cart is empty. Cannot create an order.");
  }

  // 2. Calculate total amount and prepare order items data
  let totalAmount = 0;
  const processedItems = itemsInCart.map((item) => {
    const price = Number(item.customPrice ?? item.basePrice);
    const itemTotal = price * item.quantity;
    totalAmount += itemTotal;

    return {
      serviceId: item.serviceId,
      sellerId: item.sellerId,
      quantity: item.quantity,
      price: price.toFixed(2),
    };
  });

  // 3. Execute Transaction to create order, order items, and clear cart
  const newOrder = await db.transaction(async (tx) => {
    // Insert into orderBooking
    const [booking] = await tx
      .insert(orderBooking)
      .values({
        customerId,
        totalAmount: totalAmount.toFixed(2),
        paymentStatus: "pending",
        status: "pending",
        bookingDate: bookingDateStr,
      })
      .returning();

    // Insert corresponding order items
    const orderItemsValues = processedItems.map((item) => ({
      orderId: booking.id,
      ...item,
    }));

    await tx.insert(orderItems).values(orderItemsValues);

    // Fetch customer name for notification text
    const [cust] = await tx
      .select({ username: customers.username })
      .from(customers)
      .where(eq(customers.id, customerId))
      .limit(1);

    // Insert notifications for each seller
    for (const item of itemsInCart) {
      await tx.insert(notifications).values({
        sellerId: item.sellerId,
        title: `New Booking Order #${booking.id}`,
        message: `New booking for "${item.serviceName}" (Qty: ${item.quantity}) from ${cust?.username || "Customer"} scheduled on ${bookingDateStr}.`,
        type: "order",
        link: "/seller/services",
        isRead: false,
      });
    }

    // Clear the customer's cart
    await tx.delete(cartItems).where(eq(cartItems.customerId, customerId));

    return booking;
  });

  return newOrder;
};

const getCustomerOrders = async (customerId) => {
  return await db
    .select()
    .from(orderBooking)
    .where(eq(orderBooking.customerId, customerId))
    .orderBy(desc(orderBooking.createdAt));
};

const getOrderById = async (orderId, customerId) => {
  const [order] = await db
    .select()
    .from(orderBooking)
    .where(and(eq(orderBooking.id, orderId), eq(orderBooking.customerId, customerId)))
    .limit(1);

  if (!order) {
    throw ApiError.notFound("Order not found");
  }

  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  return { ...order, items };
};

const cancelOrderService = async (orderId, customerId) => {
  const numericOrderId = Number(orderId);

  // 1. Fetch the order and verify ownership
  const [order] = await db
    .select()
    .from(orderBooking)
    .where(and(eq(orderBooking.id, numericOrderId), eq(orderBooking.customerId, customerId)));

  if (!order) {
    throw ApiError.notFound("Order not found or unauthorized");
  }

  // 2. Check if the order status allows cancellation
  if (order.status !== "pending") {
    throw ApiError.badRequest(`Cannot cancel an order that is already ${order.status}`);
  }

  // 3. Issue Razorpay refund if the order was already paid
  let refundIssued = false;
  if (order.paymentStatus === "paid" && order.razorpayPaymentId) {
    try {
      const amountInPaise = Math.round(Number(order.totalAmount) * 100);
      await razorpay.payments.refund(order.razorpayPaymentId, {
        amount: amountInPaise,
        speed: "normal",  // "normal" = 5-7 business days, "optimum" = instant if eligible
        notes: { reason: "Order cancelled by customer", orderId: String(numericOrderId) },
      });
      refundIssued = true;
    } catch (refundErr) {
      // Log but don't block the cancellation — admin can manually refund
      console.error("Razorpay refund failed:", refundErr?.error ?? refundErr);
    }
  }

  // 4. Update status to cancelled (+ paymentStatus to refunded if refund was issued)
  const [updatedOrder] = await db
    .update(orderBooking)
    .set({
      status: "cancelled",
      paymentStatus: refundIssued ? "refunded" : order.paymentStatus,
      updatedAt: new Date(),
    })
    .where(eq(orderBooking.id, numericOrderId))
    .returning();

  // 5. Notify sellers + customer about cancellation & refund
  try {
    const items = await db
      .select({
        sellerId: orderItems.sellerId,
        serviceName: service.serviceName,
      })
      .from(orderItems)
      .leftJoin(service, eq(orderItems.serviceId, service.id))
      .where(eq(orderItems.orderId, numericOrderId));

    // Notify each seller
    for (const item of items) {
      if (item.sellerId) {
        await db.insert(notifications).values({
          sellerId: item.sellerId,
          title: `Booking Cancelled #${numericOrderId}`,
          message: `Booking for "${item.serviceName || "Service"}" was cancelled by the customer.`,
          type: "cancellation",
          link: "/seller/services",
          isRead: false,
        });
      }
    }

    // Notify customer about refund status
    if (order.paymentStatus === "paid") {
      const refundMsg = refundIssued
        ? `Your payment of ₹${Number(order.totalAmount).toFixed(2)} for Order #${numericOrderId} has been refunded. It will reflect in your account within 5-7 business days.`
        : `Your Order #${numericOrderId} was cancelled. We were unable to process the refund automatically — please contact support.`;

      await db.insert(notifications).values({
        customerId,
        title: refundIssued ? `Refund Initiated – Order #${numericOrderId}` : `Cancellation Confirmed – Order #${numericOrderId}`,
        message: refundMsg,
        type: "refund",
        link: "/customer/orders",
        isRead: false,
      });
    }
  } catch (notifErr) {
    console.error("Failed to create cancellation notifications:", notifErr);
  }

  return updatedOrder;
};

export { createOrder, getCustomerOrders, getOrderById, cancelOrderService };