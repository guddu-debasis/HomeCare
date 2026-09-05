import joi from "joi";
import BaseDto from "../../../common/dto/base.dto.js"

class LoginDto extends BaseDto {
    static schema = joi.object({
        email: joi.string().email().lowercase().required(),
        password: joi.string()
        .message("Password must contain 8 chars minimum")
        .min(8).required(),
        role: joi.string().valid("customer").required()
    })
}

export default LoginDto