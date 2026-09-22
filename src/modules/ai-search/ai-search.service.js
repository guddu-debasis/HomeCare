import { z } from "zod";
import { db } from "../../common/config/db.js";
import { sellerService, service, seller, ratings } from "../../db/schema.js";
import { eq, avg, count } from "drizzle-orm";
import { groqModel } from "../../common/config/groq.js";
import { redis } from "../../common/config/redis.js";
import ApiError from "../../common/utils/api-error.js";


const RATE_LIMIT = 20;
const RATE_WINDOW_SECONDS = 60 * 60; // 1 hour

const MAX_RESULTS = 5;


const rankingSchema = z.object({
  results: z
    .array(
      z.object({
        sellerServiceId: z
          .number()
          .describe("Must be the exact sellerServiceId of one of the candidates given — never invented"),
        reason: z
          .string()
          .max(160)
          .describe("One short sentence explaining why this fits the customer's request"),
      })
    )
    .max(MAX_RESULTS)
    .describe("Best-matching candidates from the given list, ordered best first. Empty array if nothing fits."),
});

const structuredModel = groqModel.withStructuredOutput(rankingSchema, {
  name: "return_ranked_services",
});

const enforceRateLimit = async (customerId) => {
  const key = `ai-search:${customerId}`;
  const attemptCount = await redis.incr(key);
  if (attemptCount === 1) {
    await redis.expire(key, RATE_WINDOW_SECONDS);
  }
  if (attemptCount > RATE_LIMIT) {
    throw ApiError.badRequest("You've hit the search limit for now — try again in a bit.");
  }
};

const getCandidates = async () => {
  const [listings, ratingStats] = await Promise.all([
    db
      .select({
        sellerServiceId: sellerService.id,
        serviceId: service.id,
        serviceName: service.serviceName,
        serviceDescription: service.description,
        basePrice: service.basePrice,
        customPrice: sellerService.customPrice,
        listingDescription: sellerService.description,
        sellerId: seller.id,
        sellerName: seller.username,
      })
      .from(sellerService)
      .innerJoin(service, eq(sellerService.serviceId, service.id))
      .innerJoin(seller, eq(sellerService.sellerId, seller.id)),
    db
      .select({
        sellerId: ratings.sellerId,
        avgRating: avg(ratings.ratingScore),
        ratingCount: count(ratings.id),
      })
      .from(ratings)
      .groupBy(ratings.sellerId),
  ]);

  const ratingBySeller = new Map(
    ratingStats.map((r) => [r.sellerId, { avgRating: Number(r.avgRating), ratingCount: r.ratingCount }])
  );

  return listings.map((listing) => {
    const stats = ratingBySeller.get(listing.sellerId) || { avgRating: 0, ratingCount: 0 };
    return {
      ...listing,
      price: Number(listing.customPrice ?? listing.basePrice),
      avgRating: stats.avgRating,
      ratingCount: stats.ratingCount,
    };
  });
};

const searchServices = async ({ customerId, query }) => {
  await enforceRateLimit(customerId);

  const candidates = await getCandidates();

  if (candidates.length === 0) {
    return { results: [], message: "No listings are available to search yet." };
  }


  const candidateSummaries = candidates.map((c) => ({
    sellerServiceId: c.sellerServiceId,
    service: c.serviceName,
    seller: c.sellerName,
    price: c.price,
    avgRating: c.avgRating,
    ratingCount: c.ratingCount,
    description: c.listingDescription || c.serviceDescription || "",
  }));

  const messages = [
    {
      role: "system",
      content:
        "You are a service-recommendation assistant for a home-services marketplace. " +
        "You are given a JSON array of real, currently available listings and a customer's request in their own words. " +
        `Pick up to ${MAX_RESULTS} listings that best match the request, ordered best first, weighing price, rating, and how well the description matches what they asked for. ` +
        "You must ONLY use sellerServiceId values that appear in the given list — never invent one. " +
        "If nothing in the list is a reasonable match, return an empty results array rather than forcing a bad match.",
    },
    {
      role: "user",
      content: `Customer request: "${query}"\n\nAvailable listings:\n${JSON.stringify(candidateSummaries)}`,
    },
  ];

  let structured;
  try {
    structured = await structuredModel.invoke(messages);
  } catch (err) {
    console.error("Groq AI search call failed:", err);
    throw ApiError.badRequest("AI search is temporarily unavailable — try browsing the catalog instead.");
  }


  const candidateById = new Map(candidates.map((c) => [c.sellerServiceId, c]));

  const results = (structured.results || [])
    .map((r) => {
      const candidate = candidateById.get(r.sellerServiceId);
      if (!candidate) return null; // hallucinated or stale id — discard, don't trust it
      return {
        sellerServiceId: candidate.sellerServiceId,
        serviceId: candidate.serviceId,
        serviceName: candidate.serviceName,
        sellerId: candidate.sellerId,
        sellerName: candidate.sellerName,
        price: candidate.price,
        avgRating: candidate.avgRating,
        ratingCount: candidate.ratingCount,
        reason: String(r.reason || "").slice(0, 200),
      };
    })
    .filter(Boolean)
    .slice(0, MAX_RESULTS);

  return { results };
};

export { searchServices };
