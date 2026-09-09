import joi from "joi";
import BaseDto from "../../../common/dto/base.dto.js"

class RegisterDto extends BaseDto {
    static schema = joi.object({
        name: joi.string().alphanum().min(3).max(30).required(),
        email: joi.string().email().lowercase().required(),
        password: joi.string()
        .min(8)
        .message("Password must contain 8 chars minimum")
        .required(),
        role: joi.string().valid("babycare","housekeeping","cooking","eldercare","tutoring").required(),
        dateOfBirth: joi.date().iso().required()
    })
}

export default RegisterDto