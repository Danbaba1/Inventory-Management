import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import User from "../models/user.model.js";
import nodemailer from "nodemailer";
import EmailTemplates from "../utils/emailTemplate.js";

/**
 * USER SERVICE
 * Manages user authentication, registration, email verification, and password management
 * Handles admin creation, OTP verification, and user session management
 */
class UserService {
  /**
   * Create administrative user with elevated privileges
   * 
   * @description Creates an admin user with pre-verified email and generates JWT token
   * 
   * Algorithm:
   * 1. Validate input parameters (name and password)
   * 2. Check password strength requirements
   * 3. Verify admin doesn't already exist
   * 4. Hash password with bcrypt salt
   * 5. Create admin user with verified status
   * 6. Generate JWT token for immediate authentication
   * 
   * @param {string} name - Admin username (required, must be unique)
   * @param {string} password - Admin password (required, min 8 characters)
   * 
   * @returns {Object} Creation result with admin data and JWT token
   * @throws {Error} Validation errors, duplicate admin, or database errors
   */
  static async createAdmin(name, password) {
    try {
      if (!name || !password) {
        throw new Error("Please provide both name and password");
      }

      if (password.length < 8) {
        throw new Error("Password must be at least 8 characters long");
      }

      const existingAdmin = await User.findOne({ name });
      if (existingAdmin) {
        throw new Error("Admin already exists");
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const newAdmin = new User({
        name,
        email: "admin@gmail.com",
        password: hashedPassword,
        role: "admin",
        isEmailVerified: true,
      });

      await newAdmin.save();

      const payload = {
        userId: newAdmin._id,
        email: newAdmin.email,
        role: newAdmin.role,
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: "24h",
      });

      return {
        message: "Admin created successfully",
        admin: {
          id: newAdmin._id,
          name: newAdmin.name,
          role: newAdmin.role,
          token,
        },
      };
    } catch (err) {
      throw new Error(err.message);
    }
  }

  /**
   * Register new user with email verification workflow
   * 
   * @description Complex registration process with email validation and OTP sending
   * 
   * Algorithm:
   * 1. Validate all required fields and email format
   * 2. Check password strength requirements
   * 3. Handle existing user scenarios (verified vs unverified)
   * 4. Hash password and create user record
   * 5. Initiate email verification process with OTP
   * 
   * @param {string} name - User's full name (required)
   * @param {string} phone - User's phone number (required)
   * @param {string} password - User password (required, min 8 characters)
   * @param {string} email - User's email address (required, must be valid format)
   * 
   * @returns {Object} Registration result with user ID and verification message
   * @throws {Error} Validation errors, duplicate verified user, or email service errors
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

      const existingUser = await User.findOne({ email });

      if (existingUser) {
        if (!existingUser.isEmailVerified) {
          // If user exists but email not verified, allow resending OTP
          await this.sendVerificationOTP(email);
          return {
            message:
              "User already exists but email not verified. New verification OTP sent.",
            userId: existingUser._id,
            email: existingUser.email,
          };
        }
        throw new Error("User already exists and is verified");
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const newUser = new User({
        name,
        phone,
        password: hashedPassword,
        email,
        isEmailVerified: false,
      });

      await newUser.save();

      await this.sendVerificationOTP(email);

      return {
        message:
          "User registered successfully. Please verify your email with the OTP sent to your email address",
        userId: newUser._id,
        email: newUser.email,
      };
    } catch (err) {
      throw new Error(err.message);
    }
  }

  /**
   * Send email verification OTP to user
   * 
   * @description Generates and sends OTP with rate limiting and expiry management
   * 
   * Algorithm:
   * 1. Validate user exists and needs verification
   * 2. Check rate limiting for OTP requests (1 minute cooldown)
   * 3. Generate new OTP and set expiry (10 minutes)
   * 4. Update user record with OTP data
   * 5. Send formatted email with OTP using nodemailer
   * 
   * @param {string} email - User's email address for OTP delivery
   * 
   * @returns {string} Success message confirming OTP sent
   * @throws {Error} User not found, already verified, rate limited, or email service errors
   */
  static async sendVerificationOTP(email) {
    try {
      const user = await User.findOne({ email });

      if (!user) {
        throw new Error("User not found");
      }

      if (user.isEmailVerified) {
        throw new Error("Email is already verified");
      }

      if (!user.canSendOTP()) {
        throw new Error("Please wait 1 minute before requesting another OTP");
      }

      const otp = user.generateOTP();
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      user.emailOTP = otp;
      user.otpExpiry = otpExpiry;
      user.lastOTPSent = new Date();
      user.otpAttempts = 0; // Reset attempts when new OTP is sent

      await user.save();

      const transporter = nodemailer.createTransporter({
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
   * Verify user's email using OTP
   * 
   * @description Validates OTP with attempt limiting and completes email verification
   * 
   * Algorithm:
   * 1. Validate input parameters and user existence
   * 2. Check if already verified or too many failed attempts
   * 3. Validate OTP expiry and correctness
   * 4. Handle failed attempts with remaining count feedback
   * 5. Complete verification and clear OTP data on success
   * 
   * @param {string} email - User's email address
   * @param {string} otp - One-time password from email
   * 
   * @returns {Object} Verification result with user data
   * @throws {Error} Invalid OTP, expired, too many attempts, or user not found
   */
  static async verifyEmailOTP(email, otp) {
    try {
      if (!email || !otp) {
        throw new Error("Email and OTP are required");
      }

      const user = await User.findOne({ email });

      if (!user) {
        throw new Error("User not found");
      }

      if (user.isEmailVerified) {
        throw new Error("Email is already verified");
      }

      if (!user.canAttemptOTP()) {
        // Clear OTP data when max attempts reached
        user.emailOTP = null;
        user.otpExpiry = null;
        await user.save();
        throw new Error("Too many failed attempts. Please request a new OTP");
      }

      if (!user.emailOTP || user.otpExpiry < new Date()) {
        throw new Error("OTP has expired. Please request a new one");
      }

      if (user.emailOTP !== otp) {
        user.otpAttempts += 1;
        await user.save();

        const remainingAttempts = 5 - user.otpAttempts;
        throw new Error(`Invalid OTP. ${remainingAttempts} attempts remaining`);
      }

      // OTP is valid, verify the user
      user.isEmailVerified = true;
      user.emailOTP = null;
      user.otpExpiry = null;
      user.otpAttempts = 0;

      await user.save();

      return {
        message: "Email verified successfully",
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          isEmailVerified: user.isEmailVerified,
        },
      };
    } catch (err) {
      throw new Error(err.message);
    }
  }

  /**
   * Send welcome email to newly verified user
   * 
   * @description Non-critical email sending for user onboarding
   * 
   * @param {string} email - User's email address
   * @param {string} userName - User's name for personalization
   * 
   * @returns {void} Does not throw errors to avoid disrupting user flow
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
   * Resend verification OTP to user
   * 
   * @description Wrapper for sendVerificationOTP with additional validation
   * 
   * @param {string} email - User's email address
   * 
   * @returns {string} Success message confirming OTP resent
   * @throws {Error} User not found, already verified, or rate limited
   */
  static async resendVerificationOTP(email) {
    try {
      const user = await User.findOne({ email });

      if (!user) {
        throw new Error("User not found");
      }

      if (user.isEmailVerified) {
        throw new Error("Email is already verified");
      }

      if (!user.canSendOTP()) {
        throw new Error("Please wait 1 minute before requesting another OTP");
      }

      await this.sendVerificationOTP(email);
      return "Verification OTP resent successfully";
    } catch (err) {
      throw new Error(err.message);
    }
  }

  /**
   * Authenticate user login with email and password
   * 
   * @description Complete login workflow with validation and JWT generation
   * 
   * Algorithm:
   * 1. Validate user exists and is verified
   * 2. Check account active status
   * 3. Verify password using bcrypt comparison
   * 4. Generate JWT token with user data
   * 5. Return authentication result with user info
   * 
   * @param {string} email - User's email address
   * @param {string} password - User's password
   * 
   * @returns {Object} Login result with JWT token and user data
   * @throws {Error} Invalid credentials, unverified email, or deactivated account
   */
  static async login(email, password) {
    try {
      const user = await User.findOne({ email });

      if (!user) {
        throw new Error("User does not exist");
      }

      if (!user.isEmailVerified) {
        throw new Error("Please verify your email before logging in");
      }

      if (!user.isActive) {
        throw new Error("Account is deactivated. Please contact support");
      }

      const validPassword = await bcrypt.compare(password, user.password);

      if (!validPassword) {
        throw new Error("Invalid Password");
      }

      const jwtToken = jwt.sign(
        { userId: user._id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: "24h" }
      );

      return {
        message: "Success",
        jwtToken,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
        },
      };
    } catch (err) {
      throw new Error(err.message);
    }
  }

  /**
   * Initiate password reset process with email verification
   * 
   * @description Secure password reset with token generation and email delivery
   * 
   * Algorithm:
   * 1. Validate email format and user existence
   * 2. Check email verification status
   * 3. Generate secure JWT reset token (1 hour expiry)
   * 4. Store token and expiry in user record
   * 5. Send password reset email with secure link
   * 
   * @param {string} email - User's email address
   * 
   * @returns {string} Success message (same for security regardless of user existence)
   * @throws {Error} Invalid email format, unverified email, or email service errors
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

      const user = await User.findOne({ email });

      if (!user) {
        console.log(
          `Password reset attempted for non-existent email: ${email}`
        );
        return "Password reset link sent successfully";
      }

      if (!user.isEmailVerified) {
        throw new Error(
          "Please verify your email first before resetting password"
        );
      }

      const resetToken = jwt.sign(
        { email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );

      user.resetToken = resetToken;
      const resetTokenExpiry = Date.now() + 3600000;
      user.resetTokenExpiry = resetTokenExpiry;

      await user.save();

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
   * Complete password reset using secure token
   * 
   * @description Validates reset token and updates user password
   * 
   * Algorithm:
   * 1. Validate token and new password requirements
   * 2. Verify JWT token and extract user email
   * 3. Find user with matching token and check expiry
   * 4. Hash new password and update user record
   * 5. Clear reset token data for security
   * 
   * @param {string} token - JWT reset token from email link
   * @param {string} newPassword - New password (min 8 characters)
   * 
   * @returns {string} Success message confirming password reset
   * @throws {Error} Invalid/expired token, weak password, or user not found
   */
  static async resetPassword(token, newPassword) {
    try {
      if (!token) {
        throw new Error("Reset token is required");
      }

      if (!newPassword) {
        throw new Error("New password is required");
      }

      if (newPassword.length < 8) {
        throw new Error("Password must be at least 8 characters long");
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findOne({
        email: decoded.email,
        resetToken: token,
      });

      if (!user) {
        throw new Error("Invalid token");
      }

      if (user.resetTokenExpiry < Date.now()) {
        throw new Error("Token expired");
      }

      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
      user.resetToken = null;
      user.resetTokenExpiry = null;

      await user.save();

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
   * Retrieve paginated list of users (excluding admins)
   * 
   * @description Admin function to fetch all non-admin users with pagination
   * 
   * @param {number} page - Page number (default: 1)
   * @param {number} limit - Items per page (default: 10)
   * 
   * @returns {Object} Paginated users with metadata and sensitive fields excluded
   * @throws {Error} Database query errors
   */
  static async getUsers(page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;

      const query = { role: { $ne: "admin" } };

      const users = await User.find(query)
        .select("-password -resetToken -resetTokenExpiry -emailOTP")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });

      const total = await User.countDocuments(query);

      return {
        users,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalUsers: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1,
        },
      };
    } catch (err) {
      throw new Error(err.message);
    }
  }

  /**
   * Get user's email verification status and OTP attempt information
   * 
   * @description Provides detailed verification status for UI state management
   * 
   * @param {string} email - User's email address
   * 
   * @returns {Object} Comprehensive verification status including attempt limits
   * @throws {Error} User not found or database errors
   */
  static async getUserVerificationStatus(email) {
    try {
      const user = await User.findOne({ email }).select(
        "isEmailVerified otpAttempts otpExpiry"
      );

      if (!user) {
        throw new Error("User not found");
      }

      return {
        isVerified: user.isEmailVerified,
        otpAttempts: user.otpAttempts || 0,
        otpExpired: user.otpExpiry ? user.otpExpiry < new Date() : true,
        canAttempt: user.canAttemptOTP(),
        canSendOTP: user.canSendOTP(),
      };
    } catch (err) {
      throw new Error(err.message);
    }
  }
}

export default UserService;