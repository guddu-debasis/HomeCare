import Joi from "joi";
import BaseDto from "../../../common/dto/base.dto.js";

class CreateSellerServiceDto extends BaseDto {
  static schema = Joi.object({
    serviceId: Joi.number().integer().required(),
    // min(1) ensures custom price is at least ₹1.00 — the Razorpay minimum.
    // .positive() is intentionally omitted: .min(1) already implies > 0.
    customPrice: Joi.number().precision(2).min(1).optional().allow(null, ""),
    description: Joi.string().max(1000).optional().allow("", null),
  });
}

export default CreateSellerServiceDto;