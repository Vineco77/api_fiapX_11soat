jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('trace-uuid-123'),
}));

jest.mock('@/infrastructure/monitoring', () => ({
  logRequest: jest.fn(),
  logResponse: jest.fn(),
}));

import { loggingMiddleware } from '@/infrastructure/middlewares/logging.middleware';
import type { Request, Response, NextFunction } from 'express';

const { logRequest, logResponse } = jest.requireMock('@/infrastructure/monitoring');

function createMockRequest(): Partial<Request> {
  return {
    method: 'GET',
    originalUrl: '/videos',
    url: '/videos',
    get: jest.fn().mockReturnValue('Mozilla/5.0'),
  };
}

function createMockResponse(): Partial<Response> {
  const res: Partial<Response> & { statusCode: number } = {
    statusCode: 200,
    send: jest.fn(),
  };
  return res;
}

describe('Logging Middleware', () => {
  let mockNext: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    mockNext = jest.fn();
  });

  it('should call next()', () => {
    const req = createMockRequest();
    const res = createMockResponse();

    loggingMiddleware(req as Request, res as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });

  it('should set traceId on request', () => {
    const req = createMockRequest();
    const res = createMockResponse();

    loggingMiddleware(req as Request, res as Response, mockNext);

    expect((req as any).traceId).toBe('trace-uuid-123');
  });

  it('should log request', () => {
    const req = createMockRequest();
    const res = createMockResponse();

    loggingMiddleware(req as Request, res as Response, mockNext);

    expect(logRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        traceId: 'trace-uuid-123',
        method: 'GET',
        url: '/videos',
      })
    );
  });

  it('should log response when send is called', () => {
    const req = createMockRequest();
    const res = createMockResponse();

    loggingMiddleware(req as Request, res as Response, mockNext);

    // Simulate response send
    (res as any).send('response body');

    expect(logResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        traceId: 'trace-uuid-123',
        method: 'GET',
        url: '/videos',
        statusCode: 200,
        duration: expect.any(Number),
      })
    );
  });
});
