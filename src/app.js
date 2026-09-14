import express from "express"

import adminRoutes from "./modules/admin/admin.routes.js"
import sellerRoutes from "./modules/seller/seller.routes.js"
import customerRoutes from "./modules/customer/customer.routes.js"
import cartRoutes from "./modules/cart/cart.routes.js"
import orderRoutes from "./modules/order/order.routes.js"
import serviceRoutes from "./modules/service/service.routes.js";


const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use("/app/v1/admin", adminRoutes)
app.use("/app/v1/seller", sellerRoutes)
app.use("/app/v1/customer", customerRoutes)
app.use("app/v1/cart",cartRoutes)
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/services", serviceRoutes);


export default app