import express from "express";
import { addRating, fetchSellerRatings } from "./ratings.controller.js";
import { verifyAuth, verifyCustomer } from "../../common/middlewares/auth.middleware.js";
import validate from "../../common/middlewares/validate.middleware.js";
import CreateRatingDto from "./dto/create-rating.dto.js";

const router = express.Router();

// Public route to view a seller's ratings
router.get("/seller/:sellerId", fetchSellerRatings);

// Protected customer route to submit a rating
router.post("/", verifyAuth, verifyCustomer, validate(CreateRatingDto), addRating);

export default router;