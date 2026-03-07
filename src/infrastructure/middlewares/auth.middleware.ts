import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { AuthenticatedUserDTO, AuthValidationResponse } from '@/domain/dtos';
import { UnauthorizedError } from './errors';
import { env } from '../config/env';
import { logger } from '../monitoring/logger.service';

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
  const traceId = (req as any).id || 'unknown';
  
  try {
    // if (env.auth.mockAuth) {
    //   req.user = {
    //     email: 'mock-user@fiapx.com',
    //     clientId: 'mock-client-id-123',
    //   };
      
    //   logger.warn({
    //     traceId,
    //     tag: 'auth.middleware',
    //     mockUser: req.user,
    //     msg: '⚠️ MOCK_AUTH enabled - bypassing authentication'
    //   });
      
    //   next();
    //   return;
    // }
    
    logger.info({
      traceId,
      tag: 'auth.middleware',
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      msg: 'authMiddleware_001'
    });

    const authHeader = req.headers.authorization;

    if (!authHeader) {
      logger.warn({
        traceId,
        tag: 'auth.middleware',
        msg: 'authMiddleware_002'
      });
      throw new UnauthorizedError('Missing authorization token');
    }

    logger.debug({
      traceId,
      tag: 'auth.middleware',
      headerPrefix: authHeader.substring(0, 20) + '...',
      msg: 'authMiddleware_003'
    });

    if (!authHeader.startsWith('Bearer ')) {
      logger.warn({
        traceId,
        tag: 'auth.middleware',
        headerPrefix: authHeader.substring(0, 20),
        msg: 'authMiddleware_004'
      });
      throw new UnauthorizedError('Invalid token format. Expected: Bearer <token>');
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      logger.warn({
        traceId,
        tag: 'auth.middleware',
        msg: 'authMiddleware_005'
      });
      throw new UnauthorizedError('Token not provided');
    }

    const tokenPreview = `${token.substring(0, 10)}...${token.substring(token.length - 10)}`;
    logger.debug({
      traceId,
      tag: 'auth.middleware',
      tokenPreview,
      tokenLength: token.length,
      msg: 'authMiddleware_006'
    });

    const authGateUrl = env.AUTH_GATE;
    const validateUrl = `${authGateUrl}/auth/validate`;
    
    logger.info({
      traceId,
      tag: 'auth.middleware',
      authGateUrl,
      validateUrl,
      tokenPreview,
      msg: 'authMiddleware_007'
    });

    let validationResponse: AuthValidationResponse;

    try {
      const axiosStartTime = Date.now();
      
      const response = await axios.post<AuthValidationResponse>(
        validateUrl,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          timeout: 5000, // 5 segundos timeout
        }
      );

      const axiosEndTime = Date.now();
      const duration = axiosEndTime - axiosStartTime;

      logger.info({
        traceId,
        tag: 'auth.middleware',
        statusCode: response.status,
        duration,
        responseData: response.data,
        msg: 'authMiddleware_008'
      });

      validationResponse = response.data;
    } catch (error: any) {
      logger.error({
        traceId,
        tag: 'auth.middleware',
        errorCode: error.code,
        errorMessage: error.message,
        responseStatus: error.response?.status,
        responseData: error.response?.data,
        errorStack: error.stack,
        msg: 'authMiddleware_009'
      });

      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        logger.error({
          traceId,
          tag: 'auth.middleware',
          authGateUrl,
          errorCode: error.code,
          msg: 'authMiddleware_010'
        });
        throw new UnauthorizedError('Authentication service unavailable');
      }

      if (error.response?.data?.error) {
        logger.warn({
          traceId,
          tag: 'auth.middleware',
          authError: error.response.data.error,
          statusCode: error.response.status,
          msg: 'authMiddleware_011'
        });
        throw new UnauthorizedError(error.response.data.error);
      }

      logger.error({
        traceId,
        tag: 'auth.middleware',
        msg: 'authMiddleware_012'
      });
      throw new UnauthorizedError('Failed to validate token');
    }

    logger.debug({
      traceId,
      tag: 'auth.middleware',
      validationResponse,
      msg: 'authMiddleware_013'
    });

    if (!validationResponse.valid) {
      const errorMessage = validationResponse.error || 'Invalid token';
      logger.warn({
        traceId,
        tag: 'auth.middleware',
        valid: validationResponse.valid,
        errorMessage,
        msg: 'authMiddleware_014'
      });
      throw new UnauthorizedError(errorMessage);
    }

    if (!validationResponse.user) {
      logger.warn({
        traceId,
        tag: 'auth.middleware',
        validationResponse,
        msg: 'authMiddleware_015'
      });
      throw new UnauthorizedError('Invalid token payload');
    }

    const { email, clientId } = validationResponse.user;

    if (!email || !clientId) {
      logger.warn({
        traceId,
        tag: 'auth.middleware',
        email,
        clientId,
        msg: 'authMiddleware_016'
      });
      throw new UnauthorizedError('Invalid token payload: missing email or clientId');
    }

    req.user = {
      email,
      clientId,
    };

    logger.info({
      traceId,
      tag: 'auth.middleware',
      email,
      clientId,
      tokenPreview,
      msg: 'authMiddleware_017'
    });

    next();
  } catch (error) {
    logger.error({
      traceId,
      tag: 'auth.middleware',
      errorName: error instanceof Error ? error.constructor.name : 'Unknown',
      errorMessage: error instanceof Error ? error.message : String(error),
      msg: 'authMiddleware_018'
    });
    next(error);
  }
}
