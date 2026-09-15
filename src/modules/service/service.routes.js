import express from "express";
import { addService, fetchServices, removeService } from "./service.controller.js";
import { verifyAuth, verifyAdmin, verifyAdminOrSeller } from "../../common/middlewares/auth.middleware.js";
import validate from "../../common/middlewares/validate.middleware.js";
import CreateServiceDto from "./dto/create-service.dto.js";

const router = express.Router();

// Public route to view all master services
router.get("/", fetchServices);

// Admin or Seller route to add new services to catalog
router.post("/", verifyAuth, verifyAdminOrSeller, validate(CreateServiceDto), addService);
router.delete("/:id", verifyAuth, verifyAdmin, removeService);

export default router;