import { Router } from "express";
import validate from "../../common/middlewares/validate.middleware.js";
import controller from "./admin.controller.js";
import  RegisterDto from "./dto/register.dto.js";
import  LoginDto from "./dto/login.dto.js";

const router=Router();

router.get("/",(req,res)=>{
    res.send("Admin route is working");
});
router.post("/register", validate(RegisterDto), controller.registerAdmin);
router.post("/login", validate(LoginDto), controller.loginAdmin);

export default router;