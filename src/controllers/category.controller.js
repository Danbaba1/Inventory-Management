import CategoryService from "../services/category.service.js";

class CategoryController {
  static async createCategory(req, res) {
    try {
      const { name, description } = req.body;
      const userId = req.user?.userId;

      const result = await CategoryService.createCategory(
        name,
        description,
        userId
      );

      res.status(201).json(result);
    } catch (err) {
      if (
        err.message === "Please provide a valid category name" ||
        err.message === "Category with this name already exists" ||
        err.message ===
          "You must register a business before creating categories" ||
        err.message === "User authentication required"
      ) {
        return res.status(400).json({
          error: "Bad Request",
          message: err.message,
        });
      }

      console.error("Error creating category", err);
      res.status(500).json({
        error: "Internal Server Error",
        message: "Error creating category",
      });
    }
  }

  static async getCategories(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const userId = req.user?.userId;

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

      const result = await CategoryService.getCategories(page, limit, userId);

      res.status(200).json({
        message: "Categories retrieved successfully",
        ...result,
      });
    } catch (err) {
      if (
        err.message === "You must register a business to view categories" ||
        err.message === "User authentication required"
      ) {
        return res.status(400).json({
          error: "Bad Request",
          message: err.message,
        });
      }

      console.error("Error getting categories", err);
      res.status(500).json({
        error: "Internal Server Error",
        message: "Error retrieving categories",
      });
    }
  }

  static async updateCategory(req, res) {
    try {
      const { id } = req.query;
      const { name, description } = req.body;
      const userId = req.user?.userId;

      const result = await CategoryService.updateCategory(
        id,
        name,
        description,
        userId
      );

      res.status(200).json(result);
    } catch (err) {
      if (
        err.message === "Category ID is required" ||
        err.message === "Category does not exist" ||
        err.message === "Category with name already exists" ||
        err.message === "You must own a business to update categories" ||
        err.message === "User authentication required"
      ) {
        return res.status(400).json({
          error: "Bad Request",
          message: err.message,
        });
      }

      console.error("Error updating category", err);
      res.status(500).json({
        error: "Internal Server Error",
        message: "Error updating category",
      });
    }
  }

  static async deleteCategory(req, res) {
    try {
      const { id } = req.query;
      const userId = req.user?.userId;

      const result = await CategoryService.deleteCategory(id, userId);
      res.status(200).json({
        message: result,
      });
    } catch (err) {
      if (
        err.message === "Category ID is required" ||
        err.message === "Category does not exist" ||
        err.message === "You must own a business to delete categories" ||
        err.message === "User authentication required"
      ) {
        return res.status(400).json({
          error: "Bad Request",
          message: err.message,
        });
      }

      console.error("Error deleting category", err);
      res.status(500).json({
        error: "Internal Server Error",
        message: "Error deleting category",
      });
    }
  }
}

export default CategoryController;
