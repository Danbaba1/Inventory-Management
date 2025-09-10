import Business from "../models/business.model.js";

export const verifyBusinessOwnership = async (req, res, next) => {
  try {
    const id = req.params.id || req.query.id || req.body.businessId;

    if (!id) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Business ID is required",
      });
    }

    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User authentication required",
      });
    }

    const business = await Business.findOne({
      _id: id,
      owner: userId,
      isActive: true,
    });

    if (!business) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You don't have access to this business",
      });
    }

    req.business = business;
    next();
  } catch (err) {
    console.error("Business ownership verification error:", err);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Error verifying business ownership",
    });
  }
};
