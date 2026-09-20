import Joi from "joi";
import BaseDto from "../../../common/dto/base.dto.js";
import { TIME_SLOT_LABELS } from "../../../common/constants/time-slots.js";

const MAX_ADVANCE_DAYS = 7;

// Runs at validate() time (every request), not at schema-definition time,
// so "today" here is always the actual current day — unlike Joi's built-in
// .min('now')/.max('now'), which compare full timestamps rather than
// calendar dates and would incorrectly reject a same-day booking made
// after midnight UTC. This mirrors the frontend's own date-only comparison
// (see Cart.jsx's todayStr/maxBookingDateStr).
const validateBookingWindow = (value, helpers) => {
  const toUtcDateOnly = (d) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());

  const todayMs = toUtcDateOnly(new Date());
  const requestedMs = toUtcDateOnly(value);
  const maxAllowedMs = todayMs + MAX_ADVANCE_DAYS * 24 * 60 * 60 * 1000;

  if (requestedMs < todayMs) {
    return helpers.error("date.pastBooking");
  }
  if (requestedMs > maxAllowedMs) {
    return helpers.error("date.tooFarAhead");
  }
  return value;
};

class CreateOrderDto extends BaseDto {
  static schema = Joi.object({
    bookingDate: Joi.date()
      .iso()
      .required()
      .custom(validateBookingWindow)
      .messages({
        "date.pastBooking": "Booking date cannot be in the past.",
        "date.tooFarAhead": `Booking date must be within the next ${MAX_ADVANCE_DAYS} days.`,
      }),
    timeSlot: Joi.string()
      .valid(...TIME_SLOT_LABELS)
      .required()
      .messages({
        "any.only": "Please select a valid time slot.",
      }),
  });
}

export default CreateOrderDto;