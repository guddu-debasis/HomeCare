import Joi from "joi";
import BaseDto from "../../../common/dto/base.dto.js";

class CreateOrderDto extends BaseDto {
  static schema = Joi.object({
    bookingDate: Joi.date().iso().required(),
  });
}

export default CreateOrderDto;