import express from "express";
import InventoryController from "../controllers/inventory.controller.js";
import { authenticateUser } from "../middleware/auth.middleware.js";

const inventoryRouter = express.Router();

/**
 * Inventory Management Routes
 * Controllers handle the business logic - see InventoryController for detailed implementation
 */

/**
 * POST /increment - Increment inventory quantity
 * Requires authentication
 */
inventoryRouter.post(
  "/increment",
  authenticateUser,
  InventoryController.incrementQuantity
);

/**
 * POST /decrement - Decrement inventory quantity
 * Public endpoint
 */
inventoryRouter.post("/decrement", authenticateUser, InventoryController.decrementQuantity);

/**
 * GET /history/topup - Get inventory top-up history
 * Requires admin authorization
 */
inventoryRouter.get(
  "/history/topup",
  authenticateUser,
  InventoryController.getTopUpHistory
);

/**
 * GET /history/usage - Get inventory usage history
 * Requires admin authorization
 */
inventoryRouter.get(
  "/history/usage",
  authenticateUser,
  InventoryController.getUsageHistory
);

export { inventoryRouter as InventoryRoutes };