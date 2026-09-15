import Router from "express";
import validate from "../../common/middlewares/validate.middleware.js";
import * as controller from "./seller.controller.js";
import RegisterDto from "./dto/register.dto.js";
import LoginDto from "./dto/login.dto.js";
import { verifyAuth, verifySeller } from "../../common/middlewares/auth.middleware.js";

const router = Router();

router.get("/",(req,res)=>{
    res.send("Seller route is working");
});
router.post("/register", validate(RegisterDto), controller.registerSeller);
router.post("/login", validate(LoginDto), controller.loginSeller);
router.post("/logout", verifyAuth, verifySeller, controller.logoutSeller);
router.post("/refresh-token", controller.refreshToken);
router.post("/forgot-password", controller.forgotPassword);
router.post("/reset-password", controller.resetPassword);
router.get("/bookings", verifyAuth, verifySeller, controller.fetchSellerBookings);
router.patch("/bookings/:id/status", verifyAuth, verifySeller, controller.updateSellerBookingStatus);
router.get("/notifications", verifyAuth, verifySeller, controller.fetchSellerNotifications);
router.patch("/notifications/:id/read", verifyAuth, verifySeller, controller.markSellerNotificationRead);
router.patch("/notifications/read-all", verifyAuth, verifySeller, controller.markAllSellerNotificationsRead);

export default router;