import { Request } from 'express';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

export const logAdminAction = async (
  req: Request,
  action: string,
  entity: string,
  entityId?: string,
  details?: Record<string, any>
) => {
  try {
    const adminId = req.admin?.id;
    const ipAddress = req.ip || req.socket.remoteAddress || null;
    const userAgent = req.headers['user-agent'] || null;

    await prisma.auditLog.create({
      data: {
        adminId: adminId || null,
        action,
        entity,
        entityId: entityId || null,
        details: details ? JSON.stringify(details) : null,
        ipAddress: typeof ipAddress === 'string' ? ipAddress : null,
        userAgent: typeof userAgent === 'string' ? userAgent : null,
      },
    });
  } catch (error) {
    logger.error('Failed to write audit log:', error);
  }
};
