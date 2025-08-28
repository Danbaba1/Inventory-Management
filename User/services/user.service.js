import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import User from "../model/user.model.js";
import nodemailer from "nodemailer";

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

      const existingUser = await User.findOne({ email });

      if (existingUser) {
        throw new Error("User already exists");
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const newUser = new User({
        name,
        phone,
        password: hashedPassword,
        email,
      });

      await newUser.save();

      return "User registered successfully";
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
      const mailOptions = {
        to: user.email,
        subject: "Password Reset",
        html: `<h2>Password Reset Request</h2>
        <p>Click the link below to reset your password:</p>
        <a href="${baseUrl}/reset-password/${resetToken}">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>`,
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
        .select("-password -resetToken -resetTokenExpiry")
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
}

export default UserService;
