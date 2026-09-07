import Joi from "joi";
import BaseDto from "../../../common/dto/base.dto.js";

class RegisterDto extends BaseDto {

  static schema = Joi.object({

    name: Joi.string()
      .alphanum()
      .min(3)
      .max(30)
      .required(),

    email: Joi.string()
      .email()
      .lowercase()
      .required(),

    password: Joi.string()
      .min(8)
      .message("Password must contain 8 chars minimum")
      .required(),

    dateOfBirth: Joi.date()
      .iso()
      .required(),

  });

}

export default RegisterDto;