import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import User from "../models/user.model.js";
import nodemailer from "nodemailer";
import EmailTemplates from "../utils/emailTemplate.js";

class UserService {
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

      return "Password reset succesfully";
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
