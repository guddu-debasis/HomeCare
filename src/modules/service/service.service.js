import { db } from "../../common/config/db.js";
import { service } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import ApiError from "../../common/utils/api-error.js";

const createService = async ({ serviceName, basePrice, description }) => {
  const [existingService] = await db
    .select()
    .from(service)
    .where(eq(service.serviceName, serviceName))
    .limit(1);

  if (existingService) {
    throw ApiError.conflict("Service with this name already exists");
  }

  const [newService] = await db
    .insert(service)
    .values({
      serviceName,
      basePrice: basePrice.toFixed(2),
      description: description || null,
    })
    .returning();

  return newService;
};

const getAllServices = async () => {
  return await db.select().from(service);
};

const deleteService = async (serviceId) => {
  const [targetService] = await db
    .select()
    .from(service)
    .where(eq(service.id, serviceId))
    .limit(1);

  if (!targetService) {
    throw ApiError.notFound("Service not found");
  }

  await db.delete(service).where(eq(service.id, serviceId));
  return { message: "Service deleted successfully" };
};

export { createService, getAllServices, deleteService };