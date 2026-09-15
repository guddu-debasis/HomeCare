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
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: "Email is required" });
        }
        const result = await sellerService.forgotPassword(email);
        return ApiResponse.success(res, result.message || "Password reset email sent successfully");
    }
    catch (error) {
        next(error);
    }       
};

const resetPassword = async (req, res, next) => {
    try {
        const { token, password } = req.body;
        const result = await sellerService.resetPassword(token, password);
        return ApiResponse.success(res, result.message || "Password reset successfully");
    } catch (error) {
        next(error);
    }
};

const refreshToken = async (req, res, next) => {
    try {
        const data = await sellerService.refresh(req.body.refreshToken);
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

const fetchSellerBookings = async (req, res, next) => {
    try {
        const sellerId = req.user.id;
        const bookings = await sellerService.getSellerBookings(sellerId);
        return ApiResponse.success(res, "Seller bookings retrieved successfully", bookings);
    } catch (error) {
        next(error);
    }
};

const updateSellerBookingStatus = async (req, res, next) => {
    try {
        const sellerId = req.user.id;
        const bookingId = Number(req.params.id);
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({ success: false, message: "Status is required" });
        }

        const updated = await sellerService.updateBookingStatus(sellerId, bookingId, status);
        return ApiResponse.success(res, "Booking status updated successfully", updated);
    } catch (error) {
        next(error);
    }
};

const fetchSellerNotifications = async (req, res, next) => {
    try {
        const sellerId = req.user.id;
        const notifications = await sellerService.getSellerNotifications(sellerId);
        return ApiResponse.success(res, "Seller notifications retrieved successfully", notifications);
    } catch (error) {
        next(error);
    }
};

const markSellerNotificationRead = async (req, res, next) => {
    try {
        const sellerId = req.user.id;
        const notificationId = Number(req.params.id);
        const updated = await sellerService.markNotificationRead(sellerId, notificationId);
        return ApiResponse.success(res, "Notification marked as read", updated);
    } catch (error) {
        next(error);
    }
};

const markAllSellerNotificationsRead = async (req, res, next) => {
    try {
        const sellerId = req.user.id;
        const result = await sellerService.markAllNotificationsRead(sellerId);
        return ApiResponse.success(res, "All notifications marked as read", result);
    } catch (error) {
        next(error);
    }
};

export {
    registerSeller,
    loginSeller,
    forgotPassword,
    resetPassword,
    refreshToken,
    logoutSeller,
    fetchSellerBookings,
    updateSellerBookingStatus,
    fetchSellerNotifications,
    markSellerNotificationRead,
    markAllSellerNotificationsRead,
};
