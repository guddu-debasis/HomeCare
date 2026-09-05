import Router from "express";
import validate from "../../middleware/validate.middleware.js";
import * as controller from "./seller.controller.js";
import RegisterDto from "./dto/register.dto.js";
import LoginDto from "./dto/login.dto.js";

const router = Router();

router.post("/register",validate(RegisterDto),controller.registerSeller);
router.post("/login",validate(LoginDto),controller.loginSeller);

export default router;