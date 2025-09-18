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

    // Query Supabase for business with ownership and status validation
    const { data: business, error } = await supabase
      .from("businesses")
      .select("*")
      .eq("id", id)
      .eq("owner_id", userId)
      .eq("is_active", true)
      .single();

    // Validate business existence and ownership
    if (error || !business) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You don't have access to this business",
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