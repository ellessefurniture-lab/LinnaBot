import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma } from '../utils/prisma';
import { sendError } from '../utils/apiResponse';

export interface AuthenticatedUser {
  id: string;
  email: string;
  username: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      admin?: AuthenticatedUser;
    }
  }
}

export const authenticateAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    let token: string | undefined;

    // 1. Check Authorization Header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && (req.cookies.token || req.cookies.admin_token)) {
      // 2. Check Cookie
      token = req.cookies.token || req.cookies.admin_token;
    }

    if (!token) {
      return sendError(res, 'Authentication required. Please login.', 401);
    }

    // Verify token
    const decoded = jwt.verify(token, config.JWT_SECRET) as {
      id: string;
      email: string;
      username: string;
      role: string;
    };

    // Verify admin still exists in database
    const admin = await prisma.admin.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, username: true, role: true },
    });

    if (!admin) {
      return sendError(res, 'User session invalid or account removed.', 401);
    }

    req.admin = admin;
    return next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return sendError(res, 'Session expired. Please login again.', 401);
    }
    return sendError(res, 'Invalid authentication token.', 401);
  }
};
