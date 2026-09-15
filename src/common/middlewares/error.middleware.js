import ApiError from "../utils/api-error.js";

// Centralized error handler. Every controller does next(error) — this is
// what actually turns ApiError (and anything else) into the JSON envelope
// the frontend's axios interceptor expects ({ success, message, errors }).
const errorHandler = (err, req, res, next) => {
  // Known, expected errors we raised ourselves
  if (err instanceof ApiError) {
    if (!err.isOperational) {
      console.error("Non-operational error:", err);
    }
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors || [],
    });
  }

  // Known JWT authentication errors
  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      message: "Access token has expired",
      errors: [],
    });
  }

  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      message: "Invalid access token",
      errors: [],
    });
  }

  // Anything unexpected (bugs, driver errors, etc.) — don't leak internals
  console.error("Unhandled error:", err);
  return res.status(500).json({
    success: false,
    message: "Internal server error",
    errors: [],
  });
};

export default errorHandler;
