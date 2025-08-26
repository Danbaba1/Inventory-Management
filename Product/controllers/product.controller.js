import ProductService from "../services/product.service.js";

class ProductController {
  static async createProduct(req, res) {
    try {
      const { categoryId } = req.query;
      const { name, quantity, price, description } = req.body;

      const result = await ProductService.createProduct(
        name,
        categoryId,
        quantity,
        price,
        description
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
        err.message === "Category does not exist" ||
        err.message === "Product with name already exists"
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

      const result = await ProductService.getProducts(page, limit);

      res.status(200).json({
        message: "Products retrieved successfully",
        ...result,
      });
    } catch (err) {
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

      const result = await ProductService.updateProduct(id, updateData);
      res.status(200).json({
        message: "Product updated successfully",
        result: result,
      });
    } catch (err) {
      if (
        err.message === "Product ID is required" ||
        err.message === "Product does not exist" ||
        err.message === "Product with name already exists" ||
        err.message === "Category does not exist"
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

      const message = await ProductService.deleteProduct(id);

      res.status(200).json({
        message: message,
      });
    } catch (err) {
      if (
        err.message === "Product ID is required" ||
        err.message === "Product does not exist"
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
