import express from "express";
import BusinessController from "../controllers/business.controller.js";
import { authenticateUser } from "../middleware/auth.middleware.js";
import { verifyBusinessOwnership } from "../middleware/business.middleware.js";

const router = express.Router();

/**
 * Business Management Routes
 * Controllers handle the business logic - see BusinessController for detailed implementation
 */

/**
 * POST /register/business - Register a new business
 * Requires authentication
 */
router.post(
  "/",
  authenticateUser,
  BusinessController.register
);

/**
 * GET /businesses - Get all businesses
 * Public endpoint
 */
router.get("/", BusinessController.getBusinesses);

/**
 * PUT /business/:userId - Update business information
 * Requires authentication and business ownership verification
 */
router.put(
  "/:id",
  authenticateUser,
  verifyBusinessOwnership,
  BusinessController.updateBusiness
);

/**
 * DELETE /business/:userId - Delete a business
 * Requires authentication and business ownership verification
 */
router.delete(
  "/:id",
  authenticateUser,
  verifyBusinessOwnership,
  BusinessController.deleteBusiness
);

export { router as BusinessRoutes };