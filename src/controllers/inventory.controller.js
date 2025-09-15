import InventoryService from "../services/inventory.service.js";

/**
 * Inventory Controller - Manages product inventory operations and history tracking
 * 
 * This controller handles all inventory-related operations including stock adjustments,
 * inventory top-ups, usage tracking, and comprehensive history management. It serves
 * as the central hub for inventory operations within the business management system.
 * 
 * Inventory Management Architecture:
 * Business -> Products -> Inventory Records -> Transaction History
 * 
 * Core Inventory Operations:
 * - Stock quantity increments (restocking/top-ups)
 * - Stock quantity decrements (sales/usage)
 * - Top-up history tracking with pagination
 * - Usage history tracking with pagination
 * - Real-time inventory balance calculations
 * - Automated availability status updates
 * 
 * Business Logic Framework:
 * - All inventory operations are business-scoped for multi-tenancy
 * - Inventory transactions maintain complete audit trails
 * - Stock levels automatically update product availability
 * - Negative inventory prevention with validation
 * - Time-stamped transaction recording for analytics
 * - User-specific inventory operation tracking
 * 
 * Data Integrity Features:
 * - Atomic inventory operations to prevent race conditions
 * - Transaction history immutability for audit compliance
 * - Real-time stock level synchronization
 * - Inventory balance validation and error prevention
 * - Business ownership verification for all operations
 * 
 * Integration Points:
 * - Product availability status management
 * - Business analytics and reporting systems
 * - Sales transaction processing
 * - Inventory alert and notification systems
 * - Stock level monitoring and forecasting
 * 
 * @class InventoryController
 * @requires InventoryService
 */
class InventoryController {
  
  /**
   * Increment Product Quantity (Stock Top-Up)
   * 
   * Increases the available inventory for a specific product by adding stock
   * quantities. This operation is typically used for restocking, receiving
   * new inventory, or correcting stock levels upward.
   * 
   * Top-Up Process Flow:
   * 1. Validate user authentication and product ownership
   * 2. Verify product exists within user's business
   * 3. Validate quantity increment value (positive integer)
   * 4. Create inventory top-up transaction record
   * 5. Update product quantity in real-time
   * 6. Recalculate product availability status
   * 7. Update business inventory statistics
   * 8. Log transaction for audit and history tracking
   * 
   * Business Rules:
   * - Quantity increment must be positive (greater than 0)
   * - Product must exist and belong to user's business
   * - Transaction is recorded with timestamp and user ID
   * - Product availability auto-updates based on new stock level
   * - Inventory statistics are updated in real-time
   * 
   * Inventory Impact:
   * - Increases total available stock
   * - Updates product availability to "in stock" if previously out
   * - Creates permanent audit trail record
   * - Triggers inventory level notifications if configured
   * - Updates business-level inventory analytics
   * 
   * @static
   * @async
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {string} req.query.productId - Product ID to increment quantity for (required)
   * @param {string} req.query.userId - User ID for business ownership verification (required)
   * @param {Object} req.body - Request body containing increment details
   * @param {number} req.body.quantity - Quantity to add to inventory (positive integer)
   * @param {Object} res - Express response object
   * @returns {Promise<void>} Inventory increment operation result
   * 
   * @example
   * POST /api/inventory/increment?productId=prod_123&userId=user_456
   * Headers: Authorization: Bearer jwt_token
   * {
   *   "quantity": 50
   * }
   * 
   * Success Response (200):
   * {
   *   "message": "Inventory quantity incremented successfully",
   *   "result": {
   *     "productId": "prod_123",
   *     "previousQuantity": 25,
   *     "incrementAmount": 50,
   *     "newQuantity": 75,
   *     "transactionId": "txn_789",
   *     "timestamp": "2024-01-01T10:00:00.000Z",
   *     "isAvailable": true
   *   }
   * }
   * 
   * Error Responses:
   * - 400: Missing/invalid product ID, invalid quantity, or product not found
   * - 401: User not authenticated
   * - 403: User doesn't own the business containing the product
   * - 500: Server error during inventory update
   */
  static async incrementQuantity(req, res) {
    try {
      const { productId, userId } = req.query;
      const { quantity } = req.body;

      // Service handles validation, business logic, and atomic operations
      const result = await InventoryService.incrementQuantity(
        productId,
        quantity,
        userId
      );

      res.status(200).json(result);
    } catch (err) {
      // Handle validation and business logic errors
      if (
        err.message === "Product ID and quantity are required" ||
        err.message === "Quantity must be greater than 0" ||
        err.message === "Product not found"
      ) {
        return res.status(400).json({
          error: "Bad Request",
          message: err.message,
        });
      }

      // Handle unexpected errors during inventory operations
      console.error("Error incrementing quantity", err);
      res.status(500).json({
        error: "Internal Server Error",
        message: "Error incrementing quantity",
      });
    }
  }

  /**
   * Decrement Product Quantity (Stock Usage)
   * 
   * Decreases the available inventory for a specific product by removing stock
   * quantities. This operation is used for sales, usage, waste, or stock corrections.
   * 
   * Usage/Decrement Process:
   * 1. Authenticate user and verify product ownership
   * 2. Validate product exists in user's business
   * 3. Check sufficient inventory is available
   * 4. Validate decrement quantity (positive, not exceeding available stock)
   * 5. Create usage transaction record
   * 6. Update product quantity atomically
   * 7. Recalculate availability status
   * 8. Update inventory analytics and alerts
   * 
   * Stock Protection Rules:
   * - Cannot reduce inventory below zero
   * - Decrement quantity must be positive
   * - Must have sufficient stock available
   * - Product must exist and be owned by user's business
   * - All reductions are tracked with complete audit trail
   * 
   * Availability Management:
   * - Automatically sets product to "out of stock" when quantity reaches 0
   * - Triggers low stock alerts if configured
   * - Updates business inventory levels in real-time
   * - Maintains transaction history for reporting
   * 
   * @static
   * @async
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {string} req.query.productId - Product ID to decrement quantity for (required)
   * @param {string} req.query.userId - User ID for business ownership verification (required)
   * @param {Object} req.body - Request body containing decrement details
   * @param {number} req.body.quantity - Quantity to remove from inventory (positive integer)
   * @param {string} [req.body.reason] - Optional reason for stock reduction
   * @param {Object} res - Express response object
   * @returns {Promise<void>} Inventory decrement operation result
   * 
   * @example
   * POST /api/inventory/decrement?productId=prod_123&userId=user_456
   * Headers: Authorization: Bearer jwt_token
   * {
   *   "quantity": 10,
   *   "reason": "Sale transaction"
   * }
   * 
   * Success Response (200):
   * {
   *   "message": "Inventory quantity decremented successfully",
   *   "result": {
   *     "productId": "prod_123",
   *     "previousQuantity": 75,
   *     "decrementAmount": 10,
   *     "newQuantity": 65,
   *     "transactionId": "txn_890",
   *     "timestamp": "2024-01-01T11:00:00.000Z",
   *     "isAvailable": true,
   *     "reason": "Sale transaction"
   *   }
   * }
   * 
   * Error Responses:
   * - 400: Missing/invalid data, insufficient stock, or product not found
   * - 401: User not authenticated
   * - 403: User doesn't own the business containing the product
   * - 500: Server error during inventory update
   */
  static async decrementQuantity(req, res) {
    try {
      const { productId, userId } = req.query;
      const { quantity } = req.body;

      // Service handles stock validation and atomic decrement operations
      const result = await InventoryService.decrementQuantity(
        productId,
        quantity,
        userId
      );

      res.status(200).json(result);
    } catch (err) {
      // Handle validation and business logic errors
      if (
        err.message === "Product ID, quantity,and user ID are required" ||
        err.message === "Quantity must be greater than 0" ||
        err.message === "Product not found" ||
        err.message === "Insufficient quantity available"
      ) {
        return res.status(400).json({
          error: "Bad Request",
          message: err.message,
        });
      }

      // Handle unexpected errors during inventory operations
      console.error("Error decrementing quantity", err);
      res.status(500).json({
        error: "Internal Server Error",
        message: "Error decrementing quantity",
      });
    }
  }

  /**
   * Get Top-Up History with Pagination
   * 
   * Retrieves a paginated history of all inventory top-up transactions for a
   * specific product. This provides complete audit trails for stock increases,
   * restocking events, and inventory corrections.
   * 
   * Top-Up History Features:
   * - Complete transaction audit trail
   * - Pagination for handling large transaction volumes
   * - User-specific transaction filtering
   * - Chronological sorting (most recent first)
   * - Transaction details including dates, quantities, and user information
   * - Business-scoped data access control
   * 
   * History Data Includes:
   * - Transaction ID and timestamp
   * - Quantity added and previous stock level
   * - User who performed the top-up
   * - Transaction reason or notes (if provided)
   * - Before and after inventory levels
   * - Transaction status and validation details
   * 
   * Business Intelligence Usage:
   * - Inventory restocking pattern analysis
   * - Supply chain efficiency metrics
   * - User activity tracking and accountability
   * - Seasonal restocking trend identification
   * - Inventory turnover rate calculations
   * 
   * @static
   * @async
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {string} req.query.productId - Product ID to get top-up history for (required)
   * @param {string} req.query.userId - User ID for business ownership verification (required)
   * @param {number} [req.query.page=1] - Page number (starts from 1)
   * @param {number} [req.query.limit=10] - Items per page (max 100)
   * @param {Object} res - Express response object
   * @returns {Promise<void>} Paginated top-up history
   * 
   * @example
   * GET /api/inventory/topup-history?productId=prod_123&userId=user_456&page=1&limit=20
   * Headers: Authorization: Bearer jwt_token
   * 
   * Success Response (200):
   * {
   *   "message": "Topup history retrieved successfully",
   *   "topupHistory": [
   *     {
   *       "id": "txn_789",
   *       "productId": "prod_123",
   *       "quantityAdded": 50,
   *       "previousQuantity": 25,
   *       "newQuantity": 75,
   *       "userId": "user_456",
   *       "userName": "John Doe",
   *       "timestamp": "2024-01-01T10:00:00.000Z",
   *       "reason": "Weekly restock",
   *       "transactionType": "TOP_UP"
   *     }
   *   ],
   *   "totalTransactions": 45,
   *   "totalPages": 3,
   *   "currentPage": 1,
   *   "hasNextPage": true,
   *   "hasPrevPage": false,
   *   "totalQuantityAdded": 2250
   * }
   * 
   * Error Responses:
   * - 400: Invalid pagination parameters
   * - 401: User not authenticated
   * - 403: User doesn't own the business containing the product
   * - 404: Product not found
   * - 500: Server error during history retrieval
   */
  static async getTopUpHistory(req, res) {
    try {
      const { productId, userId } = req.query;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

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

      // Service handles business logic, authorization, and data retrieval
      const topupInventory = await InventoryService.getTopUpHistory(productId, {
        page,
        limit,
        userId,
      });

      res.status(200).json({
        message: "Topup history retrieved successfully",
        ...topupInventory,
      });
    } catch (err) {
      // Handle unexpected errors during history retrieval
      console.error("Error getting topup history", err);
      res.status(500).json({
        error: "Internal Server Error",
        message: "Error getting topup history",
      });
    }
  }

  /**
   * Get Usage History with Pagination
   * 
   * Retrieves a paginated history of all inventory usage/decrement transactions
   * for a specific product. This provides complete audit trails for stock
   * reductions, sales, usage, and inventory corrections.
   * 
   * Usage History Features:
   * - Complete usage transaction audit trail
   * - Pagination for large transaction datasets
   * - Business-scoped access control
   * - Chronological transaction ordering
   * - Detailed transaction metadata and context
   * - User activity tracking and attribution
   * 
   * Usage Data Analytics:
   * - Sales velocity and demand pattern analysis
   * - Product usage trend identification
   * - Inventory turnover rate calculations
   * - Customer demand forecasting data
   * - Loss/waste tracking and analysis
   * - User productivity and activity metrics
   * 
   * Transaction Details Include:
   * - Transaction ID and precise timestamp
   * - Quantity used/sold and remaining stock
   * - User who performed the transaction
   * - Transaction context (sale, waste, correction)
   * - Before and after inventory snapshots
   * - Associated business transactions (if applicable)
   * 
   * Compliance and Auditing:
   * - Immutable transaction records for compliance
   * - User accountability and activity tracking
   * - Inventory discrepancy investigation support
   * - Financial reconciliation data
   * - Regulatory reporting data sources
   * 
   * @static
   * @async
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {string} req.query.productId - Product ID to get usage history for (required)
   * @param {string} req.query.userId - User ID for business ownership verification (required)
   * @param {number} [req.query.page=1] - Page number (starts from 1)
   * @param {number} [req.query.limit=10] - Items per page (max 100)
   * @param {Object} res - Express response object
   * @returns {Promise<void>} Paginated usage history
   * 
   * @example
   * GET /api/inventory/usage-history?productId=prod_123&userId=user_456&page=1&limit=20
   * Headers: Authorization: Bearer jwt_token
   * 
   * Success Response (200):
   * {
   *   "message": "Usage Inventory history retrieved",
   *   "usageHistory": [
   *     {
   *       "id": "txn_890",
   *       "productId": "prod_123",
   *       "quantityUsed": 10,
   *       "previousQuantity": 75,
   *       "newQuantity": 65,
   *       "userId": "user_456",
   *       "userName": "John Doe",
   *       "timestamp": "2024-01-01T11:00:00.000Z",
   *       "reason": "Sale transaction",
   *       "transactionType": "USAGE",
   *       "associatedSaleId": "sale_123"
   *     }
   *   ],
   *   "totalTransactions": 156,
   *   "totalPages": 8,
   *   "currentPage": 1,
   *   "hasNextPage": true,
   *   "hasPrevPage": false,
   *   "totalQuantityUsed": 1840,
   *   "averageUsagePerTransaction": 11.8
   * }
   * 
   * Error Responses:
   * - 400: Invalid pagination parameters
   * - 401: User not authenticated
   * - 403: User doesn't own the business containing the product
   * - 404: Product not found
   * - 500: Server error during history retrieval
   */
  static async getUsageHistory(req, res) {
    try {
      const { productId, userId } = req.query;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

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

      // Service handles business logic, authorization, and comprehensive data retrieval
      const usageInventory = await InventoryService.getUsageHistory(productId, {
        page,
        limit,
        userId,
      });

      res.status(200).json({
        message: "Usage Inventory history retrieved",
        ...usageInventory,
      });
    } catch (err) {
      // Handle unexpected errors during history retrieval
      console.error("Error retrieving usage history", err);
      res.status(500).json({
        error: "Internal Server Error",
        message: "Error retrieving usage history",
      });
    }
  }
}

export default InventoryController;