import { db } from "../../common/config/db.js";
import { service, seller, sellerService } from "../../db/schema.js";
import { eq, inArray } from "drizzle-orm";
import ApiError from "../../common/utils/api-error.js";
import { redis } from "../../common/config/redis.js";

// The live cart lives entirely in a Redis hash — one hash per customer,
// one field per (serviceId, sellerId) line, value = quantity. Nothing
// touches Postgres between "add to cart" and checkout.
//
// IMPORTANT: Upstash's Redis client talks REST, not a persistent TCP
// connection — every command is its own HTTPS round trip. That means
// issuing commands one at a time with sequential `await`s is slow in a way
// normal Redis isn't; the fix is `redis.pipeline()`, which batches
// independent commands into a single HTTP request. Every function below
// pipelines whatever it can and only falls back to a second round trip
// when a later command genuinely depends on an earlier result.

const CART_TTL = 60 * 60 * 24 * 30; // 30 days — abandoned carts expire instead of living forever

const cartKey = (customerId) => `cart:customer:${customerId}`;
const fieldKey = (serviceId, sellerId) => `${serviceId}:${sellerId}`;
const parseField = (field) => {
  const [serviceId, sellerId] = field.split(":").map(Number);
  return { serviceId, sellerId };
};

const addToCart = async ({ customerId, serviceId, sellerId, quantity = 1 }) => {
  const key = cartKey(customerId);
  const field = fieldKey(serviceId, sellerId);

  // One round trip: increment and refresh the TTL together. HINCRBY on a
  // missing field creates it starting from 0, so newQuantity === quantity
  // reliably means this field didn't exist a moment ago (fields are always
  // HDEL'd on reaching 0 elsewhere in this file, so a stored 0 never lingers).
  const pipeline = redis.pipeline();
  pipeline.hincrby(key, field, quantity);
  pipeline.expire(key, CART_TTL);
  const [newQuantity] = await pipeline.exec();

  const isNewLine = newQuantity === quantity;

  if (isNewLine) {
    // Validate in parallel (one round trip total, not two) rather than
    // before incrementing — the common case (an already-valid pair) never
    // pays for this at all after the first add.
    const [[svc], [sel]] = await Promise.all([
      db.select({ id: service.id }).from(service).where(eq(service.id, serviceId)).limit(1),
      db.select({ id: seller.id }).from(seller).where(eq(seller.id, sellerId)).limit(1),
    ]);

    if (!svc || !sel) {
      // Roll back the optimistic increment — never leave a bad line in
      // someone's cart just because we checked after writing instead of
      // before.
      await redis.hdel(key, field);
      if (!svc) throw ApiError.notFound("Service not found");
      throw ApiError.notFound("Seller not found");
    }
  }

  return { serviceId, sellerId, quantity: newQuantity };
};

// Hot path for the quantity +/- stepper. Pure Redis — no DB read or write
// at all, so rapid clicks never hit Postgres. Pipelined: one round trip in
// the common case, two only when the item is being removed at quantity 0.
const incrementCartItem = async ({ customerId, serviceId, sellerId, delta }) => {
  const key = cartKey(customerId);
  const field = fieldKey(serviceId, sellerId);

  const pipeline = redis.pipeline();
  pipeline.hincrby(key, field, delta);
  pipeline.expire(key, CART_TTL);
  const [newQuantity] = await pipeline.exec();

  if (newQuantity <= 0) {
    await redis.hdel(key, field);
    return { serviceId, sellerId, quantity: 0 };
  }

  return { serviceId, sellerId, quantity: newQuantity };
};

// Raw (serviceId, sellerId, quantity) triples with no Postgres enrichment —
// what checkout needs internally.
const getCartEntries = async (customerId) => {
  const raw = await redis.hgetall(cartKey(customerId));
  if (!raw) return [];
  return Object.entries(raw).map(([field, qty]) => ({
    ...parseField(field),
    quantity: Number(qty),
  }));
};

// Enriched cart for display — one batched Postgres query (not one per
// line) to attach service name, base price, and any seller-custom price.
const getCartItems = async (customerId) => {
  const entries = await getCartEntries(customerId);
  if (entries.length === 0) return [];

  const serviceIds = [...new Set(entries.map((e) => e.serviceId))];
  const sellerIds = [...new Set(entries.map((e) => e.sellerId))];

  const [services, sellers, sellerServices] = await Promise.all([
    db.select().from(service).where(inArray(service.id, serviceIds)),
    db.select().from(seller).where(inArray(seller.id, sellerIds)),
    db.select().from(sellerService).where(inArray(sellerService.sellerId, sellerIds)),
  ]);

  const serviceById = new Map(services.map((s) => [s.id, s]));
  const sellerById = new Map(sellers.map((s) => [s.id, s]));
  const customPriceByPair = new Map(
    sellerServices.map((ss) => [fieldKey(ss.serviceId, ss.sellerId), ss.customPrice])
  );

  return entries
    .map(({ serviceId, sellerId, quantity }) => {
      const svc = serviceById.get(serviceId);
      const sel = sellerById.get(sellerId);
      if (!svc || !sel) return null; // service/seller deleted since it was added — drop silently

      const customPrice = customPriceByPair.get(fieldKey(serviceId, sellerId)) ?? null;
      return {
        id: fieldKey(serviceId, sellerId),
        serviceId,
        serviceName: svc.serviceName,
        basePrice: svc.basePrice,
        customPrice,
        sellerId,
        sellerName: sel.username,
        quantity,
        price: customPrice ?? svc.basePrice,
      };
    })
    .filter(Boolean);
};

const removeFromCart = async ({ customerId, serviceId, sellerId }) => {
  // Already a single round trip — this is as fast as this operation gets.
  // If deletes are still slow, the bottleneck is network latency to your
  // Upstash region rather than anything pipelining can fix.
  const removed = await redis.hdel(cartKey(customerId), fieldKey(serviceId, sellerId));
  if (!removed) {
    throw ApiError.notFound("Cart item not found");
  }
  return { message: "Item removed from cart successfully" };
};

// Cheap count for UI chrome (navbar badge, etc). HLEN is O(1) in Redis and
// needs zero Postgres enrichment — callers that just need "how many lines
// are in the cart" (not the enriched items) should use this instead of
// getCartItems, which does a Redis read plus three joined Postgres queries.
const getCartCount = async (customerId) => {
  return await redis.hlen(cartKey(customerId));
};

const clearCart = async (customerId) => {
  await redis.del(cartKey(customerId));
};

export { addToCart, incrementCartItem, getCartItems, getCartEntries, getCartCount, removeFromCart, clearCart };
