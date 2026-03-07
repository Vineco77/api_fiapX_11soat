import { Video } from '@/domain/entities/video.entity';

// Mock @prisma/client VideoStatus enum
jest.mock('@prisma/client', () => ({
  VideoStatus: {
    PENDING: 'PENDING',
    PROCESSING: 'PROCESSING',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED',
  },
}));

const { VideoStatus } = jest.requireMock('@prisma/client');

function createVideo(overrides: Partial<ConstructorParameters<typeof Video>[0]> = {}): Video {
  return new Video({
    id: 'video-1',
    fileName: 'test.mp4',
    fileFormat: 'mp4',
    processamentoId: 'proc-1',
    status: VideoStatus.PENDING,
    inputUrlStorage: 's3://bucket/input/',
    outputUrlStorage: 's3://bucket/output/',
    size: BigInt(1024),
    error: null,
    uploadedAt: new Date('2026-01-01'),
    processedAt: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  });
}

describe('Video Entity', () => {
  describe('constructor', () => {
    it('should create a video entity with correct properties', () => {
      const video = createVideo();

      expect(video.id).toBe('video-1');
      expect(video.fileName).toBe('test.mp4');
      expect(video.fileFormat).toBe('mp4');
      expect(video.processamentoId).toBe('proc-1');
      expect(video.status).toBe(VideoStatus.PENDING);
      expect(video.inputUrlStorage).toBe('s3://bucket/input/');
      expect(video.outputUrlStorage).toBe('s3://bucket/output/');
      expect(video.size).toBe(BigInt(1024));
      expect(video.error).toBeNull();
      expect(video.uploadedAt).toEqual(new Date('2026-01-01'));
      expect(video.processedAt).toBeNull();
    });
  });

  describe('belongsToProcessamento', () => {
    it('should return true when processamentoId matches', () => {
      const video = createVideo({ processamentoId: 'proc-1' });
      expect(video.belongsToProcessamento('proc-1')).toBe(true);
    });

    it('should return false when processamentoId does not match', () => {
      const video = createVideo({ processamentoId: 'proc-1' });
      expect(video.belongsToProcessamento('proc-2')).toBe(false);
    });
  });

  describe('status checks', () => {
    it('isPending should return true for PENDING status', () => {
      const video = createVideo({ status: VideoStatus.PENDING });
      expect(video.isPending()).toBe(true);
      expect(video.isProcessing()).toBe(false);
      expect(video.isCompleted()).toBe(false);
      expect(video.isFailed()).toBe(false);
    });

    it('isProcessing should return true for PROCESSING status', () => {
      const video = createVideo({ status: VideoStatus.PROCESSING });
      expect(video.isProcessing()).toBe(true);
      expect(video.isPending()).toBe(false);
      expect(video.isCompleted()).toBe(false);
      expect(video.isFailed()).toBe(false);
    });

    it('isCompleted should return true for COMPLETED status', () => {
      const video = createVideo({ status: VideoStatus.COMPLETED });
      expect(video.isCompleted()).toBe(true);
      expect(video.isPending()).toBe(false);
      expect(video.isProcessing()).toBe(false);
      expect(video.isFailed()).toBe(false);
    });

    it('isFailed should return true for FAILED status', () => {
      const video = createVideo({ status: VideoStatus.FAILED });
      expect(video.isFailed()).toBe(true);
      expect(video.isPending()).toBe(false);
      expect(video.isProcessing()).toBe(false);
      expect(video.isCompleted()).toBe(false);
    });
  });
});
