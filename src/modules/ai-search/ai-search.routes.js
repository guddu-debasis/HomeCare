import express from "express";
import { searchServices } from "./ai-search.controller.js";
import { verifyAuth, verifyCustomer } from "../../common/middlewares/auth.middleware.js";
import validate from "../../common/middlewares/validate.middleware.js";
import SearchQueryDto from "./dto/search-query.dto.js";

const router = express.Router();

// Customer-only: results feed directly into an "Add to cart" action, and
// the per-customer Redis rate limit in ai-search.service.js is keyed on a
// real account id.
router.post("/", verifyAuth, verifyCustomer, validate(SearchQueryDto), searchServices);

export default router;
