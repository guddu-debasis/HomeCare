import * as ratingsService from "./ratings.service.js";
import ApiResponse from "../../common/utils/api-response.js";

const addRating = async (req, res, next) => {
  try {
    const customerId = req.user.id;
    const rating = await ratingsService.createRating({
      customerId,
      ...req.body,
    });
    return ApiResponse.created(res, "Rating submitted successfully", rating);
  } catch (error) {
    next(error);
  }
};

const fetchSellerRatings = async (req, res, next) => {
  try {
    const sellerId = Number(req.params.sellerId);
    const sellerRatings = await ratingsService.getSellerRatings(sellerId);
    return ApiResponse.success(res, "Seller ratings retrieved successfully", sellerRatings);
  } catch (error) {
    next(error);
  }
};

export { addRating, fetchSellerRatings };