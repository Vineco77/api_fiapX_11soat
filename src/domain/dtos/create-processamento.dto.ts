import { IsInt, IsString, IsNotEmpty, Min, Max } from 'class-validator';

export class CreateProcessamentoDTO {
  @IsNotEmpty({ message: 'clientId é obrigatório' })
  @IsString({ message: 'clientId deve ser uma string' })
  clientId: string;

  @IsNotEmpty({ message: 'email é obrigatório' })
  @IsString({ message: 'email deve ser uma string' })
  email: string;

  @IsInt({ message: 'framesPerSecond deve ser um número inteiro' })
  @Min(1, { message: 'framesPerSecond deve ser no mínimo 1' })
  @Max(60, { message: 'framesPerSecond deve ser no máximo 60' })
  framesPerSecond: number;

  @IsNotEmpty({ message: 'format é obrigatório' })
  @IsString({ message: 'format deve ser uma string' })
  format: string;

  constructor(clientId: string, email: string, framesPerSecond: number, format: string) {
    this.clientId = clientId;
    this.email = email;
    this.framesPerSecond = framesPerSecond;
    this.format = format;
  }
}

export interface CreateVideoDTO {
  fileName: string;
  fileFormat: string;
  processamentoId: string;
  inputUrlStorage: string;
  outputUrlStorage: string;
  size: bigint;
}
