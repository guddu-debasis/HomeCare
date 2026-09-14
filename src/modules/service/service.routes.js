import express from "express";
import { addService, fetchServices, removeService } from "./service.controller.js";
import { verifyAuth, verifyAdmin } from "../../common/middlewares/auth.middleware.js";
import validate from "../../common/middlewares/validate.middleware.js";
import CreateServiceDto from "./dto/create-service.dto.js";

const router = express.Router();

// Public route to view all master services
router.get("/", fetchServices);

// Admin restricted routes to manage master services
router.post("/", verifyAuth, verifyAdmin, validate(CreateServiceDto), addService);
router.delete("/:id", verifyAuth, verifyAdmin, removeService);

export default router;