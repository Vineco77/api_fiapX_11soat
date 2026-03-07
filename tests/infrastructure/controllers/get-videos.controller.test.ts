jest.mock('tsyringe', () => ({
  container: {
    resolve: jest.fn(),
  },
  injectable: () => jest.fn(),
  inject: () => jest.fn(),
}));

jest.mock('class-transformer', () => ({
  plainToInstance: jest.fn().mockImplementation((_cls: any, obj: any) => obj),
  Type: () => () => {},
}));

jest.mock('class-validator', () => ({
  validate: jest.fn().mockResolvedValue([]),
  IsOptional: () => () => {},
  IsInt: () => () => {},
  Min: () => () => {},
  Max: () => () => {},
  IsIn: () => () => {},
  IsString: () => () => {},
}));

jest.mock('@/infrastructure/middlewares', () => ({
  getAuthenticatedUser: jest.fn().mockReturnValue({
    clientId: 'client-1',
    email: 'test@test.com',
  }),
}));

import { GetVideosController } from '@/infrastructure/controllers/get-videos.controller';
import type { Request, Response } from 'express';

const { container } = jest.requireMock('tsyringe');
const { validate } = jest.requireMock('class-validator');

function createMockRequest(query: any = {}): Partial<Request> {
  return { query };
}

function createMockResponse(): Partial<Response> {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('GetVideosController', () => {
  let controller: GetVideosController;
  let mockExecute: jest.Mock;

  beforeEach(() => {
    controller = new GetVideosController();
    mockExecute = jest.fn().mockResolvedValue({
      processamentos: [],
      pagination: {
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      },
    });
    container.resolve.mockReturnValue({ execute: mockExecute });
    validate.mockResolvedValue([]);
  });

  it('should return 200 with videos', async () => {
    const req = createMockRequest({ page: '1', limit: '10' });
    const res = createMockResponse();

    // Override plainToInstance to return object with getWithDefaults
    const { plainToInstance } = jest.requireMock('class-transformer');
    plainToInstance.mockReturnValue({
      getWithDefaults: () => ({ page: 1, limit: 10 }),
    });

    await controller.list(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockExecute).toHaveBeenCalledWith({
      clientId: 'client-1',
      page: 1,
      limit: 10,
      status: undefined,
    });
  });

  it('should throw ValidationError when validation fails', async () => {
    validate.mockResolvedValue([
      {
        constraints: { isInt: 'page must be an integer' },
      },
    ]);

    const { plainToInstance } = jest.requireMock('class-transformer');
    plainToInstance.mockReturnValue({
      getWithDefaults: () => ({ page: 1, limit: 10 }),
    });

    const req = createMockRequest({ page: 'invalid' });
    const res = createMockResponse();

    await expect(controller.list(req as Request, res as Response)).rejects.toThrow(
      'Query validation failed'
    );
  });
});
