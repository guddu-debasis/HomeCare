import { Router } from "express";
import validate from "../../common/middlewares/validate.middleware.js";
import controller from "./customer.controller.js";
import RegisterDto from "./dto/register.dto.js";
import LoginDto from "./dto/login.dto.js";
import { verifyAuth, verifyCustomer } from "../../common/middlewares/auth.middleware.js";

const router=Router();

router.get("/",(req,res)=>{
    res.send("Customer route is working");
});
router.post("/register", validate(RegisterDto), controller.registerCustomer);
router.post("/login", validate(LoginDto), controller.loginCustomer);
router.post("/logout", verifyAuth, verifyCustomer, controller.logoutCustomer);
router.post("/refresh-token", controller.refreshToken);
router.post("/forgot-password", controller.forgotPassword);
router.post("/reset-password", controller.resetPassword);
router.get("/notifications", verifyAuth, verifyCustomer, controller.fetchCustomerNotifications);
// IMPORTANT: static segment "read-all" must be registered BEFORE the parameterized
// "/:id/read" route, otherwise Express treats "read-all" as the value of :id.
router.patch("/notifications/read-all", verifyAuth, verifyCustomer, controller.markAllCustomerNotificationsRead);
router.patch("/notifications/:id/read", verifyAuth, verifyCustomer, controller.markCustomerNotificationRead);

export default router;