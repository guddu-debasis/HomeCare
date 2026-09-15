import express from "express";
import { initiatePayment, confirmPayment, handleWebhook } from "./payment.controller.js";
import { verifyAuth, verifyCustomer } from "../../common/middlewares/auth.middleware.js";

const router = express.Router();

// Registered before the auth middleware below: Razorpay's servers call this
// directly and can't supply a customer access token. Authenticity is instead
// established by verifying the x-razorpay-signature header inside the
// controller/service.
router.post("/webhook", handleWebhook);

router.use(verifyAuth, verifyCustomer);

router.post("/orders/:orderId/create", initiatePayment);
router.post("/verify", confirmPayment);

export default router;