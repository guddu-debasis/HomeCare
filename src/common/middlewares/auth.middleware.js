import ApiError from "../utils/api-error.js";
import { verifyAccessToken } from "../utils/jwt.utils.js";

const verifyAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw ApiError.unauthorized("Access token missing or malformed");
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyAccessToken(token);

    req.user = decoded; // Contains { id, role }
    next();
  } catch (error) {
    next(error);
  }
};

const verifyAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return next(ApiError.forbidden("Access denied. Admin privileges required."));
  }
  next();
};

const verifySeller = (req, res, next) => {
  if (!req.user || req.user.role !== "seller") {
    return next(ApiError.forbidden("Access denied. Seller privileges required."));
  }
  next();
};

const verifyCustomer = (req, res, next) => {
  if (!req.user || req.user.role !== "customer") {
    return next(ApiError.forbidden("Access denied. Customer privileges required."));
  }
  next();
};

export { verifyAuth, verifyAdmin, verifySeller, verifyCustomer };