import type { Request, Response } from 'express';
import { container } from 'tsyringe';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { GetVideosUseCase } from '@/application/use-cases/get-videos.use-case';
import { GetVideosQueryDTO } from '@/domain/dtos/get-videos-query.dto';
import { ValidationError } from '@/infrastructure/middlewares/errors';
import { getAuthenticatedUser } from '@/infrastructure/middlewares';


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

    const user = getAuthenticatedUser(req);

    const { page, limit, status } = queryDto.getWithDefaults();
    const useCase = container.resolve(GetVideosUseCase);
    const result = await useCase.execute({
      email: user.email,
      page,
      limit,
      status,
    });

    res.status(200).json(result);
  }
}
