import * as orderService from "./order.service.js";
import ApiResponse from "../../common/utils/api-response.js";

const createNewOrder = async (req, res, next) => {
  try {
    const customerId = req.user.id;
    const order = await orderService.createOrder({
      customerId,
      ...req.body,
    });
    return ApiResponse.created(res, "Order created successfully", order);
  } catch (error) {
    next(error);
  }
};

const fetchCustomerOrders = async (req, res, next) => {
  try {
    const customerId = req.user.id;
    const orders = await orderService.getCustomerOrders(customerId);
    return ApiResponse.success(res, "Orders retrieved successfully", orders);
  } catch (error) {
    next(error);
  }
};

const fetchOrderDetails = async (req, res, next) => {
  try {
    const customerId = req.user.id;
    const orderId = Number(req.params.id);
    const order = await orderService.getOrderById(orderId, customerId);
    return ApiResponse.success(res, "Order details retrieved successfully", order);
  } catch (error) {
    next(error);
  }
};

const cancelOrderRequest = async (req, res, next) => {
  try {
    const orderId = Number(req.params.id);
    const customerId = req.user.id;

    const cancelledOrder = await orderService.cancelOrderService(orderId, customerId);

    return ApiResponse.success(res, "Order cancelled successfully", cancelledOrder);
  } catch (error) {
    next(error);
  }
};

export { createNewOrder, fetchCustomerOrders, fetchOrderDetails, cancelOrderRequest };