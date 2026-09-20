// Single source of truth for the fixed set of booking time slots — must
// stay in sync with the <select> options in Cart.jsx on the frontend.
// startHour is used by seller.service.js#updateBookingStatus to compute
// the earliest moment a booking can be marked "completed".
const TIME_SLOTS = {
  "Morning (08:00 - 12:00)": { startHour: 8 },
  "Afternoon (12:00 - 16:00)": { startHour: 12 },
  "Evening (16:00 - 20:00)": { startHour: 16 },
};

const TIME_SLOT_LABELS = Object.keys(TIME_SLOTS);

export { TIME_SLOTS, TIME_SLOT_LABELS };
