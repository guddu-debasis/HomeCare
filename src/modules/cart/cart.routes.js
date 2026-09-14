import express from "express";
import { addCartItem, fetchCartItems, removeCartItem } from "./cart.controller.js";
import { verifyAuth, verifyCustomer } from "../../common/middlewares/auth.middleware.js";
import validate from "../../common/middlewares/validate.middleware.js";
import AddCartDto from "./dto/add-cart.dto.js";

const router = express.Router();

// All cart routes require customer authentication
router.use(verifyAuth, verifyCustomer);

router.post("/", validate(AddCartDto), addCartItem);
router.get("/", fetchCartItems);
router.delete("/:id", removeCartItem);

export default router;