import express from "express";
import InventoryController from "../controllers/inventory.controller.js";
import { authenticateUser } from "../middleware/auth.middleware.js";

const inventoryRouter = express.Router();

/**
 * @swagger
 * tags:
 *   name: Inventory
 *   description: Inventory management with complete audit trail
 */

/**
 * @swagger
 * /api/inventory/business/history:
 *   get:
 *     summary: Get comprehensive inventory history for entire business
 *     description: Returns inventory transactions across all products for the authenticated business
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: transactionType
 *         schema:
 *           type: string
 *           enum: [TOP_UP, USAGE]
 *         description: Filter by transaction type
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter transactions from this date (ISO format)
 *         example: "2025-01-01"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter transactions until this date (ISO format)
 *         example: "2025-12-31"
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
 *           maximum: 100
 *         description: Number of transactions per page
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by category ID
 *     responses:
 *       200:
 *         description: Business inventory history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Business inventory history retrieved successfully"
 *                 business:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     name:
 *                       type: string
 *                     type:
 *                       type: string
 *                 categories:
 *                   type: array
 *                   description: Transactions grouped by category and product
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
 *                       totalTransactions:
 *                         type: integer
 *                       products:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                               format: uuid
 *                             name:
 *                               type: string
 *                             description:
 *                               type: string
 *                             price:
 *                               type: number
 *                             currentQuantity:
 *                               type: integer
 *                             transactions:
 *                               type: array
 *                               items:
 *                                 $ref: '#/components/schemas/InventoryTransaction'
 *                 totalTransactions:
 *                   type: integer
 *                   description: Total number of transactions across all categories
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     totalRecords:
 *                       type: integer
 *                     hasNextPage:
 *                       type: boolean
 *                     hasPrevPage:
 *                       type: boolean
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: User must own a business to view inventory history
 *       500:
 *         description: Server error
 */
inventoryRouter.get(
  "/business/:businessId/history",
  authenticateUser,
  InventoryController.getBusinessInventoryHistory
);

/**
 * @swagger
 * /api/inventory/{productId}/increment:
 *   post:
 *     summary: Add stock to product (TOP_UP transaction)
 *     description: Creates a TOP_UP transaction for the specified product
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Product ID to add stock
 *         example: "550e8400-e29b-41d4-a716-446655440000"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - quantity
 *             properties:
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *                 description: Quantity to add (must be greater than 0)
 *                 example: 100
 *               reason:
 *                 type: string
 *                 description: Reason for stock addition
 *                 default: "Stock replenishment"
 *                 example: "Received new shipment from supplier"
 *               referenceId:
 *                 type: string
 *                 format: uuid
 *                 description: External reference ID for linking to other transactions
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Stock added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Quantity added successfully"
 *                 transaction:
 *                   type: object
 *                   properties:
 *                     productId:
 *                       type: string
 *                       format: uuid
 *                     productName:
 *                       type: string
 *                     oldQuantity:
 *                       type: integer
 *                     newQuantity:
 *                       type: integer
 *                     quantityChanged:
 *                       type: integer
 *                     transactionType:
 *                       type: string
 *                       example: "TOP_UP"
 *                     transactionId:
 *                       type: string
 *                       format: uuid
 *       400:
 *         description: Validation error - invalid quantity or product category deleted
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Not authorized to modify this product
 *       404:
 *         description: Product not found
 *       500:
 *         description: Server error
 */
inventoryRouter.post(
  "/:productId/increment",
  authenticateUser,
  InventoryController.incrementQuantity
);

/**
 * @swagger
 * /api/inventory/{productId}/decrement:
 *   post:
 *     summary: Remove stock from product (USAGE transaction)
 *     description: Creates a USAGE transaction for the specified product
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Product ID to remove stock
 *         example: "550e8400-e29b-41d4-a716-446655440000"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - quantity
 *             properties:
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *                 description: Quantity to remove (must be greater than 0)
 *                 example: 25
 *               reason:
 *                 type: string
 *                 description: Reason for stock removal
 *                 default: "Stock usage"
 *                 example: "Sold to customer - Order #12345"
 *               referenceId:
 *                 type: string
 *                 format: uuid
 *                 description: External reference ID for linking to other transactions
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Stock removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Quantity removed successfully"
 *                 transaction:
 *                   type: object
 *                   properties:
 *                     productId:
 *                       type: string
 *                       format: uuid
 *                     productName:
 *                       type: string
 *                     oldQuantity:
 *                       type: integer
 *                     newQuantity:
 *                       type: integer
 *                     quantityChanged:
 *                       type: integer
 *                     transactionType:
 *                       type: string
 *                       example: "USAGE"
 *                     transactionId:
 *                       type: string
 *                       format: uuid
 *       400:
 *         description: Validation error - insufficient stock, invalid quantity, or category deleted
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Not authorized to modify this product
 *       404:
 *         description: Product not found
 *       500:
 *         description: Server error
 */
inventoryRouter.post(
  "/:productId/decrement",
  authenticateUser,
  InventoryController.decrementQuantity
);

/**
 * @swagger
 * /api/inventory/{productId}/history:
 *   get:
 *     summary: Get inventory transaction history for a specific product
 *     description: Returns all transactions for a specific product with optional filtering
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Product ID
 *         example: "550e8400-e29b-41d4-a716-446655440000"
 *       - in: query
 *         name: transactionType
 *         schema:
 *           type: string
 *           enum: [TOP_UP, USAGE]
 *         description: Filter by transaction type
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter transactions from this date (ISO format)
 *         example: "2025-01-01"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter transactions until this date (ISO format)
 *         example: "2025-12-31"
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
 *           maximum: 100
 *         description: Number of transactions per page
 *     responses:
 *       200:
 *         description: Product inventory history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Product inventory history retrieved successfully"
 *                 transactions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       transaction_type:
 *                         type: string
 *                         enum: [TOP_UP, USAGE]
 *                       old_quantity:
 *                         type: integer
 *                       new_quantity:
 *                         type: integer
 *                       quantity_changed:
 *                         type: integer
 *                       reason:
 *                         type: string
 *                       reference_id:
 *                         type: string
 *                         format: uuid
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                       product:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           description:
 *                             type: string
 *                       user:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           email:
 *                             type: string
 *                       business:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           type:
 *                             type: string
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     totalRecords:
 *                       type: integer
 *                     hasNextPage:
 *                       type: boolean
 *                     hasPrevPage:
 *                       type: boolean
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       404:
 *         description: Product not found or category deleted
 *       500:
 *         description: Server error
 */
inventoryRouter.get(
  "/:productId/history",
  authenticateUser,
  InventoryController.getProductInventoryHistory
);

export { inventoryRouter as InventoryRoutes };