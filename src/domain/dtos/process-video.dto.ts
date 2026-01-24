import { IsInt, IsIn, IsOptional, Min, Max } from 'class-validator';

export class ProcessVideoDTO {
  @IsOptional()
  @IsInt({ message: 'framesPerSecond deve ser um número inteiro' })
  @Min(1, { message: 'framesPerSecond deve ser no mínimo 1' })
  @Max(60, { message: 'framesPerSecond deve ser no máximo 60' })
  framesPerSecond?: number;

  @IsOptional()
  @IsIn(['jpg', 'png'], { message: 'format deve ser "jpg" ou "png"' })
  format?: string;

  getWithDefaults(): { framesPerSecond: number; format: string } {
    return {
      framesPerSecond: this.framesPerSecond ?? 1,
      format: this.format?.toLowerCase() ?? 'jpg',
    };
  }
}
