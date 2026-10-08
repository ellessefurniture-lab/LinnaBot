import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { sendPaginated } from '../utils/apiResponse';

export class AuditLogController {
  static async getLogs(req: Request, res: Response) {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          admin: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
      }),
      prisma.auditLog.count(),
    ]);

    return sendPaginated(res, logs, total, page, limit, 'Audit logs retrieved');
  }
}
