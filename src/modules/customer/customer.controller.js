import ApiResponse from "../../common/utils/api-response.js";
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

const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: "Email is required" });
        }
        const result = await customerService.forgotPassword(email);
        return ApiResponse.success(res, result.message || "Password reset email sent successfully");
    } catch (error) {
        next(error);
    }
};

const resetPassword = async (req, res, next) => {
    try {
        const { token, password } = req.body;
        const result = await customerService.resetPassword(token, password);
        return ApiResponse.success(res, result.message || "Password reset successfully");
    } catch (error) {
        next(error);
    }
};

const logoutCustomer = async (req, res, next) => {
    try {
        await customerService.logout(req.user.id); // Assuming req.user is populated by auth middleware 
        return ApiResponse.success(res, "Customer logged out successfully");
    } catch (error) {
        next(error);
    }
};

const refreshToken = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        const data = await customerService.refresh(refreshToken);
        return ApiResponse.success(res, "Token refreshed successfully", data);
    } catch (error) {
        next(error);
    }   
};   

export default { registerCustomer, loginCustomer, forgotPassword, resetPassword, logoutCustomer, refreshToken };
