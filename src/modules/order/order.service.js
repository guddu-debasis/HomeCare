import { db } from "../../common/config/db.js";
import { orderBooking, orderItems, cartItems, service, sellerService } from "../../db/schema.js";
import { eq, and } from "drizzle-orm";
import ApiError from "../../common/utils/api-error.js";

const createOrder = async ({ customerId, bookingDate }) => {
  // 1. Fetch items from the customer's cart with prices
  const itemsInCart = await db
    .select({
      serviceId: cartItems.serviceId,
      sellerId: cartItems.sellerId,
      quantity: cartItems.quantity,
      basePrice: service.basePrice,
      customPrice: sellerService.customPrice,
    })
    .from(cartItems)
    .innerJoin(service, eq(cartItems.serviceId, service.id))
    .leftJoin(
      sellerService,
      and(
        eq(sellerService.sellerId, cartItems.sellerId),
        eq(sellerService.serviceId, cartItems.serviceId)
      )
    )
    .where(eq(cartItems.customerId, customerId));

  if (!itemsInCart || itemsInCart.length === 0) {
    throw ApiError.badRequest("Cart is empty. Cannot create an order.");
  }

  // 2. Calculate total amount and prepare order items data
  let totalAmount = 0;
  const processedItems = itemsInCart.map((item) => {
    const price = Number(item.customPrice ?? item.basePrice);
    const itemTotal = price * item.quantity;
    totalAmount += itemTotal;

    return {
      serviceId: item.serviceId,
      sellerId: item.sellerId,
      quantity: item.quantity,
      price: price.toFixed(2),
    };
  });

  // 3. Execute Transaction to create order, order items, and clear cart
  const newOrder = await db.transaction(async (tx) => {
    // Insert into orderBooking
    const [booking] = await tx
      .insert(orderBooking)
      .values({
        customerId,
        totalAmount: totalAmount.toFixed(2),
        paymentStatus: "pending",
        status: "pending",
        bookingDate,
      })
      .returning();

    // Insert corresponding order items
    const orderItemsValues = processedItems.map((item) => ({
      orderId: booking.id,
      ...item,
    }));

    await tx.insert(orderItems).values(orderItemsValues);

    // Clear the customer's cart
    await tx.delete(cartItems).where(eq(cartItems.customerId, customerId));

    return booking;
  });

  return newOrder;
};

const getCustomerOrders = async (customerId) => {
  return await db
    .select()
    .from(orderBooking)
    .where(eq(orderBooking.customerId, customerId));
};

const getOrderById = async (orderId, customerId) => {
  const [order] = await db
    .select()
    .from(orderBooking)
    .where(and(eq(orderBooking.id, orderId), eq(orderBooking.customerId, customerId)))
    .limit(1);

  if (!order) {
    throw ApiError.notFound("Order not found");
  }

  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  return { ...order, items };
};

export { createOrder, getCustomerOrders, getOrderById };