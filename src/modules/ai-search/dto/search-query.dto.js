import Joi from "joi";
import BaseDto from "../../../common/dto/base.dto.js";

class SearchQueryDto extends BaseDto {
  static schema = Joi.object({
    query: Joi.string().trim().min(3).max(300).required(),
  });
}

export default SearchQueryDto;
