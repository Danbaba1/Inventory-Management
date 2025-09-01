import express from "express";
import InventoryController from "../controllers/inventory.controller.js";
import { authorizeAdmin } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post(
  "/increment",
  authorizeAdmin,
  InventoryController.incrementQuantity
);

router.post("/decrement", InventoryController.decrementQuantity);

router.get(
  "/history/topup",
  authorizeAdmin,
  InventoryController.getTopUpHistory
);

router.get(
  "/history/usage",
  authorizeAdmin,
  InventoryController.getUsageHistory
);

export { router as InventoryRoutes };
