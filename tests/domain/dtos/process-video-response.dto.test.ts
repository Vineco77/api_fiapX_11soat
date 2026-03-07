import { ProcessVideoResponseDTO } from '@/domain/dtos/process-video-response.dto';

describe('ProcessVideoResponseDTO', () => {
  it('should create a response with correct default values', () => {
    const dto = new ProcessVideoResponseDTO('job-123', 3);

    expect(dto.jobId).toBe('job-123');
    expect(dto.status).toBe('PROCESSING');
    expect(dto.videosCount).toBe(3);
    expect(dto.message).toBe('Videos sent to processing');
  });

  it('should handle single video', () => {
    const dto = new ProcessVideoResponseDTO('job-1', 1);

    expect(dto.videosCount).toBe(1);
    expect(dto.status).toBe('PROCESSING');
  });

  it('should handle many videos', () => {
    const dto = new ProcessVideoResponseDTO('job-1', 100);
    expect(dto.videosCount).toBe(100);
  });
});
