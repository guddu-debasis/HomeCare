import Joi from "joi";
import BaseDto from "../../../common/dto/base.dto.js";

class AddCartDto extends BaseDto {
  static schema = Joi.object({
    serviceId: Joi.number().integer().required(),
    sellerId: Joi.number().integer().required(),
    quantity: Joi.number().integer().min(1).default(1),
  });
}

export default AddCartDto;