import Joi from "joi";
import BaseDto from "../../../common/dto/base.dto.js";

class VerifySellerServiceDto extends BaseDto {
  static schema = Joi.object({
    status: Joi.string().valid("approved", "rejected").required(),
    // Required when rejecting — an unexplained rejection leaves the seller
    // with nothing to act on. Not needed (and cleared) when approving.
    rejectionReason: Joi.string().max(500).when("status", {
      is: "rejected",
      then: Joi.required(),
      otherwise: Joi.optional().allow(null, ""),
    }),
  });
}

export default VerifySellerServiceDto;
