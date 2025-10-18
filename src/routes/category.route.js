import express from "express";
import CategoryController from "../controllers/category.controller.js";
import { authenticateUser } from "../middleware/auth.middleware.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Categories
 *   description: Category management within business context
 */

/**
 * @swagger
 * /api/categories:
 *   post:
 *     summary: Create a new category
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: Category name (must be unique within business)
 *                 example: "Electronics"
 *               description:
 *                 type: string
 *                 description: Category description
 *                 example: "Electronic devices and accessories"
 *     responses:
 *       201:
 *         description: Category created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Category created successfully"
 *                 category:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 *                     business_id:
 *                       type: string
 *                       format: uuid
 *                     is_active:
 *                       type: boolean
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                     business:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         type:
 *                           type: string
 *       400:
 *         description: Validation error or category already exists
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: User must register a business first
 */
router.post("/", authenticateUser, CategoryController.createCategory);

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Get all categories for user's business
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of categories per page
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Categories retrieved successfully"
 *                 categories:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *                       business_id:
 *                         type: string
 *                         format: uuid
 *                       is_active:
 *                         type: boolean
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                       business:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           type:
 *                             type: string
 *                       products:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                             name:
 *                               type: string
 *                             description:
 *                               type: string
 *                             price:
 *                               type: number
 *                             quantity:
 *                               type: integer
 *                             is_available:
 *                               type: boolean
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     totalCategories:
 *                       type: integer
 *                     hasNext:
 *                       type: boolean
 *                     hasPrev:
 *                       type: boolean
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: User must register a business to view categories
 */
router.get("/", authenticateUser, CategoryController.getCategories);

/**
 * @swagger
 * /api/categories/{id}:
 *   patch:
 *     summary: Update a category
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Category ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: New category name (must be unique within business)
 *                 example: "Consumer Electronics"
 *               description:
 *                 type: string
 *                 description: New category description
 *                 example: "Updated description for electronics"
 *     responses:
 *       200:
 *         description: Category updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Category updated successfully"
 *                 category:
 *                   type: object
 *       400:
 *         description: Validation error or name conflict
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       404:
 *         description: Category does not exist
 */
router.patch("/:id", authenticateUser, CategoryController.updateCategory);

/**
 * @swagger
 * /api/categories/{id}:
 *   delete:
 *     summary: Delete a category (soft delete)
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Category ID
 *     responses:
 *       200:
 *         description: Category deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Category deleted successfully"
 *       400:
 *         description: Cannot delete category with products
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       404:
 *         description: Category does not exist
 */
router.delete("/:id", authenticateUser, CategoryController.deleteCategory);

export { router as CategoryRoutes };