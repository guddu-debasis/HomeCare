import joi from "joi";
import BaseDto from "../../../common/dto/base.dto.js"

class LoginDto extends BaseDto {
    static schema = joi.object({
        email: joi.string().email().lowercase().required(),
        password: joi.string()
        .min(8)
        .message("Password must contain 8 chars minimum")
        .required()
    })
}

export default LoginDto