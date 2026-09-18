import joi from "joi";
import BaseDto from "./base.dto.js";

class GithubAuthDto extends BaseDto {
  static schema = joi.object({
    code: joi.string().required(),
  });
}

export default GithubAuthDto;
