import { Router } from "express";
import validate from "../../common/middlewares/validate.middleware.js";
import controller from "./customer.controller.js";
import RegisterDto from "./dto/register.dto.js";

const router=Router();


router.post("/register", validate(RegisterDto), controller.registerCustomer);
router.post("/login", validate(LoginDto), controller.loginCustomer);
router.post("/logout", controller.logoutCustomer);
router.post("/refresh-token", controller.refreshToken);
router.post("/forgot-password", controller.resetPassword);

export default router;