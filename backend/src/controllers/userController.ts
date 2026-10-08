import { Request, Response } from 'express';
import { z } from 'zod';
import { UserStatus } from '../types/enums';
import { UserService } from '../services/userService';
import { sendError, sendPaginated, sendSuccess } from '../utils/apiResponse';
import { logAdminAction } from '../middleware/auditLogger';

export const getUsersQuerySchema = z.object({
  search: z.string().optional(),
  status: z.nativeEnum(UserStatus).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
});

export const updateUserStatusSchema = z.object({
  status: z.nativeEnum(UserStatus),
});

export class UserController {
  static async getUsers(req: Request, res: Response) {
    const { search, status, page, limit } = req.query as any;
    const result = await UserService.getUsers({
      search,
      status,
      page: Number(page) || 1,
      limit: Number(limit) || 10,
    });

    return sendPaginated(
      res,
      result.users,
      result.total,
      result.page,
      result.limit,
      'Users retrieved successfully'
    );
  }

  static async getUserById(req: Request, res: Response) {
    const { id } = req.params;
    const user = await UserService.getUserById(id);

    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    return sendSuccess(res, user, 'User details retrieved');
  }

  static async updateUser(req: Request, res: Response) {
    const { id } = req.params;
    const { status } = req.body;

    const user = await UserService.getUserById(id);
    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    const updated = await UserService.updateUserStatus(id, status);
    await logAdminAction(req, 'UPDATE_USER_STATUS', 'User', id, { previous: user.status, new: status });

    return sendSuccess(res, updated, 'User status updated successfully');
  }

  static async deleteUser(req: Request, res: Response) {
    const { id } = req.params;
    const user = await UserService.getUserById(id);
    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    await UserService.deleteUser(id);
    await logAdminAction(req, 'DELETE_USER', 'User', id, { telegramId: user.telegramId });

    return sendSuccess(res, null, 'User deleted successfully');
  }
}
