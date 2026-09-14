import { Router } from "express";
import validate from "../../common/middlewares/validate.middleware.js";
import  controller from "./admin.controller.js";
import  RegisterDto from "./dto/register.dto.js";
import  LoginDto from "./dto/login.dto.js";
import { verifyAuth, verifyAdmin } from "../../common/middlewares/auth.middleware.js";

const router=Router();

router.get("/",(req,res)=>{
    res.send("Admin route is working");
});
router.post("/register", validate(RegisterDto), controller.registerAdmin);
router.post("/login", validate(LoginDto), controller.loginAdmin);
router.post("/logout", verifyAuth, verifyAdmin, controller.logoutAdmin);
router.post("/refresh-token", controller.refreshToken);
router.post("/forgot-password", controller.adminForgotPassword);

export default router;