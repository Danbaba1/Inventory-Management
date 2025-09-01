import express from "express";
import UserController from "../controllers/user.controller.js";
import {
  authorizeAdmin,
  requireUnverifiedEmail,
} from "../middleware/auth.middleware.js";
import ValidationMiddleware from "../validation/validation.middleware.js";

const router = express.Router();

// Admin routes
router.post("/create/admin", UserController.createAdmin);

// User authentication routes
router.post(
  "/register",
  ValidationMiddleware.validateRegistration,
  UserController.register
);
router.post("/login", ValidationMiddleware.validateLogin, UserController.login);

// Email verification routes
router.post(
  "/verify-email",
  ValidationMiddleware.validateOTP,
  UserController.verifyEmail
);
router.post(
  "/resend-otp",
  ValidationMiddleware.validateEmail,
  ValidationMiddleware.rateLimitOTP,
  requireUnverifiedEmail,
  UserController.resendOTP
);

// Password reset routes
router.post(
  "/forgot/password",
  ValidationMiddleware.validateEmail,
  UserController.forgotPassword
);
router.post("/reset/password", UserController.resetPassword);

// Admin protected routes
router.get("/users", authorizeAdmin, UserController.getUsers);

export { router as UserRoutes };
