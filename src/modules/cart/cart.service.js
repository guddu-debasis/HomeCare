import { db } from "../../common/config/db.js";
import { cartItems, service, seller, sellerService } from "../../db/schema.js";
import { eq, and } from "drizzle-orm";
import ApiError from "../../common/utils/api-error.js";

const addToCart = async ({ customerId, serviceId, sellerId, quantity = 1 }) => {
  const [existingItem] = await db
    .select()
    .from(cartItems)
    .where(
      and(
        eq(cartItems.customerId, customerId),
        eq(cartItems.serviceId, serviceId),
        eq(cartItems.sellerId, sellerId)
      )
    )
    .limit(1);

  if (existingItem) {
    const [updatedItem] = await db
      .update(cartItems)
      .set({ quantity: existingItem.quantity + quantity })
      .where(eq(cartItems.id, existingItem.id))
      .returning();
    return updatedItem;
  }

  const [newItem] = await db
    .insert(cartItems)
    .values({
      customerId,
      serviceId,
      sellerId,
      quantity,
    })
    .returning();

  return newItem;
};

const getCartItems = async (customerId) => {
  const rows = await db
    .select({
      id: cartItems.id,
      quantity: cartItems.quantity,
      serviceId: service.id,
      serviceName: service.serviceName,
      basePrice: service.basePrice,
      customPrice: sellerService.customPrice,
      sellerId: seller.id,
      sellerName: seller.username,
    })
    .from(cartItems)
    .innerJoin(service, eq(cartItems.serviceId, service.id))
    .innerJoin(seller, eq(cartItems.sellerId, seller.id))
    .leftJoin(
      sellerService,
      and(
        eq(sellerService.sellerId, cartItems.sellerId),
        eq(sellerService.serviceId, cartItems.serviceId)
      )
    )
    .where(eq(cartItems.customerId, customerId));

  // Surface the effective per-unit price (seller's custom rate if they've set
  // one, otherwise the catalog base price) as `price`, matching what
  // order.service.js actually charges at checkout so the cart total the
  // customer sees isn't misleading.
  return rows.map((row) => ({
    ...row,
    price: row.customPrice ?? row.basePrice,
  }));
};

const removeFromCart = async (cartItemId, customerId) => {
  const [item] = await db
    .select()
    .from(cartItems)
    .where(and(eq(cartItems.id, cartItemId), eq(cartItems.customerId, customerId)))
    .limit(1);

  if (!item) {
    throw ApiError.notFound("Cart item not found");
  }

  await db.delete(cartItems).where(eq(cartItems.id, cartItemId));
  return { message: "Item removed from cart successfully" };
};

export { addToCart, getCartItems, removeFromCart };