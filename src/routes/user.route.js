import express from "express";
import UserController from "../controllers/user.controller.js";
import {
  authorizeAdmin,
  requireUnverifiedEmail,
} from "../middleware/auth.middleware.js";
import ValidationMiddleware from "../validation/validation.middleware.js";

const userRouter = express.Router();

/**
 * User Management Routes
 * Controllers handle the business logic - see UserController for detailed implementation
 */

// Admin routes
/**
 * POST /create/admin - Create admin user
 * Public endpoint (likely protected by app-level security)
 */
userRouter.post("/create/admin", UserController.createAdmin);

// User authentication routes
/**
 * POST /register - Register new user account
 * Includes registration validation
 */
userRouter.post(
  "/register",
  ValidationMiddleware.validateRegistration,
  UserController.register
);

/**
 * POST /login - User login authentication
 * Includes login validation
 */
userRouter.post("/login", ValidationMiddleware.validateLogin, UserController.login);

// Email verification routes
/**
 * POST /verify-email - Verify user email with OTP
 * Includes OTP validation
 */
userRouter.post(
  "/verify-email",
  ValidationMiddleware.validateOTP,
  UserController.verifyEmail
);

/**
 * POST /resend-otp - Resend email verification OTP
 * Includes rate limiting and requires unverified email
 */
userRouter.post(
  "/resend-otp",
  ValidationMiddleware.validateEmail,
  ValidationMiddleware.rateLimitOTP,
  requireUnverifiedEmail,
  UserController.resendOTP
);

// Password reset routes
/**
 * POST /forgot/password - Request password reset
 * Includes email validation
 */
userRouter.post(
  "/forgot/password",
  ValidationMiddleware.validateEmail,
  UserController.forgotPassword
);

/**
 * POST /reset/password - Reset user password
 * Public endpoint with token validation
 */
userRouter.post("/reset/password", UserController.resetPassword);

// Admin protected routes
/**
 * GET /users - Get all users
 * Requires admin authorization
 */
userRouter.get("/users", authorizeAdmin, UserController.getUsers);

export { userRouter as UserRoutes };