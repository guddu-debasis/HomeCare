import * as sellerServiceService from "./seller-service.service.js";
import ApiResponse from "../../common/utils/api-response.js";

const addServiceToSeller = async (req, res, next) => {
  try {
    const sellerId = req.user.id;
    const mapping = await sellerServiceService.addSellerService({
      sellerId,
      ...req.body,
    });
    return ApiResponse.created(res, "Service assigned to seller successfully", mapping);
  } catch (error) {
    next(error);
  }
};

const fetchSellerServices = async (req, res, next) => {
  try {
    const sellerId = Number(req.params.sellerId);
    const services = await sellerServiceService.getSellerServices(sellerId);
    return ApiResponse.success(res, "Seller services retrieved successfully", services);
  } catch (error) {
    next(error);
  }
};

const removeServiceFromSeller = async (req, res, next) => {
  try {
    const sellerId = req.user.id;
    const serviceId = Number(req.params.serviceId);
    const result = await sellerServiceService.removeSellerService(sellerId, serviceId);
    return ApiResponse.success(res, result.message);
  } catch (error) {
    next(error);
  }
};

const updateServiceForSeller = async (req, res, next) => {
  try {
    const sellerId = req.user.id;
    const serviceId = Number(req.params.serviceId || req.body.serviceId);
    const updated = await sellerServiceService.updateSellerService({
      sellerId,
      serviceId,
      ...req.body,
    });
    return ApiResponse.success(res, "Service rate updated successfully", updated);
  } catch (error) {
    next(error);
  }
};

const fetchAllSellerServices = async (req, res, next) => {
  try {
    const offerings = await sellerServiceService.getAllOfferings();
    return ApiResponse.success(res, "All seller offerings retrieved successfully", offerings);
  } catch (error) {
    next(error);
  }
};

const fetchProvidersByService = async (req, res, next) => {
  try {
    const serviceId = Number(req.params.serviceId);
    const providers = await sellerServiceService.getProvidersByServiceId(serviceId);
    return ApiResponse.success(res, "Providers for service retrieved successfully", providers);
  } catch (error) {
    next(error);
  }
};

export {
  addServiceToSeller,
  fetchSellerServices,
  removeServiceFromSeller,
  updateServiceForSeller,
  fetchAllSellerServices,
  fetchProvidersByService,
};