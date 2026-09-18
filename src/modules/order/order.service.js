import { db } from "../../common/config/db.js";
import { orderBooking, orderItems, service, notifications, customers } from "../../db/schema.js";
import { eq, and, desc, inArray } from "drizzle-orm";
import ApiError from "../../common/utils/api-error.js";
import razorpay from "../../common/config/razorpay.js";
import { redis } from "../../common/config/redis.js";
import * as cartService from "../cart/cart.service.js";
import { deriveOverallOrderStatus } from "../../common/utils/order-status.util.js";

const createOrder = async ({ customerId, bookingDate }) => {
  // Joi.date().iso() coerces the incoming string into a JS Date object.
  // Normalize it back to a plain YYYY-MM-DD string so DB inserts and
  // notification messages don't show a full timezone-aware datetime string.
  const bookingDateStr =
    bookingDate instanceof Date
      ? bookingDate.toISOString().split("T")[0]
      : String(bookingDate).split("T")[0];

  // 1. Read the live cart out of Redis (already enriched with current
  // service/seller pricing — see cart.service.js). This is the one point
  // where the cart touches Postgres at all pre-checkout.
  const itemsInCart = await cartService.getCartItems(customerId);

  if (!itemsInCart || itemsInCart.length === 0) {
    throw ApiError.badRequest("Cart is empty. Cannot create an order.");
  }

  // 2. Calculate total amount and prepare order items data
  let totalAmount = 0;
  const processedItems = itemsInCart.map((item) => {
    const price = Number(item.price);
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
      await redis.incr(`unread:seller:${item.sellerId}`);
    }

    return booking;
  });

  // 4. Order committed — now it's safe to clear the Redis cart. Redis isn't
  // part of the Postgres transaction above (it can't be), so this only runs
  // once we know the order actually committed — if checkout fails partway
  // through, the customer's cart is untouched rather than silently lost.
  await cartService.clearCart(customerId);

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

// Shared core for both "cancel the whole order" and "cancel one item within
// a combined order". onlyItemId narrows which item(s) get cancelled; null
// means every still-cancellable item (the whole-order case).
const performCancellation = async ({ orderId, customerId, onlyItemId = null }) => {
  const numericOrderId = Number(orderId);

  // 1. Fetch the order and verify ownership
  const [order] = await db
    .select()
    .from(orderBooking)
    .where(and(eq(orderBooking.id, numericOrderId), eq(orderBooking.customerId, customerId)));

  if (!order) {
    throw ApiError.notFound("Order not found or unauthorized");
  }

  // 2. Check if the order status still allows cancellation. Blocked only
  // once there's nothing left to cancel: fully completed, or already
  // cancelled. Acceptance by a provider does NOT block this — orderBooking
  // .status is a rollup (see order-status.util.js) that can reach "accepted"
  // the moment any one seller responds, and a customer should still be able
  // to cancel a booking (or an item within it) that hasn't been carried out
  // yet.
  if (order.status === "completed" || order.status === "cancelled") {
    throw ApiError.badRequest(`Cannot cancel an order that is already ${order.status}`);
  }

  // 3. Figure out which items are actually being cancelled here. Items a
  // seller already marked "completed" are NOT touched — cancelling can't
  // retroactively un-complete a job that was actually done.
  const allItems = await db
    .select({
      id: orderItems.id,
      sellerId: orderItems.sellerId,
      serviceId: orderItems.serviceId,
      status: orderItems.status,
      price: orderItems.price,
      quantity: orderItems.quantity,
    })
    .from(orderItems)
    .where(eq(orderItems.orderId, numericOrderId));

  let cancellableItems;
  if (onlyItemId != null) {
    const target = allItems.find((item) => item.id === Number(onlyItemId));
    if (!target) {
      throw ApiError.notFound("Order item not found in this order");
    }
    if (target.status === "completed" || target.status === "cancelled") {
      throw ApiError.badRequest(`Cannot cancel an item that is already ${target.status}`);
    }
    cancellableItems = [target];
  } else {
    cancellableItems = allItems.filter(
      (item) => item.status !== "completed" && item.status !== "cancelled"
    );
    if (cancellableItems.length === 0) {
      // Defensive — the order-level guard above should already have caught
      // the all-completed case.
      throw ApiError.badRequest("Nothing in this order is eligible for cancellation.");
    }
  }

  const cancellableAmount = cancellableItems.reduce(
    (sum, item) => sum + Number(item.price) * item.quantity,
    0
  );

  // 4. Issue a Razorpay refund for the cancelled portion only — never the
  // full order total, since other items may be untouched (still in
  // progress) or already completed and legitimately paid for.
  let refundIssued = false;
  if (order.paymentStatus === "paid" && order.razorpayPaymentId && cancellableAmount > 0) {
    try {
      const amountInPaise = Math.round(cancellableAmount * 100);
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

  // 5. Cancel exactly the targeted item(s), leave everything else untouched.
  const cancellableIds = cancellableItems.map((item) => item.id);
  await db
    .update(orderItems)
    .set({ status: "cancelled" })
    .where(and(eq(orderItems.orderId, numericOrderId), inArray(orderItems.id, cancellableIds)));

  // 6. Recompute the parent's rollup status the same way
  // seller.service.js#updateBookingStatus does, from every item's *current*
  // status — not hardcoded to "cancelled", since other items untouched by
  // this cancellation (still pending/accepted, or already completed) mean
  // the order as a whole isn't simply "cancelled".
  const finalStatuses = allItems.map((item) =>
    cancellableIds.includes(item.id) ? "cancelled" : item.status
  );
  const overallStatus = deriveOverallOrderStatus(finalStatuses);

  // paymentStatusEnum has no "partially_refunded" value. A full refund only
  // gets marked "refunded" when the whole order ends up cancelled — a
  // partial cancel (single item, or one of several) leaves paymentStatus as
  // "paid", since part of what was paid for is still active or delivered.
  // The notification below still tells the customer the correct (possibly
  // partial) amount either way.
  const paymentStatus =
    refundIssued && overallStatus === "cancelled" ? "refunded" : order.paymentStatus;

  const [updatedOrder] = await db
    .update(orderBooking)
    .set({
      status: overallStatus,
      paymentStatus,
      updatedAt: new Date(),
    })
    .where(eq(orderBooking.id, numericOrderId))
    .returning();

  // 7. Notify sellers whose item was actually cancelled here (not ones
  // whose item was untouched) + the customer.
  try {
    const cancelledSellerItems = allItems.filter((item) => cancellableIds.includes(item.id));
    const serviceIds = [...new Set(cancelledSellerItems.map((item) => item.serviceId))];
    const serviceRows = serviceIds.length
      ? await db.select({ id: service.id, serviceName: service.serviceName }).from(service).where(inArray(service.id, serviceIds))
      : [];
    const serviceNameById = new Map(serviceRows.map((s) => [s.id, s.serviceName]));

    for (const item of cancelledSellerItems) {
      if (item.sellerId) {
        await db.insert(notifications).values({
          sellerId: item.sellerId,
          title: `Booking Cancelled #${numericOrderId}`,
          message: `Booking for "${serviceNameById.get(item.serviceId) || "Service"}" was cancelled by the customer.`,
          type: "cancellation",
          link: "/seller/services",
          isRead: false,
        });
        await redis.incr(`unread:seller:${item.sellerId}`);
      }
    }

    // Notify customer about refund status
    if (order.paymentStatus === "paid" && cancellableAmount > 0) {
      const refundMsg = refundIssued
        ? `Your payment of \u20b9${cancellableAmount.toFixed(2)} for the cancelled part of Order #${numericOrderId} has been refunded. It will reflect in your account within 5-7 business days.`
        : `Your Order #${numericOrderId} was cancelled. We were unable to process the refund automatically — please contact support.`;

      await db.insert(notifications).values({
        customerId,
        title: refundIssued ? `Refund Initiated – Order #${numericOrderId}` : `Cancellation Confirmed – Order #${numericOrderId}`,
        message: refundMsg,
        type: "refund",
        link: "/customer/orders",
        isRead: false,
      });
      await redis.incr(`unread:customer:${customerId}`);
    }
  } catch (notifErr) {
    console.error("Failed to create cancellation notifications:", notifErr);
  }

  return updatedOrder;
};

// Cancel every still-cancellable item in the order.
const cancelOrderService = (orderId, customerId) =>
  performCancellation({ orderId, customerId });

// Cancel a single line item within a (possibly combined, multi-seller)
// order, leaving every other item untouched.
const cancelOrderItemService = (orderId, itemId, customerId) =>
  performCancellation({ orderId, customerId, onlyItemId: itemId });

export { createOrder, getCustomerOrders, getOrderById, cancelOrderService, cancelOrderItemService };