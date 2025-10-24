import UserService from "../services/user.service.js";
import { asyncHandler, SuccessResponse, RequestValidator } from "../utils/apiHelpers.js";

/**
 * User Controller - Handles all user-related HTTP requests
 * 
 * This controller manages user authentication, registration, email verification,
 * password reset functionality, and admin operations. It serves as the interface
 * between the HTTP layer and the UserService business logic layer.
 * 
 * Key Features:
 * - User registration with email verification
 * - OTP-based email verification system
 * - JWT-based authentication
 * - Secure password reset via email tokens
 * - Admin user creation and management
 * - Comprehensive error handling with appropriate HTTP status codes
 * 
 * Security Measures:
 * - Input validation and sanitization
 * - Rate limiting for OTP operations
 * - Secure password hashing
 * - Role-based access control
 * 
 * @class UserController
 */
class UserController {

  /**
   * Create Admin User
   * 
   * Creates a new admin user in the system. Admin must login separately after creation.
   * 
   * @static
   * @async
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {string} req.body.email - Admin user's email address
   * @param {string} req.body.password - Admin password (min 8 characters)
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response with admin creation result
   * 
   * @example
   * POST /api/users/admin
   * {
   *   "email": "admin@example.com",
   *   "password": "securepass123"
   * }
   * 
   * Success Response (201):
   * {
   *   "message": "Admin created successfully",
   *   "result": {...},
   *   "nextStep": "Please login using your email and password to access admin features"
   * }
   */
  static createAdmin = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Delegate business logic to service layer
    const result = await UserService.createAdmin(email, password);

    return SuccessResponse.created(
      res,
      {
        ...result,
        nextStep: "Please login using your email and password to access admin features"
      },
      "Admin created successfully"
    );
  });

  /**
   * User Registration
   * 
   * Registers a new user and initiates email verification process.
   * Creates user account in pending state until email is verified.
   * 
   * Registration Flow:
   * 1. Validate input data (name, phone, email, password)
   * 2. Check for existing user with same email
   * 3. Create user account with isEmailVerified: false
   * 4. Generate and send 6-digit OTP via email
   * 5. Return success response with next steps
   * 
   * Business Rules:
   * - Email must be unique across system
   * - Password is hashed using bcrypt
   * - OTP expires after 10 minutes
   * - Account remains inactive until email verification
   * 
   * @static
   * @async
   * @param {Object} req - Express request object
   * @param {Object} req.body - Registration data
   * @param {string} req.body.name - User's full name
   * @param {string} req.body.phone - User's phone number
   * @param {string} req.body.email - User's email address (must be unique)
   * @param {string} req.body.password - User's password
   * @param {Object} res - Express response object
   * @returns {Promise<void>} Registration result with verification instructions
   * 
   * @example
   * POST /api/users/register
   * {
   *   "name": "John Doe",
   *   "phone": "1234567890",
   *   "email": "john@example.com",
   *   "password": "securepass123"
   * }
   * 
   * Success Response (201):
   * {
   *   "message": "Registration successful. Please verify your email.",
   *   "userId": "user_id_string",
   *   "email": "john@example.com",
   *   "nextStep": "Please check your email and verify using the OTP sent"
   * }
   */
  static register = asyncHandler(async (req, res) => {
    const { name, phone, password, email } = req.body;

    // Service layer handles validation, user creation, and OTP sending
    const result = await UserService.register(name, phone, password, email);

    return SuccessResponse.created(
      res,
      {
        userId: result.userId,
        email: result.email,
        nextStep: "Please check your email and verify using the OTP sent"
      },
      result.message
    );
  });

  /**
   * Email Verification with OTP
   * 
   * Verifies user's email address using the 6-digit OTP sent during registration.
   * Completes the user activation process and enables login capability.
   * 
   * Verification Process:
   * 1. Validate OTP format and expiry
   * 2. Check attempt limits (max 5 attempts per OTP)
   * 3. Verify OTP matches stored value
   * 4. Activate user account (isEmailVerified: true)
   * 5. Clear OTP data for security
   * 6. Send welcome email
   * 
   * Security Features:
   * - OTP expires after 10 minutes
   * - Maximum 5 verification attempts per OTP
   * - Rate limiting on OTP requests
   * - Secure OTP storage and clearing
   * 
   * @static
   * @async
   * @param {Object} req - Express request object
   * @param {Object} req.body - Verification data
   * @param {string} req.body.email - User's email address
   * @param {string} req.body.otp - 6-digit verification code
   * @param {Object} res - Express response object
   * @returns {Promise<void>} Verification result
   * 
   * @example
   * POST /api/users/verify-email
   * {
   *   "email": "john@example.com",
   *   "otp": "123456"
   * }
   * 
   * Success Response (200):
   * {
   *   "message": "Email verified successfully",
   *   "user": { userData }
   * }
   */
  static verifyEmail = asyncHandler(async (req, res) => {
    const { email, otp } = req.body;

    // Service handles OTP validation, attempt tracking, and user activation
    const result = await UserService.verifyEmailOTP(email, otp);

    return SuccessResponse.ok(res, result.user, result.message);
  });

  /**
   * Resend OTP
   * 
   * Resends verification OTP to user's email address. Includes rate limiting
   * to prevent spam and abuse of the email service.
   * 
   * Rate Limiting Logic:
   * - Users must wait 1 minute between OTP requests
   * - Maximum 5 OTP requests per hour (implemented in service layer)
   * - New OTP invalidates previous OTP
   * 
   * Use Cases:
   * - Original OTP expired
   * - User didn't receive original email
   * - User exceeded attempt limit on current OTP
   * 
   * @static
   * @async
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request data
   * @param {string} req.body.email - User's email address
   * @param {Object} res - Express response object
   * @returns {Promise<void>} Resend operation result
   * 
   * @example
   * POST /api/users/resend-otp
   * {
   *   "email": "john@example.com"
   * }
   * 
   * Success Response (200):
   * {
   *   "message": "New OTP sent to your email address"
   * }
   */
  static resendOTP = asyncHandler(async (req, res) => {
    const { email } = req.body;

    // Basic input validation
    if (!email) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Email is required",
      });
    }

    // Service handles rate limiting, OTP generation, and email sending
    const message = await UserService.resendVerificationOTP(email);

    return SuccessResponse.ok(res, null, message);
  });

  /**
   * User Login
   * 
   * Authenticates user credentials and returns JWT token for accessing protected routes.
   * Enforces email verification requirement before allowing login.
   * 
   * Authentication Flow:
   * 1. Validate email and password presence
   * 2. Find user by email address
   * 3. Check if email is verified
   * 4. Verify password using bcrypt comparison
   * 5. Generate JWT token with user information
   * 6. Return token and user data (excluding sensitive fields)
   * 
   * Security Features:
   * - Email verification enforcement
   * - Secure password comparison
   * - JWT token generation with expiration
   * - Sensitive data exclusion from response
   * 
   * @static
   * @async
   * @param {Object} req - Express request object
   * @param {Object} req.body - Login credentials
   * @param {string} req.body.email - User's email address
   * @param {string} req.body.password - User's password
   * @param {Object} res - Express response object
   * @returns {Promise<void>} Authentication result with JWT token
   * 
   * @example
   * POST /api/users/login
   * {
   *   "email": "john@example.com",
   *   "password": "securepass123"
   * }
   * 
   * Success Response (200):
   * {
   *   "message": "Login successful",
   *   "token": "jwt_token_string",
   *   "user": { userData }
   * }
   */
  static login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Service handles user lookup, verification checks, and token generation
    const result = await UserService.login(email, password);

    return SuccessResponse.ok(
      res,
      {
        token: result.jwtToken,
        user: result.user
      },
      "Login successful"
    );
  });

  /**
   * Forgot Password
   * 
   * Initiates password reset process by sending secure reset token via email.
   * Only verified users can reset passwords to prevent abuse.
   * 
   * Password Reset Flow:
   * 1. Validate email address format
   * 2. Find user and verify email is confirmed
   * 3. Generate secure reset token with expiration
   * 4. Send reset link via email
   * 5. Store token hash in database with expiry
   * 
   * Security Measures:
   * - Email verification requirement
   * - Secure token generation (crypto)
   * - Token expiration (typically 1 hour)
   * - Rate limiting on reset requests
   * 
   * @static
   * @async
   * @param {Object} req - Express request object
   * @param {Object} req.body - Reset request data
   * @param {string} req.body.email - User's registered email address
   * @param {Object} res - Express response object
   * @returns {Promise<void>} Password reset initiation result
   * 
   * @example
   * POST /api/users/forgot-password
   * {
   *   "email": "john@example.com"
   * }
   * 
   * Success Response (200):
   * {
   *   "message": "Password reset link sent to your email"
   * }
   */
  static forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;

    const message = await UserService.forgotPassword(email);

    return SuccessResponse.ok(res, null, message);
  });

  /**
   * Reset Password
   * 
   * Completes password reset process using the secure token from email.
   * Validates token, updates password, and clears reset data.
   * 
   * Reset Completion Flow:
   * 1. Validate token format and presence
   * 2. Verify token hasn't expired
   * 3. Find user by token
   * 4. Validate new password strength
   * 5. Hash new password with bcrypt
   * 6. Clear reset token data
   * 7. Save updated user record
   * 
   * @static
   * @async
   * @param {Object} req - Express request object
   * @param {Object} req.body - Reset completion data
   * @param {string} req.body.token - Secure reset token from email
   * @param {string} req.body.newPassword - New password (min 8 characters)
   * @param {Object} res - Express response object
   * @returns {Promise<void>} Password reset completion result
   * 
   * @example
   * POST /api/users/reset-password
   * {
   *   "token": "secure_reset_token",
   *   "newPassword": "newsecurepass123"
   * }
   * 
   * Success Response (200):
   * {
   *   "message": "Password reset successfully"
   * }
   */
  static resetPassword = asyncHandler(async (req, res) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Token and new password are required",
      });
    }

    const message = await UserService.resetPassword(token, newPassword);

    return SuccessResponse.ok(res, null, message);
  });

  /**
   * Get Users (Admin Only)
   * 
   * Retrieves paginated list of all users in the system. This is an admin-only
   * endpoint that provides user management capabilities.
   * 
   * Features:
   * - Pagination support (page and limit parameters)
   * - Role-based access control (admin only)
   * - Sensitive data exclusion from response
   * - Total count and pagination metadata
   * 
   * Authorization:
   * - Requires valid JWT token
   * - User must have 'admin' role
   * - Enforced via middleware and controller check
   * 
   * @static
   * @async
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {number} req.query.page - Page number (default: 1)
   * @param {number} req.query.limit - Items per page (default: 10, max: 100)
   * @param {Object} req.user - User data from JWT middleware
   * @param {string} req.user.role - User's role (must be 'admin')
   * @param {Object} res - Express response object
   * @returns {Promise<void>} Paginated user list
   * 
   * @example
   * GET /api/users?page=1&limit=20
   * Headers: Authorization: Bearer admin_jwt_token
   * 
   * Success Response (200):
   * {
   *   "message": "Users retrieved successfully",
   *   "users": [user_objects],
   *   "totalUsers": 150,
   *   "totalPages": 8,
   *   "currentPage": 1,
   *   "hasNextPage": true,
   *   "hasPrevPage": false
   * }
   */
  static getUsers = asyncHandler(async (req, res) => {
    const { page, limit } = RequestValidator.validatePagination(req.query);

    // Role-based access control
    if (req.user?.role !== "admin") {
      return res.status(403).json({
        error: "Forbidden",
        message: "Admin access required",
      });
    }

    // Service handles data retrieval and pagination
    const result = await UserService.getUsers(page, limit);

    return SuccessResponse.okWithPagination(
      res,
      result.users,
      result.pagination,
      "Users retrieved successfully"
    );
  });
}

export default UserController;