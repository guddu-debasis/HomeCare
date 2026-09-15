import crypto from "crypto";
import razorpay from "../../common/config/razorpay.js";
import { db } from "../../common/config/db.js";
import { orderBooking } from "../../db/schema.js";
import { eq, and } from "drizzle-orm";
import ApiError from "../../common/utils/api-error.js";

const createRazorpayOrder = async (orderId, customerId) => {
  const [order] = await db
    .select()
    .from(orderBooking)
    .where(and(eq(orderBooking.id, orderId), eq(orderBooking.customerId, customerId)))
    .limit(1);

  if (!order) throw ApiError.notFound("Order not found");
  if (order.paymentStatus === "paid") throw ApiError.badRequest("Order is already paid");
  if (order.status === "cancelled") throw ApiError.badRequest("Cannot pay for a cancelled order");

  const amountInPaise = Math.round(Number(order.totalAmount) * 100);

  // Razorpay enforces a minimum of 100 paise (₹1.00) for INR orders.
  // Return a clear error rather than letting Razorpay reject the request.
  if (amountInPaise < 100) {
    throw ApiError.badRequest(
      `Order total ₹${Number(order.totalAmount).toFixed(2)} is below the minimum payable amount of ₹1.00. ` +
      `Please add services with a higher price to proceed with payment.`
    );
  }

  const razorpayOrder = await razorpay.orders.create({
    amount: amountInPaise,
    currency: "INR",
    receipt: `order_${order.id}`,
    notes: { orderId: String(order.id), customerId: String(customerId) },
  });

  await db
    .update(orderBooking)
    .set({ razorpayOrderId: razorpayOrder.id })
    .where(eq(orderBooking.id, order.id));

  return {
    razorpayOrderId: razorpayOrder.id,
    amount: razorpayOrder.amount,
    currency: razorpayOrder.currency,
    keyId: process.env.RAZORPAY_KEY_ID,
  };
};

const verifyPayment = async (
  { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature },
  customerId
) => {
  const [order] = await db
    .select()
    .from(orderBooking)
    .where(and(eq(orderBooking.id, orderId), eq(orderBooking.customerId, customerId)))
    .limit(1);

  if (!order) throw ApiError.notFound("Order not found");

  // Idempotency: don't re-verify (and don't stomp on) an order that's already settled.
  if (order.paymentStatus === "paid") {
    return order;
  }

  if (!order.razorpayOrderId || order.razorpayOrderId !== razorpayOrderId) {
    throw ApiError.badRequest("Order/payment mismatch");
  }

  if (!razorpayPaymentId || !razorpaySignature) {
    throw ApiError.badRequest("Missing payment verification details");
  }

  // Validate that the received signature is a properly-formed hex string before
  // creating a Buffer from it. Buffer.from(str, 'hex') silently truncates on
  // invalid input, which could cause a length mismatch rather than a clean error.
  if (!/^[0-9a-fA-F]+$/.test(razorpaySignature)) {
    await db
      .update(orderBooking)
      .set({ paymentStatus: "failed" })
      .where(eq(orderBooking.id, order.id));
    throw ApiError.badRequest("Payment verification failed");
  }

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  const expectedBuffer = Buffer.from(expectedSignature, "hex");
  const receivedBuffer = Buffer.from(razorpaySignature, "hex");

  // Constant-time comparison — a plain !== leaks timing information that can
  // help an attacker brute-force a valid signature byte by byte.
  const isValidSignature =
    expectedBuffer.length === receivedBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, receivedBuffer);

  if (!isValidSignature) {
    await db
      .update(orderBooking)
      .set({ paymentStatus: "failed" })
      .where(eq(orderBooking.id, order.id));
    throw ApiError.badRequest("Payment verification failed");
  }

  const [updated] = await db
    .update(orderBooking)
    .set({ paymentStatus: "paid", razorpayPaymentId, updatedAt: new Date() })
    .where(eq(orderBooking.id, order.id))
    .returning();

  return updated;
};

// Called from the Razorpay webhook, not from the browser. Razorpay retries
// webhooks that don't return 2xx, and can (rarely) deliver the same event more
// than once, so this has to be idempotent and must never throw for "business"
// reasons (unknown order, already paid, etc.) — only signature failures are
// treated as errors by the caller.
const processWebhookEvent = async (rawBody, signature) => {
  if (!signature) {
    throw ApiError.badRequest("Missing webhook signature");
  }

  // Validate the webhook signature is valid hex before creating Buffers.
  if (!/^[0-9a-fA-F]+$/.test(signature)) {
    throw ApiError.badRequest("Invalid webhook signature");
  }

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");

  const expectedBuffer = Buffer.from(expectedSignature, "hex");
  const receivedBuffer = Buffer.from(signature, "hex");

  const isValidSignature =
    expectedBuffer.length === receivedBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, receivedBuffer);

  if (!isValidSignature) {
    throw ApiError.badRequest("Invalid webhook signature");
  }

  const event = JSON.parse(rawBody.toString("utf8"));
  const eventType = event.event;

  // Only these two matter for keeping paymentStatus in sync; everything else
  // (refund/dispute events etc.) is ignored for now.
  if (eventType !== "payment.captured" && eventType !== "payment.failed") {
    return { handled: false, event: eventType };
  }

  const paymentEntity = event.payload?.payment?.entity;
  const razorpayOrderId = paymentEntity?.order_id;
  const razorpayPaymentId = paymentEntity?.id;

  if (!razorpayOrderId) {
    return { handled: false, event: eventType };
  }

  const [order] = await db
    .select()
    .from(orderBooking)
    .where(eq(orderBooking.razorpayOrderId, razorpayOrderId))
    .limit(1);

  if (!order) {
    // Nothing to do on our side (e.g. a stray/test event). Ack it anyway so
    // Razorpay doesn't keep retrying.
    return { handled: false, event: eventType };
  }

  // Idempotent: a captured payment always wins and is never downgraded, and
  // we don't reprocess an order that's already settled.
  if (order.paymentStatus === "paid") {
    return { handled: true, event: eventType, orderId: order.id };
  }

  if (eventType === "payment.captured") {
    await db
      .update(orderBooking)
      .set({ paymentStatus: "paid", razorpayPaymentId, updatedAt: new Date() })
      .where(eq(orderBooking.id, order.id));
  } else if (eventType === "payment.failed") {
    await db
      .update(orderBooking)
      .set({ paymentStatus: "failed", updatedAt: new Date() })
      .where(eq(orderBooking.id, order.id));
  }

  return { handled: true, event: eventType, orderId: order.id };
};

export { createRazorpayOrder, verifyPayment, processWebhookEvent };