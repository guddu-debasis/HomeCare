import { Router } from "express";
import validate from "../../common/middlewares/validate.middleware.js";
import controller from "./admin.controller.js";

const router=Router();


router.post("/register", validate(RegisterDto), controller.registerAdmin);
router.post("/login", validate(LoginDto), controller.loginAdmin);

export default router;