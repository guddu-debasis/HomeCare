import { db } from "../../common/config/db.js";
import { sellerService, service } from "../../db/schema.js";
import { eq, and } from "drizzle-orm";
import ApiError from "../../common/utils/api-error.js";

const addSellerService = async ({ sellerId, serviceId, customPrice, description }) => {
  // 1. Verify that the master service exists
  const [masterService] = await db
    .select()
    .from(service)
    .where(eq(service.id, serviceId))
    .limit(1);

  if (!masterService) {
    throw ApiError.notFound("Master service not found");
  }

  // 2. Check if the seller already offers this service
  const [existingMapping] = await db
    .select()
    .from(sellerService)
    .where(and(eq(sellerService.sellerId, sellerId), eq(sellerService.serviceId, serviceId)))
    .limit(1);

  if (existingMapping) {
    throw ApiError.conflict("You already offer this service");
  }

  // 3. Insert the mapping
  const [newMapping] = await db
    .insert(sellerService)
    .values({
      sellerId,
      serviceId,
      customPrice: customPrice || null,
      description: description || null,
    })
    .returning();

  return newMapping;
};

const getSellerServices = async (sellerId) => {
  return await db
    .select({
      id: sellerService.id,
      serviceId: service.id,
      serviceName: service.serviceName,
      basePrice: service.basePrice,
      customPrice: sellerService.customPrice,
      description: sellerService.description,
    })
    .from(sellerService)
    .innerJoin(service, eq(sellerService.serviceId, service.id))
    .where(eq(sellerService.sellerId, sellerId));
};

const removeSellerService = async (sellerId, serviceId) => {
  const [mapping] = await db
    .select()
    .from(sellerService)
    .where(and(eq(sellerService.sellerId, sellerId), eq(sellerService.serviceId, serviceId)))
    .limit(1);

  if (!mapping) {
    throw ApiError.notFound("Service assignment not found for this seller");
  }

  await db
    .delete(sellerService)
    .where(and(eq(sellerService.sellerId, sellerId), eq(sellerService.serviceId, serviceId)));

  return { message: "Service removed from seller profile successfully" };
};

export { addSellerService, getSellerServices, removeSellerService };