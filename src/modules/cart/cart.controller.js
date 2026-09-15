import * as cartService from "./cart.service.js";
import ApiError from "../../common/utils/api-error.js";
import ApiResponse from "../../common/utils/api-response.js";

const addCartItem = async (req, res, next) => {
  try {
    const customerId = req.user.id; // From customer auth middleware
    const item = await cartService.addToCart({
      customerId,
      ...req.body,
    });
    return ApiResponse.created(res, "Item added to cart successfully", item);
  } catch (error) {
    next(error);
  }
};

const fetchCartItems = async (req, res, next) => {
  try {
    const customerId = req.user.id;
    const items = await cartService.getCartItems(customerId);
    return ApiResponse.success(res, "Cart items fetched successfully", items);
  } catch (error) {
    next(error);
  }
};

const removeCartItem = async (req, res, next) => {
  try {
    const customerId = req.user.id;
    const cartItemId = Number(req.params.id);
    if (!Number.isInteger(cartItemId)) {
      throw ApiError.badRequest("Invalid cart item id");
    }
    const result = await cartService.removeFromCart(cartItemId, customerId);
    return ApiResponse.success(res, result.message);
  } catch (error) {
    next(error);
  }
};

export { addCartItem, fetchCartItems, removeCartItem };