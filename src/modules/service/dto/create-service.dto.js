import Joi from "joi";
import BaseDto from "../../../common/dto/base.dto.js";

class CreateServiceDto extends BaseDto {
  static schema = Joi.object({
    serviceName: Joi.string().min(2).max(100).required(),
    basePrice: Joi.number().precision(2).positive().required(),
    description: Joi.string().max(500).optional().allow("", null),
  });
}

export default CreateServiceDto;