/**
 * @fileoverview Inventory Controller for managing product stock operations
 * 
 * This controller handles all inventory-related operations including stock increments,
 * decrements, and history tracking. It provides proper UUID validation, user authentication,
 * and error handling for inventory management in a business context.
 * 
 * @requires InventoryService - Service layer for inventory operations
 * @author Your Name
 * @version 1.0.0
 * @since 2024
 */

import InventoryService from "../services/inventory.service.js";
import { asyncHandler, SuccessResponse, RequestValidator } from "../utils/apiHelpers.js";

/**
 * Inventory Controller
 * Properly handles UUID validation and user authentication
 * 
 * This controller manages inventory operations with proper validation,
 * error handling, and authentication checks. All methods are static
 * and designed to work with Express.js middleware.
 * 
 * @class InventoryController
 */
class InventoryController {

  /**
   * Increment Product Quantity (Stock Top-Up)
   * Creates a TOP_UP transaction in the unified inventory model
   * 
   * This endpoint handles stock replenishment operations. It validates
   * the product ID, quantity, and user permissions before creating
   * a TOP_UP transaction record.
   * 
   * @static
   * @async
   * @param {Object} req - Express request object
   * @param {Object} req.params - URL parameters
   * @param {string} req.params.productId - UUID of the product to increment
   * @param {Object} req.user - Authenticated user object (from middleware)
   * @param {string} req.user.userId - UUID of the authenticated user
   * @param {Object} req.body - Request body
   * @param {number} req.body.quantity - Amount to increment (must be > 0)
   * @param {string} [req.body.reason] - Optional reason for the increment
   * @param {string} [req.body.referenceId] - Optional reference ID for tracking
   * @param {Object} res - Express response object
   * 
   * @returns {Promise<void>} JSON response with transaction details or error
   * 
   * @example
   * POST /api/inventory/products/550e8400-e29b-41d4-a716-446655440000/increment
   * Body: { "quantity": 50, "reason": "New stock delivery", "referenceId": "PO-2024-001" }
   * 
   * Success Response (200):
   * {
   *   "transactionId": "123e4567-e89b-12d3-a456-426614174000",
   *   "newQuantity": 150,
   *   "message": "Stock incremented successfully"
   * }
   */
  static incrementQuantity = asyncHandler(async (req, res) => {
    const { productId } = req.params;
    const userId = req.user?.userId;
    const { quantity, reason, referenceId } = req.body;

    // Validate UUID format
    RequestValidator.validateUUID(productId, "Product ID");

    // Validate quantity
    if (!quantity || quantity <= 0) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Valid quantity greater than 0 is required",
      });
    }

    // Delegate to service layer
    const result = await InventoryService.incrementQuantity(
      productId,
      quantity,
      userId,
      reason,
      referenceId
    );

    return SuccessResponse.ok(res, result, "Stock incremented successfully");
  });

  /**
   * Decrement Product Quantity (Stock Usage)
   * Creates a USAGE transaction in the unified inventory model
   * 
   * This endpoint handles stock consumption/usage operations. It validates
   * sufficient stock availability and user permissions before creating
   * a USAGE transaction record.
   * 
   * @static
   * @async
   * @param {Object} req - Express request object
   * @param {Object} req.params - URL parameters
   * @param {string} req.params.productId - UUID of the product to decrement
   * @param {Object} req.user - Authenticated user object (from middleware)
   * @param {string} req.user.userId - UUID of the authenticated user
   * @param {Object} req.body - Request body
   * @param {number} req.body.quantity - Amount to decrement (must be > 0)
   * @param {string} [req.body.reason] - Optional reason for the decrement
   * @param {string} [req.body.referenceId] - Optional reference ID for tracking
   * @param {Object} res - Express response object
   * 
   * @returns {Promise<void>} JSON response with transaction details or error
   * 
   * @example
   * POST /api/inventory/products/550e8400-e29b-41d4-a716-446655440000/decrement
   * Body: { "quantity": 10, "reason": "Sale to customer", "referenceId": "ORDER-2024-001" }
   * 
   * Success Response (200):
   * {
   *   "transactionId": "123e4567-e89b-12d3-a456-426614174001",
   *   "newQuantity": 140,
   *   "message": "Stock decremented successfully"
   * }
   */
  static decrementQuantity = asyncHandler(async (req, res) => {
    const { productId } = req.params;
    const userId = req.user?.userId;
    const { quantity, reason, referenceId } = req.body;

    // Validate UUID format
    RequestValidator.validateUUID(productId, "Product ID");

    // Validate quantity
    if (!quantity || quantity <= 0) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Valid quantity greater than 0 is required",
      });
    }

    // Delegate to service layer
    const result = await InventoryService.decrementQuantity(
      productId,
      quantity,
      userId,
      reason,
      referenceId
    );

    return SuccessResponse.ok(res, result, "Stock decremented successfully");
  });

  /**
   * Get Complete Inventory History for a Specific Product
   * Returns all transactions with optional filtering by type and date range
   * 
   * This endpoint retrieves paginated inventory transaction history for a
   * specific product. Supports filtering by transaction type, date ranges,
   * and includes comprehensive validation.
   * 
   * @static
   * @async
   * @param {Object} req - Express request object
   * @param {Object} req.params - URL parameters
   * @param {string} req.params.productId - UUID of the product
   * @param {Object} req.user - Authenticated user object (from middleware)
   * @param {string} req.user.userId - UUID of the authenticated user
   * @param {Object} req.query - Query parameters
   * @param {number} [req.query.page=1] - Page number for pagination (min: 1)
   * @param {number} [req.query.limit=10] - Items per page (1-100)
   * @param {string} [req.query.transactionType] - Filter by 'TOP_UP' or 'USAGE'
   * @param {string} [req.query.startDate] - Start date filter (ISO format)
   * @param {string} [req.query.endDate] - End date filter (ISO format)
   * @param {Object} res - Express response object
   * 
   * @returns {Promise<void>} JSON response with paginated transaction history
   * 
   * @example
   * GET /api/inventory/products/550e8400-e29b-41d4-a716-446655440000/history?page=1&limit=20&transactionType=TOP_UP
   * 
   * Success Response (200):
   * {
   *   "message": "Inventory history retrieved successfully",
   *   "transactions": [...],
   *   "pagination": {
   *     "page": 1,
   *     "limit": 20,
   *     "total": 45,
   *     "totalPages": 3
   *   }
   * }
   */
  static getProductInventoryHistory = asyncHandler(async (req, res) => {
    const { productId } = req.params;
    const userId = req.user?.userId;
    const { transactionType, startDate, endDate } = req.query;

    // Validate UUID format
    RequestValidator.validateUUID(productId, "Product ID");

    // Validate pagination parameters
    const { page, limit } = RequestValidator.validatePagination(req.query);

    // Validate transaction type if provided
    if (transactionType && !['TOP_UP', 'USAGE'].includes(transactionType)) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Transaction type must be either 'TOP_UP' or 'USAGE'",
      });
    }

    // Delegate to service layer
    const history = await InventoryService.getProductInventoryHistory(productId, {
      page,
      limit,
      userId,
      transactionType,
      startDate,
      endDate,
    });

    return SuccessResponse.okWithPagination(
      res,
      history.transactions,
      history.pagination,
      "Inventory history retrieved successfully"
    );
  });

  /**
   * Get Business Inventory History
   * Returns complete inventory history for all products in the business,
   * organized by categories with comprehensive filtering options
   * 
   * This endpoint retrieves paginated inventory transaction history across
   * all products owned by the authenticated user's business. Supports filtering
   * by transaction type, date ranges, and specific categories.
   * 
   * @static
   * @async
   * @param {Object} req - Express request object
   * @param {Object} req.user - Authenticated user object (from middleware)
   * @param {string} req.user.userId - UUID of the authenticated user
   * @param {Object} req.query - Query parameters
   * @param {number} [req.query.page=1] - Page number for pagination (min: 1)
   * @param {number} [req.query.limit=10] - Items per page (1-100)
   * @param {string} [req.query.transactionType] - Filter by 'TOP_UP' or 'USAGE'
   * @param {string} [req.query.startDate] - Start date filter (ISO format)
   * @param {string} [req.query.endDate] - End date filter (ISO format)
   * @param {string} [req.query.categoryId] - Filter by specific category UUID
   * @param {Object} res - Express response object
   * 
   * @returns {Promise<void>} JSON response with business-wide transaction history
   * 
   * @example
   * GET /api/inventory/business/history?page=1&limit=50&categoryId=cat-uuid&transactionType=USAGE
   * 
   * Success Response (200):
   * {
   *   "message": "Business inventory history retrieved successfully",
   *   "transactions": [...],
   *   "pagination": {...},
   *   "summary": {...}
   * }
   */
  static getBusinessInventoryHistory = asyncHandler(async (req, res) => {
    const userId = req.user?.userId;
    const { transactionType, startDate, endDate, categoryId } = req.query;

    // Validate pagination parameters
    const { page, limit } = RequestValidator.validatePagination(req.query);

    // Validate transaction type if provided
    if (transactionType && !['TOP_UP', 'USAGE'].includes(transactionType)) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Transaction type must be either 'TOP_UP' or 'USAGE'",
      });
    }

    // Validate category ID format if provided
    if (categoryId) {
      RequestValidator.validateUUID(categoryId, "Category ID");
    }

    // Delegate to service layer
    const history = await InventoryService.getBusinessInventoryHistory({
      userId,
      page,
      limit,
      transactionType,
      startDate,
      endDate,
      categoryId,
    });

    return SuccessResponse.okWithPagination(
      res,
      history.transactions,
      history.pagination,
      "Business inventory history retrieved successfully"
    );
  });
}

/**
 * Export the InventoryController class as default export
 * 
 * This controller should be used with proper authentication middleware
 * that populates req.user.userId with the authenticated user's UUID.
 * 
 * Expected middleware:
 * - Authentication middleware (sets req.user)
 * - Body parsing middleware for JSON requests
 * - Error handling middleware for uncaught exceptions
 * 
 * Routes structure:
 * - POST /:productId/increment - Increment stock
 * - POST /:productId/decrement - Decrement stock  
 * - GET /:productId/history - Get product history
 * - GET /business/history - Get business-wide history
 */
export default InventoryController;