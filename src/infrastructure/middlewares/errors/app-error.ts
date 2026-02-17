export abstract class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string) {
    super(message, 400);
    this.name = 'BadRequestError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends AppError {
  public readonly errors: string[];

  constructor(message: string, errors: string[] = []) {
    super(message, 422);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

export class InternalServerError extends AppError {
  constructor(message = 'Internal server error') {
    super(message, 500, false);
    this.name = 'InternalServerError';
  }
}

export class VideoNotFoundError extends NotFoundError {
  constructor(jobId: string) {
    super(`Video with jobId ${jobId}`);
    this.name = 'VideoNotFoundError';
  }
}

export class LimitExceededError extends BadRequestError {
  constructor(limit: string, value: number) {
    super(`${limit} limit exceeded: ${value}`);
    this.name = 'LimitExceededError';
  }
}

export class InvalidFileError extends BadRequestError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidFileError';
  }
}
