import express from "express"
import cors from "cors"
import passport from "./common/config/passport.js"

import adminRoutes from "./modules/admin/admin.routes.js"
import sellerRoutes from "./modules/seller/seller.routes.js"
import customerRoutes from "./modules/customer/customer.routes.js"
import cartRoutes from "./modules/cart/cart.routes.js"
import orderRoutes from "./modules/order/order.routes.js"
import serviceRoutes from "./modules/service/service.routes.js";
import sellerServiceRoutes from "./modules/seller-service/seller-service.routes.js";
import ratingsRoutes from "./modules/ratings/ratings.routes.js";
import errorHandler from "./common/middlewares/error.middleware.js";
import paymentRoutes from "./modules/payment/payment.routes.js";

const app = express()

const allowedOrigins = [
  "http://localhost:5173",
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (curl, mobile apps, Render health checks)
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true
}));

app.use(passport.initialize()) // stateless — no sessions, JWT handles auth

// Stash the raw request bytes alongside the parsed body. The Razorpay webhook
// signature is computed over the exact raw payload Razorpay sent — re-serializing
// req.body with JSON.stringify is not guaranteed to match byte-for-byte (key
// order, spacing), so signature verification needs this raw buffer.
app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }))
app.use(express.urlencoded({ extended: true }))

app.use("/app/v1/admin", adminRoutes)
app.use("/app/v1/seller", sellerRoutes)
app.use("/app/v1/customer", customerRoutes)
app.use("/app/v1/cart",cartRoutes)
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/services", serviceRoutes);
app.use("/api/v1/seller-services", sellerServiceRoutes);
app.use("/api/v1/ratings", ratingsRoutes);
app.use("/api/v1/payments", paymentRoutes);

import { resetPassword as customerReset } from "./modules/customer/customer.service.js";
import { resetPassword as sellerReset } from "./modules/seller/seller.service.js";
import { resetPassword as adminReset } from "./modules/admin/admin.service.js";
import ApiResponse from "./common/utils/api-response.js";
import ApiError from "./common/utils/api-error.js";

// Universal reset-password endpoint that handles tokens across all user roles
app.post("/app/v1/auth/reset-password", async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      throw ApiError.badRequest("Token and password are required");
    }

    // Try customer
    try {
      const result = await customerReset(token, password);
      return ApiResponse.success(res, result.message, { role: "customer" });
    } catch (err) {
      if (err.message?.includes("expired")) throw err;
    }

    // Try seller
    try {
      const result = await sellerReset(token, password);
      return ApiResponse.success(res, result.message, { role: "seller" });
    } catch (err) {
      if (err.message?.includes("expired")) throw err;
    }

    // Try admin
    try {
      const result = await adminReset(token, password);
      return ApiResponse.success(res, result.message, { role: "admin" });
    } catch (err) {
      if (err.message?.includes("expired")) throw err;
    }

    throw ApiError.badRequest("Invalid or expired password reset link");
  } catch (error) {
    next(error);
  }
});

// Must be registered last — catches every next(error) from the routes above
app.use(errorHandler);

export default app