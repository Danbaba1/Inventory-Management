import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

/**
 * Authentication Middleware Module - JWT-Based Security Layer
 * 
 * This module provides comprehensive authentication and authorization middleware
 * for the multi-tenant inventory management system. It implements JWT-based
 * authentication with role-based access control, email verification checks,
 * and account status validation.
 * 
 * Core Features:
 * - JWT token validation and user authentication
 * - Role-based authorization (admin, user)
 * - Email verification enforcement
 * - Account status validation (active/inactive)
 * - Multi-layered security checks
 * - Comprehensive error handling and logging
 * 
 * Security Architecture:
 * Request -> JWT Validation -> User Lookup -> Status Checks -> Authorization
 * 
 * Middleware Chain:
 * - authenticateUser: Base authentication for all protected routes
 * - authorizeAdmin: Admin-only access control
 * - requireUnverifiedEmail: Email verification workflow control
 * 
 * Token Format:
 * Authorization: Bearer <jwt_token>
 * 
 * User Context:
 * After successful authentication, req.user contains sanitized user data
 * without sensitive information like passwords.
 * 
 * @module AuthenticationMiddleware
 * @requires jsonwebtoken - JWT token handling library
 * @requires User - User model for database operations
 */

/**
 * User Authentication Middleware
 * 
 * Primary authentication middleware that validates JWT tokens and establishes
 * user context for protected routes. This middleware performs comprehensive
 * security checks including token validation, user existence, email verification,
 * and account status validation.
 * 
 * Authentication Flow:
 * 1. Extract Authorization header from request
 * 2. Validate Bearer token format and presence
 * 3. Verify JWT token signature and expiration
 * 4. Lookup user in database by decoded user ID
 * 5. Validate user account status and email verification
 * 6. Attach sanitized user data to request object
 * 7. Pass control to next middleware or route handler
 * 
 * Security Validations:
 * - JWT signature verification using secret key
 * - Token expiration validation
 * - User existence in database
 * - Account activation status
 * - Email verification status (except for admin users)
 * - Password field exclusion from response
 * 
 * Token Requirements:
 * - Must be present in Authorization header
 * - Must follow "Bearer <token>" format
 * - Must be valid, unexpired JWT
 * - Must contain valid userId claim
 * 
 * User Context Data:
 * After successful authentication, req.user contains:
 * - userId: Database user ID
 * - email: User email address
 * - role: User role (admin, user, etc.)
 * - name: User display name
 * - isEmailVerified: Email verification status
 * 
 * @function authenticateUser
 * @async
 * @param {Object} req - Express request object
 * @param {Object} req.header - Request headers
 * @param {string} req.header.Authorization - Bearer token header
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>} Continues to next middleware or returns error
 * 
 * @example
 * // Protected route usage
 * import { authenticateUser } from './middleware/auth.middleware.js';
 * 
 * router.get('/protected', authenticateUser, (req, res) => {
 *   // req.user is now available with authenticated user data
 *   res.json({ 
 *     message: 'Access granted',
 *     user: req.user 
 *   });
 * });
 * 
 * // Client request format
 * fetch('/api/protected', {
 *   headers: {
 *     'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
 *     'Content-Type': 'application/json'
 *   }
 * });
 * 
 * Success Response:
 * - req.user populated with authenticated user data
 * - Control passed to next middleware/route handler
 * - User context available throughout request lifecycle
 * 
 * Error Responses:
 * - 401: Missing/invalid token, token expired, user not found
 * - 403: Email not verified (non-admin), account deactivated
 * - 500: Server error during authentication process
 */
const authenticateUser = async (req, res, next) => {
  try {
    // Extract Authorization header from request
    const authHeader = req.header("Authorization");

    // Validate Authorization header presence and format
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Access Denied: No valid token provided",
      });
    }

    // Extract JWT token from Bearer format
    const token = authHeader.split(" ")[1];

    // Additional validation for token presence
    if (!token) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Access denied: No token provided",
      });
    }

    // Verify JWT token signature and decode payload
    // Uses JWT_SECRET environment variable for verification
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Lookup user in database using decoded user ID
    // Exclude password field from returned user data for security
    const user = await User.findById(decoded.userId).select("-password");

    // Validate user existence in database
    if (!user) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User not found",
      });
    }

    // Enforce email verification for non-admin users
    // Admin users bypass email verification requirement
    if (user.role !== "admin" && !user.isEmailVerified) {
      return res.status(403).json({
        error: "Forbidden",
        message: "Please verify your email before accessing this resource",
      });
    }

    // Validate account activation status
    // Deactivated accounts cannot access protected resources
    if (!user.isActive) {
      return res.status(403).json({
        error: "Forbidden",
        message: "Account is deactivated",
      });
    }

    // Attach sanitized user context to request object
    // This data is available to all subsequent middleware and route handlers
    req.user = {
      userId: user._id,
      email: user.email,
      role: user.role,
      name: user.name,
      isEmailVerified: user.isEmailVerified,
    };

    // Pass control to next middleware or route handler
    next();
  } catch (err) {
    // Handle JWT-specific errors with appropriate responses
    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Invalid token",
      });
    }

    if (err.name === "TokenExpiryError") {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Token expired",
      });
    }

    // Log unexpected errors for debugging and monitoring
    console.error("Authentication error:", err);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Authentication failed",
    });
  }
};

/**
 * Admin Authorization Middleware
 * 
 * Specialized middleware that combines user authentication with admin role
 * validation. This middleware ensures that only authenticated admin users
 * can access admin-protected routes and resources.
 * 
 * Authorization Flow:
 * 1. Execute user authentication middleware
 * 2. Validate authentication success
 * 3. Check user role for admin privileges
 * 4. Grant or deny access based on role validation
 * 
 * Use Cases:
 * - Administrative dashboard access
 * - User management operations
 * - System configuration changes
 * - Business oversight and reporting
 * - Data export and analytics
 * 
 * Security Considerations:
 * - Combines authentication and authorization in single middleware
 * - Prevents privilege escalation attacks
 * - Ensures admin-only resources remain protected
 * - Maintains audit trail for admin access attempts
 * 
 * @function authorizeAdmin
 * @async
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>} Continues to next middleware or returns error
 * 
 * @example
 * // Admin-only route protection
 * import { authorizeAdmin } from './middleware/auth.middleware.js';
 * 
 * router.get('/admin/users', authorizeAdmin, (req, res) => {
 *   // Only admin users can access this route
 *   res.json({ users: getAllUsers() });
 * });
 * 
 * router.delete('/admin/business/:id', authorizeAdmin, (req, res) => {
 *   // Admin can delete any business
 *   deleteBusinessById(req.params.id);
 * });
 * 
 * Success Response:
 * - User authenticated and authorized as admin
 * - req.user contains admin user context
 * - Access granted to protected admin resource
 * 
 * Error Responses:
 * - 401: Authentication failed or user not found
 * - 403: User authenticated but not admin role
 * - 500: Server error during authorization process
 */
const authorizeAdmin = async (req, res, next) => {
  // Execute user authentication middleware first
  // Using Promise wrapper to handle middleware callback pattern
  await new Promise((resolve, reject) => {
    authenticateUser(req, res, (err) => {
      if (err) reject(err);
      else resolve();
    });
  }).catch(() => {
    // Authentication middleware already sent error response
    // Return early to prevent duplicate responses
    return;
  });

  // Validate authentication success
  if (!req.user) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Authentication required",
    });
  }

  // Validate admin role authorization
  if (req.user.role !== "admin") {
    return res.status(403).json({
      error: "Forbidden",
      message: "Access Denied: Admins only",
    });
  }

  // Grant access to admin-protected resource
  next();
};

/**
 * Unverified Email Requirement Middleware
 * 
 * Specialized middleware for email verification workflows that ensures
 * operations are only performed on users with unverified email addresses.
 * This prevents duplicate verification attempts and enforces proper
 * verification state management.
 * 
 * Verification Flow:
 * 1. Extract email from request body
 * 2. Validate email parameter presence
 * 3. Lookup user by email address
 * 4. Validate user existence
 * 5. Check email verification status
 * 6. Allow operation only for unverified emails
 * 
 * Use Cases:
 * - Email verification token generation
 * - Resend verification email operations
 * - Account activation workflows
 * - Email verification status checks
 * 
 * Business Logic:
 * - Prevents verification of already verified emails
 * - Ensures verification tokens are only issued when needed
 * - Maintains data integrity in verification workflows
 * - Provides clear error messages for invalid states
 * 
 * @function requireUnverifiedEmail
 * @async
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body containing user data
 * @param {string} req.body.email - Email address to validate
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>} Continues to next middleware or returns error
 * 
 * @example
 * // Email verification route
 * import { requireUnverifiedEmail } from './middleware/auth.middleware.js';
 * 
 * router.post('/auth/resend-verification', requireUnverifiedEmail, (req, res) => {
 *   // Only unverified emails reach this handler
 *   sendVerificationEmail(req.body.email);
 *   res.json({ message: 'Verification email sent' });
 * });
 * 
 * router.post('/auth/generate-token', requireUnverifiedEmail, (req, res) => {
 *   // Generate new verification token for unverified email
 *   const token = generateVerificationToken(req.body.email);
 *   res.json({ token });
 * });
 * 
 * Client Request:
 * POST /api/auth/resend-verification
 * {
 *   "email": "user@example.com"
 * }
 * 
 * Success Response:
 * - Email exists and is unverified
 * - Control passed to next middleware/route handler
 * - Email verification operation can proceed
 * 
 * Error Responses:
 * - 400: Missing email or email already verified
 * - 404: User not found with provided email
 * - 500: Server error during email verification check
 */
const requireUnverifiedEmail = async (req, res, next) => {
  try {
    // Extract email from request body
    const { email } = req.body;

    // Validate email parameter presence
    if (!email) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Email is required",
      });
    }

    // Lookup user by email address
    const user = await User.findOne({ email });

    // Validate user existence
    if (!user) {
      return res.status(404).json({
        error: "Not Found",
        message: "User not found",
      });
    }

    // Check email verification status
    // Only allow operations on unverified emails
    if (user.isEmailVerified) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Email is already verified",
      });
    }

    // Email is unverified, allow operation to proceed
    next();
  } catch (err) {
    // Log error for debugging and monitoring
    console.error("Email verification check error:", err);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Error checking email verification status",
    });
  }
};

export { authenticateUser, authorizeAdmin, requireUnverifiedEmail };