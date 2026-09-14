import Joi from "joi";
import BaseDto from "../../../common/dto/base.dto.js";

class RegisterDto extends BaseDto {
  static schema = Joi.object({
    username: Joi.string()
      .min(3)
      .max(50)
      .required(),

    email: Joi.string()
      .email()
      .lowercase()
      .required(),

    password: Joi.string()
      .min(8)
      .message("Password must contain 8 chars minimum")
      .required(),

    dob: Joi.date()
      .iso()
      .optional(),

    phNo: Joi.string()
      .pattern(/^[0-9+-\s()]*$/)
      .optional(),
  });
}

export default RegisterDto;