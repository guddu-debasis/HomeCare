import express from "express"

import adminRoutes from "./modules/admin/admin.routes.js"


const app = express()

app.use(express.json())

app.use("/app/admin", adminRoutes)

export default app