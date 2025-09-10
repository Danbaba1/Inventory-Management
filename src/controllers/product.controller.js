import ProductService from "../services/product.service.js";

class ProductController {
  static async createProduct(req, res) {
    try {
      const { categoryId } = req.query;
      const { name, quantity, price, description } = req.body;
      const userId = req.user?.userId;

      const result = await ProductService.createProduct(
        name,
        categoryId,
        quantity,
        price,
        description,
        userId
      );

      res.status(201).json({
        message: "Product created successfully",
        result: result,
      });
    } catch (err) {
      if (
        err.message === "Please provide a valid product name" ||
        err.message === "Please provide a category" ||
        err.message === "Please provide a valid price" ||
        err.message === "Please provide a valid quantity" ||
        err.message === "Category does not exist in your business" ||
        err.message ===
          "Product with this name already exists in your business" ||
        err.message ===
          "You must register a business before creating products" ||
        err.message === "User authentication required"
      ) {
        return res.status(400).json({
          error: "Bad Request",
          message: err.message,
        });
      }

      console.error("Error creating product", err);
      res.status(500).json({
        error: "Internal Server Error",
        message: "Error creating product",
      });
    }
  }

  static async getProducts(req, res) {
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

      const result = await ProductService.getProducts(page, limit, userId);

      res.status(200).json({
        message: "Products retrieved successfully",
        ...result,
      });
    } catch (err) {
      if (
        err.message === "You must register a business to view products" ||
        err.message === "User authentication required"
      ) {
        return res.status(400).json({
          error: "Bad Request",
          message: err.message,
        });
      }

      console.error("Error getting products", err);
      res.status(500).json({
        error: "Internal Server Error",
        message: "Error retrieving products",
      });
    }
  }

  static async updateProduct(req, res) {
    try {
      const { id } = req.query;
      const updateData = req.body;
      const userId = req.user?.userId;

      const result = await ProductService.updateProduct(id, updateData, userId);
      res.status(200).json({
        message: "Product updated successfully",
        result: result,
      });
    } catch (err) {
      if (
        err.message === "Product ID is required" ||
        err.message === "Product does not exist" ||
        err.message === "Product with name already exists in your business" ||
        err.message === "Category does not exist in your business" ||
        err.message === "You must own a business to update products" ||
        err.message === "User authentication required"
      ) {
        return res.status(400).json({
          error: "Bad Request",
          message: err.message,
        });
      }

      console.error("Error updating product", err);
      res.status(500).json({
        error: "Internal Server Error",
        message: "Error updating product",
      });
    }
  }

  static async deleteProduct(req, res) {
    try {
      const { id } = req.query;
      const userId = req.user?.userId;

      const message = await ProductService.deleteProduct(id, userId);

      res.status(200).json({
        message: message,
      });
    } catch (err) {
      if (
        err.message === "Product ID is required" ||
        err.message === "Product does not exist" ||
        err.message === "You must own a business to delete products" ||
        err.message === "User authentication required"
      ) {
        return res.status(400).json({
          error: "Bad Request",
          message: err.message,
        });
      }

      console.error("Error deleting product", err);
      res.status(500).json({
        error: "Internal Server Error",
        message: "Error deleting product",
      });
    }
  }
}

export default ProductController;
