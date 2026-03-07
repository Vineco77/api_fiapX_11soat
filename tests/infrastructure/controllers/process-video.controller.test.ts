jest.mock('tsyringe', () => ({
  container: {
    resolve: jest.fn(),
  },
  injectable: () => jest.fn(),
  inject: () => jest.fn(),
}));

jest.mock('class-transformer', () => ({
  plainToInstance: jest.fn().mockImplementation((_cls: any, _obj: any) => ({
    getWithDefaults: () => ({ framesPerSecond: 30, format: 'jpg' }),
  })),
}));

jest.mock('class-validator', () => ({
  validate: jest.fn().mockResolvedValue([]),
  IsOptional: () => jest.fn(),
  IsInt: () => jest.fn(),
  IsIn: () => jest.fn(),
  Min: () => jest.fn(),
  Max: () => jest.fn(),
}));

jest.mock('@/infrastructure/middlewares', () => ({
  getAuthenticatedUser: jest.fn().mockReturnValue({
    clientId: 'client-1',
    email: 'test@test.com',
  }),
}));

import { ProcessVideoController } from '@/infrastructure/controllers/process-video.controller';
import type { Request, Response } from 'express';

const { container } = jest.requireMock('tsyringe');
const { validate } = jest.requireMock('class-validator');

function createMockResponse(): Partial<Response> {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('ProcessVideoController', () => {
  let controller: ProcessVideoController;
  let mockExecute: jest.Mock;

  beforeEach(() => {
    controller = new ProcessVideoController();
    mockExecute = jest.fn().mockResolvedValue({
      jobId: 'job-1',
      status: 'PROCESSING',
      videosCount: 1,
      message: 'Videos sent to processing',
    });
    container.resolve.mockReturnValue({ execute: mockExecute });
    validate.mockResolvedValue([]);
  });

  it('should return 200 on successful processing', async () => {
    const req = {
      files: [
        {
          fieldname: 'files',
          originalname: 'test.mp4',
          mimetype: 'video/mp4',
          size: 1024,
          buffer: Buffer.from('fake'),
        },
      ],
      body: { framesPerSecond: '30', format: 'jpg' },
    } as Partial<Request>;

    const res = createMockResponse();

    await controller.process(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        framesPerSecond: 30,
        format: 'jpg',
        clientId: 'client-1',
        email: 'test@test.com',
      })
    );
  });

  it('should throw ValidationError when no files', async () => {
    const req = {
      files: [],
      body: {},
    } as Partial<Request>;

    const res = createMockResponse();

    await expect(
      controller.process(req as Request, res as Response)
    ).rejects.toThrow('At least one video file is required');
  });

  it('should throw ValidationError when files is undefined', async () => {
    const req = {
      body: {},
    } as Partial<Request>;

    const res = createMockResponse();

    await expect(
      controller.process(req as Request, res as Response)
    ).rejects.toThrow('At least one video file is required');
  });

  it('should throw ValidationError when validation fails', async () => {
    validate.mockResolvedValue([
      {
        constraints: {
          isIn: 'format deve ser "jpg" ou "png"',
        },
      },
    ]);

    const req = {
      files: [
        {
          fieldname: 'files',
          originalname: 'test.mp4',
          mimetype: 'video/mp4',
          size: 1024,
          buffer: Buffer.from('fake'),
        },
      ],
      body: { format: 'gif' },
    } as Partial<Request>;

    const res = createMockResponse();

    await expect(
      controller.process(req as Request, res as Response)
    ).rejects.toThrow('Validation failed');
  });
});
