import type { Request, Response, NextFunction } from 'express';
import { AppError } from './app-error';
import { logError } from '@/infrastructure/monitoring';

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const traceId = (req as any).traceId;
  const user = (req as any).user;
  const url = req.originalUrl || req.url;

  if (error instanceof AppError) {
    logError({
      traceId,
      errorType: error.constructor.name,
      errorMessage: error.message,
      statusCode: error.statusCode,
      clientId: user?.clientId,
      url,
      stack: error.stack,
    });

    res.status(error.statusCode).json({
      status: 'error',
      message: error.message,
      ...(error instanceof Error &&
        'errors' in error && { errors: (error as any).errors }),
    });
    return;
  }

  logError({
    traceId,
    errorType: 'UnexpectedError',
    errorMessage: error.message,
    statusCode: 500,
    clientId: user?.clientId,
    url,
    stack: error.stack,
  });

  console.error('Unexpected error:', error);

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
