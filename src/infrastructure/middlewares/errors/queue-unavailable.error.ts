import { AppError } from './app-error';

export class QueueUnavailableError extends AppError {
  constructor(message = 'Message queue service is unavailable') {
    super(message, 503);
    this.name = 'QueueUnavailableError';
  }
}
