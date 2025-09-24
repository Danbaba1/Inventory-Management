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

/**
 * Fixed Inventory Controller
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
   * Helper function to validate UUID format
   * 
   * Validates that a string matches the standard UUID v4 format.
   * Uses regex pattern to ensure proper UUID structure with hyphens
   * and correct character ranges.
   * 
   * @static
   * @param {string} uuid - The UUID string to validate
   * @returns {boolean} True if valid UUID format, false otherwise
   * 
   * @example
   * InventoryController.isValidUUID('550e8400-e29b-41d4-a716-446655440000'); // true
   * InventoryController.isValidUUID('invalid-uuid'); // false
   */
  static isValidUUID(uuid) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

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
   * // POST /api/inventory/products/550e8400-e29b-41d4-a716-446655440000/increment
   * // Body: { "quantity": 50, "reason": "New stock delivery", "referenceId": "PO-2024-001" }
   * 
   * // Success Response (200):
   * {
   *   "transactionId": "123e4567-e89b-12d3-a456-426614174000",
   *   "newQuantity": 150,
   *   "message": "Stock incremented successfully"
   * }
   * 
   * // Error Response (400):
   * {
   *   "error": "Bad Request",
   *   "message": "Invalid product ID format. Expected UUID format."
   * }
   */
  static async incrementQuantity(req, res) {
    try {
      const { productId } = req.params; // Get from URL params instead of query
      const userId = req.user.userId; // Get from authenticated user
      const { quantity, reason, referenceId } = req.body;

      // Validate required parameters
      if (!productId) {
        return res.status(400).json({
          error: "Bad Request",
          message: "Product ID is required",
        });
      }

      // Validate UUID format
      if (!InventoryController.isValidUUID(productId)) {
        return res.status(400).json({
          error: "Bad Request",
          message: "Invalid product ID format. Expected UUID format.",
        });
      }

      if (!quantity || quantity <= 0) {
        return res.status(400).json({
          error: "Bad Request",
          message: "Valid quantity greater than 0 is required",
        });
      }

      const result = await InventoryService.incrementQuantity(
        productId,
        quantity,
        userId,
        reason,
        referenceId
      );

      res.status(200).json(result);
    } catch (err) {
      if (
        err.message.includes("Product not found") ||
        err.message.includes("not authorized") ||
        err.message.includes("required")
      ) {
        return res.status(400).json({
          error: "Bad Request",
          message: err.message,
        });
      }

      console.error("Error incrementing quantity:", err);
      res.status(500).json({
        error: "Internal Server Error",
        message: "Error incrementing quantity",
      });
    }
  }

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
   * // POST /api/inventory/products/550e8400-e29b-41d4-a716-446655440000/decrement
   * // Body: { "quantity": 10, "reason": "Sale to customer", "referenceId": "ORDER-2024-001" }
   * 
   * // Success Response (200):
   * {
   *   "transactionId": "123e4567-e89b-12d3-a456-426614174001",
   *   "newQuantity": 140,
   *   "message": "Stock decremented successfully"
   * }
   * 
   * // Error Response (400):
   * {
   *   "error": "Bad Request",
   *   "message": "Insufficient quantity available"
   * }
   */
  static async decrementQuantity(req, res) {
    try {
      const { productId } = req.params; // Get from URL params instead of query
      const userId = req.user.userId; // Get from authenticated user
      const { quantity, reason, referenceId } = req.body;

      // Validate required parameters
      if (!productId) {
        return res.status(400).json({
          error: "Bad Request",
          message: "Product ID is required",
        });
      }

      // Validate UUID format
      if (!InventoryController.isValidUUID(productId)) {
        return res.status(400).json({
          error: "Bad Request",
          message: "Invalid product ID format. Expected UUID format.",
        });
      }

      if (!quantity || quantity <= 0) {
        return res.status(400).json({
          error: "Bad Request",
          message: "Valid quantity greater than 0 is required",
        });
      }

      const result = await InventoryService.decrementQuantity(
        productId,
        quantity,
        userId,
        reason,
        referenceId
      );

      res.status(200).json(result);
    } catch (err) {
      if (
        err.message.includes("Product not found") ||
        err.message.includes("not authorized") ||
        err.message.includes("Insufficient quantity") ||
        err.message.includes("required")
      ) {
        return res.status(400).json({
          error: "Bad Request",
          message: err.message,
        });
      }

      console.error("Error decrementing quantity:", err);
      res.status(500).json({
        error: "Internal Server Error",
        message: "Error decrementing quantity",
      });
    }
  }

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
   * // GET /api/inventory/products/550e8400-e29b-41d4-a716-446655440000/history?page=1&limit=20&transactionType=TOP_UP
   * 
   * // Success Response (200):
   * {
   *   "message": "Inventory history retrieved successfully",
   *   "transactions": [
   *     {
   *       "id": "123e4567-e89b-12d3-a456-426614174000",
   *       "type": "TOP_UP",
   *       "quantity": 50,
   *       "reason": "Stock delivery",
   *       "createdAt": "2024-01-15T10:30:00Z",
   *       "userId": "user-uuid"
   *     }
   *   ],
   *   "pagination": {
   *     "page": 1,
   *     "limit": 20,
   *     "total": 45,
   *     "totalPages": 3
   *   }
   * }
   */
  static async getProductInventoryHistory(req, res) {
    try {
      const { productId } = req.params; // Get from URL params instead of query
      const userId = req.user.userId; // Get from authenticated user
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const { transactionType, startDate, endDate } = req.query;

      // Validate required parameters
      if (!productId) {
        return res.status(400).json({
          error: "Bad Request",
          message: "Product ID is required",
        });
      }

      // Validate UUID format
      if (!InventoryController.isValidUUID(productId)) {
        return res.status(400).json({
          error: "Bad Request",
          message: "Invalid product ID format. Expected UUID format.",
        });
      }

      // Validate pagination parameters
      if (page < 1) {
        return res.status(400).json({
          error: "Bad Request",
          message: "Page number must be greater than 0",
        });
      }

      if (limit < 1 || limit > 100) {
        return res.status(400).json({
          error: "Bad Request",
          message: "Limit must be between 1 and 100",
        });
      }

      // Validate transaction type if provided
      if (transactionType && !['TOP_UP', 'USAGE'].includes(transactionType)) {
        return res.status(400).json({
          error: "Bad Request",
          message: "Transaction type must be either 'TOP_UP' or 'USAGE'",
        });
      }

      const history = await InventoryService.getProductInventoryHistory(productId, {
        page,
        limit,
        userId,
        transactionType,
        startDate,
        endDate,
      });

      res.status(200).json(
        history);
    } catch (err) {
      console.error("Error getting inventory history:", err);
      res.status(500).json({
        error: "Internal Server Error",
        message: "Error getting inventory history",
      });
    }
  }

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
   * // GET /api/inventory/business/history?page=1&limit=50&categoryId=cat-uuid&transactionType=USAGE
   * 
   * // Success Response (200):
   * {
   *   "message": "Business inventory history retrieved successfully",
   *   "transactions": [
   *     {
   *       "id": "trans-uuid",
   *       "productId": "prod-uuid",
   *       "productName": "Widget A",
   *       "categoryId": "cat-uuid",
   *       "categoryName": "Electronics",
   *       "type": "USAGE",
   *       "quantity": 5,
   *       "reason": "Customer order",
   *       "createdAt": "2024-01-15T14:20:00Z"
   *     }
   *   ],
   *   "pagination": {
   *     "page": 1,
   *     "limit": 50,
   *     "total": 234,
   *     "totalPages": 5
   *   },
   *   "summary": {
   *     "totalTopUps": 120,
   *     "totalUsage": 114,
   *     "categories": [
   *       {
   *         "categoryId": "cat-uuid",
   *         "categoryName": "Electronics",
   *         "transactionCount": 45
   *       }
   *     ]
   *   }
   * }
   * 
   * @throws {400} Bad Request - Invalid parameters or unauthorized access
   * @throws {500} Internal Server Error - Database or service errors
   */
  static async getBusinessInventoryHistory(req, res) {
    try {
      const userId = req.user.userId;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const { transactionType, startDate, endDate, categoryId } = req.query;

      // Validate pagination parameters
      if (page < 1) {
        return res.status(400).json({
          error: "Bad Request",
          message: "Page number must be greater than 0",
        });
      }

      if (limit < 1 || limit > 100) {
        return res.status(400).json({
          error: "Bad Request",
          message: "Limit must be between 1 and 100",
        });
      }

      // Validate transaction type if provided
      if (transactionType && !['TOP_UP', 'USAGE'].includes(transactionType)) {
        return res.status(400).json({
          error: "Bad Request",
          message: "Transaction type must be either 'TOP_UP' or 'USAGE'",
        });
      }

      // Validate category ID format if provided
      if (categoryId && !InventoryController.isValidUUID(categoryId)) {
        return res.status(400).json({
          error: "Bad Request",
          message: "Invalid category ID format. Expected UUID format.",
        });
      }

      const history = await InventoryService.getBusinessInventoryHistory({
        userId,
        page,
        limit,
        transactionType,
        startDate,
        endDate,
        categoryId,
      });

      res.status(200).json(history);
    } catch (err) {
      if (
        err.message.includes("not found") ||
        err.message.includes("not authorized") ||
        err.message.includes("required")
      ) {
        return res.status(400).json({
          error: "Bad Request",
          message: err.message,
        });
      }

      console.error("Error getting business inventory history:", err);
      res.status(500).json({
        error: "Internal Server Error",
        message: "Error getting business inventory history",
      });
    }
  }
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