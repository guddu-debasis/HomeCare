import joi from "joi";
import BaseDto from "./base.dto.js";

class GoogleAuthDto extends BaseDto {
  static schema = joi.object({
    idToken: joi.string().required(),
  });
}

export default GoogleAuthDto;
