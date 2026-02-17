import type { Request, Response } from 'express';
import { container } from 'tsyringe';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { GetVideosUseCase } from '@/application/use-cases/get-videos.use-case';
import { GetVideosQueryDTO } from '@/domain/dtos/get-videos-query.dto';
import { ValidationError } from '@/infrastructure/middlewares/errors';
import { getAuthenticatedUser } from '@/infrastructure/middlewares';
import { env } from '@/infrastructure/config/env';

export class GetVideosController {
  async list(req: Request, res: Response): Promise<void> {
    const queryDto = plainToInstance(GetVideosQueryDTO, req.query);
    const errors = await validate(queryDto);

    if (errors.length > 0) {
      const errorMessages = errors
        .map((error) => Object.values(error.constraints || {}).join(', '))
        .filter(Boolean);

      throw new ValidationError('Query validation failed', errorMessages);
    }

    let clientId: string;

    if (env.MOCK_AUTH) {
      const queryClientId = queryDto.clientId;

      if (!queryClientId) {
        res.status(400).json({
          error: 'clientId is required when MOCK_AUTH is enabled',
        });
        return;
      }

      if (queryClientId !== 'mock-client-id-123') {
        res.status(404).json({
          error: 'Client not found',
        });
        return;
      }

      clientId = queryClientId;
      console.log(`MOCK_AUTH enabled - using clientId: ${clientId}`);
    } else {
      const user = getAuthenticatedUser(req);
      clientId = user.clientId;
      console.log(`JWT Auth - using clientId from token: ${clientId}`);
    }

    const { page, limit, status } = queryDto.getWithDefaults();
    const useCase = container.resolve(GetVideosUseCase);
    const result = await useCase.execute({
      clientId,
      page,
      limit,
      status,
    });

    res.status(200).json(result);
  }
}
