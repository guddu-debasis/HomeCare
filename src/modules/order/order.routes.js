import express from "express";
import { createNewOrder, fetchCustomerOrders, fetchOrderDetails } from "./order.controller.js";
import { verifyAuth, verifyCustomer } from "../../common/middlewares/auth.middleware.js";
import validate from "../../common/middlewares/validate.middleware.js";
import CreateOrderDto from "./dto/create-order.dto.js";

const router = express.Router();

// All order routes require customer authentication
router.use(verifyAuth, verifyCustomer);

router.post("/", validate(CreateOrderDto), createNewOrder);
router.get("/", fetchCustomerOrders);
router.get("/:id", fetchOrderDetails);

export default router;