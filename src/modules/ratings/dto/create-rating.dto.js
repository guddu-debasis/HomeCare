import Joi from "joi";
import BaseDto from "../../../common/dto/base.dto.js";

class CreateRatingDto extends BaseDto {
  static schema = Joi.object({
    bookingId: Joi.number().integer().required(),
    sellerId: Joi.number().integer().required(),
    ratingScore: Joi.number().integer().min(1).max(5).required(),
    comment: Joi.string().max(500).optional().allow("", null),
  });
}

export default CreateRatingDto;