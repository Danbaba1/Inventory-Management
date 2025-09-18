import jwt from "jsonwebtoken";
import { supabase } from "../config/supabase.js";

/**
 * User Authentication Middleware - Updated for Supabase
 */
const authenticateUser = async (req, res, next) => {
  try {
    // Extract Authorization header from request
    const authHeader = req.header("Authorization");

    // Validate Authorization header presence and format
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Access Denied: No valid token provided",
      });
    }

    // Extract JWT token from Bearer format
    const token = authHeader.split(" ")[1];

    // Additional validation for token presence
    if (!token) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Access denied: No token provided",
      });
    }

    // Verify JWT token signature and decode payload
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Lookup user in Supabase using decoded user ID
    const { data: user, error } = await supabase
      .from("users")
      .select("id, email, role, name, is_email_verified, is_active")
      .eq("id", decoded.userId)
      .single();

    // Validate user existence in database
    if (error || !user) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User not found",
      });
    }

    // Enforce email verification for non-admin users
    if (user.role !== "admin" && !user.is_email_verified) {
      return res.status(403).json({
        error: "Forbidden",
        message: "Please verify your email before accessing this resource",
      });
    }

    // Validate account activation status
    if (!user.is_active) {
      return res.status(403).json({
        error: "Forbidden",
        message: "Account is deactivated",
      });
    }

    // Attach sanitized user context to request object
    req.user = {
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      isEmailVerified: user.is_email_verified,
    };

    // Pass control to next middleware or route handler
    next();
  } catch (err) {
    // Handle JWT-specific errors with appropriate responses
    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Invalid token",
      });
    }

    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Token expired",
      });
    }

    // Log unexpected errors for debugging and monitoring
    console.error("Authentication error:", err);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Authentication failed",
    });
  }
};

/**
 * Admin Authorization Middleware
 */
const authorizeAdmin = async (req, res, next) => {
  // Execute user authentication middleware first
  await new Promise((resolve, reject) => {
    authenticateUser(req, res, (err) => {
      if (err) reject(err);
      else resolve();
    });
  }).catch(() => {
    return;
  });

  // Validate authentication success
  if (!req.user) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Authentication required",
    });
  }

  // Validate admin role authorization
  if (req.user.role !== "admin") {
    return res.status(403).json({
      error: "Forbidden",
      message: "Access Denied: Admins only",
    });
  }

  // Grant access to admin-protected resource
  next();
};

/**
 * Unverified Email Requirement Middleware - Updated for Supabase
 */
const requireUnverifiedEmail = async (req, res, next) => {
  try {
    // Extract email from request body
    const { email } = req.body;

    // Validate email parameter presence
    if (!email) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Email is required",
      });
    }

    // Lookup user by email address in Supabase
    const { data: user, error } = await supabase
      .from("users")
      .select("email, is_email_verified")
      .eq("email", email)
      .single();

    // Validate user existence
    if (error || !user) {
      return res.status(404).json({
        error: "Not Found",
        message: "User not found",
      });
    }

    // Check email verification status
    if (user.is_email_verified) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Email is already verified",
      });
    }

    // Email is unverified, allow operation to proceed
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