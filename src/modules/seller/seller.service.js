import ApiError from "../../common/utils/api-error.js";
import {
  generateAccessToken,
  generateRefreshToken,
  generateResetToken,
  verifyRefreshToken,
} from "../../common/utils/jwt.utils.js";
import crypto from "crypto";
import { sendEmail } from "../../common/utils/email.utils.js";
import bcrypt from "bcrypt";
import { seller, orderBooking, orderItems, service, customers, notifications } from "../../db/schema.js";
import { db } from "../../common/config/db.js";
import { eq, and, desc } from "drizzle-orm";
import { redis } from "../../common/config/redis.js";
import { deriveOverallOrderStatus } from "../../common/utils/order-status.util.js";
import razorpay from "../../common/config/razorpay.js";
import { TIME_SLOTS } from "../../common/constants/time-slots.js";

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const register = async ({ username, email, password, dob, phNo }) => {
  const [existing] = await db.select().from(seller).where(eq(seller.email, email)).limit(1);
  if (existing) throw ApiError.conflict("Email already exists");

  const { hashedToken } = generateResetToken();
  const hashedPassword = await bcrypt.hash(password, 12);

  const [newSeller] = await db
    .insert(seller)
    .values({
      username,
      email,
      password: hashedPassword,
      dob: dob || null,
      phNo: phNo || null,
      verificationToken: hashedToken,
    })
    .returning();

  const userObj = { ...newSeller };
  delete userObj.password;
  delete userObj.verificationToken;

  return userObj;
};

const login = async ({ email, password }) => {
  const [user] = await db.select().from(seller).where(eq(seller.email, email)).limit(1);
  if (!user) throw ApiError.unauthorized("Invalid Email or password");

  const isPasswordCorrect = await bcrypt.compare(password, user.password);
  if (!isPasswordCorrect) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  const accessToken = generateAccessToken({ id: user.id, role: "seller" });
  const refreshToken = generateRefreshToken({ id: user.id, role: "seller" });

  const hashedRefreshToken = hashToken(refreshToken);
  await db
    .update(seller)
    .set({ refreshToken: hashedRefreshToken })
    .where(eq(seller.id, user.id));

  const userObj = { ...user };
  delete userObj.password;
  delete userObj.refreshToken;

  return { user: userObj, accessToken, refreshToken };
};

const refresh = async (token) => {
  if (!token) throw ApiError.unauthorized("Refresh token missing");
  const decoded = verifyRefreshToken(token);

  if (decoded.role !== "seller") {
    throw ApiError.unauthorized("Invalid refresh token");
  }

  const [user] = await db.select().from(seller).where(eq(seller.id, decoded.id)).limit(1);
  if (!user) throw ApiError.unauthorized("User not found");

  if (user.refreshToken !== hashToken(token)) {
    throw ApiError.unauthorized("Invalid refresh token");
  }

  const accessToken = generateAccessToken({ id: user.id, role: "seller" });
  const refreshToken = generateRefreshToken({ id: user.id, role: "seller" });

  const hashedRefreshToken = hashToken(refreshToken);
  await db
    .update(seller)
    .set({ refreshToken: hashedRefreshToken })
    .where(eq(seller.id, user.id));

  return { accessToken, refreshToken };
};

const logout = async (userId) => {
  await db
    .update(seller)
    .set({ refreshToken: null })
    .where(eq(seller.id, userId));

  return { message: "Logged out successfully" };
};

const forgotPassword = async (email) => {
  const [user] = await db.select().from(seller).where(eq(seller.email, email)).limit(1);

  if (!user) {
    throw ApiError.notFound("No account with that email");
  }

  const { rawToken, hashedToken } = generateResetToken();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await db
    .update(seller)
    .set({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: expiresAt,
    })
    .where(eq(seller.id, user.id));

  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${rawToken}`;

  await sendEmail({
    to: user.email,
    subject: "Reset Your Password",
    html: `
      <h2>Password Reset Request</h2>
      <p>Hello ${user.username || "User"},</p>
      <p>
        We received a request to reset your password.
      </p>
      <p>
        Click the link below to reset your password:
      </p>
      <a href="${resetUrl}">
        Reset Password
      </a>
      <p>
        This link will expire in <strong>15 minutes</strong>.
      </p>
      <p>
        If you did not request a password reset,
        please ignore this email.
      </p>
    `,
  });

  return {
    message: "Password reset link sent successfully",
  };
};

const getSellerBookings = async (sellerId) => {
  const numericSellerId = Number(sellerId);
  return await db
    .select({
      id: orderBooking.id,
      customerId: orderBooking.customerId,
      customerName: customers.username,
      customerEmail: customers.email,
      customerPhone: customers.phNo,
      customerLocation: customers.currLocation,
      bookingDate: orderBooking.bookingDate,
      timeSlot: orderBooking.timeSlot,
      // This seller's own line status — what this seller can actually see
      // and act on. NOT orderBooking.status, which is a rollup across every
      // seller in the (possibly combined) order and would show this seller
      // someone else's rejection as if it were their own.
      status: orderItems.status,
      orderOverallStatus: orderBooking.status,
      paymentStatus: orderBooking.paymentStatus,
      totalAmount: orderBooking.totalAmount,
      createdAt: orderBooking.createdAt,
      orderItemId: orderItems.id,
      serviceId: orderItems.serviceId,
      serviceName: service.serviceName,
      quantity: orderItems.quantity,
      price: orderItems.price,
    })
    .from(orderItems)
    .innerJoin(orderBooking, eq(orderItems.orderId, orderBooking.id))
    .innerJoin(service, eq(orderItems.serviceId, service.id))
    .innerJoin(customers, eq(orderBooking.customerId, customers.id))
    .where(eq(orderItems.sellerId, numericSellerId))
    .orderBy(desc(orderBooking.bookingDate), desc(orderBooking.createdAt));
};

// `orderItemId` is this seller's specific Order_Items row — NOT the parent
// order id. Updating status here only ever touches this seller's own line;
// the parent order's status is then recomputed as a rollup of every item
// (see order-status.util.js), so one seller accepting/declining their job
// can never flip the order for other sellers or the customer's other items.
const updateBookingStatus = async (sellerId, orderItemId, status) => {
  const numericSellerId = Number(sellerId);
  const numericItemId = Number(orderItemId);

  // Verify this order item actually belongs to this seller
  const [item] = await db
    .select({
      id: orderItems.id,
      orderId: orderItems.orderId,
      serviceId: orderItems.serviceId,
      serviceName: service.serviceName,
      status: orderItems.status,
      price: orderItems.price,
      quantity: orderItems.quantity,
    })
    .from(orderItems)
    .innerJoin(service, eq(orderItems.serviceId, service.id))
    .where(and(eq(orderItems.id, numericItemId), eq(orderItems.sellerId, numericSellerId)))
    .limit(1);

  if (!item) {
    throw ApiError.notFound("Booking not found or not assigned to you");
  }

  // Guard against re-triggering an already-final status — besides being
  // nonsensical (un-completing a finished job), without this a seller could
  // call "cancelled" on the same item twice and, once refunds are involved
  // below, trigger a duplicate refund.
  if (item.status === "completed" || item.status === "cancelled") {
    throw ApiError.badRequest(`This item is already ${item.status} and can't be updated further.`);
  }

  const [orderRow] = await db
    .select({
      customerId: orderBooking.customerId,
      paymentStatus: orderBooking.paymentStatus,
      razorpayPaymentId: orderBooking.razorpayPaymentId,
      bookingDate: orderBooking.bookingDate,
      timeSlot: orderBooking.timeSlot,
    })
    .from(orderBooking)
    .where(eq(orderBooking.id, item.orderId))
    .limit(1);

  // A seller can accept (or decline) a booking any time, but can't mark it
  // "completed" before the scheduled window has actually started — the job
  // hasn't happened yet. Orders created before the timeSlot column existed
  // have no slot on record, so those fall back to just gating on the
  // booking date itself (midnight UTC) rather than a specific hour.
  if (status === "completed" && orderRow?.bookingDate) {
    const slotInfo = orderRow.timeSlot ? TIME_SLOTS[orderRow.timeSlot] : null;
    const earliestCompletion = new Date(orderRow.bookingDate);
    earliestCompletion.setUTCHours(slotInfo ? slotInfo.startHour : 0, 0, 0, 0);

    if (new Date() < earliestCompletion) {
      throw ApiError.badRequest(
        `This booking can't be marked completed before its scheduled window (${orderRow.bookingDate}${orderRow.timeSlot ? `, ${orderRow.timeSlot}` : ""}).`
      );
    }
  }

  const [updatedItem] = await db
    .update(orderItems)
    .set({ status })
    .where(eq(orderItems.id, numericItemId))
    .returning();

  // If the seller is declining this item and the order was already paid,
  // refund just this item's share. A customer should never be left having
  // paid for a service a provider refuses to deliver — the customer-
  // initiated cancel path (order.service.js#performCancellation) already
  // does this; a seller-initiated decline is functionally the same outcome
  // and needs the same treatment.
  let refundIssued = false;
  const itemAmount = Number(item.price) * item.quantity;
  if (
    status === "cancelled" &&
    orderRow?.paymentStatus === "paid" &&
    orderRow?.razorpayPaymentId &&
    itemAmount > 0
  ) {
    try {
      const amountInPaise = Math.round(itemAmount * 100);
      await razorpay.payments.refund(orderRow.razorpayPaymentId, {
        amount: amountInPaise,
        speed: "normal",
        notes: { reason: "Item declined by seller", orderItemId: String(numericItemId) },
      });
      refundIssued = true;
    } catch (refundErr) {
      // Log but don't block the status update — admin can manually refund
      console.error("Razorpay refund failed (seller decline):", refundErr?.error ?? refundErr);
    }
  }

  // Recompute the parent order's rolled-up status from ALL of its items.
  const siblingItems = await db
    .select({ status: orderItems.status })
    .from(orderItems)
    .where(eq(orderItems.orderId, item.orderId));

  const overallStatus = deriveOverallOrderStatus(siblingItems.map((s) => s.status));

  // paymentStatusEnum has no "partially_refunded" value — only mark the
  // order "refunded" once the WHOLE order ends up cancelled (every item,
  // not just this one). The Razorpay refund above still happens for this
  // item's own amount regardless; paymentStatus just can't represent a
  // partial state mid-order. Same rule as the customer-initiated cancel
  // path, kept consistent on purpose.
  const paymentStatusUpdate =
    refundIssued && overallStatus === "cancelled" ? { paymentStatus: "refunded" } : {};

  const [updatedOrder] = await db
    .update(orderBooking)
    .set({
      status: overallStatus,
      ...paymentStatusUpdate,
      updatedAt: new Date(),
    })
    .where(eq(orderBooking.id, item.orderId))
    .returning();

  // Let the customer know THIS specific item's status changed (not the
  // aggregate — they should hear "your AC repair booking was declined",
  // not a vague whole-order message that ignores their other, unaffected
  // items) — and, for a decline, whether a refund actually went through.
  if (updatedOrder?.customerId) {
    const wasPaid = orderRow?.paymentStatus === "paid";
    const statusMessages = {
      accepted: `Your booking for "${item.serviceName}" has been accepted by the seller.`,
      completed: `Your booking for "${item.serviceName}" has been marked as completed.`,
      cancelled: refundIssued
        ? `Your booking for "${item.serviceName}" has been declined by the seller. \u20b9${itemAmount.toFixed(2)} has been refunded and will reflect in your account within 5-7 business days.`
        : wasPaid
        ? `Your booking for "${item.serviceName}" has been declined by the seller. We were unable to process your refund automatically — please contact support.`
        : `Your booking for "${item.serviceName}" has been declined by the seller.`,
    };

    await db.insert(notifications).values({
      customerId: updatedOrder.customerId,
      title: `Booking #${item.orderId} update`,
      message: statusMessages[status] || `Your booking for "${item.serviceName}" status was updated to ${status}.`,
      type: "booking_status",
      link: `/orders/${item.orderId}`,
      isRead: false,
    });

    await redis.incr(`unread:customer:${updatedOrder.customerId}`);
  }

  return { ...updatedItem, orderOverallStatus: updatedOrder?.status };
};

const resetPassword = async (token, newPassword) => {
  if (!token) throw ApiError.badRequest("Reset token is required");
  if (!newPassword || newPassword.length < 8) {
    throw ApiError.badRequest("Password must be at least 8 characters");
  }

  const hashedToken = hashToken(token);
  const [user] = await db
    .select()
    .from(seller)
    .where(eq(seller.resetPasswordToken, hashedToken))
    .limit(1);

  if (!user) {
    throw ApiError.badRequest("Invalid or expired password reset link");
  }

  if (new Date() > new Date(user.resetPasswordExpires)) {
    throw ApiError.badRequest("Password reset link has expired. Please request a new one.");
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);
  await db
    .update(seller)
    .set({
      password: hashedPassword,
      resetPasswordToken: null,
      resetPasswordExpires: null,
      refreshToken: null,
    })
    .where(eq(seller.id, user.id));

  return { message: "Password reset successfully. You can now log in with your new password." };
};

const UNREAD_TTL = 60 * 60; // 1hr safety net — the counter is kept in sync explicitly on writes below

const getSellerNotifications = async (sellerId) => {
  return await db
    .select()
    .from(notifications)
    .where(eq(notifications.sellerId, Number(sellerId)))
    .orderBy(desc(notifications.createdAt));
};

// Cheap, Redis-backed. This is what the 20s poll should call instead of
// getSellerNotifications above.
const getUnreadCount = async (sellerId) => {
  const cacheKey = `unread:seller:${sellerId}`;
  const cached = await redis.get(cacheKey);
  if (cached !== null) {
    return Number(cached);
  }

  const rows = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(and(eq(notifications.sellerId, Number(sellerId)), eq(notifications.isRead, false)));
  const count = rows.length;

  await redis.set(cacheKey, count, { ex: UNREAD_TTL });
  return count;
};

const markNotificationRead = async (sellerId, notificationId) => {
  const [existing] = await db
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.id, Number(notificationId)),
        eq(notifications.sellerId, Number(sellerId))
      )
    )
    .limit(1);

  if (!existing) {
    throw ApiError.notFound("Notification not found");
  }

  const [updated] = await db
    .update(notifications)
    .set({ isRead: true })
    .where(eq(notifications.id, Number(notificationId)))
    .returning();

  if (!existing.isRead) {
    await redis.decr(`unread:seller:${sellerId}`);
  }

  return updated;
};

const markAllNotificationsRead = async (sellerId) => {
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(eq(notifications.sellerId, Number(sellerId)));

  await redis.set(`unread:seller:${sellerId}`, 0);

  return { message: "All notifications marked as read" };
};

export {
  register,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  getSellerBookings,
  updateBookingStatus,
  getSellerNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
};