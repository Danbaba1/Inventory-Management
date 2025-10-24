// ============================================================
// ERROR HANDLING MIDDLEWARE & UTILITIES
// ============================================================

/**
 * Custom API Error Class
 * Provides structured error handling with HTTP status codes
 */
class ApiError extends Error {
  constructor(statusCode, message, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error Response Factory
 * Creates consistent error response structures
 */
class ErrorResponse {
  static badRequest(message, errors = null) {
    return new ApiError(400, message, errors);
  }

  static unauthorized(message = "Unauthorized access") {
    return new ApiError(401, message);
  }

  static forbidden(message = "Access forbidden") {
    return new ApiError(403, message);
  }

  static notFound(message = "Resource not found") {
    return new ApiError(404, message);
  }

  static conflict(message = "Resource conflict") {
    return new ApiError(409, message);
  }

  static unprocessable(message, errors = null) {
    return new ApiError(422, message, errors);
  }

  static tooManyRequests(message = "Too many requests") {
    return new ApiError(429, message);
  }

  static internal(message = "Internal server error") {
    return new ApiError(500, message);
  }

  static serviceUnavailable(message = "Service temporarily unavailable") {
    return new ApiError(503, message);
  }
}

/**
 * Global Error Handler Middleware
 * Catches all errors and formats them consistently
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error for debugging (in production, use proper logging service)
  if (process.env.NODE_ENV === "development") {
    console.error("Error:", err);
  }

  // Mongoose/Supabase duplicate key error
  if (err.code === "23505" || err.code === 11000) {
    const message = "Duplicate field value entered";
    error = new ApiError(409, message);
  }

  // Mongoose/Supabase validation error
  if (err.name === "ValidationError" || err.code === "23502") {
    const message = "Validation failed";
    const errors = Object.values(err.errors || {}).map((e) => e.message);
    error = new ApiError(400, message, errors);
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    error = new ApiError(401, "Invalid authentication token");
  }

  if (err.name === "TokenExpiredError") {
    error = new ApiError(401, "Authentication token expired");
  }

  // Default to 500 server error
  const statusCode = error.statusCode || 500;
  const message = error.message || "Internal Server Error";

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(error.errors && { errors: error.errors }),
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    },
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
  });
};

/**
 * Async Handler Wrapper
 * Eliminates need for try-catch in every controller
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// ============================================================
// SUCCESS RESPONSE UTILITIES
// ============================================================

/**
 * Success Response Factory
 * Creates consistent success response structures
 */
class SuccessResponse {
  /**
   * 200 OK - Standard success response
   */
  static ok(res, data, message = "Success") {
    return res.status(200).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 201 Created - Resource creation success
   */
  static created(res, data, message = "Resource created successfully") {
    return res.status(201).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 200 OK with Pagination - Paginated list response
   */
  static okWithPagination(res, data, pagination, message = "Success") {
    return res.status(200).json({
      success: true,
      message,
      data,
      pagination: {
        currentPage: pagination.currentPage,
        totalPages: pagination.totalPages,
        pageSize: pagination.pageSize || data.length,
        totalItems: pagination.totalItems,
        hasNextPage: pagination.hasNext || pagination.hasNextPage || false,
        hasPrevPage: pagination.hasPrev || pagination.hasPrevPage || false,
      },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 204 No Content - Successful deletion
   */
  static noContent(res) {
    return res.status(204).send();
  }

  /**
   * 202 Accepted - Async operation accepted
   */
  static accepted(res, message = "Request accepted for processing") {
    return res.status(202).json({
      success: true,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}

// ============================================================
// VALIDATION UTILITIES
// ============================================================

/**
 * Request Validator
 * Validates incoming request data
 */
class RequestValidator {
  /**
   * Validate required fields
   */
  static validateRequired(data, requiredFields) {
    const missing = requiredFields.filter((field) => !data[field]);

    if (missing.length > 0) {
      throw ErrorResponse.badRequest(
        "Missing required fields",
        missing.map((field) => `${field} is required`)
      );
    }
  }

  /**
   * Validate pagination parameters
   */
  static validatePagination(query) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;

    if (page < 1) {
      throw ErrorResponse.badRequest("Page number must be greater than 0");
    }

    if (limit < 1 || limit > 100) {
      throw ErrorResponse.badRequest("Limit must be between 1 and 100");
    }

    return { page, limit };
  }

  /**
   * Validate email format
   */
  static validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw ErrorResponse.badRequest("Invalid email format");
    }
  }

  /**
   * Validate UUID format
   */
  static validateUUID(id, fieldName = "ID") {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw ErrorResponse.badRequest(`Invalid ${fieldName} format`);
    }
  }

  /**
   * Validate numeric value
   */
  static validateNumeric(value, fieldName, min = null, max = null) {
    const num = Number(value);

    if (isNaN(num)) {
      throw ErrorResponse.badRequest(`${fieldName} must be a number`);
    }

    if (min !== null && num < min) {
      throw ErrorResponse.badRequest(
        `${fieldName} must be at least ${min}`
      );
    }

    if (max !== null && num > max) {
      throw ErrorResponse.badRequest(
        `${fieldName} must not exceed ${max}`
      );
    }

    return num;
  }
}

// ============================================================
// PAGINATION HELPER
// ============================================================

/**
 * Pagination Builder
 * Creates consistent pagination metadata
 */
class PaginationBuilder {
  static build(page, limit, totalItems) {
    const totalPages = Math.ceil(totalItems / limit);

    return {
      currentPage: page,
      totalPages,
      pageSize: limit,
      totalItems,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      nextPage: page < totalPages ? page + 1 : null,
      prevPage: page > 1 ? page - 1 : null,
    };
  }

  /**
   * Calculate offset for database queries
   */
  static getOffset(page, limit) {
    return (page - 1) * limit;
  }
}

// ============================================================
// EXPORTS
// ============================================================

export {
  ApiError,
  ErrorResponse,
  SuccessResponse,
  RequestValidator,
  PaginationBuilder,
  errorHandler,
  asyncHandler,
};