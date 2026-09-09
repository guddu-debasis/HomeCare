import Router from "express";
import validate from "../../common/middlewares/validate.middleware.js";
import * as controller from "./seller.controller.js";
import RegisterDto from "./dto/register.dto.js";
import LoginDto from "./dto/login.dto.js";

const router = Router();

router.get("/",(req,res)=>{
    res.send("Seller route is working");
});
router.post("/register", validate(RegisterDto), controller.registerSeller);
router.post("/login", validate(LoginDto), controller.loginSeller);
router.post("/logout", controller.logoutSeller);
router.post("/refresh-token", controller.refreshToken);
router.post("/forgot-password", controller.forgotPassword);

export default router;