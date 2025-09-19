import express from "express";
import CategoryController from "../controllers/category.controller.js";
import { authenticateUser } from "../middleware/auth.middleware.js";

const categoryRouter = express.Router();

/**
 * Category Management Routes
 * Controllers handle the business logic - see CategoryController for detailed implementation
 */

/**
 * POST /category - Create a new category
 * Requires authentication
 */
categoryRouter.post("/", authenticateUser, CategoryController.createCategory);

/**
 * GET /categories - Get all categories
 * Requires authentication
 */
categoryRouter.get("/", authenticateUser, CategoryController.getCategories);

/**
 * PUT /category - Update category information
 * Requires authentication
 */
categoryRouter.put("/:id", authenticateUser, CategoryController.updateCategory);

/**
 * DELETE /category - Delete a category
 * Requires authentication
 */
categoryRouter.delete("/:id", authenticateUser, CategoryController.deleteCategory);

// Admin routes (commented out - ready for future implementation)
// router.post("/admin/category", authorizeAdmin, CategoryController.createCategory);
// router.get("/admin/categories", authorizeAdmin, CategoryController.getCategories);
// router.put("/admin/category", authorizeAdmin, CategoryController.updateCategory);
// router.delete("/admin/category", authorizeAdmin, CategoryController.deleteCategory);

export { categoryRouter as CategoryRoutes };