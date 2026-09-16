import { Router } from "express";
import validate from "../../common/middlewares/validate.middleware.js";
import  controller from "./admin.controller.js";
import  RegisterDto from "./dto/register.dto.js";
import  LoginDto from "./dto/login.dto.js";
import { verifyAuth, verifyAdmin } from "../../common/middlewares/auth.middleware.js";

const router=Router();

// Admin registration is otherwise a fully open endpoint — anyone who finds
// it could create an admin account. Require a shared secret (set
// ADMIN_SETUP_SECRET in .env) sent as the x-setup-secret header.
const requireSetupSecret = (req, res, next) => {
    const provided = req.headers["x-setup-secret"];
    if (!process.env.ADMIN_SETUP_SECRET || provided !== process.env.ADMIN_SETUP_SECRET) {
        return res.status(403).json({ success: false, message: "Admin registration is restricted." });
    }
    next();
};

router.get("/",(req,res)=>{
    res.send("Admin route is working");
});
router.post("/register", requireSetupSecret, validate(RegisterDto), controller.registerAdmin);
router.post("/login", validate(LoginDto), controller.loginAdmin);
router.post("/logout", verifyAuth, verifyAdmin, controller.logoutAdmin);
router.post("/refresh-token", controller.refreshToken);
router.post("/forgot-password", controller.adminForgotPassword);
router.post("/reset-password", controller.adminResetPassword);

export default router;