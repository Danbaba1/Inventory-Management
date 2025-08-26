import { TopUp, UsageHistory } from "../model/inventory.model.js";
import Product from "../../Product/model/product.model.js";

class InventoryService {
  static async incrementQuantity(productId, quantity, userId) {
    try {
      if (!productId || !quantity || !userId) {
        throw new Error("Product ID and quantity are required");
      }

      if (quantity <= 0) {
        throw new Error("Quantity must be greater than 0");
      }

      const product = await Product.findById(productId);
      if (!product) {
        throw new Error("Product not found");
      }

      const oldQuantity = product.quantity;
      product.quantity += Number(quantity);
      await product.save();

      const topUp = new TopUp({
        product: productId,
        user: userId,
        oldQuantity,
        newQuantity: product.quantity,
        quantityAdded: Number(quantity),
      });

      await topUp.save();

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

      if (product.quantity < quantity) {
        throw new Error("Insufficient quantity available");
      }

      const oldQuantity = product.quantity;
      product.quantity -= Number(quantity);
      await product.save();

      const usage = new UsageHistory({
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

  static async getTopUpHistory(productId, options = {}) {
    try {
      const { page = 1, limit = 10, userId } = options;
      const skip = (page - 1) * limit;

      const query = { product: productId };
      if (userId) {
        query.user = userId;
      }

      const topUps = await TopUp.find(query)
        .populate("product", "name description")
        .populate("user", "name email")
        .sort({ date: -1, createdAt: -1 })
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
