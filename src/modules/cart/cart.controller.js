import * as cartService from "./cart.service.js";
import ApiError from "../../common/utils/api-error.js";
import ApiResponse from "../../common/utils/api-response.js";

const addCartItem = async (req, res, next) => {
  try {
    const customerId = req.user.id;
    const item = await cartService.addToCart({
      customerId,
      ...req.body,
    });
    return ApiResponse.created(res, "Item added to cart successfully", item);
  } catch (error) {
    next(error);
  }
};

const incrementCartItem = async (req, res, next) => {
  try {
    const customerId = req.user.id;
    const item = await cartService.incrementCartItem({
      customerId,
      ...req.body,
    });
    return ApiResponse.success(res, "Cart item quantity updated", item);
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

const fetchCartCount = async (req, res, next) => {
  try {
    const customerId = req.user.id;
    const count = await cartService.getCartCount(customerId);
    return ApiResponse.success(res, "Cart count fetched successfully", { count });
  } catch (error) {
    next(error);
  }
};

const removeCartItem = async (req, res, next) => {
  try {
    const customerId = req.user.id;
    const serviceId = Number(req.params.serviceId);
    const sellerId = Number(req.params.sellerId);
    if (!Number.isInteger(serviceId) || !Number.isInteger(sellerId)) {
      throw ApiError.badRequest("Invalid service or seller id");
    }
    const result = await cartService.removeFromCart({ customerId, serviceId, sellerId });
    return ApiResponse.success(res, result.message);
  } catch (error) {
    next(error);
  }
};

export { addCartItem, incrementCartItem, fetchCartItems, fetchCartCount, removeCartItem };
