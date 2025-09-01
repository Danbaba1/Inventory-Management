import InventoryService from "../services/inventory.service.js";

class InventoryController {
  static async incrementQuantity(req, res) {
    try {
      const { productId, userId } = req.query;
      const { quantity } = req.body;

      const result = await InventoryService.incrementQuantity(
        productId,
        quantity,
        userId
      );

      res.status(200).json(result);
    } catch (err) {
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

      console.error("Error incrementing quantity", err);
      res.status(500).json({
        error: "Internal Server Error",
        message: "Error incrementing quantity",
      });
    }
  }

  static async decrementQuantity(req, res) {
    try {
      const { productId, userId } = req.query;
      const { quantity } = req.body;

      const result = await InventoryService.decrementQuantity(
        productId,
        quantity,
        userId
      );

      res.status(200).json(result);
    } catch (err) {
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

      console.error("Error decrementing quantity", err);
      res.status(500).json({
        error: "Internal Server Error",
        message: "Error decrementing quantity",
      });
    }
  }

  static async getTopUpHistory(req, res) {
    try {
      const { productId, userId } = req.query;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

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
      console.error("Error getting topup history", err);
      res.status(500).json({
        error: "Internal Server Error",
        message: "Error getting topup history",
      });
    }
  }

  static async getUsageHistory(req, res) {
    try {
      const { productId, userId } = req.query;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

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
      console.error("Error retrieving usage history", err);
      res.status(500).json({
        error: "Internal Server Error",
        message: "Error retrieving usage history",
      });
    }
  }
}

export default InventoryController;
