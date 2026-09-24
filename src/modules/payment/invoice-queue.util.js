import { SendMessageCommand } from "@aws-sdk/client-sqs";
import { sqsClient, INVOICE_QUEUE_URL } from "../../common/config/sqs.js";
import { generateAndSaveInvoice } from "../order/invoice.service.js";

// Payment completion hands off invoice generation here.
// If SQS credentials and queue URL are configured, it sends a message
// to SQS for the worker process to handle.
// If SQS is not configured (e.g. local dev / staging) or sending fails,
// it immediately generates and saves the invoice in the background.
export const enqueueInvoiceGeneration = async (orderId) => {
  const isSqsConfigured = Boolean(
    INVOICE_QUEUE_URL &&
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY
  );

  if (isSqsConfigured) {
    try {
      await sqsClient.send(
        new SendMessageCommand({
          QueueUrl: INVOICE_QUEUE_URL,
          MessageBody: JSON.stringify({ orderId }),
        })
      );
      return;
    } catch (err) {
      console.warn(`Failed to enqueue invoice generation to SQS for order ${orderId}, falling back to direct generation:`, err.message);
    }
  }

  // Fallback: asynchronous direct invoice generation
  generateAndSaveInvoice(orderId).catch((err) => {
    console.error(`Failed to generate invoice for order ${orderId}:`, err);
  });
};
