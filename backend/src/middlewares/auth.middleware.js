import jwt from 'jsonwebtoken';
import { User } from '../models/user.model.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const authenticate = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")

  if (!token) {
    throw new ApiError(401, 'Authentication required');
  }

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET || "access-token-secret");
    const user = await User.findById(decoded._id).select('-password');

    if (!user) {
      throw new ApiError(401, 'Invalid token');
    }

    if (user.isSuspended) {
      throw new ApiError(403, 'Account suspended due to policy violations');
    }

    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(401, error?.message || 'Invalid access token');
  }
});

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      throw new ApiError(403, 'Access denied');
    }
    next();
  };
};
