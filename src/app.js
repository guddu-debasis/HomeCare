import express from "express"

import adminRoutes from "./modules/admin/admin.routes.js"
import sellerRoutes from "./modules/seller/seller.routes.js"
import customerRoutes from "./modules/customer/customer.routes.js"

const app = express()

app.use(express.json())

app.use("/app/admin", adminRoutes)
app.use("/app/seller", sellerRoutes)
app.use("/app/customer", customerRoutes)

export default app