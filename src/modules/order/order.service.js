import { db } from "../../common/config/db.js";
import { orderBooking, orderItems, cartItems, service, sellerService, notifications, customers } from "../../db/schema.js";
import { eq, and } from "drizzle-orm";
import ApiError from "../../common/utils/api-error.js";

const createOrder = async ({ customerId, bookingDate }) => {
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
        bookingDate,
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
        message: `New booking for "${item.serviceName}" (Qty: ${item.quantity}) from ${cust?.username || "Customer"} scheduled on ${bookingDate}.`,
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
    .where(eq(orderBooking.customerId, customerId));
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

  // 3. Update status to cancelled
  const [updatedOrder] = await db
    .update(orderBooking)
    .set({
      status: "cancelled",
      updatedAt: new Date(),
    })
    .where(eq(orderBooking.id, numericOrderId))
    .returning();

  // Notify sellers about cancellation
  try {
    const items = await db
      .select({
        sellerId: orderItems.sellerId,
        serviceName: service.serviceName,
      })
      .from(orderItems)
      .leftJoin(service, eq(orderItems.serviceId, service.id))
      .where(eq(orderItems.orderId, numericOrderId));

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
  } catch (notifErr) {
    console.error("Failed to create cancellation notifications:", notifErr);
  }

  return updatedOrder;
};

export { createOrder, getCustomerOrders, getOrderById, cancelOrderService };