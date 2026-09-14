import express from "express"
import cors from "cors"

import adminRoutes from "./modules/admin/admin.routes.js"
import sellerRoutes from "./modules/seller/seller.routes.js"
import customerRoutes from "./modules/customer/customer.routes.js"
import cartRoutes from "./modules/cart/cart.routes.js"
import orderRoutes from "./modules/order/order.routes.js"
import serviceRoutes from "./modules/service/service.routes.js";
import sellerServiceRoutes from "./modules/seller-service/seller-service.routes.js";
import ratingsRoutes from "./modules/ratings/ratings.routes.js";

const app = express()

app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173", credentials: true }));
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use("/app/v1/admin", adminRoutes)
app.use("/app/v1/seller", sellerRoutes)
app.use("/app/v1/customer", customerRoutes)
app.use("/app/v1/cart",cartRoutes)
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/services", serviceRoutes);
app.use("/api/v1/seller-services", sellerServiceRoutes);
app.use("/api/v1/ratings", ratingsRoutes);

export default app