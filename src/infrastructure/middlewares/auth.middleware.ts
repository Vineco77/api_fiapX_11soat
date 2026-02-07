import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { AuthenticatedUserDTO, AuthValidationResponse } from '@/domain/dtos';
import { UnauthorizedError } from './errors';
import { env } from '../config/env';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUserDTO;
    }
  }
}

export async function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (env.MOCK_AUTH) {
      const mockUser: AuthenticatedUserDTO = {
        email: 'mock@test.com',
        clientId: 'mock-client-id-123',
      };
      
      req.user = mockUser;
      console.log('[AUTH] Using MOCK authentication:', mockUser);
      next();
      return;
    }

    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedError('Missing authorization token');
    }

    if (!authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Invalid token format. Expected: Bearer <token>');
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      throw new UnauthorizedError('Token not provided');
    }

    const authGateUrl = env.AUTH_GATE;
    
    let validationResponse: AuthValidationResponse;

    try {
      const response = await axios.post<AuthValidationResponse>(
        `${authGateUrl}/auth/validate`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          timeout: 5000, // 5 segundos timeout
        }
      );

      validationResponse = response.data;
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        console.error('[AUTH_MIDDLEWARE] Auth Service unavailable:', error.message);
        throw new UnauthorizedError('Authentication service unavailable');
      }

      if (error.response?.data?.error) {
        throw new UnauthorizedError(error.response.data.error);
      }

      throw new UnauthorizedError('Failed to validate token');
    }

    if (!validationResponse.valid) {
      const errorMessage = validationResponse.error || 'Invalid token';
      throw new UnauthorizedError(errorMessage);
    }

    if (!validationResponse.user) {
      throw new UnauthorizedError('Invalid token payload');
    }

    const { email, clientId } = validationResponse.user;

    if (!email || !clientId) {
      throw new UnauthorizedError('Invalid token payload: missing email or clientId');
    }

    req.user = {
      email,
      clientId,
    };

    const tokenPreview = `${token.substring(0, 10)}...${token.substring(token.length - 10)}`;
    console.log(`[AUTH] User authenticated: ${email} (${clientId}) - Token: ${tokenPreview}`);

    next();
  } catch (error) {
    next(error);
  }
}
