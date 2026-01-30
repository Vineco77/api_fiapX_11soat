import type { Request, Response } from 'express';
import { container } from 'tsyringe';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ProcessVideoUseCase } from '@/application/use-cases/process-video.use-case';
import { ProcessVideoDTO } from '@/domain/dtos/process-video.dto';
import { ValidationError } from '@/infrastructure/middlewares/errors';
import { getAuthenticatedUser } from '@/infrastructure/middlewares';
import type { UploadedFile } from '@/domain/repositories/s3-storage.interface';

export class ProcessVideoController {
  async process(req: Request, res: Response): Promise<void> {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      throw new ValidationError('At least one video file is required');
    }

    const dto = plainToInstance(ProcessVideoDTO, req.body, {
      enableImplicitConversion: true,
    });
    const errors = await validate(dto);

    if (errors.length > 0) {
      const errorMessages = errors
        .map((error) => Object.values(error.constraints || {}).join(', '))
        .filter(Boolean);

      throw new ValidationError('Validation failed', errorMessages);
    }

    const user = getAuthenticatedUser(req);

    const { framesPerSecond, format } = dto.getWithDefaults();

    const files = req.files as UploadedFile[];

    const useCase = container.resolve(ProcessVideoUseCase);
    const result = await useCase.execute({
      files,
      framesPerSecond,
      format,
      clientId: user.clientId,
      email: user.email,
    });

    res.status(200).json(result);
  }
}
