import "dotenv/config";
import { ReceiveMessageCommand, DeleteMessageCommand } from "@aws-sdk/client-sqs";
import { sqsClient, INVOICE_QUEUE_URL } from "../common/config/sqs.js";
import { generateAndSaveInvoice } from "../modules/order/invoice.service.js";

// A separate long-running process from the API server — run alongside it
// with `npm run worker:invoice`, not started by server.js. This is the
// actual point of using a queue here: the API server can respond to a
// payment instantly (it only ever sends one small message, see
// payment.service.js / invoice-queue.util.js), while THIS process — which
// can be slow, can crash, and can be scaled independently — is what
// actually does the work.

const processOrder = async (orderId) => {
  await generateAndSaveInvoice(orderId);
};

const pollLoop = async () => {
  console.log("Invoice worker started. Polling SQS...");

  // Runs forever. Each iteration is wrapped in its own try/catch so one
  // bad poll (network blip, a message that fails to process) can never
  // crash the whole process — it just logs and tries again next loop.
  while (true) {
    try {
      const { Messages } = await sqsClient.send(
        new ReceiveMessageCommand({
          QueueUrl: INVOICE_QUEUE_URL,
          MaxNumberOfMessages: 5,
          WaitTimeSeconds: 20, // long polling — fewer empty API calls than short polling
        })
      );

      if (!Messages || Messages.length === 0) continue;

      for (const message of Messages) {
        try {
          const { orderId } = JSON.parse(message.Body);
          await processOrder(orderId);

          // Only delete AFTER successful processing. If processOrder threw,
          // we skip this and the message becomes visible again after the
          // queue's visibility timeout — SQS retries it automatically. This
          // is the actual reliability benefit of using a queue here instead
          // of just doing this inline.
          await sqsClient.send(
            new DeleteMessageCommand({
              QueueUrl: INVOICE_QUEUE_URL,
              ReceiptHandle: message.ReceiptHandle,
            })
          );
        } catch (err) {
          console.error("Invoice worker: failed to process message, leaving it for retry:", err);
        }
      }
    } catch (err) {
      console.error("Invoice worker: poll cycle failed:", err);
    }
  }
};

pollLoop();
