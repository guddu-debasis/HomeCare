import * as serviceService from "./service.service.js";
import ApiResponse from "../../common/utils/api-response.js";

const addService = async (req, res, next) => {
  try {
    const newService = await serviceService.createService(req.body);
    return ApiResponse.created(res, "Service created successfully", newService);
  } catch (error) {
    next(error);
  }
};

const fetchServices = async (req, res, next) => {
  try {
    const services = await serviceService.getAllServices();
    return ApiResponse.success(res, "Services retrieved successfully", services);
  } catch (error) {
    next(error);
  }
};

const removeService = async (req, res, next) => {
  try {
    const serviceId = Number(req.params.id);
    const result = await serviceService.deleteService(serviceId);
    return ApiResponse.success(res, result.message);
  } catch (error) {
    next(error);
  }
};

export { addService, fetchServices, removeService };