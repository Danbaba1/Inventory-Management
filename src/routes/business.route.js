import express from "express";
import BusinessController from "../controllers/business.controller.js";
import { authenticateUser } from "../middleware/auth.middleware.js";
import { verifyBusinessOwnership } from "../middleware/business.middleware.js";

const router = express.Router();

router.post(
  "/register/business",
  authenticateUser,
  BusinessController.register
);

router.get("/businesses", BusinessController.getBusinesses);

router.put(
  "/business/:userId",
  authenticateUser,
  verifyBusinessOwnership,
  BusinessController.updateBusiness
);

router.delete(
  "/business/:userId",
  authenticateUser,
  verifyBusinessOwnership,
  BusinessController.deleteBusiness
);

export { router as BusinessRoutes };
