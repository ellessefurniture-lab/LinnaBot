import { Request, Response } from 'express';
import { z } from 'zod';
import { AuthService } from '../services/authService';
import { sendError, sendSuccess } from '../utils/apiResponse';
import { logAdminAction } from '../middleware/auditLogger';

export const loginSchema = z.object({
  identifier: z.string().min(1, 'Email or username is required'),
  password: z.string().min(1, 'Password is required'),
});

export class AuthController {
  static async login(req: Request, res: Response) {
    const { identifier, password } = req.body;
    const result = await AuthService.login(identifier, password);

    if (!result) {
      return sendError(res, 'Invalid credentials', 401);
    }

    // Set HTTP-Only Cookie
    res.cookie('token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    req.admin = result.admin;
    await logAdminAction(req, 'LOGIN', 'Admin', result.admin.id, { identifier });

    return sendSuccess(res, result, 'Login successful');
  }

  static async logout(req: Request, res: Response) {
    if (req.admin) {
      await logAdminAction(req, 'LOGOUT', 'Admin', req.admin.id);
    }
    res.clearCookie('token');
    return sendSuccess(res, null, 'Logged out successfully');
  }

  static async me(req: Request, res: Response) {
    if (!req.admin) {
      return sendError(res, 'Unauthorized', 401);
    }

    const admin = await AuthService.getAdminById(req.admin.id);
    if (!admin) {
      return sendError(res, 'User not found', 404);
    }

    return sendSuccess(res, admin, 'User profile fetched');
  }
}
