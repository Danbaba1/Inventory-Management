import UserService from "../../services/user.service.js";

class UserController {
  static async createAdmin(req, res) {
    try {
      const { name, password } = req.body;

      const result = await UserService.createAdmin(name, password);

      res.status(200).json({
        message: "Admin created successfully",
        result: result,
      });
    } catch (err) {
      if (err.message === "Please provide both name and password") {
        return res.status(400).json({
          error: "Bad Request",
          message: err.message,
        });
      }

      if (err.message === "Password must be at least 8 characters long") {
        return res.status(400).json({
          error: "Bad Request",
          message: err.message,
        });
      }

      if (err.message === "Admin already exists") {
        return res.status(409).json({
          error: "Conflict",
          message: err.message,
        });
      }

      console.error("Create admin error", err);
      res.status(500).json({
        error: "Internal Server Error",
        message: "An error occurred while creating admin",
      });
    }
  }

  static async register(req, res) {
    try {
      const { name, phone, password, email } = req.body;

      await UserService.register(name, phone, password, email);

      res.status(200).json({
        message: "Registration successful",
      });
    } catch (err) {
      if (err.message === "Please complete your details") {
        return res.status(400).json({
          error: "Bad Request",
          message: err.message,
        });
      }

      if (err.message === "User already exists") {
        return res.status(409).json({
          error: "Conflict",
          message: err.message,
        });
      }

      console.error("Registration error:", err);
      res.status(500).json({
        error: "Internal Server Error",
        message: "An error occurred during registration",
      });
    }
  }

  static async login(req, res) {
    try {
      const { email, password } = req.body;

      const result = await UserService.login(email, password);

      res.status(200).json({
        message: "Login successful",
        token: result.jwtToken,
        user: result.user,
      });
    } catch (err) {
      if (err.message === "User does not exist") {
        return res.status(401).json({
          error: "Unauthorized",
          message: err.message,
        });
      }

      if (err.message === "Invalid Password") {
        return res.status(400).json({
          error: "Unauthorized",
          message: err.message,
        });
      }

      console.error("Login error", err);
      res.status(500).json({
        error: "Internal Server Error",
        message: "An error occurred during login",
      });
    }
  }

  static async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      const result = await UserService.forgotPassword(email);

      res.status(200).json({
        message: result,
      });
    } catch (err) {
      if (
        err.message === "Email is required" ||
        err.message === "Please provide a valid email address"
      ) {
        return res.status(400).json({
          error: "Bad Request",
          message: err.message,
        });
      }

      if (err.message === "Email service temporarily unavailable") {
        return res.status(503).json({
          error: "Service Unavailable",
          message: "Unable to send email at this time. Please try again later",
        });
      }

      if (err.message === "User not found") {
        return res.status(400).json({
          error: "Bad Request",
          message: err.message,
        });
      }

      console.error("Forgot password error:", err);
      res.status(500).json({
        error: "Internal Server Error",
        message: "An error occured while processing the request",
      });
    }
  }

  static async resetPassword(req, res) {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({
          error: "Bad Request",
          message: "Token and new password are required",
        });
      }

      const result = await UserService.resetPassword(token, newPassword);

      res.status(200).json({
        message: result,
      });
    } catch (err) {
      if (
        err.message === "Reset token is required" ||
        err.message === "New password is required" ||
        err.message === "Password must be at least 8 characters long"
      ) {
        return res.status(400).json({
          error: "Bad Request",
          message: err.message,
        });
      }

      if (err.message === "Invalid token") {
        return res.status(400).json({
          error: "Bad Request",
          message: "Invalid or malformed reset token",
        });
      }

      if (err.message === "Token expired") {
        return res.status(401).json({
          error: "Unauthorized",
          message:
            "Reset token has expired. Please request a new password reset",
        });
      }

      console.error("Reset password error", err);
      res.status(500).json({
        error: "Internal Server Error",
        message: "An error occurred while resetting the password",
      });
    }
  }

  static async getUsers(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      if (page < 1) {
        return res.status(400).json({
          error: "Bad Request",
          message: "Page number must be greater than 0",
        });
      }

      if (limit < 1 || limit > 100) {
        return res.status(400).json({
          error: "Bad Request",
          message: "Limit must be between 1 and 100",
        });
      }

      if (req.user?.role !== "admin") {
        return res.status(403).json({
          error: "Forbidden",
          message: "Admin access required",
        });
      }

      const result = await UserService.getUsers(page, limit);

      res.status(200).json({
        message: "Users retrieved successfully",
        ...result,
      });
    } catch (err) {
      console.error("Error getting users", err);
      res.status(500).json({
        error: "Internal Server Error",
        message: "Error retrieving users",
      });
    }
  }
}

export default UserController;
