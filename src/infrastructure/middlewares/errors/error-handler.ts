import type { Request, Response, NextFunction } from 'express';
import { AppError } from './app-error';

export function errorHandler(
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      status: 'error',
      message: error.message,
      ...(error instanceof Error &&
        'errors' in error && { errors: (error as any).errors }),
    });
    return;
  }

  console.error('❌ Unexpected error:', error);

  res.status(500).json({
    status: 'error',
    message:
      process.env.NODE_ENV === 'development'
        ? error.message
        : 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && {
      stack: error.stack,
    }),
  });
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
