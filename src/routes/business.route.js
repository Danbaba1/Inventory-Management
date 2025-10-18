import express from "express";
import BusinessController from "../controllers/business.controller.js";
import { authenticateUser } from "../middleware/auth.middleware.js";
import { verifyBusinessOwnership } from "../middleware/business.middleware.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Business
 *   description: Business management endpoints
 */

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * /api/businesses:
 *   post:
 *     summary: Register a new business
 *     tags: [Business]
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
 *               - email
 *             properties:
 *               name:
 *                 type: string
 *                 description: Business name
 *                 example: Tech Solutions Ltd
 *               email:
 *                 type: string
 *                 format: email
 *                 example: contact@techsolutions.com
 *               phone:
 *                 type: string
 *                 example: "+234 801 234 5678"
 *               address:
 *                 type: string
 *                 example: "123 Lagos Street, Ikeja"
 *               description:
 *                 type: string
 *                 example: "Leading technology solutions provider"
 *               website:
 *                 type: string
 *                 format: uri
 *                 example: "https://techsolutions.com"
 *     responses:
 *       201:
 *         description: Business registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 business:
 *                   type: object
 *       400:
 *         description: Invalid input or business already exists
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       500:
 *         description: Server error
 */
router.post(
  "/",
  authenticateUser,
  BusinessController.register
);

/**
 * @swagger
 * /api/businesses:
 *   get:
 *     summary: Get all businesses
 *     description: Retrieve list of all businesses with pagination and search
 *     tags: [Business]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *           maximum: 100
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by business name or email
 *         example: "Tech"
 *     responses:
 *       200:
 *         description: List of businesses retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 businesses:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       name:
 *                         type: string
 *                       email:
 *                         type: string
 *                       phone:
 *                         type: string
 *                       address:
 *                         type: string
 *                       website:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                 total:
 *                   type: integer
 *                   description: Total number of businesses
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/", authenticateUser, BusinessController.getBusinesses);

/**
 * @swagger
 * /api/businesses/{id}:
 *   patch:
 *     summary: Update business information
 *     description: Update details of a specific business (owner only)
 *     tags: [Business]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Business ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Tech Solutions Updated"
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *               description:
 *                 type: string
 *               website:
 *                 type: string
 *                 format: uri
 *     responses:
 *       200:
 *         description: Business updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 business:
 *                   type: object
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not business owner
 *       404:
 *         description: Business not found
 *       500:
 *         description: Server error
 */
router.patch(
  "/:id",
  authenticateUser,
  verifyBusinessOwnership,
  BusinessController.updateBusiness
);

/**
 * @swagger
 * /api/businesses/{id}:
 *   delete:
 *     summary: Delete a business
 *     description: Permanently delete a business (owner only)
 *     tags: [Business]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Business ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Business deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not business owner
 *       404:
 *         description: Business not found
 *       500:
 *         description: Server error
 */
router.delete(
  "/:id",
  authenticateUser,
  verifyBusinessOwnership,
  BusinessController.deleteBusiness
);

export { router as BusinessRoutes };