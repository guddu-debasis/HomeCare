class ApiError extends Error {
    constructor(statusCode, message, errors = [], stack = "") {
        super(message);
        this.statusCode = statusCode;
        this.errors = errors; // Holds validation arrays or details
        this.isOperational = true; // Identifies expected vs runtime errors

        if (stack) {
            this.stack = stack;
        } else {
            Error.captureStackTrace(this, this.constructor);
        }
    }

    // 400 Bad Request
    static badRequest(message = "Bad request", errors = []) {
        return new ApiError(400, message, errors);
    }
    

    // 401 Unauthorized
    static unauthorized(message = "Unauthorized") {
        return new ApiError(401, message);
    }

    // 403 Forbidden
    static forbidden(message = "Forbidden") {
        return new ApiError(403, message);
    }

    // 404 Not Found
    static notFound(message = "Resource not found") {
        return new ApiError(404, message);
    }

    // 409 Conflict
    static conflict(message = "Conflict") {
        return new ApiError(409, message);
    }

    // 422 Unprocessable Entity (Great for validation libraries like Joi/Zod)
    static validation(errors = [], message = "Validation failed") {
        return new ApiError(422, message, errors);
    }

    // 429 Too Many Requests (Rate Limiting)
    static tooManyRequests(message = "Too many requests, please try again later") {
        return new ApiError(429, message);
    }

    // 500 Internal Server Error
    static internal(message = "Internal server error") {
        const error = new ApiError(500, message);
        error.isOperational = false; // System crashes are not operational errors
        return error;
    }
}

export default ApiError;
