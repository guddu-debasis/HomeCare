import { db } from "../../common/config/db.js";
import { orderBooking, orderItems, customers, service, seller } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import { generateInvoicePdfBuffer } from "../../common/utils/invoice-pdf.util.js";

/**
 * Generates an invoice PDF for a paid order and stores it in the database.
 * Used by the SQS worker, the payment completion fallback, and on-demand invoice retrieval.
 *
 * @param {number} orderId
 * @returns {Promise<Buffer|null>} The generated PDF buffer, or null if cannot be generated
 */
export const generateAndSaveInvoice = async (orderId) => {
  const [order] = await db
    .select()
    .from(orderBooking)
    .where(eq(orderBooking.id, Number(orderId)))
    .limit(1);

  if (!order) {
    console.warn(`Invoice generator: order ${orderId} not found — skipping.`);
    return null;
  }

  // Idempotency: return existing buffer if already generated
  if (order.invoiceGeneratedAt && order.invoicePdfBase64) {
    return Buffer.from(order.invoicePdfBase64, "base64");
  }

  if (order.paymentStatus !== "paid") {
    console.warn(`Invoice generator: order ${orderId} is not paid (status: ${order.paymentStatus}) — skipping.`);
    return null;
  }

  const [items, [customer]] = await Promise.all([
    db
      .select({
        serviceId: orderItems.serviceId,
        serviceName: service.serviceName,
        sellerId: orderItems.sellerId,
        sellerName: seller.username,
        quantity: orderItems.quantity,
        price: orderItems.price,
      })
      .from(orderItems)
      .innerJoin(service, eq(orderItems.serviceId, service.id))
      .innerJoin(seller, eq(orderItems.sellerId, seller.id))
      .where(eq(orderItems.orderId, orderId)),
    db.select().from(customers).where(eq(customers.id, order.customerId)).limit(1),
  ]);

  const pdfBuffer = await generateInvoicePdfBuffer({ order, items, customer });

  await db
    .update(orderBooking)
    .set({
      invoicePdfBase64: pdfBuffer.toString("base64"),
      invoiceGeneratedAt: new Date(),
    })
    .where(eq(orderBooking.id, orderId));

  console.log(`Invoice generator: generated invoice for order ${orderId}.`);
  return pdfBuffer;
};
