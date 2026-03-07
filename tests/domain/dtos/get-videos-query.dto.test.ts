import 'reflect-metadata';
import { GetVideosQueryDTO } from '@/domain/dtos/get-videos-query.dto';

describe('GetVideosQueryDTO', () => {
  describe('getWithDefaults', () => {
    it('should return default values when no params provided', () => {
      const dto = new GetVideosQueryDTO();
      const result = dto.getWithDefaults();

      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.status).toBeUndefined();
      expect(result.clientId).toBeUndefined();
    });

    it('should return provided values', () => {
      const dto = new GetVideosQueryDTO();
      dto.page = 3;
      dto.limit = 25;
      dto.status = 'completed';
      dto.clientId = 'client-1';

      const result = dto.getWithDefaults();

      expect(result.page).toBe(3);
      expect(result.limit).toBe(25);
      expect(result.status).toBe('completed');
      expect(result.clientId).toBe('client-1');
    });
  });

  describe('getSkip', () => {
    it('should return 0 for page 1 with default limit', () => {
      const dto = new GetVideosQueryDTO();
      expect(dto.getSkip()).toBe(0);
    });

    it('should calculate skip correctly for page 2 limit 10', () => {
      const dto = new GetVideosQueryDTO();
      dto.page = 2;
      dto.limit = 10;
      expect(dto.getSkip()).toBe(10);
    });

    it('should calculate skip correctly for page 3 limit 25', () => {
      const dto = new GetVideosQueryDTO();
      dto.page = 3;
      dto.limit = 25;
      expect(dto.getSkip()).toBe(50);
    });
  });
});
