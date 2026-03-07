jest.mock('@/infrastructure/monitoring', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('tsyringe', () => ({
  container: {
    resolve: jest.fn(),
  },
  injectable: () => jest.fn(),
  inject: () => jest.fn(),
}));

import { VideoCallbackController } from '@/infrastructure/controllers/video-callback.controller';
import type { Request, Response } from 'express';

const { container } = jest.requireMock('tsyringe');

function createMockRequest(body: any = {}): Partial<Request> {
  return { body };
}

function createMockResponse(): Partial<Response> {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('VideoCallbackController', () => {
  let controller: VideoCallbackController;
  let mockExecute: jest.Mock;

  beforeEach(() => {
    controller = new VideoCallbackController();
    mockExecute = jest.fn().mockResolvedValue(undefined);
    container.resolve.mockReturnValue({ execute: mockExecute });
  });

  it('should return 200 on successful callback', async () => {
    const req = createMockRequest({
      id: 'video-1',
      id_processamento: 'job-1',
      status: 'COMPLETED',
    });
    const res = createMockResponse();

    await controller.callback(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Status updated successfully',
    });
  });

  it('should return 400 when required fields are missing', async () => {
    const req = createMockRequest({ id: 'video-1' }); // missing id_processamento and status
    const res = createMockResponse();

    await controller.callback(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should return 400 for invalid status', async () => {
    const req = createMockRequest({
      id: 'video-1',
      id_processamento: 'job-1',
      status: 'INVALID',
    });
    const res = createMockResponse();

    await controller.callback(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'Invalid status. Must be COMPLETED or FAILED',
      })
    );
  });

  it('should return 400 when FAILED status has no error', async () => {
    const req = createMockRequest({
      id: 'video-1',
      id_processamento: 'job-1',
      status: 'FAILED',
    });
    const res = createMockResponse();

    await controller.callback(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Error message is required when status is FAILED',
      })
    );
  });

  it('should return 404 when use case throws not found error', async () => {
    mockExecute.mockRejectedValue(new Error('Video not found: video-1'));

    const req = createMockRequest({
      id: 'video-1',
      id_processamento: 'job-1',
      status: 'COMPLETED',
    });
    const res = createMockResponse();

    await controller.callback(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('should return 500 on unexpected use case error', async () => {
    mockExecute.mockRejectedValue(new Error('Database connection lost'));

    const req = createMockRequest({
      id: 'video-1',
      id_processamento: 'job-1',
      status: 'COMPLETED',
    });
    const res = createMockResponse();

    await controller.callback(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('should accept FAILED status with error message', async () => {
    const req = createMockRequest({
      id: 'video-1',
      id_processamento: 'job-1',
      status: 'FAILED',
      error: 'Codec error',
    });
    const res = createMockResponse();

    await controller.callback(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockExecute).toHaveBeenCalledWith({
      id: 'video-1',
      id_processamento: 'job-1',
      status: 'FAILED',
      error: 'Codec error',
    });
  });
});
