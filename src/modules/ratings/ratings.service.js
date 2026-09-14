import { db } from "../../common/config/db.js";
import { ratings, orderBooking } from "../../db/schema.js";
import { eq, and } from "drizzle-orm";
import ApiError from "../../common/utils/api-error.js";

const createRating = async ({ customerId, bookingId, sellerId, ratingScore, comment }) => {
  // 1. Verify that the booking exists and belongs to the customer
  const [booking] = await db
    .select()
    .from(orderBooking)
    .where(and(eq(orderBooking.id, bookingId), eq(orderBooking.customerId, customerId)))
    .limit(1);

  if (!booking) {
    throw ApiError.notFound("Booking not found or unauthorized");
  }

  // 2. Check if a rating already exists for this booking
  const [existingRating] = await db
    .select()
    .from(ratings)
    .where(eq(ratings.bookingId, bookingId))
    .limit(1);

  if (existingRating) {
    throw ApiError.conflict("You have already rated this booking");
  }

  // 3. Insert new rating
  const [newRating] = await db
    .insert(ratings)
    .values({
      customerId,
      bookingId,
      sellerId,
      ratingScore,
      comment: comment || null,
    })
    .returning();

  return newRating;
};

const getSellerRatings = async (sellerId) => {
  return await db
    .select()
    .from(ratings)
    .where(eq(ratings.sellerId, sellerId));
};

export { createRating, getSellerRatings };