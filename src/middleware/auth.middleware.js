import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Access Denied: No valid token provided",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Access denied: No token provided",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User not found",
      });
    }

    if (user.role !== "admin" && !user.isEmailVerified) {
      return res.status(403).json({
        error: "Forbidden",
        message: "Please verify your email before accessing this resource",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        error: "Forbidden",
        message: "Account is deactivated",
      });
    }

    req.user = {
      userId: user._id,
      email: user.email,
      role: user.role,
      name: user.name,
      isEmailVerified: user.isEmailVerified,
    };

    next();
  } catch (err) {
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

    console.error("Authentication error:", err);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Authentication failed",
    });
  }
};

const authorizeAdmin = async (req, res, next) => {
  await new Promise((resolve, reject) => {
    authenticateUser(req, res, (err) => {
      if (err) reject(err);
      else resolve();
    });
  }).catch(() => {
    return;
  });

  if (!req.user) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Authentication required",
    });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({
      error: "Forbidden",
      message: "Access Denied: Admins only",
    });
  }

  next();
};

const requireUnverifiedEmail = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Email is required",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        error: "Not Found",
        message: "User not found",
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Email is already verified",
      });
    }

    next();
  } catch (err) {
    console.error("Email verification check error:", err);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Error checking email verification status",
    });
  }
};

export { authenticateUser, authorizeAdmin, requireUnverifiedEmail };
