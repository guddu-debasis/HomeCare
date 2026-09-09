import ApiResponse from "../../common/utils/api-response.js";
import * as sellerService from "./seller.service.js"; // 👈 Importing all exports as a module namespace

const registerSeller = async (req, res, next) => {
    try {
        const user = await sellerService.register(req.body); // Matches your service method name
        return ApiResponse.created(res, "Seller registered successfully", user);
    } catch (error) {
        next(error); // 👈 Passes your ApiError to the global error middleware
    }
};

const loginSeller = async (req, res, next) => {
    try {
        const data = await sellerService.login(req.body); // Matches your service method name
        return ApiResponse.success(res, "Seller logged in successfully", data);
    } catch (error) {
        next(error); // 👈 Catches wrong password or email errors safely
    }
};

const forgotPassword = async (req, res, next) => {
    try {
        await sellerService.forgotPassword(req.body.email);
        return ApiResponse.success(res, "Password reset email sent successfully");
    }
    catch (error) {
        next(error);
    }       
};

const refreshToken = async (req, res, next) => {
    try {
        const data = await sellerService.refresh(req.body.token);
        return ApiResponse.success(res, "Token refreshed successfully", data);
    }
    catch (error) {
        next(error);
    }
};

const logoutSeller = async (req, res, next) => {
    try {
        await sellerService.logout(req.user.id); // Assuming req.user is populated by auth middleware
        return ApiResponse.success(res, "Seller logged out successfully");
    }
    catch (error) {
        next(error);
    }
};

export { registerSeller, loginSeller, forgotPassword, refreshToken, logoutSeller };
