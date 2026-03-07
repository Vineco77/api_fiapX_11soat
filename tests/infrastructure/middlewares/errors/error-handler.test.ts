jest.mock('@/infrastructure/monitoring', () => ({
  logError: jest.fn(),
}));

import { errorHandler, asyncHandler } from '@/infrastructure/middlewares/errors/error-handler';
import { ValidationError, BadRequestError } from '@/infrastructure/middlewares/errors/app-error';
import type { Request, Response, NextFunction } from 'express';

function createMockRequest(overrides: Partial<Request> = {}): Partial<Request> {
  return {
    originalUrl: '/test',
    url: '/test',
    ...overrides,
  };
}

function createMockResponse(): Partial<Response> {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('Error Handler Middleware', () => {
  const mockNext: NextFunction = jest.fn();

  describe('errorHandler', () => {
    it('should handle AppError with correct status code', () => {
      const error = new BadRequestError('Invalid input');
      const req = createMockRequest();
      const res = createMockResponse();

      errorHandler(error, req as Request, res as Response, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: 'Invalid input',
        })
      );
    });

    it('should include errors array for ValidationError', () => {
      const error = new ValidationError('Validation failed', ['field required']);
      const req = createMockRequest();
      const res = createMockResponse();

      errorHandler(error, req as Request, res as Response, mockNext);

      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: 'Validation failed',
          errors: ['field required'],
        })
      );
    });

    it('should return 500 for unexpected errors', () => {
      const error = new Error('Something went wrong');
      const req = createMockRequest();
      const res = createMockResponse();

      // Set NODE_ENV to production for safe message
      const origEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      errorHandler(error, req as Request, res as Response, mockNext);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: 'Internal server error',
        })
      );

      process.env.NODE_ENV = origEnv;
    });

    it('should include error message in development mode', () => {
      const error = new Error('Detailed error info');
      const req = createMockRequest();
      const res = createMockResponse();

      const origEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      errorHandler(error, req as Request, res as Response, mockNext);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Detailed error info',
        })
      );

      process.env.NODE_ENV = origEnv;
    });
  });

  describe('asyncHandler', () => {
    it('should call the handler function', async () => {
      const handler = jest.fn().mockResolvedValue(undefined);
      const wrappedHandler = asyncHandler(handler);
      const req = {} as Request;
      const res = {} as Response;
      const next = jest.fn();

      wrappedHandler(req, res, next);

      // Wait for the promise to resolve
      await new Promise(process.nextTick);

      expect(handler).toHaveBeenCalledWith(req, res, next);
      expect(next).not.toHaveBeenCalled();
    });

    it('should pass errors to next when handler rejects', async () => {
      const error = new Error('Async error');
      const handler = jest.fn().mockRejectedValue(error);
      const wrappedHandler = asyncHandler(handler);
      const req = {} as Request;
      const res = {} as Response;
      const next = jest.fn();

      wrappedHandler(req, res, next);

      await new Promise(process.nextTick);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
