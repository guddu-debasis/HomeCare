import Joi from "joi";
import BaseDto from "../../../common/dto/base.dto.js";

class CreateSellerServiceDto extends BaseDto {
  static schema = Joi.object({
    serviceId: Joi.number().integer().required(),
    customPrice: Joi.number().precision(2).positive().optional().allow(null, ""),
    description: Joi.string().max(1000).optional().allow("", null),
  });
}

export default CreateSellerServiceDto;