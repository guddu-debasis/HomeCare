import joi from "joi";
import BaseDto from "../../../common/dto/base.dto.js"

class RegisterDto extends BaseDto {
    static schema = joi.object({
        username: joi.string().alphanum().min(3).max(30).required(),
        email: joi.string().email().lowercase().required(),
        password: joi.string()
        .min(8)
        .message("Password must contain 8 chars minimum")
        .required(),
        dob: joi.date().iso().required(),
        phNo: joi.string()
        .pattern(/^[0-9+-\s()]*$/)
        .optional()
    })
}

export default RegisterDto
