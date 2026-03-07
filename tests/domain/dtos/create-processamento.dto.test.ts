import { CreateProcessamentoDTO } from '@/domain/dtos/create-processamento.dto';

describe('CreateProcessamentoDTO', () => {
  it('should create instance with all properties', () => {
    const dto = new CreateProcessamentoDTO('client-1', 'test@test.com', 30, 'jpg');

    expect(dto.clientId).toBe('client-1');
    expect(dto.email).toBe('test@test.com');
    expect(dto.framesPerSecond).toBe(30);
    expect(dto.format).toBe('jpg');
  });

  it('should allow different formats', () => {
    const dto = new CreateProcessamentoDTO('client-1', 'test@test.com', 60, 'png');

    expect(dto.format).toBe('png');
    expect(dto.framesPerSecond).toBe(60);
  });
});
