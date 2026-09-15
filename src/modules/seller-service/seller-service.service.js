import { db } from "../../common/config/db.js";
import { sellerService, service, seller } from "../../db/schema.js";
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
    // If the seller already offers this service, update their custom price and description
    const updatedCustomPrice =
      customPrice !== undefined
        ? (customPrice === null || customPrice === "" ? null : String(customPrice))
        : existingMapping.customPrice;

    const updatedDescription =
      description !== undefined
        ? (description === null || description === "" ? null : description)
        : existingMapping.description;

    const [updatedMapping] = await db
      .update(sellerService)
      .set({
        customPrice: updatedCustomPrice,
        description: updatedDescription,
      })
      .where(eq(sellerService.id, existingMapping.id))
      .returning();

    return updatedMapping;
  }

  // 3. Insert the mapping
  const [newMapping] = await db
    .insert(sellerService)
    .values({
      sellerId,
      serviceId,
      customPrice: customPrice ? String(customPrice) : null,
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

const updateSellerService = async ({ sellerId, serviceId, customPrice, description }) => {
  const numericServiceId = Number(serviceId);
  const [existingMapping] = await db
    .select()
    .from(sellerService)
    .where(and(eq(sellerService.sellerId, sellerId), eq(sellerService.serviceId, numericServiceId)))
    .limit(1);

  if (!existingMapping) {
    throw ApiError.notFound("Service assignment not found for this seller");
  }

  const updatedCustomPrice =
    customPrice !== undefined
      ? (customPrice === null || customPrice === "" ? null : String(customPrice))
      : existingMapping.customPrice;

  const updatedDescription =
    description !== undefined
      ? (description === null || description === "" ? null : description)
      : existingMapping.description;

  const [updatedMapping] = await db
    .update(sellerService)
    .set({
      customPrice: updatedCustomPrice,
      description: updatedDescription,
    })
    .where(eq(sellerService.id, existingMapping.id))
    .returning();

  return updatedMapping;
};

const getAllOfferings = async () => {
  return await db
    .select({
      id: sellerService.id,
      serviceId: service.id,
      serviceName: service.serviceName,
      basePrice: service.basePrice,
      customPrice: sellerService.customPrice,
      description: sellerService.description,
      sellerId: seller.id,
      sellerName: seller.username,
      sellerPhone: seller.phNo,
    })
    .from(sellerService)
    .innerJoin(service, eq(sellerService.serviceId, service.id))
    .innerJoin(seller, eq(sellerService.sellerId, seller.id));
};

const getProvidersByServiceId = async (serviceId) => {
  return await db
    .select({
      id: sellerService.id,
      serviceId: service.id,
      serviceName: service.serviceName,
      basePrice: service.basePrice,
      customPrice: sellerService.customPrice,
      description: sellerService.description,
      sellerId: seller.id,
      sellerName: seller.username,
      sellerPhone: seller.phNo,
    })
    .from(sellerService)
    .innerJoin(service, eq(sellerService.serviceId, service.id))
    .innerJoin(seller, eq(sellerService.sellerId, seller.id))
    .where(eq(sellerService.serviceId, Number(serviceId)));
};

export {
  addSellerService,
  getSellerServices,
  removeSellerService,
  updateSellerService,
  getAllOfferings,
  getProvidersByServiceId,
};