import { supabase } from "../config/supabase.js";

/**
 * Business Ownership Verification Middleware - Updated for Supabase
 */
export const verifyBusinessOwnership = async (req, res, next) => {
  try {
    // Extract business ID from multiple possible sources
    const id = req.params.id || req.query.id || req.body.businessId;

    // Validate business ID presence
    if (!id) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Business ID is required",
      });
    }

    // Extract authenticated user ID from request context
    const userId = req.user?.userId;

    // Validate user authentication
    if (!userId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User authentication required",
      });
    }

    // Query business WITHOUT is_active filter to provide specific error messages
    const { data: business, error } = await supabase
      .from("businesses")
      .select("*")
      .eq("id", id)
      .single();

    // Validate business existence and ownership
    if (error || !business) {
      return res.status(404).json({
        error: "Not Found",
        message: "Business not found",
      });
    }

    if (business.owner_id !== userId) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You are not authorized to access this business"
      })
    }

    if (!business.is_active) {
      return res.status(403).json({
        error: "Forbidden",
        message: "Cannot perform operations on deactivated business"
      });
    }

    // Inject verified business context into request object
    req.business = business;

    // Pass control to next middleware or route handler
    next();
  } catch (err) {
    // Log error for debugging and security monitoring
    console.error("Business ownership verification error:", err);

    // Return generic error to prevent information disclosure
    res.status(500).json({
      error: "Internal Server Error",
      message: "Error verifying business ownership",
    });
  }
};