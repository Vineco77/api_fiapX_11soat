import { ProcessVideoDTO } from '@/domain/dtos/process-video.dto';

describe('ProcessVideoDTO', () => {
  describe('getWithDefaults', () => {
    it('should return default values when no values are set', () => {
      const dto = new ProcessVideoDTO();
      const result = dto.getWithDefaults();

      expect(result.framesPerSecond).toBe(1);
      expect(result.format).toBe('jpg');
    });

    it('should return provided framesPerSecond when set', () => {
      const dto = new ProcessVideoDTO();
      dto.framesPerSecond = 30;
      const result = dto.getWithDefaults();

      expect(result.framesPerSecond).toBe(30);
    });

    it('should return lowercase format when set', () => {
      const dto = new ProcessVideoDTO();
      dto.format = 'PNG';
      const result = dto.getWithDefaults();

      expect(result.format).toBe('png');
    });

    it('should return both provided values', () => {
      const dto = new ProcessVideoDTO();
      dto.framesPerSecond = 60;
      dto.format = 'jpg';
      const result = dto.getWithDefaults();

      expect(result.framesPerSecond).toBe(60);
      expect(result.format).toBe('jpg');
    });
  });
});
