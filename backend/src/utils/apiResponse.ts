import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: any;
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const sendSuccess = <T>(
  res: Response,
  data?: T,
  message = 'Operation successful',
  statusCode = 200
): Response => {
  const body: ApiResponse<T> = {
    success: true,
    message,
    data,
  };
  return res.status(statusCode).json(body);
};

export const sendError = (
  res: Response,
  message = 'Internal server error',
  statusCode = 500,
  errors: any = null
): Response => {
  const body: ApiResponse = {
    success: false,
    message,
    ...(errors && { errors }),
  };
  return res.status(statusCode).json(body);
};

export const sendPaginated = <T>(
  res: Response,
  items: T[],
  total: number,
  page: number,
  limit: number,
  message = 'Data retrieved successfully'
): Response => {
  const totalPages = Math.ceil(total / limit) || 1;
  const body: ApiResponse<T[]> = {
    success: true,
    message,
    data: items,
    meta: {
      total,
      page,
      limit,
      totalPages,
    },
  };
  return res.status(200).json(body);
};
