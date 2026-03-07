jest.mock('@prisma/client', () => ({
  VideoStatus: {
    PENDING: 'PENDING',
    PROCESSING: 'PROCESSING',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED',
  },
}));

import { Processamento } from '@/domain/entities/processamento.entity';
import { Video } from '@/domain/entities/video.entity';

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

function createProcessamento(
  overrides: Partial<ConstructorParameters<typeof Processamento>[0]> = {}
): Processamento {
  return new Processamento({
    id: 'proc-1',
    jobId: 'job-1',
    clientId: 'client-1',
    email: 'test@test.com',
    framesPerSecond: 30,
    format: 'jpg',
    size: BigInt(2048),
    error: null,
    uploadedAt: new Date('2026-01-01'),
    processedAt: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    videos: [],
    ...overrides,
  });
}

describe('Processamento Entity', () => {
  describe('constructor', () => {
    it('should create a processamento entity with correct properties', () => {
      const proc = createProcessamento();

      expect(proc.id).toBe('proc-1');
      expect(proc.jobId).toBe('job-1');
      expect(proc.clientId).toBe('client-1');
      expect(proc.email).toBe('test@test.com');
      expect(proc.framesPerSecond).toBe(30);
      expect(proc.format).toBe('jpg');
      expect(proc.size).toBe(BigInt(2048));
      expect(proc.error).toBeNull();
      expect(proc.videos).toEqual([]);
    });

    it('should default videos to empty array when not provided', () => {
      const proc = new Processamento({
        id: 'proc-1',
        jobId: 'job-1',
        clientId: 'client-1',
        email: 'test@test.com',
        framesPerSecond: 30,
        format: 'jpg',
        size: BigInt(0),
        uploadedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(proc.videos).toEqual([]);
    });
  });

  describe('belongsTo', () => {
    it('should return true when clientId matches', () => {
      const proc = createProcessamento({ clientId: 'client-1' });
      expect(proc.belongsTo('client-1')).toBe(true);
    });

    it('should return false when clientId does not match', () => {
      const proc = createProcessamento({ clientId: 'client-1' });
      expect(proc.belongsTo('client-2')).toBe(false);
    });
  });

  describe('belongsToEmail', () => {
    it('should return true when email matches', () => {
      const proc = createProcessamento({ email: 'test@test.com' });
      expect(proc.belongsToEmail('test@test.com')).toBe(true);
    });

    it('should return false when email does not match', () => {
      const proc = createProcessamento({ email: 'test@test.com' });
      expect(proc.belongsToEmail('other@test.com')).toBe(false);
    });
  });

  describe('video status aggregations', () => {
    it('isAllVideosCompleted should return true when all videos are completed', () => {
      const proc = createProcessamento({
        videos: [
          createVideo({ status: VideoStatus.COMPLETED }),
          createVideo({ id: 'video-2', status: VideoStatus.COMPLETED }),
        ],
      });
      expect(proc.isAllVideosCompleted()).toBe(true);
    });

    it('isAllVideosCompleted should return false when not all videos are completed', () => {
      const proc = createProcessamento({
        videos: [
          createVideo({ status: VideoStatus.COMPLETED }),
          createVideo({ id: 'video-2', status: VideoStatus.PENDING }),
        ],
      });
      expect(proc.isAllVideosCompleted()).toBe(false);
    });

    it('isAllVideosCompleted should return false when there are no videos', () => {
      const proc = createProcessamento({ videos: [] });
      expect(proc.isAllVideosCompleted()).toBe(false);
    });

    it('hasAnyVideoFailed should return true when any video has failed', () => {
      const proc = createProcessamento({
        videos: [
          createVideo({ status: VideoStatus.COMPLETED }),
          createVideo({ id: 'video-2', status: VideoStatus.FAILED }),
        ],
      });
      expect(proc.hasAnyVideoFailed()).toBe(true);
    });

    it('hasAnyVideoFailed should return false when no video has failed', () => {
      const proc = createProcessamento({
        videos: [
          createVideo({ status: VideoStatus.COMPLETED }),
          createVideo({ id: 'video-2', status: VideoStatus.PROCESSING }),
        ],
      });
      expect(proc.hasAnyVideoFailed()).toBe(false);
    });

    it('hasAnyVideoProcessing should return true when any video is processing', () => {
      const proc = createProcessamento({
        videos: [
          createVideo({ status: VideoStatus.PENDING }),
          createVideo({ id: 'video-2', status: VideoStatus.PROCESSING }),
        ],
      });
      expect(proc.hasAnyVideoProcessing()).toBe(true);
    });

    it('hasAnyVideoProcessing should return false when no video is processing', () => {
      const proc = createProcessamento({
        videos: [
          createVideo({ status: VideoStatus.PENDING }),
          createVideo({ id: 'video-2', status: VideoStatus.COMPLETED }),
        ],
      });
      expect(proc.hasAnyVideoProcessing()).toBe(false);
    });
  });

  describe('count methods', () => {
    const videos = [
      createVideo({ id: 'v1', status: VideoStatus.PENDING }),
      createVideo({ id: 'v2', status: VideoStatus.PROCESSING }),
      createVideo({ id: 'v3', status: VideoStatus.COMPLETED }),
      createVideo({ id: 'v4', status: VideoStatus.COMPLETED }),
      createVideo({ id: 'v5', status: VideoStatus.FAILED }),
    ];

    const proc = createProcessamento({ videos });

    it('getTotalVideos should return total count', () => {
      expect(proc.getTotalVideos()).toBe(5);
    });

    it('getCompletedVideosCount should return completed count', () => {
      expect(proc.getCompletedVideosCount()).toBe(2);
    });

    it('getFailedVideosCount should return failed count', () => {
      expect(proc.getFailedVideosCount()).toBe(1);
    });

    it('getProcessingVideosCount should return processing count', () => {
      expect(proc.getProcessingVideosCount()).toBe(1);
    });
  });
});
