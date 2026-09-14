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
router.post("/forgot-password", controller.resetPassword);

export default router;