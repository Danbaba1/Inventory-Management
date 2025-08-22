import jwt from "jsonwebtoken";
import User from "./user.model.js";

const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json("Access Denied: No valid token provided");
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWTSECRET);

    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json("User not found");
    }

    req.user = {
      userId: user._id,
      email: user.email,
      role: user.role,
      name: user.name,
    };
    next();
  } catch (err) {
    res.status(400).json("Invalid Token");
  }
};

const authorizeAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json("Authentication required");
  }
  if (req.user !== "admin") {
    return res.status(403).json("Access Denied: Admins only");
  }
  next();
};

export { authenticateUser, authorizeAdmin };
