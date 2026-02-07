import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logRequest, logResponse } from '@/infrastructure/monitoring';


export function loggingMiddleware(req: Request, res: Response, next: NextFunction): void {
  const traceId = uuidv4();
  
  (req as any).traceId = traceId;
  
  const startTime = Date.now();

  const method = req.method;
  const url = req.originalUrl || req.url;
  const userAgent = req.get('user-agent');
  
  const user = (req as any).user;
  const clientId = user?.clientId;
  const email = user?.email;

  logRequest({
    traceId,
    method,
    url,
    userAgent,
    clientId,
    email,
  });

  const originalSend = res.send;
  
  res.send = function (data: any): Response {
    const duration = Date.now() - startTime;

    logResponse({
      traceId,
      method,
      url,
      statusCode: res.statusCode,
      duration,
      clientId,
    });

    return originalSend.call(this, data);
  };

  next();
}
