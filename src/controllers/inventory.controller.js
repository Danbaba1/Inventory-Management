import InventoryService from "../services/inventory.service.js";

/**
 * Fixed Inventory Controller
 * Properly handles UUID validation and user authentication
 */
class InventoryController {

  /**
   * Helper function to validate UUID format
   */
  static isValidUUID(uuid) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Increment Product Quantity (Stock Top-Up)
   * Creates a TOP_UP transaction in the unified model
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
   * Creates a USAGE transaction in the unified model
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
   * Get Complete Inventory History
   * Returns all transactions with optional filtering by type
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

      res.status(200).json({
        message: "Inventory history retrieved successfully",
        ...history,
      });
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
 * organized by categories
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

      res.status(200).json({
        message: "Business inventory history retrieved successfully",
        ...history,
      });
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

export default InventoryController;