jest.mock('axios');
jest.mock('@/infrastructure/monitoring/logger.service', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@/infrastructure/config/env', () => ({
  env: {
    AUTH_GATE: 'http://auth-service:4000',
    JWT_SECRET: 'test-secret',
  },
}));

import { authMiddleware } from '@/infrastructure/middlewares/auth.middleware';
import type { Request, Response, NextFunction } from 'express';
import axios from 'axios';

const mockedAxios = axios as jest.Mocked<typeof axios>;

function createMockRequest(headers: Record<string, string> = {}): Partial<Request> {
  return {
    headers,
    method: 'GET',
    path: '/test',
    ip: '127.0.0.1',
  };
}

function createMockResponse(): Partial<Response> {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('Auth Middleware', () => {
  let mockNext: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    mockNext = jest.fn();
  });

  it('should call next with error when no authorization header', async () => {
    const req = createMockRequest();
    const res = createMockResponse();

    await authMiddleware(req as Request, res as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Missing authorization token',
      })
    );
  });

  it('should call next with error when token format is invalid', async () => {
    const req = createMockRequest({ authorization: 'Basic token123' });
    const res = createMockResponse();

    await authMiddleware(req as Request, res as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Invalid token format. Expected: Bearer <token>',
      })
    );
  });

  it('should call next with error when token is empty', async () => {
    const req = createMockRequest({ authorization: 'Bearer ' });
    const res = createMockResponse();

    await authMiddleware(req as Request, res as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('Token not provided'),
      })
    );
  });

  it('should authenticate user successfully', async () => {
    mockedAxios.post.mockResolvedValue({
      status: 200,
      data: {
        valid: true,
        user: {
          email: 'test@test.com',
          clientId: 'client-1',
        },
      },
    });

    const req = createMockRequest({
      authorization: 'Bearer valid-token-12345',
    });
    const res = createMockResponse();

    await authMiddleware(req as Request, res as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith();
    expect((req as any).user).toEqual({
      email: 'test@test.com',
      clientId: 'client-1',
    });
  });

  it('should handle auth service unavailable', async () => {
    mockedAxios.post.mockRejectedValue({
      code: 'ECONNREFUSED',
      message: 'Connection refused',
    });

    const req = createMockRequest({
      authorization: 'Bearer some-token-value',
    });
    const res = createMockResponse();

    await authMiddleware(req as Request, res as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Authentication service unavailable',
      })
    );
  });

  it('should handle invalid token response', async () => {
    mockedAxios.post.mockResolvedValue({
      status: 200,
      data: {
        valid: false,
        error: 'Token expired',
      },
    });

    const req = createMockRequest({
      authorization: 'Bearer expired-token-val',
    });
    const res = createMockResponse();

    await authMiddleware(req as Request, res as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Token expired',
      })
    );
  });

  it('should handle missing user in valid response', async () => {
    mockedAxios.post.mockResolvedValue({
      status: 200,
      data: {
        valid: true,
        // user missing
      },
    });

    const req = createMockRequest({
      authorization: 'Bearer token-no-user-dat',
    });
    const res = createMockResponse();

    await authMiddleware(req as Request, res as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Invalid token payload',
      })
    );
  });

  it('should handle user missing email or clientId', async () => {
    mockedAxios.post.mockResolvedValue({
      status: 200,
      data: {
        valid: true,
        user: {
          email: '',
          clientId: 'client-1',
        },
      },
    });

    const req = createMockRequest({
      authorization: 'Bearer token-no-email-vl',
    });
    const res = createMockResponse();

    await authMiddleware(req as Request, res as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Invalid token payload: missing email or clientId',
      })
    );
  });

  it('should handle auth service returning error response', async () => {
    mockedAxios.post.mockRejectedValue({
      response: {
        status: 401,
        data: {
          error: 'Unauthorized access',
        },
      },
    });

    const req = createMockRequest({
      authorization: 'Bearer bad-access-token1',
    });
    const res = createMockResponse();

    await authMiddleware(req as Request, res as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Unauthorized access',
      })
    );
  });
});
