import * as paymentService from "./payment.service.js";
import ApiResponse from "../../common/utils/api-response.js";
import ApiError from "../../common/utils/api-error.js";

const initiatePayment = async (req, res, next) => {
  try {
    const customerId = req.user.id;
    const orderId = Number(req.params.orderId);
    if (!Number.isInteger(orderId)) {
      throw ApiError.badRequest("Invalid order id");
    }
    const data = await paymentService.createRazorpayOrder(orderId, customerId);
    return ApiResponse.success(res, "Razorpay order created", data);
  } catch (error) {
    next(error);
  }
};

const confirmPayment = async (req, res, next) => {
  try {
    const customerId = req.user.id;
    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
    const numericOrderId = Number(orderId);
    if (!Number.isInteger(numericOrderId)) {
      throw ApiError.badRequest("Invalid order id");
    }
    const updated = await paymentService.verifyPayment(
      { orderId: numericOrderId, razorpayOrderId, razorpayPaymentId, razorpaySignature },
      customerId
    );
    return ApiResponse.success(res, "Payment verified", updated);
  } catch (error) {
    next(error);
  }
};

// Hit by Razorpay's servers, not the browser — no user JWT is present here.
// req.rawBody is populated by the express.json({ verify }) hook in app.js and
// is required for signature verification; req.body is the parsed JSON.
const handleWebhook = async (req, res, next) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const result = await paymentService.processWebhookEvent(req.rawBody, signature);
    // Always ack with 200 once the signature checks out, even for events we
    // don't act on — a non-2xx tells Razorpay to keep retrying this event.
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export { initiatePayment, confirmPayment, handleWebhook };