import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";
import { supabase } from "../config/supabase.js";
import EmailTemplates from "../utils/emailTemplate.js";

/**
 * USER SERVICE - Fixed for PostgreSQL/Supabase
 * Manages user authentication, registration, email verification, and password management
 */
class UserService {
  /**
   * Create administrative user with elevated privileges
   */
  static async createAdmin(name, password) {
    try {
      if (!name || !password) {
        throw new Error("Please provide both name and password");
      }

      if (password.length < 8) {
        throw new Error("Password must be at least 8 characters long");
      }

      // Check if admin already exists
      const { data: existingAdmin } = await supabase
        .from("users")
        .select("id")
        .eq("name", name)
        .single();

      if (existingAdmin) {
        throw new Error("Admin already exists");
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const { data: newAdmin, error } = await supabase
        .from("users")
        .insert({
          name,
          email: "admin@gmail.com",
          password: hashedPassword,
          role: "admin",
          is_email_verified: true,
        })
        .select()
        .single();

      if (error) throw error;

      const payload = {
        userId: newAdmin.id,
        email: newAdmin.email,
        role: newAdmin.role,
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: "24h",
      });

      return {
        message: "Admin created successfully",
        admin: {
          id: newAdmin.id,
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
   * Send email verification OTP to user
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
   * Send welcome email to newly verified user
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
   * Authenticate user login with email and password
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
   * Initiate password reset process with email verification
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
   * Complete password reset using secure token
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
   * Retrieve paginated list of users (excluding admins)
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
   * Get user's email verification status and OTP attempt information
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