import { db } from "../../common/config/db.js";
import { cartItems, service, seller } from "../../db/schema.js";
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
  return await db
    .select({
      cartId: cartItems.id,
      quantity: cartItems.quantity,
      serviceId: service.id,
      serviceName: service.serviceName,
      basePrice: service.basePrice,
      sellerId: seller.id,
      sellerName: seller.username,
    })
    .from(cartItems)
    .innerJoin(service, eq(cartItems.serviceId, service.id))
    .innerJoin(seller, eq(cartItems.sellerId, seller.id))
    .where(eq(cartItems.customerId, customerId));
};

const removeFromCart = async (cartItemId, customerId) => {
  const [item] = await db
    .select()
    .from(cartItems)
    .where(and(eq(cartItems.id, cartItemId), eq(cartItems.customerId, customerId)))
    .limit(1);

  if (!item) {
    throw ApiError.notfound("Cart item not found");
  }

  await db.delete(cartItems).where(eq(cartItems.id, cartItemId));
  return { message: "Item removed from cart successfully" };
};

export { addToCart, getCartItems, removeFromCart };