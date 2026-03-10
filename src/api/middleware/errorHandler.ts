import { Request, Response, NextFunction } from "express";

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const statusCode = err.statusCode ?? 500;
  const message = err.message ?? "Internal server error";

  console.error(`[API] Error ${statusCode} on ${req.method} ${req.path}:`, message);

  res.status(statusCode).json({
    error: {
      code: err.code ?? "INTERNAL_ERROR",
      message,
      path: req.path,
      timestamp: new Date().toISOString(),
    },
  });
}

export function notFound(req: Request, res: Response): void {
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: `Route ${req.method} ${req.path} not found`,
      timestamp: new Date().toISOString(),
    },
  });
}