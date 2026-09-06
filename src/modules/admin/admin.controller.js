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

const refreshToken = async (req, res, next) => {
    try {
        const data = await adminService.refresh(req.body.token);
        return ApiResponse.success(res, "Token refreshed successfully", data);
    } catch (error) {
        next(error);
    }   
};

const logoutAdmin = async (req, res, next) => {
    try {
        await adminService.logout(req.user.id); // Assuming req.user is populated by auth middleware
        return ApiResponse.success(res, "Admin logged out successfully");
    }
    catch (error) {
        next(error);
    }
};

const adminForgotPassword = async (req, res, next) => {
    try {
        await adminService.forgotPassword(req.body.email);
        return ApiResponse.success(res, "Password reset email sent successfully");
    } catch (error) {
        next(error);
    }
};

export { registerAdmin, loginAdmin, refreshToken, logoutAdmin, adminForgotPassword };   

