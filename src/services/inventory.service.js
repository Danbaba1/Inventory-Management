import { TopUp, UsageHistory } from "../models/inventory.model.js";
import Product from "../models/product.model.js";

/**
 * INVENTORY SERVICE
 * Manages product inventory with complete audit trail
 * Tracks all quantity changes (increases/decreases) with user attribution
 */
class InventoryService {
  /**
   * Increment product quantity with audit logging
   * 
   * @description Admin-only operation to increase inventory with complete audit trail
   * 
   * Algorithm:
   * 1. Validate inputs and verify product existence
   * 2. Capture current quantity for audit trail
   * 3. Apply quantity increment atomically
   * 4. Create audit record with before/after states
   * 5. Return operation summary
   * 
   * @param {string} productId - Product ObjectId
   * @param {number} quantity - Quantity to add (must be positive)
   * @param {string} userId - Business owner ID for audit trail
   * 
   * @returns {Object} Operation result with quantity change details
   * @throws {Error} Validation errors, product not found errors
   */
  static async incrementQuantity(productId, quantity, userId) {
    try {
      // Input validation with type checking
      if (!productId || !quantity || !userId) {
        throw new Error("Product ID and quantity are required");
      }

      // Business rule: quantity must be positive
      if (quantity <= 0) {
        throw new Error("Quantity must be greater than 0");
      }

      // Product existence verification
      const product = await Product.findById(productId);
      if (!product) {
        throw new Error("Product not found");
      }

      // Capture pre-update state for audit
      const oldQuantity = product.quantity;
      
      // Apply quantity increment
      product.quantity += Number(quantity);
      await product.save();

      // Create comprehensive audit record
      const topUp = new TopUp({
        business: product.business._id,
        product: productId,
        user: userId, // user performing the operation
        oldQuantity,
        newQuantity: product.quantity,
        quantityAdded: Number(quantity),
        // Timestamps added automatically by schema
      });

      await topUp.save();

      // Return detailed operation summary
      return {
        message: "Quantity added successfully",
        product: {
          id: product._id,
          name: product.name,
          oldQuantity,
          newQuantity: product.quantity,
          quantityAdded: Number(quantity),
        },
      };
    } catch (err) {
      throw new Error(err.message);
    }
  }

  /**
   * Decrement product quantity with stock validation
   * 
   * @description Public operation to reduce inventory with stock level validation
   * 
   * Algorithm:
   * 1. Validate inputs and verify product existence
   * 2. Check sufficient stock availability
   * 3. Apply quantity decrement atomically
   * 4. Create usage audit record
   * 5. Return operation summary
   * 
   * @param {string} productId - Product ObjectId
   * @param {number} quantity - Quantity to remove (must be positive)
   * @param {string} userId - User ID performing the operation
   * 
   * @returns {Object} Operation result with quantity change details
   * @throws {Error} Validation errors, insufficient stock errors
   */
  static async decrementQuantity(productId, quantity, userId) {
    try {
      if (!productId || !quantity || !userId) {
        throw new Error("Product ID, quantity, and user ID are required");
      }

      if (quantity <= 0) {
        throw new Error("Quantity must be greater than 0");
      }

      const product = await Product.findById(productId);
      if (!product) {
        throw new Error("Product not found");
      }

      // Critical business rule: prevent negative inventory
      if (product.quantity < quantity) {
        throw new Error("Insufficient quantity available");
      }

      const oldQuantity = product.quantity;
      product.quantity -= Number(quantity);
      await product.save();

      // Create usage audit record
      const usage = new UsageHistory({
        business: product.business._id,
        product: productId,
        user: userId,
        oldQuantity,
        newQuantity: product.quantity,
        quantityUsed: Number(quantity),
      });

      await usage.save();

      return {
        message: "Quantity removed successfully",
        product: {
          id: product._id,
          name: product.name,
          oldQuantity,
          newQuantity: product.quantity,
          quantityUsed: Number(quantity),
        },
      };
    } catch (err) {
      throw new Error(err.message);
    }
  }

  /**
   * Retrieve paginated top-up history with optional user filtering
   * 
   * @description Admin analytics for inventory replenishment tracking
   * 
   * Algorithm:
   * 1. Build query with optional user filtering
   * 2. Apply pagination and sorting (most recent first)
   * 3. Populate related entities for comprehensive view
   * 4. Calculate pagination metadata
   * 
   * @param {string} productId - Product ObjectId to filter by
   * @param {Object} options - Query options
   * @param {number} options.page - Page number (default: 1)
   * @param {number} options.limit - Items per page (default: 10)
   * @param {string} options.userId - Optional user filter for specific admin
   * 
   * @returns {Object} Paginated top-up records with metadata
   * @throws {Error} Database query errors
   */
  static async getTopUpHistory(productId, options = {}) {
    try {
      const { page = 1, limit = 10, userId } = options;
      const skip = (page - 1) * limit;

      // Build query with optional user filtering
      const query = { product: productId };
      if (userId) {
        query.user = userId; // Filter by specific business owner
      }

      // Query with comprehensive population
      const topUps = await TopUp.find(query)
        .populate("product", "name description") // Product details
        .populate("user", "name email") // Business owner who performed action
        .populate("business", "name type") // Business details
        .sort({ date: -1, createdAt: -1 }) // Most recent first
        .skip(skip)
        .limit(limit);

      const total = await TopUp.countDocuments(query);

      return {
        topUps,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalRecords: total,
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1,
        },
      };
    } catch (err) {
      throw new Error(err.message);
    }
  }

  /**
   * Retrieve paginated usage history with optional user filtering
   * 
   * @description Analytics for inventory consumption tracking
   * 
   * Algorithm: Similar to getTopUpHistory but for usage records
   * 
   * @param {string} productId - Product ObjectId to filter by
   * @param {Object} options - Query options (same as getTopUpHistory)
   * 
   * @returns {Object} Paginated usage records with metadata
   * @throws {Error} Database query errors
   */
  static async getUsageHistory(productId, options = {}) {
    try {
      const { page = 1, limit = 10, userId } = options;
      const skip = (page - 1) * limit;

      const query = { product: productId };
      if (userId) {
        query.user = userId;
      }

      const usages = await UsageHistory.find(query)
        .populate("product", "name description")
        .populate("user", "name email")
        .populate("business", "name type")
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await UsageHistory.countDocuments(query);

      return {
        usages,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalRecords: total,
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1,
        },
      };
    } catch (err) {
      throw new Error(err.message);
    }
  }
}

export default InventoryService;