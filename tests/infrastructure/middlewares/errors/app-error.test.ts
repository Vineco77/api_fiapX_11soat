import {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  InternalServerError,
  VideoNotFoundError,
  LimitExceededError,
  InvalidFileError,
} from '@/infrastructure/middlewares/errors/app-error';
import { QueueUnavailableError } from '@/infrastructure/middlewares/errors/queue-unavailable.error';

describe('Error Classes', () => {
  describe('AppError', () => {
    it('BadRequestError should have status 400', () => {
      const error = new BadRequestError('Bad request');
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Bad request');
      expect(error.isOperational).toBe(true);
      expect(error.name).toBe('BadRequestError');
    });

    it('UnauthorizedError should have status 401', () => {
      const error = new UnauthorizedError();
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Unauthorized');
      expect(error.name).toBe('UnauthorizedError');
    });

    it('UnauthorizedError should accept custom message', () => {
      const error = new UnauthorizedError('Token expired');
      expect(error.message).toBe('Token expired');
    });

    it('ForbiddenError should have status 403', () => {
      const error = new ForbiddenError();
      expect(error.statusCode).toBe(403);
      expect(error.message).toBe('Forbidden');
      expect(error.name).toBe('ForbiddenError');
    });

    it('NotFoundError should have status 404', () => {
      const error = new NotFoundError('Resource');
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('Resource not found');
      expect(error.name).toBe('NotFoundError');
    });

    it('ValidationError should have status 422 and errors array', () => {
      const error = new ValidationError('Validation failed', ['field1 is required']);
      expect(error.statusCode).toBe(422);
      expect(error.message).toBe('Validation failed');
      expect(error.errors).toEqual(['field1 is required']);
      expect(error.name).toBe('ValidationError');
    });

    it('ValidationError should default to empty errors array', () => {
      const error = new ValidationError('Validation failed');
      expect(error.errors).toEqual([]);
    });

    it('InternalServerError should have status 500 and isOperational false', () => {
      const error = new InternalServerError();
      expect(error.statusCode).toBe(500);
      expect(error.message).toBe('Internal server error');
      expect(error.isOperational).toBe(false);
      expect(error.name).toBe('InternalServerError');
    });

    it('VideoNotFoundError should have status 404 with jobId', () => {
      const error = new VideoNotFoundError('job-123');
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('Video with jobId job-123 not found');
      expect(error.name).toBe('VideoNotFoundError');
    });

    it('LimitExceededError should have status 400', () => {
      const error = new LimitExceededError('File size (500MB)', 3);
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('File size (500MB) limit exceeded: 3');
      expect(error.name).toBe('LimitExceededError');
    });

    it('InvalidFileError should have status 400', () => {
      const error = new InvalidFileError('Only video files allowed');
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Only video files allowed');
      expect(error.name).toBe('InvalidFileError');
    });
  });

  describe('QueueUnavailableError', () => {
    it('should have status 503', () => {
      const error = new QueueUnavailableError();
      expect(error.statusCode).toBe(503);
      expect(error.message).toBe('Message queue service is unavailable');
      expect(error.name).toBe('QueueUnavailableError');
    });

    it('should accept custom message', () => {
      const error = new QueueUnavailableError('RabbitMQ is down');
      expect(error.message).toBe('RabbitMQ is down');
    });
  });

  describe('Error inheritance', () => {
    it('all errors should be instances of Error', () => {
      expect(new BadRequestError('test')).toBeInstanceOf(Error);
      expect(new UnauthorizedError()).toBeInstanceOf(Error);
      expect(new ForbiddenError()).toBeInstanceOf(Error);
      expect(new NotFoundError('r')).toBeInstanceOf(Error);
      expect(new ValidationError('v')).toBeInstanceOf(Error);
      expect(new InternalServerError()).toBeInstanceOf(Error);
      expect(new QueueUnavailableError()).toBeInstanceOf(Error);
    });

    it('all errors should be instances of AppError', () => {
      expect(new BadRequestError('test')).toBeInstanceOf(AppError);
      expect(new UnauthorizedError()).toBeInstanceOf(AppError);
      expect(new NotFoundError('r')).toBeInstanceOf(AppError);
      expect(new ValidationError('v')).toBeInstanceOf(AppError);
      expect(new QueueUnavailableError()).toBeInstanceOf(AppError);
    });
  });
});
