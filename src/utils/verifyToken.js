import jwt from "jsonwebtoken";

const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWTSECRET);
    return decoded;
  } catch (err) {
    throw new Error("Invalid token");
  }
};

export default verifyToken;
