import Joi from "joi";
import BaseDto from "../../../common/dto/base.dto.js"

class LoginDto extends BaseDto {
    static schema = Joi.object({
        email: Joi.string().email().lowercase().required(),
        password: Joi.string()
        .min(8)
        .message("Password must contain 8 chars minimum")
        .required()
    })
}

export default LoginDto