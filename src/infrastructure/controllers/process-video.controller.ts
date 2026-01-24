import type { Request, Response } from 'express';
import { container } from 'tsyringe';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ProcessVideoUseCase } from '@/application/use-cases/process-video.use-case';
import { ProcessVideoDTO } from '@/domain/dtos/process-video.dto';
import { ValidationError } from '@/infrastructure/middlewares/errors';
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

    const clientId = (req as any).user?.clientId || 'mock-client-id';
    const email = (req as any).user?.email || 'mock@example.com';

    const { framesPerSecond, format } = dto.getWithDefaults();

    const files: UploadedFile[] = (req.files as any[]).map((file) => ({
      fieldname: file.fieldname,
      originalname: file.originalname,
      encoding: file.encoding,
      mimetype: file.mimetype,
      buffer: file.buffer,
      size: file.size,
    }));

    const useCase = container.resolve(ProcessVideoUseCase);
    const result = await useCase.execute({
      files,
      framesPerSecond,
      format,
      clientId,
      email,
    });

    res.status(200).json(result);
  }
}
