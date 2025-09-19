import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";
import { supabase } from "../config/supabase.js";
import EmailTemplates from "../utils/emailTemplate.js";

/**
 * USER SERVICE - PostgreSQL/Supabase Implementation
 * Comprehensive user management system with authentication, email verification, and password management
 * Provides secure user registration, login, password reset, and administrative functions
 * Implements rate limiting, security measures, and email-based verification workflows
 */
class UserService {
  /**
 * Create administrative user with elevated privileges and immediate verification
 * Creates admin account without generating token - admin must login separately
 * 
 * @param {string} email - Administrator email (required, must be unique)
 * @param {string} password - Administrator password (required, minimum 8 characters)
 * 
 * @returns {Object} Admin creation result without JWT token
 * @throws {Error} If validation fails, admin already exists, or creation fails
 */
  static async createAdmin(email, password) {
    try {
      if (!email || !password) {
        throw new Error("Please provide both email and password");
      }

      if (password.length < 8) {
        throw new Error("Password must be at least 8 characters long");
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error("Please provide a valid email address");
      }

      // Check if admin already exists with this email
      const { data: existingAdmin } = await supabase
        .from("users")
        .select("id")
        .eq("email", email)
        .single();

      if (existingAdmin) {
        throw new Error("Admin with this email already exists");
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const { data: newAdmin, error } = await supabase
        .from("users")
        .insert({
          name: "Administrator", // Default name, can be updated later
          email,
          password: hashedPassword,
          role: "admin",
          is_email_verified: true, // Admins are pre-verified
          is_active: true
        })
        .select("id, name, email, role")
        .single();

      if (error) throw error;

      return {
        message: "Admin created successfully. Please login to access admin features.",
        admin: {
          id: newAdmin.id,
          name: newAdmin.name,
          email: newAdmin.email,
          role: newAdmin.role,
        },
      };
    } catch (err) {
      throw new Error(err.message);
    }
  }

  /**
   * Register new user with comprehensive validation and email verification workflow
   * Creates user account with unverified status and initiates email verification process
   * 
   * @param {string} name - User's full name (required)
   * @param {string} phone - User's phone number (required)
   * @param {string} password - User's password (required, minimum 8 characters)
   * @param {string} email - User's email address (required, must be valid format)
   * 
   * @returns {Object} Registration result with user ID and verification instructions
   * @throws {Error} If validation fails, user exists and verified, or registration fails
   * 
   * Business Logic:
   * - Validates all required fields and formats (email regex, password length)
   * - Handles existing unverified users by resending verification OTP
   * - Creates new user with unverified status (is_email_verified = false)
   * - Automatically triggers email verification OTP sending
   * - Implements secure password hashing with bcrypt
   * 
   * Email Verification Workflow:
   * - New users require email verification before login
   * - Existing unverified users receive new OTP automatically
   * - Verified users cannot register again with same email
   * - OTP is sent immediately after successful registration
   * 
   * Security Features:
   * - Email format validation with regex
   * - Password strength requirement (minimum 8 characters)
   * - Secure password hashing with salt
   * - Duplicate email handling with verification status check
   * 
   * Use Cases:
   * - New user account creation
   * - User onboarding with email verification
   * - Account recovery for unverified users
   */
  static async register(name, phone, password, email) {
    try {
      if (!name || !phone || !password || !email) {
        throw new Error("Please complete your details");
      }

      if (password.length < 8) {
        throw new Error("Password must be at least 8 characters long");
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error("Please provide a valid email address");
      }

      const { data: existingUser } = await supabase
        .from("users")
        .select("id, is_email_verified, email")
        .eq("email", email)
        .single();

      if (existingUser) {
        if (!existingUser.is_email_verified) {
          await this.sendVerificationOTP(email);
          return {
            message:
              "User already exists but email not verified. New verification OTP sent.",
            userId: existingUser.id,
            email: existingUser.email,
          };
        }
        throw new Error("User already exists and is verified");
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const { data: newUser, error } = await supabase
        .from("users")
        .insert({
          name,
          phone,
          password: hashedPassword,
          email,
          is_email_verified: false,
        })
        .select("id, email")
        .single();

      if (error) throw error;

      await this.sendVerificationOTP(email);

      return {
        message:
          "User registered successfully. Please verify your email with the OTP sent to your email address",
        userId: newUser.id,
        email: newUser.email,
      };
    } catch (err) {
      throw new Error(err.message);
    }
  }

  /**
   * Send email verification OTP with rate limiting and security measures
   * Generates and sends time-limited OTP for email verification with anti-spam protection
   * 
   * @param {string} email - User's email address to send OTP (required)
   * 
   * @returns {string} Success message confirming OTP delivery
   * @throws {Error} If user not found, already verified, rate limited, or email service fails
   * 
   * Business Logic:
   * - Validates user exists and requires verification
   * - Implements 1-minute rate limiting between OTP requests
   * - Generates 6-digit random numeric OTP
   * - Sets 10-minute expiry time for security
   * - Resets attempt counter to allow fresh verification tries
   * - Sends professionally formatted HTML email with OTP
   * 
   * Rate Limiting Features:
   * - 1-minute cooldown between OTP requests per user
   * - Tracks last OTP sent timestamp to enforce limits
   * - Prevents spam and abuse of verification system
   * - Resets attempt counter on new OTP generation
   * 
   * Security Measures:
   * - 6-digit numeric OTP for balance of security and usability
   * - 10-minute expiry window to prevent replay attacks
   * - OTP stored securely in database with expiry timestamp
   * - Email service error handling and user feedback
   * 
   * Email Features:
   * - Professional HTML email template with branding
   * - Clear OTP presentation and expiry information
   * - Uses nodemailer with Gmail service integration
   * - Comprehensive error handling for email delivery issues
   */
  static async sendVerificationOTP(email) {
    try {
      const { data: user, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .single();

      if (error || !user) {
        throw new Error("User not found");
      }

      if (user.is_email_verified) {
        throw new Error("Email is already verified");
      }

      if (user.last_otp_sent) {
        const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
        if (new Date(user.last_otp_sent) > oneMinuteAgo) {
          throw new Error("Please wait 1 minute before requesting another OTP");
        }
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      const { error: updateError } = await supabase
        .from("users")
        .update({
          email_otp: otp,
          otp_expiry: otpExpiry.toISOString(),
          last_otp_sent: new Date().toISOString(),
          otp_attempts: 0,
        })
        .eq("email", email);

      if (updateError) throw updateError;

      // Send email
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      const mailOptions = {
        to: user.email,
        subject: "Verify Your Email Address - OTP Inside",
        html: EmailTemplates.getVerificationEmailTemplate(otp, user.name),
      };

      await transporter.sendMail(mailOptions);
      return "Verification OTP sent successfully";
    } catch (err) {
      if (err.code === "EAUTH" || err.code === "ECONNECTION") {
        throw new Error("Email service temporarily unavailable");
      }
      throw new Error(err.message);
    }
  }

  /**
   * Verify user's email using OTP with attempt limiting and security validation
   * Completes email verification process with comprehensive security checks and user activation
   * 
   * @param {string} email - User's email address (required)
   * @param {string} otp - 6-digit OTP code from email (required)
   * 
   * @returns {Object} Verification result with user details and success confirmation
   * @throws {Error} If validation fails, OTP invalid/expired, or maximum attempts exceeded
   * 
   * Business Logic:
   * - Validates user exists and requires verification
   * - Implements maximum 5 attempt limit with automatic OTP invalidation
   * - Checks OTP validity and expiry timestamp
   * - Activates user account by setting is_email_verified = true
   * - Clears verification data after successful verification
   * - Returns verified user information for immediate use
   * 
   * Security Features:
   * - Maximum 5 verification attempts before OTP invalidation
   * - Time-based OTP expiry (10 minutes from generation)
   * - Automatic OTP clearing after max attempts reached
   * - Attempt counter increment on each failed attempt
   * - Clear error messaging with remaining attempts information
   * 
   * Attempt Management:
   * - Tracks failed attempts per OTP generation cycle
   * - Provides remaining attempt count in error messages
   * - Automatically invalidates OTP after 5 failed attempts
   * - Requires new OTP request after attempt limit reached
   * 
   * Verification Completion:
   * - Sets user as email verified (is_email_verified = true)
   * - Clears OTP data (email_otp, otp_expiry, otp_attempts)
   * - Returns complete user profile for session establishment
   * - Enables user login and full system access
   * 
   * Use Cases:
   * - Email verification completion during registration
   * - Account activation after registration
   * - Email ownership confirmation for security
   */
  static async verifyEmailOTP(email, otp) {
    try {
      if (!email || !otp) {
        throw new Error("Email and OTP are required");
      }

      const { data: user, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .single();

      if (error || !user) {
        throw new Error("User not found");
      }

      if (user.is_email_verified) {
        throw new Error("Email is already verified");
      }

      if (user.otp_attempts >= 5) {
        // Clear OTP data when max attempts reached
        await supabase
          .from("users")
          .update({
            email_otp: null,
            otp_expiry: null,
          })
          .eq("email", email);

        throw new Error("Too many failed attempts. Please request a new OTP");
      }

      if (!user.email_otp || !user.otp_expiry || new Date(user.otp_expiry) < new Date()) {
        throw new Error("OTP has expired. Please request a new one");
      }

      if (user.email_otp !== otp) {
        const newAttempts = user.otp_attempts + 1;

        await supabase
          .from("users")
          .update({ otp_attempts: newAttempts })
          .eq("email", email);

        const remainingAttempts = 5 - newAttempts;
        throw new Error(`Invalid OTP. ${remainingAttempts} attempts remaining`);
      }

      // OTP is valid, verify the user
      const { data: updatedUser, error: updateError } = await supabase
        .from("users")
        .update({
          is_email_verified: true,
          email_otp: null,
          otp_expiry: null,
          otp_attempts: 0,
        })
        .eq("email", email)
        .select("id, name, email, is_email_verified")
        .single();

      if (updateError) throw updateError;

      return {
        message: "Email verified successfully",
        user: updatedUser,
      };
    } catch (err) {
      throw new Error(err.message);
    }
  }

  /**
   * Send welcome email to newly verified user with error handling
   * Delivers professional welcome message after successful email verification
   * 
   * @param {string} email - User's verified email address (required)
   * @param {string} userName - User's name for personalization (required)
   * 
   * @returns {void} No return value (non-critical operation)
   * 
   * Business Logic:
   * - Sends welcome email after successful email verification
   * - Uses professional HTML email template with personalization
   * - Non-critical operation that doesn't halt user flow on failure
   * - Logs errors but doesn't throw exceptions to prevent disruption
   * 
   * Error Handling:
   * - Graceful failure handling without throwing errors
   * - Error logging for monitoring and troubleshooting
   * - User flow continuation even if welcome email fails
   * - Silent failure to prevent user experience disruption
   * 
   * Use Cases:
   * - Post-verification user engagement
   * - Welcome messaging and onboarding communication
   * - Brand impression and user experience enhancement
   */
  static async sendWelcomeEmail(email, userName) {
    try {
      const transporter = nodemailer.createTransporter({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      const mailOptions = {
        to: email,
        subject: "Welcome! Your Account is Now Active",
        html: EmailTemplates.getWelcomeEmailTemplate(userName),
      };

      await transporter.sendMail(mailOptions);
    } catch (err) {
      console.error("Welcome email error:", err);
      // Don't throw error as this is not critical
    }
  }

  /**
   * Resend verification OTP with attempt validation and rate limiting
   * Provides OTP resending capability with security measures and attempt management
   * 
   * @param {string} email - User's email address requiring verification (required)
   * 
   * @returns {string} Success message confirming OTP resending
   * @throws {Error} If user not found, already verified, or attempt limit exceeded
   * 
   * Business Logic:
   * - Validates user exists and still requires verification
   * - Checks current attempt status before allowing resend
   * - Clears existing OTP data if attempt limit exceeded
   * - Delegates to sendVerificationOTP for actual OTP generation and sending
   * 
   * Security Features:
   * - Validates user verification status to prevent unnecessary sends
   * - Implements attempt limit checking (5 attempts maximum)
   * - Automatic OTP data clearing when limit exceeded
   * - Rate limiting through sendVerificationOTP integration
   * 
   * Use Cases:
   * - User-requested OTP resending during verification
   * - Recovery from failed email delivery
   * - Fresh OTP generation after attempt limit reached
   */
  static async resendVerificationOTP(email) {
    try {
      const { data: user, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .single();

      if (error || !user) {
        throw new Error("User not found");
      }

      if (user.is_email_verified) {
        throw new Error("Email is already verified");
      }

      if (user.otp_attempts >= 5) {
        await supabase
          .from("users")
          .update({
            email_otp: null,
            otp_expiry: null,
          })
          .eq("email", email);

        throw new Error("Too many failed attempts. Please request a new OTP");
      }

      await this.sendVerificationOTP(email);
      return "Verification OTP resent successfully";
    } catch (err) {
      throw new Error(err.message);
    }
  }

  /**
   * Authenticate user login with comprehensive validation and JWT token generation
   * Provides secure login functionality with multi-factor validation and session management
   * 
   * @param {string} email - User's email address (required)
   * @param {string} password - User's password (required)
   * 
   * @returns {Object} Authentication result with JWT token and user information
   * @throws {Error} If credentials invalid, user not verified, or account deactivated
   * 
   * Business Logic:
   * - Validates user exists in the system
   * - Verifies email has been confirmed before allowing login
   * - Checks account active status for access control
   * - Validates password using secure bcrypt comparison
   * - Generates JWT token for authenticated session management
   * - Returns user profile data for session establishment
   * 
   * Security Features:
   * - Email verification requirement before login access
   * - Account status validation (is_active check)
   * - Secure password comparison with bcrypt
   * - JWT token generation with 24-hour expiry
   * - Comprehensive error handling with security-conscious messaging
   * 
   * Authentication Flow:
   * 1. User existence validation
   * 2. Email verification status check
   * 3. Account activation status verification
   * 4. Password validation with bcrypt
   * 5. JWT token generation and signing
   * 6. User profile return for session establishment
   * 
   * Session Management:
   * - JWT token includes user ID and email for session identification
   * - 24-hour token expiry for security and session management
   * - User profile data returned for frontend state management
   * - Role-based access control preparation
   * 
   */
  static async login(email, password) {
    try {
      const { data: user, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .single();

      if (error || !user) {
        throw new Error("User does not exist");
      }

      if (!user.is_email_verified) {
        throw new Error("Please verify your email before logging in");
      }

      if (!user.is_active) {
        throw new Error("Account is deactivated. Please contact support");
      }

      const validPassword = await bcrypt.compare(password, user.password);

      if (!validPassword) {
        throw new Error("Invalid Password");
      }

      const jwtToken = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: "24h" }
      );

      return {
        message: "Success",
        jwtToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          is_email_verified: user.is_email_verified,
        },
      };
    } catch (err) {
      throw new Error(err.message);
    }
  }

  /**
   * Initiate password reset process with secure token generation and email delivery
   * Provides secure password recovery functionality with time-limited reset tokens
   * 
   * @param {string} email - User's email address for password reset (required)
   * 
   * @returns {string} Success message (always returns success for security)
   * @throws {Error} If email format invalid or email service unavailable
   * 
   * Business Logic:
   * - Validates email format with regex validation
   * - Silently handles non-existent users for security (prevents email enumeration)
   * - Requires email verification before allowing password reset
   * - Generates JWT-based reset token with 1-hour expiry
   * - Stores reset token and expiry in user record
   * - Sends professional password reset email with secure reset link
   * 
   * Security Features:
   * - Email enumeration protection (always returns success message)
   * - JWT-based reset tokens with cryptographic signatures
   * - 1-hour token expiry for limited attack window
   * - Email verification requirement prevents unauthorized resets
   * - Secure reset URL generation with token embedding
   * - Reset token storage for validation during reset process
   * 
   * Token Management:
   * - JWT tokens signed with application secret
   * - 1-hour expiry (3600000 milliseconds) for security
   * - Token includes user email for identification
   * - Database storage of token and expiry for validation
   * - Automatic token invalidation after use or expiry
   * 
   * Email Features:
   * - Professional HTML email template with branding
   * - Secure reset URL with embedded token
   * - Clear instructions and expiry information
   * - Base URL configuration for environment flexibility
   * - Comprehensive error handling for email delivery
   * 
   * Use Cases:
   * - User-initiated password recovery
   * - Account access restoration for verified users
   * - Security incident response and password updates
   */
  static async forgotPassword(email) {
    try {
      if (!email) {
        throw new Error("Email is required");
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error("Please provide a valid email address");
      }

      const { data: user } = await supabase
        .from("users")
        .select("email, is_email_verified")
        .eq("email", email)
        .single();

      if (!user) {
        console.log(
          `Password reset attempted for non-existent email: ${email}`
        );
        return "Password reset link sent successfully";
      }

      if (!user.is_email_verified) {
        throw new Error(
          "Please verify your email first before resetting password"
        );
      }

      const resetToken = jwt.sign(
        { email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );

      const resetTokenExpiry = new Date(Date.now() + 3600000);

      await supabase
        .from("users")
        .update({
          reset_token: resetToken,
          reset_token_expiry: resetTokenExpiry.toISOString(),
        })
        .eq("email", email);

      const transporter = nodemailer.createTransporter({
        service: "gmail",
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
      });

      const baseUrl = process.env.BASE_URL || "http://localhost:3000";
      const resetUrl = `${baseUrl}/reset-password/${resetToken}`;

      const mailOptions = {
        to: user.email,
        subject: "Password Reset Request",
        html: EmailTemplates.getPasswordResetTemplate(resetUrl),
      };

      await transporter.sendMail(mailOptions);
      return "Password reset link sent successfully";
    } catch (err) {
      if (err.code === "EAUTH" || err.code === "ECONNECTION") {
        throw new Error("Email service temporarily unavailable");
      }
      throw new Error(err.message);
    }
  }

  /**
   * Complete password reset using secure token validation and password update
   * Finalizes password recovery process with comprehensive security validation
   * 
   * @param {string} token - JWT reset token from email link (required)
   * @param {string} newPassword - New password to set (required, minimum 8 characters)
   * 
   * @returns {string} Success message confirming password reset completion
   * @throws {Error} If token invalid/expired, password weak, or reset fails
   * 
   * Business Logic:
   * - Validates JWT token signature and expiry
   * - Verifies token exists in user record and hasn't expired
   * - Enforces password strength requirements
   * - Updates password with secure bcrypt hashing
   * - Clears reset token data after successful reset
   * - Prevents token reuse through immediate invalidation
   * 
   * Security Features:
   * - JWT token cryptographic validation
   * - Database token matching for additional security
   * - Token expiry validation (1-hour window)
   * - Password strength enforcement (minimum 8 characters)
   * - Secure password hashing with bcrypt and salt
   * - Automatic token cleanup after use
   * 
   * Token Validation Process:
   * 1. JWT signature and payload verification
   * 2. Database token matching for authenticity
   * 3. Expiry timestamp validation
   * 4. User existence and token ownership verification
   * 5. Token invalidation after successful password reset
   * 
   * Password Security:
   * - Minimum 8-character length requirement
   * - Secure bcrypt hashing with salt generation
   * - Immediate token invalidation prevents reuse
   * - Database atomic update for consistency
   * 
   * Error Handling:
   * - Specific JWT error handling (invalid, expired tokens)
   * - Generic error masking for security
   * - Clear user feedback for different failure scenarios
   * 
   * Use Cases:
   * - Password recovery completion
   * - Secure password updates via email verification
   * - Account access restoration after verification
   */
  static async resetPassword(token, newPassword) {
    try {
      if (!token || !newPassword) {
        throw new Error("Reset token and new password are required");
      }

      if (newPassword.length < 8) {
        throw new Error("Password must be at least 8 characters long");
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const { data: user, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", decoded.email)
        .eq("reset_token", token)
        .single();

      if (error || !user) {
        throw new Error("Invalid token");
      }

      if (new Date(user.reset_token_expiry) < new Date()) {
        throw new Error("Token expired");
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      await supabase
        .from("users")
        .update({
          password: hashedPassword,
          reset_token: null,
          reset_token_expiry: null,
        })
        .eq("email", decoded.email);

      return "Password reset successfully";
    } catch (err) {
      if (err.name === "JsonWebTokenError") {
        throw new Error("Invalid token");
      }

      if (err.name === "TokenExpiredError") {
        throw new Error("Token expired");
      }
      throw new Error(err.message);
    }
  }

  /**
   * Retrieve paginated list of users with administrative filtering and security
   * Provides user management functionality for administrative operations
   * 
   * @param {number} page - Page number for pagination (default: 1)
   * @param {number} limit - Number of users per page (default: 10)
   * 
   * @returns {Object} Paginated user list with metadata and navigation information
   * @throws {Error} If database query fails
   * 
   * Returned Data Structure:
   * - users: Array of user objects with sanitized information:
   *   - Basic profile data (id, name, email, phone, role)
   *   - Account status (is_active, is_email_verified)
   *   - Timestamps (created_at, updated_at)
   * - pagination: Standard pagination object with navigation flags
   * 
   * Business Logic:
   * - Excludes administrative users from listing for security
   * - Returns only essential user information (no sensitive data)
   * - Orders by creation date (newest users first)
   * - Implements pagination for large user bases
   * 
   * Security Features:
   * - Admin users excluded from public user listings
   * - Sensitive fields (password, OTP data) excluded from response
   * - Role-based filtering to separate admin and regular users
   * 
   * Use Cases:
   * - Administrative user management interfaces
   * - User directory and listing functionality
   * - System monitoring and user analytics
   * - Customer support and account management
   */
  static async getUsers(page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;

      const { data: users, error, count } = await supabase
        .from("users")
        .select("id, name, email, phone, role, is_active, is_email_verified, created_at, updated_at", { count: "exact" })
        .neq("role", "admin")
        .range(offset, offset + limit - 1)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return {
        users,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil((count || 0) / limit),
          totalUsers: count || 0,
          hasNext: page < Math.ceil((count || 0) / limit),
          hasPrev: page > 1,
        },
      };
    } catch (err) {
      throw new Error(err.message);
    }
  }

  /**
   * Get user's email verification status and OTP attempt information for frontend state management
   * Provides comprehensive verification status for user interface and flow control
   * 
   * @param {string} email - User's email address to check (required)
   * 
   * @returns {Object} Detailed verification status with attempt information and capabilities
   * @throws {Error} If user not found or query fails
   * 
   * Returned Status Information:
   * - isVerified: Boolean indicating email verification completion
   * - otpAttempts: Current number of failed OTP attempts (0-5)
   * - otpExpired: Boolean indicating if current OTP has expired
   * - canAttempt: Boolean indicating if user can still attempt verification
   * - canSendOTP: Boolean indicating if new OTP can be requested
   * 
   * Business Logic:
   * - Provides real-time verification status for UI state management
   * - Includes attempt tracking for security enforcement
   * - Calculates capability flags for frontend flow control
   * - Handles edge cases (null values, missing data)
   * 
   * Frontend Integration Features:
   * - Boolean flags for conditional UI rendering
   * - Attempt counter for user feedback and progress indication
   * - Capability flags for enabling/disabling action buttons
   * - Expiry status for OTP validity indication
   * 
   * Use Cases:
   * - Verification form state management
   * - UI flow control for verification process
   * - User feedback and progress indication
   * - Security enforcement in frontend applications
   * 
   * Security Considerations:
   * - Reveals minimal security-sensitive information
   * - Supports proper rate limiting enforcement
   * - Enables secure user experience flows
   */
  static async getUserVerificationStatus(email) {
    try {
      const { data: user, error } = await supabase
        .from("users")
        .select("is_email_verified, otp_attempts, otp_expiry")
        .eq("email", email)
        .single();

      if (error || !user) {
        throw new Error("User not found");
      }

      return {
        isVerified: user.is_email_verified,
        otpAttempts: user.otp_attempts || 0,
        otpExpired: user.otp_expiry ? new Date(user.otp_expiry) < new Date() : true,
        canAttempt: (user.otp_attempts || 0) < 5,
        canSendOTP: (user.otp_attempts || 0) < 5,
      };
    } catch (err) {
      throw new Error(err.message);
    }
  }
}

export default UserService;