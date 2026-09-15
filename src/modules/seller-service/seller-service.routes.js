import express from "express";
import { 
  addServiceToSeller, 
  fetchSellerServices, 
  removeServiceFromSeller,
  updateServiceForSeller,
  fetchAllSellerServices,
  fetchProvidersByService,
} from "./seller-service.controller.js";
import { verifyAuth, verifySeller } from "../../common/middlewares/auth.middleware.js";
import validate from "../../common/middlewares/validate.middleware.js";
import CreateSellerServiceDto from "./dto/create-seller-service.dto.js";

const router = express.Router();

// Public routes
router.get("/", fetchAllSellerServices);
router.get("/service/:serviceId", fetchProvidersByService);
router.get("/seller/:sellerId", fetchSellerServices);

// Protected seller routes to manage their own service offerings
router.post("/", verifyAuth, verifySeller, validate(CreateSellerServiceDto), addServiceToSeller);
router.patch("/:serviceId", verifyAuth, verifySeller, updateServiceForSeller);
router.put("/:serviceId", verifyAuth, verifySeller, updateServiceForSeller);
router.delete("/:serviceId", verifyAuth, verifySeller, removeServiceFromSeller);

export default router;