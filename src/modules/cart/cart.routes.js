import express from "express";
import { addCartItem, incrementCartItem, fetchCartItems, fetchCartCount, removeCartItem } from "./cart.controller.js";
import { verifyAuth, verifyCustomer } from "../../common/middlewares/auth.middleware.js";
import validate from "../../common/middlewares/validate.middleware.js";
import AddCartDto from "./dto/add-cart.dto.js";
import IncrementCartDto from "./dto/increment-cart.dto.js";

const router = express.Router();

// All cart routes require customer authentication
router.use(verifyAuth, verifyCustomer);

router.post("/", validate(AddCartDto), addCartItem);
router.get("/", fetchCartItems);
// Cheap navbar-badge endpoint — Redis HLEN only, no Postgres enrichment.
// Registered before the /:serviceId/:sellerId delete route's neighbourhood
// out of habit, though as a distinct GET path it can't collide with it.
router.get("/count", fetchCartCount);
// Hot path for the quantity +/- stepper — hits Redis only, no DB round trip.
router.patch("/increment", validate(IncrementCartDto), incrementCartItem);
router.delete("/:serviceId/:sellerId", removeCartItem);

export default router;
