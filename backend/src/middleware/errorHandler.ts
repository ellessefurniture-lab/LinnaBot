import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { sendError } from '../utils/apiResponse';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): Response => {
  logger.error(`Unhandled Error [${req.method} ${req.url}]:`, {
    message: err.message,
    stack: err.stack,
    body: req.body,
    ip: req.ip,
  });

  const statusCode = err.statusCode || err.status || 500;
  const message =
    process.env.NODE_ENV === 'production' && statusCode === 500
      ? 'An unexpected error occurred. Please contact the administrator.'
      : err.message || 'Internal server error';

  return sendError(res, message, statusCode, err.errors || null);
};

export const notFoundHandler = (req: Request, res: Response): Response => {
  return sendError(res, `Route not found: ${req.method} ${req.originalUrl}`, 404);
};
