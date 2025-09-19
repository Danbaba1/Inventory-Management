import express from "express";
import InventoryController from "../controllers/inventory.controller.js";
import { authenticateUser } from "../middleware/auth.middleware.js";

const inventoryRouter = express.Router();

/**
 * Inventory Management Routes
 * All routes require authentication via authenticateUser middleware
 * Uses URL parameters for product identification and proper UUID handling
 */

/**
 * GET /business/history - Get business-wide inventory history
 * Returns inventory transactions across all products for the authenticated business
 * 
 * Query Parameters:
 * - transactionType: Filter by 'TOP_UP' or 'USAGE' (optional)
 * - startDate: Start date filter in ISO format (optional)
 * - endDate: End date filter in ISO format (optional)
 * - page: Page number (optional, default: 1)
 * - limit: Items per page (optional, default: 10, max: 100)
 * 
 * Example: GET /inventory/business/history?transactionType=TOP_UP&page=1&limit=20
 */
inventoryRouter.get(
  "/business/history",
  authenticateUser,
  InventoryController.getBusinessInventoryHistory
);

/**
 * POST /:productId/increment - Increment inventory quantity
 * Creates TOP_UP transaction for the specified product
 * 
 * URL Parameters:
 * - productId: UUID of the product (required)
 * 
 * Request Body:
 * - quantity: Number (required, > 0)
 * - reason: String (optional, defaults to "Stock replenishment")
 * - referenceId: UUID (optional, for linking to other transactions)
 * 
 * Example: POST /inventory/123e4567-e89b-12d3-a456-426614174000/increment
 */
inventoryRouter.post(
  "/:productId/increment",
  authenticateUser,
  InventoryController.incrementQuantity
);

/**
 * POST /:productId/decrement - Decrement inventory quantity
 * Creates USAGE transaction for the specified product
 * 
 * URL Parameters:
 * - productId: UUID of the product (required)
 * 
 * Request Body:
 * - quantity: Number (required, > 0)
 * - reason: String (optional, defaults to "Stock usage")
 * - referenceId: UUID (optional, for linking to other transactions)
 * 
 * Example: POST /inventory/123e4567-e89b-12d3-a456-426614174000/decrement
 */
inventoryRouter.post(
  "/:productId/decrement",
  authenticateUser,
  InventoryController.decrementQuantity
);

/**
 * GET /:productId/history - Get product-specific inventory history
 * Returns all transactions for a specific product with optional filtering
 * 
 * URL Parameters:
 * - productId: UUID of the product (required)
 * 
 * Query Parameters:
 * - transactionType: Filter by 'TOP_UP' or 'USAGE' (optional)
 * - startDate: Start date filter in ISO format (optional)
 * - endDate: End date filter in ISO format (optional)
 * - page: Page number (optional, default: 1)
 * - limit: Items per page (optional, default: 10, max: 100)
 * 
 * Example: GET /inventory/123e4567-e89b-12d3-a456-426614174000/history?transactionType=TOP_UP&page=1&limit=20
 */
inventoryRouter.get(
  "/:productId/history",
  authenticateUser,
  InventoryController.getProductInventoryHistory
);

export { inventoryRouter as InventoryRoutes };