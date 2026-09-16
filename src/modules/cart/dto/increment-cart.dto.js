import Joi from "joi";
import BaseDto from "../../../common/dto/base.dto.js";

class IncrementCartDto extends BaseDto {
  static schema = Joi.object({
    serviceId: Joi.number().integer().required(),
    sellerId: Joi.number().integer().required(),
    // Positive to increment, negative to decrement — never 0 (that's a no-op).
    delta: Joi.number().integer().invalid(0).required(),
  });
}

export default IncrementCartDto;
