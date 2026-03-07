import {
  buildJobPath,
  buildVideoPath,
  buildVideoInputPath,
  buildVideoOutputPath,
  buildVideoFilePath,
  buildInputPath,
  buildOutputPath,
  sanitizeFilename,
  getFileExtension,
  isVideoFile,
} from '@/infrastructure/storage/s3-path.helper';

describe('S3 Path Helper', () => {
  const email = 'user@test.com';
  const jobId = 'job-123';
  const videoId = 'video-456';

  describe('buildJobPath', () => {
    it('should build correct job path', () => {
      expect(buildJobPath(email, jobId)).toBe('user@test.com/job-123/');
    });
  });

  describe('buildVideoPath', () => {
    it('should build correct video path', () => {
      expect(buildVideoPath(email, jobId, videoId)).toBe(
        'user@test.com/job-123/video-456/'
      );
    });
  });

  describe('buildVideoInputPath', () => {
    it('should build correct video input path', () => {
      expect(buildVideoInputPath(email, jobId, videoId)).toBe(
        'user@test.com/job-123/video-456/input/'
      );
    });
  });

  describe('buildVideoOutputPath', () => {
    it('should build correct video output path', () => {
      expect(buildVideoOutputPath(email, jobId, videoId)).toBe(
        'user@test.com/job-123/video-456/output/'
      );
    });
  });

  describe('buildVideoFilePath', () => {
    it('should build correct file path', () => {
      expect(buildVideoFilePath(email, jobId, videoId, 'test.mp4')).toBe(
        'user@test.com/job-123/video-456/input/test.mp4'
      );
    });
  });

  describe('buildInputPath', () => {
    it('should build correct input path', () => {
      expect(buildInputPath(email, jobId)).toBe(
        'user@test.com/job-123/input/'
      );
    });
  });

  describe('buildOutputPath', () => {
    it('should build correct output path', () => {
      expect(buildOutputPath(email, jobId)).toBe(
        'user@test.com/job-123/output/'
      );
    });
  });

  describe('sanitizeFilename', () => {
    it('should replace special characters with underscores', () => {
      expect(sanitizeFilename('my video (1).mp4')).toBe('my_video__1_.mp4');
    });

    it('should remove double dots', () => {
      expect(sanitizeFilename('../../etc/passwd')).toBe('__etc_passwd');
    });

    it('should keep valid characters', () => {
      expect(sanitizeFilename('valid-file_name.mp4')).toBe('valid-file_name.mp4');
    });

    it('should truncate to 255 characters', () => {
      const longName = 'a'.repeat(300) + '.mp4';
      expect(sanitizeFilename(longName).length).toBe(255);
    });
  });

  describe('getFileExtension', () => {
    it('should return correct extension', () => {
      expect(getFileExtension('video.mp4')).toBe('mp4');
    });

    it('should return lowercase extension', () => {
      expect(getFileExtension('video.MP4')).toBe('mp4');
    });

    it('should return empty string for no extension', () => {
      expect(getFileExtension('noextension')).toBe('');
    });

    it('should return last extension for multiple dots', () => {
      expect(getFileExtension('my.video.file.avi')).toBe('avi');
    });
  });

  describe('isVideoFile', () => {
    it('should return true for video mimetypes', () => {
      expect(isVideoFile('video/mp4')).toBe(true);
      expect(isVideoFile('video/avi')).toBe(true);
      expect(isVideoFile('video/webm')).toBe(true);
      expect(isVideoFile('video/quicktime')).toBe(true);
    });

    it('should return false for non-video mimetypes', () => {
      expect(isVideoFile('image/png')).toBe(false);
      expect(isVideoFile('application/pdf')).toBe(false);
      expect(isVideoFile('text/plain')).toBe(false);
      expect(isVideoFile('audio/mp3')).toBe(false);
    });
  });
});
