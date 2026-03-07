import { getAuthenticatedUser } from '@/infrastructure/middlewares/decorators/client.decorator';
import type { Request } from 'express';

describe('Client Decorator', () => {
  describe('getAuthenticatedUser', () => {
    it('should return user when authenticated', () => {
      const req = {
        user: {
          email: 'test@test.com',
          clientId: 'client-1',
        },
      } as Partial<Request>;

      const user = getAuthenticatedUser(req as Request);

      expect(user.email).toBe('test@test.com');
      expect(user.clientId).toBe('client-1');
    });

    it('should throw error when user is not authenticated', () => {
      const req = {} as Request;

      expect(() => getAuthenticatedUser(req)).toThrow(
        'User not authenticated. Ensure authMiddleware is applied.'
      );
    });

    it('should throw error when user is undefined', () => {
      const req = { user: undefined } as Request;

      expect(() => getAuthenticatedUser(req)).toThrow(
        'User not authenticated'
      );
    });
  });
});
