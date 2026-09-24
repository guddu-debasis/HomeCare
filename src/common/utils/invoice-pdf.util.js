import PDFDocument from "pdfkit";

// Builds the invoice PDF in memory and resolves to a Buffer — nothing here
// touches the database or SQS, it only knows how to turn already-fetched
// order data into bytes. Called exclusively from invoice-worker.js.
export const generateInvoicePdfBuffer = ({ order, items, customer }) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc
      .fontSize(20)
      .font("Helvetica-Bold")
      .text("Hearth", { continued: true })
      .fontSize(10)
      .font("Helvetica")
      .text("  · Home Services Invoice", { align: "left" });

    doc.moveDown(1.5);

    doc.fontSize(11).font("Helvetica-Bold").text(`Invoice for Booking #${order.id}`);
    doc.font("Helvetica").fontSize(10);
    doc.text(`Date: ${new Date(order.updatedAt || order.createdAt).toLocaleDateString()}`);
    doc.text(`Booking date: ${order.bookingDate}`);
    doc.text(`Payment status: ${order.paymentStatus}`);
    if (order.razorpayPaymentId) {
      doc.text(`Payment reference: ${order.razorpayPaymentId}`);
    }

    doc.moveDown(0.5);
    doc.font("Helvetica-Bold").text("Billed to:");
    doc.font("Helvetica").text(customer?.username || "Customer");
    if (customer?.email) doc.text(customer.email);

    doc.moveDown(1);

    // Simple table header
    const tableTop = doc.y;
    const col = { service: 50, seller: 220, qty: 380, price: 430, total: 490 };

    doc.font("Helvetica-Bold").fontSize(9);
    doc.text("Service", col.service, tableTop);
    doc.text("Provider", col.seller, tableTop);
    doc.text("Qty", col.qty, tableTop);
    doc.text("Price", col.price, tableTop);
    doc.text("Total", col.total, tableTop);
    doc.moveTo(50, tableTop + 15).lineTo(545, tableTop + 15).stroke();

    let y = tableTop + 22;
    doc.font("Helvetica").fontSize(9);

    for (const item of items) {
      const lineTotal = Number(item.price) * item.quantity;
      doc.text(item.serviceName || `Service #${item.serviceId}`, col.service, y, { width: 160 });
      doc.text(item.sellerName || `Seller #${item.sellerId}`, col.seller, y, { width: 150 });
      doc.text(String(item.quantity), col.qty, y);
      doc.text(`\u20b9${Number(item.price).toFixed(2)}`, col.price, y);
      doc.text(`\u20b9${lineTotal.toFixed(2)}`, col.total, y);
      y += 20;
    }

    doc.moveTo(50, y + 5).lineTo(545, y + 5).stroke();
    doc.font("Helvetica-Bold").fontSize(11);
    doc.text(`Total paid: \u20b9${Number(order.totalAmount).toFixed(2)}`, col.price, y + 15, {
      width: 150,
      align: "left",
    });

    doc.moveDown(4);
    doc.font("Helvetica").fontSize(8).fillColor("#666666");
    doc.text("This is a system-generated invoice and does not require a signature.", 50, doc.y);

    doc.end();
  });
};
