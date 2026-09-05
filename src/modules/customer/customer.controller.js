import ApiResponse from "../../common/utils/api.response.js";
import * as customerService from "./customer.service.js"; // 👈 Importing all exports as a module namespace

const registerCustomer = async (req, res, next) => {
    try {
        const user = await customerService.register(req.body); // Matches your service method name
        return ApiResponse.created(res, "Customer registered successfully", user);
    } catch (error) {
        next(error); // 👈 Passes your ApiError to the global error middleware
    }
};

const loginCustomer = async (req, res, next) => {
    try {
        const data = await customerService.login(req.body); // Matches your service method name
        return ApiResponse.success(res, "Customer logged in successfully", data);
    } catch (error) {
        next(error); // 👈 Catches wrong password or email errors safely
    }
};

export { registerCustomer, loginCustomer };
