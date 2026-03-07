jest.mock('tsyringe', () => ({
  container: {
    resolve: jest.fn(),
  },
  injectable: () => jest.fn(),
  inject: () => jest.fn(),
}));

import { HealthController } from '@/infrastructure/controllers/health.controller';
import type { Request, Response } from 'express';

const { container } = jest.requireMock('tsyringe');

function createMockRequest(): Partial<Request> {
  return {};
}

function createMockResponse(): Partial<Response> {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(() => {
    controller = new HealthController();
  });

  describe('basic', () => {
    it('should return 200 with basic health info', async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      await controller.basic(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'ok',
          service: 'api-fiapx-11soat',
          timestamp: expect.any(String),
        })
      );
    });
  });

  describe('detailed', () => {
    it('should return 200 when all services are healthy', async () => {
      const mockHealthResult = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          postgres: { status: 'ok', responseTime: 10 },
          redis: { status: 'ok', responseTime: 5 },
          rabbitmq: { status: 'ok', responseTime: 15 },
          s3: { status: 'ok', responseTime: 20 },
          auth: { status: 'ok', responseTime: 50 },
        },
        uptime: 1000,
      };

      const mockCleanup = jest.fn();
      container.resolve.mockReturnValue({
        execute: jest.fn().mockResolvedValue(mockHealthResult),
        cleanup: mockCleanup,
      });

      const req = createMockRequest();
      const res = createMockResponse();

      await controller.detailed(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockHealthResult);
      expect(mockCleanup).toHaveBeenCalled();
    });

    it('should return 200 when status is degraded', async () => {
      const mockHealthResult = {
        status: 'degraded',
        timestamp: new Date().toISOString(),
        services: {
          postgres: { status: 'ok', responseTime: 10 },
          redis: { status: 'error', error: 'Connection refused' },
          rabbitmq: { status: 'ok', responseTime: 15 },
          s3: { status: 'ok', responseTime: 20 },
          auth: { status: 'ok', responseTime: 50 },
        },
        uptime: 1000,
      };

      container.resolve.mockReturnValue({
        execute: jest.fn().mockResolvedValue(mockHealthResult),
        cleanup: jest.fn(),
      });

      const req = createMockRequest();
      const res = createMockResponse();

      await controller.detailed(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 503 when status is unhealthy', async () => {
      const mockHealthResult = {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        services: {
          postgres: { status: 'error', error: 'Connection lost' },
          redis: { status: 'error', error: 'Connection refused' },
          rabbitmq: { status: 'error', error: 'Not available' },
          s3: { status: 'error', error: 'Auth failed' },
          auth: { status: 'error', error: 'Unavailable' },
        },
        uptime: 1000,
      };

      container.resolve.mockReturnValue({
        execute: jest.fn().mockResolvedValue(mockHealthResult),
        cleanup: jest.fn(),
      });

      const req = createMockRequest();
      const res = createMockResponse();

      await controller.detailed(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(503);
    });

    it('should return 503 when health check throws error', async () => {
      container.resolve.mockReturnValue({
        execute: jest.fn().mockRejectedValue(new Error('Health check failed')),
        cleanup: jest.fn(),
      });

      const req = createMockRequest();
      const res = createMockResponse();

      await controller.detailed(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'unhealthy',
          error: 'Health check failed',
        })
      );
    });
  });
});
