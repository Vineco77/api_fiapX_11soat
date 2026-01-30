import { Request } from 'express';
import { AuthenticatedUserDTO } from '@/domain/dtos';

export function Client() {
  return function (
    target: any,
    propertyKey: string | symbol,
    parameterIndex: number
  ) {
    const existingParameters: number[] = 
      Reflect.getOwnMetadata('client:parameters', target, propertyKey) || [];
    
    existingParameters.push(parameterIndex);
    
    Reflect.defineMetadata(
      'client:parameters',
      existingParameters,
      target,
      propertyKey
    );
  };
}

export function getAuthenticatedUser(req: Request): AuthenticatedUserDTO {
  if (!req.user) {
    throw new Error('User not authenticated. Ensure authMiddleware is applied.');
  }
  return req.user;
}
