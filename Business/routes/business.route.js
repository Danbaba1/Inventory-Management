import express from "express";
import BusinessController from "../controllers/business.controller.js";
import { verifyBusinessOwnership } from "../../Middleware/business.middleware.js";

const router = express.Router();

router.post("/register/business/:userId", BusinessController.register);

router.get("/businesses", BusinessController.getBusinesses);

router.put(
  "/business/:userId",
  verifyBusinessOwnership,
  BusinessController.updateBusiness
);

router.delete(
  "/business/:userId",
  verifyBusinessOwnership,
  BusinessController.deleteBusiness
);

export { router as BusinessRoutes };
