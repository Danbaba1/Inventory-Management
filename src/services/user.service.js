import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";
import { supabase } from "../config/supabase.js";
import EmailTemplates from "../utils/emailTemplate.js";
import { ErrorResponse } from "../utils/apiHelpers.js";

/**
 * USER SERVICE - PostgreSQL/Supabase Implementation
 * Comprehensive user management system with authentication, email verification, and password management
 * UPDATED: Now uses ErrorResponse for consistent error handling
 */
class UserService {
  /**
   * Create administrative user with elevated privileges and immediate verification
   */
  static async createAdmin(email, password) {
    if (!email || !password) {
      throw ErrorResponse.badRequest("Please provide both email and password");
    }

    if (password.length < 8) {
      throw ErrorResponse.badRequest(
        "Password must be at least 8 characters long"
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw ErrorResponse.badRequest("Please provide a valid email address");
    }

    // Check if admin already exists with this email
    const { data: existingAdmin, error: checkError } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      throw ErrorResponse.internal("Failed to check admin existence");
    }

    if (existingAdmin) {
      throw ErrorResponse.conflict("Admin with this email already exists");
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const { data: newAdmin, error } = await supabase
      .from("users")
      .insert({
        name: "Administrator",
        email,
        password: hashedPassword,
        role: "admin",
        is_email_verified: true,
        is_active: true,
      })
      .select("id, name, email, role")
      .single();

    if (error) {
      console.error("Admin creation error:", error);
      throw ErrorResponse.internal("Failed to create admin");
    }

    return {
      message:
        "Admin created successfully. Please login to access admin features.",
      admin: {
        id: newAdmin.id,
        name: newAdmin.name,
        email: newAdmin.email,
        role: newAdmin.role,
      },
    };
  }

  /**
   * Register new user with comprehensive validation and email verification workflow
   */
  static async register(name, phone, password, email) {
    if (!name || !phone || !password || !email) {
      throw ErrorResponse.badRequest("Please complete your details");
    }

    if (password.length < 8) {
      throw ErrorResponse.badRequest(
        "Password must be at least 8 characters long"
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw ErrorResponse.badRequest("Please provide a valid email address");
    }

    const { data: existingUser, error: checkError } = await supabase
      .from("users")
      .select("id, is_email_verified, email")
      .eq("email", email)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      throw ErrorResponse.internal("Failed to check user existence");
    }

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
      throw ErrorResponse.conflict("User already exists and is verified");
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

    if (error) {
      console.error("User registration error:", error);
      throw ErrorResponse.internal("Failed to register user");
    }

    await this.sendVerificationOTP(email);

    return {
      message:
        "User registered successfully. Please verify your email with the OTP sent to your email address",
      userId: newUser.id,
      email: newUser.email,
    };
  }

  /**
   * Send email verification OTP with rate limiting and security measures
   */
  static async sendVerificationOTP(email) {
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (error && error.code === "PGRST116") {
      throw ErrorResponse.notFound("User not found");
    }

    if (error) {
      console.error("User fetch error:", error);
      throw ErrorResponse.internal("Failed to retrieve user");
    }

    if (user.is_email_verified) {
      throw ErrorResponse.badRequest("Email is already verified");
    }

    if (user.last_otp_sent) {
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
      if (new Date(user.last_otp_sent) > oneMinuteAgo) {
        throw ErrorResponse.tooManyRequests(
          "Please wait 1 minute before requesting another OTP"
        );
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

    if (updateError) {
      console.error("OTP update error:", updateError);
      throw ErrorResponse.internal("Failed to generate OTP");
    }

    // Send email
    try {
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
      console.error("Email sending error:", err);
      if (err.code === "EAUTH" || err.code === "ECONNECTION") {
        throw ErrorResponse.serviceUnavailable(
          "Email service temporarily unavailable"
        );
      }
      throw ErrorResponse.internal("Failed to send verification email");
    }
  }

  /**
   * Verify user's email using OTP with attempt limiting and security validation
   */
  static async verifyEmailOTP(email, otp) {
    if (!email || !otp) {
      throw ErrorResponse.badRequest("Email and OTP are required");
    }

    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (error && error.code === "PGRST116") {
      throw ErrorResponse.notFound("User not found");
    }

    if (error) {
      console.error("User fetch error:", error);
      throw ErrorResponse.internal("Failed to retrieve user");
    }

    if (user.is_email_verified) {
      throw ErrorResponse.badRequest("Email is already verified");
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

      throw ErrorResponse.tooManyRequests(
        "Too many failed attempts. Please request a new OTP"
      );
    }

    if (
      !user.email_otp ||
      !user.otp_expiry ||
      new Date(user.otp_expiry) < new Date()
    ) {
      throw ErrorResponse.badRequest(
        "OTP has expired. Please request a new one"
      );
    }

    if (user.email_otp !== otp) {
      const newAttempts = user.otp_attempts + 1;

      await supabase
        .from("users")
        .update({ otp_attempts: newAttempts })
        .eq("email", email);

      const remainingAttempts = 5 - newAttempts;
      throw ErrorResponse.badRequest(
        `Invalid OTP. ${remainingAttempts} attempts remaining`
      );
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

    if (updateError) {
      console.error("User verification error:", updateError);
      throw ErrorResponse.internal("Failed to verify email");
    }

    return {
      message: "Email verified successfully",
      user: updatedUser,
    };
  }

  /**
   * Send welcome email to newly verified user with error handling
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
   */
  static async resendVerificationOTP(email) {
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (error && error.code === "PGRST116") {
      throw ErrorResponse.notFound("User not found");
    }

    if (error) {
      console.error("User fetch error:", error);
      throw ErrorResponse.internal("Failed to retrieve user");
    }

    if (user.is_email_verified) {
      throw ErrorResponse.badRequest("Email is already verified");
    }

    if (user.otp_attempts >= 5) {
      await supabase
        .from("users")
        .update({
          email_otp: null,
          otp_expiry: null,
        })
        .eq("email", email);

      throw ErrorResponse.tooManyRequests(
        "Too many failed attempts. Please request a new OTP"
      );
    }

    await this.sendVerificationOTP(email);
    return "Verification OTP resent successfully";
  }

  /**
   * Authenticate user login with comprehensive validation and JWT token generation
   */
  static async login(email, password) {
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (error && error.code === "PGRST116") {
      throw ErrorResponse.notFound("User does not exist");
    }

    if (error) {
      console.error("User fetch error:", error);
      throw ErrorResponse.internal("Failed to retrieve user");
    }

    if (!user.is_email_verified) {
      throw ErrorResponse.forbidden(
        "Please verify your email before logging in"
      );
    }

    if (!user.is_active) {
      throw ErrorResponse.forbidden(
        "Account is deactivated. Please contact support"
      );
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      throw ErrorResponse.unauthorized("Invalid Password");
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
  }

  /**
   * Initiate password reset process with secure token generation and email delivery
   */
  static async forgotPassword(email) {
    if (!email) {
      throw ErrorResponse.badRequest("Email is required");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw ErrorResponse.badRequest("Please provide a valid email address");
    }

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("email, is_email_verified")
      .eq("email", email)
      .single();

    if (userError && userError.code !== "PGRST116") {
      throw ErrorResponse.internal("Failed to retrieve user");
    }

    if (!user) {
      console.log(`Password reset attempted for non-existent email: ${email}`);
      return "Password reset link sent successfully";
    }

    if (!user.is_email_verified) {
      throw ErrorResponse.badRequest(
        "Please verify your email first before resetting password"
      );
    }

    const resetToken = jwt.sign(
      { email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const resetTokenExpiry = new Date(Date.now() + 3600000);

    const { error: updateError } = await supabase
      .from("users")
      .update({
        reset_token: resetToken,
        reset_token_expiry: resetTokenExpiry.toISOString(),
      })
      .eq("email", email);

    if (updateError) {
      console.error("Reset token update error:", updateError);
      throw ErrorResponse.internal("Failed to generate reset token");
    }

    try {
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
      console.error("Password reset email error:", err);
      if (err.code === "EAUTH" || err.code === "ECONNECTION") {
        throw ErrorResponse.serviceUnavailable(
          "Email service temporarily unavailable"
        );
      }
      throw ErrorResponse.internal("Failed to send password reset email");
    }
  }

  /**
   * Complete password reset using secure token validation and password update
   */
  static async resetPassword(token, newPassword) {
    if (!token || !newPassword) {
      throw ErrorResponse.badRequest(
        "Reset token and new password are required"
      );
    }

    if (newPassword.length < 8) {
      throw ErrorResponse.badRequest(
        "Password must be at least 8 characters long"
      );
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === "JsonWebTokenError") {
        throw ErrorResponse.badRequest("Invalid token");
      }
      if (err.name === "TokenExpiredError") {
        throw ErrorResponse.badRequest("Token expired");
      }
      throw ErrorResponse.badRequest("Token validation failed");
    }

    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", decoded.email)
      .eq("reset_token", token)
      .single();

    if (error && error.code === "PGRST116") {
      throw ErrorResponse.notFound("Invalid token");
    }

    if (error) {
      console.error("User fetch error:", error);
      throw ErrorResponse.internal("Failed to retrieve user");
    }

    if (new Date(user.reset_token_expiry) < new Date()) {
      throw ErrorResponse.badRequest("Token expired");
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    const { error: updateError } = await supabase
      .from("users")
      .update({
        password: hashedPassword,
        reset_token: null,
        reset_token_expiry: null,
      })
      .eq("email", decoded.email);

    if (updateError) {
      console.error("Password update error:", updateError);
      throw ErrorResponse.internal("Failed to reset password");
    }

    return "Password reset successfully";
  }

  /**
   * Retrieve paginated list of users with administrative filtering and security
   */
  static async getUsers(page = 1, limit = 10) {
    const offset = (page - 1) * limit;

    const { data: users, error, count } = await supabase
      .from("users")
      .select(
        "id, name, email, phone, role, is_active, is_email_verified, created_at, updated_at",
        { count: "exact" }
      )
      .neq("role", "admin")
      .range(offset, offset + limit - 1)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Users fetch error:", error);
      throw ErrorResponse.internal("Failed to retrieve users");
    }

    const totalPages = Math.ceil((count || 0) / limit);
    const message =
      !users || users.length === 0
        ? "No users to display"
        : "Users retrieved successfully";

    return {
      message,
      users: users || [],
      pagination: {
        currentPage: page,
        totalPages,
        totalUsers: count || 0,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Get user's email verification status and OTP attempt information
   */
  static async getUserVerificationStatus(email) {
    const { data: user, error } = await supabase
      .from("users")
      .select("is_email_verified, otp_attempts, otp_expiry")
      .eq("email", email)
      .single();

    if (error && error.code === "PGRST116") {
      throw ErrorResponse.notFound("User not found");
    }

    if (error) {
      console.error("User fetch error:", error);
      throw ErrorResponse.internal("Failed to retrieve user status");
    }

    return {
      isVerified: user.is_email_verified,
      otpAttempts: user.otp_attempts || 0,
      otpExpired: user.otp_expiry
        ? new Date(user.otp_expiry) < new Date()
        : true,
      canAttempt: (user.otp_attempts || 0) < 5,
      canSendOTP: (user.otp_attempts || 0) < 5,
    };
  }
}

export default UserService;