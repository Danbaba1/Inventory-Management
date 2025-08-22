import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import User from "./user.model.js";
import nodemailer from "nodemailer";

class UserService {
  static async createAdmin(name, password) {
    try {
      const existingAdmin = await User.findOne({ name });

      if (existingAdmin) {
        throw new Error("Admin already exists");
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const newAdmin = new User({
        name,
        password: hashedPassword,
        role: "admin",
      });

      await newAdmin.save();
      return "Admin created successfully";
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
        process.env.JWTSECRET,
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
      const user = await User.findOne({ email });

      if (!user) {
        throw new Error("User not found");
      }

      const resetToken = jwt.sign(
        { email: user.email },
        process.env.JWTSECRET,
        { expiresIn: "1h" }
      );
      user.resetToken = resetToken;
      const resetTokenExpiry = Date.now() + 3600000;
      user.resetTokenExpiry = resetTokenExpiry;

      await user.save();

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
      });

      const mailOptions = {
        to: user.email,
        subject: "Password Reset",
        text: `Click the password reset link: http://localhost:3000/reset-password/${resetToken}`,
      };

      await transporter.sendMail(mailOptions);
      return "Password reset link sent successfully";
    } catch (err) {
      throw new Error(err.message);
    }
  }

  static async resetPassword(token, newPassword) {
    try {
      const decoded = jwt.verify(token, process.env.JWTSECRET);
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
      throw new Error(err.message);
    }
  }
}

export default UserService;
