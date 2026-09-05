import ApiResponse from "../../common/utils/api.response.js";
import * as adminService from "./admin.service.js"; // 👈 Importing all exports as a module namespace

const registerAdmin = async (req, res, next) => {
    try {
        const user = await adminService.register(req.body); // Matches your service method name
        return ApiResponse.created(res, "Admin registered successfully", user);
    } catch (error) {
        next(error); // 👈 Passes your ApiError to the global error middleware
    }
};

const loginAdmin = async (req, res, next) => {
    try {
        const data = await adminService.login(req.body); // Matches your service method name
        return ApiResponse.success(res, "Admin logged in successfully", data);
    } catch (error) {
        next(error); // 👈 Catches wrong password or email errors safely
    }
};

export { registerAdmin, loginAdmin };
