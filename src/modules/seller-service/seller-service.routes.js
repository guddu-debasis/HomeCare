import express from "express";
import { 
  addServiceToSeller, 
  fetchSellerServices, 
  removeServiceFromSeller 
} from "./sellerservice.controller.js";
import { verifyAuth, verifySeller } from "../../common/middlewares/auth.middleware.js";
import validate from "../../common/middlewares/validate.middleware.js";
import CreateSellerServiceDto from "./dto/create-seller-service.dto.js";

const router = express.Router();

// Public route to view services offered by a specific seller
router.get("/seller/:sellerId", fetchSellerServices);

// Protected seller routes to manage their own service offerings
router.post("/", verifyAuth, verifySeller, validate(CreateSellerServiceDto), addServiceToSeller);
router.delete("/:serviceId", verifyAuth, verifySeller, removeServiceFromSeller);

export default router;