import express from "express";
import ProductController from "../controllers/product.controller.js";
import { authenticateUser } from "../middleware/auth.middleware.js";

const productRouter = express.Router();

/**
 * Product Management Routes
 * Controllers handle the business logic - see ProductController for detailed implementation
 */

/**
 * POST /product - Create a new product
 * Requires authentication
 */
productRouter.post("/", authenticateUser, ProductController.createProduct);

/**
 * GET /products - Get all products
 * Requires authentication
 */
productRouter.get("/", authenticateUser, ProductController.getProducts);

/**
 * PUT /product - Update product information
 * Requires authentication
 */
productRouter.put("/:id", authenticateUser, ProductController.updateProduct);

/**
 * DELETE /product - Delete a product
 * Requires authentication
 */
productRouter.delete("/:id", authenticateUser, ProductController.deleteProduct);

// Admin routes (commented out - ready for future implementation)
// router.post("/admin/product", authorizeAdmin, ProductController.createProduct);
// router.get("/admin/products", authorizeAdmin, ProductController.getProducts);
// router.put("/admin/product", authorizeAdmin, ProductController.updateProduct);
// router.delete("/admin/product", authorizeAdmin, ProductController.deleteProduct);

export { productRouter as ProductRoutes };