import jwt from 'jsonwebtoken';
import User from '../models/User.js';


const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('Warning: JWT_SECRET is not defined in environment variables. Using default secret for development.');
    return 'default_development_secret';
  }
  return secret;
};

const JWT_SECRET = getJwtSecret();


export const auth = async (req, res, next) => {
  try {
    const authheader = req.headers.authorization;  // Fixed: headers (plural)
    if (!authheader) {
      return res.status(401).json({
        status: "error",
        message: "No authentication token provided"
      });
    }
    const token = authheader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findById(decoded.userId).select("-password");
    if (!user) {
      return res.status(401).json({
        status: "error",
        message: "User not found"
      });
    }

    req.user = {
      id: user._id.toString(),
      email: user.email,
      name: user.name
    };
    next();

  } catch (err) {
    res.status(404).json({
      status: "error",
      message: "Token Invalid!"
    });
  }
};

export const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: '7d',
  });
};