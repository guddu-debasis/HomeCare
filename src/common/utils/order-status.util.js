// A combined order can contain items from multiple sellers. Each seller
// only ever changes the status of their own Order_Items row (see
// seller.service.js#updateBookingStatus) — the parent Order/Booking.status
// is always a *derived rollup* of every item's status, never written to
// directly by a single seller's accept/decline action. That separation is
// what stops one seller declining their line from cancelling the whole
// order for every other seller (and the customer).
const deriveOverallOrderStatus = (itemStatuses) => {
  if (!itemStatuses || itemStatuses.length === 0) return "pending";

  if (itemStatuses.every((s) => s === "cancelled")) return "cancelled";

  // Ignore cancelled lines when judging overall progress — an order with
  // one declined item and two accepted ones is moving forward, not stuck.
  const active = itemStatuses.filter((s) => s !== "cancelled");

  if (active.every((s) => s === "completed")) return "completed";
  if (active.every((s) => s === "accepted" || s === "completed")) return "accepted";
  return "pending";
};

export { deriveOverallOrderStatus };
