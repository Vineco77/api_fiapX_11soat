import { Request, Response } from 'express';
import { container } from 'tsyringe';
import { HealthCheckUseCase } from '@/application/use-cases/health-check.use-case';

export class HealthController {
  async detailed(_req: Request, res: Response): Promise<Response> {
    const healthCheckUseCase = container.resolve(HealthCheckUseCase);

    try {
      const result = await healthCheckUseCase.execute();

      const httpStatus = result.status === 'healthy' ? 200 : result.status === 'degraded' ? 200 : 503;

      return res.status(httpStatus).json(result);
    } catch (error) {
      return res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Health check failed',
      });
    } finally {
      await healthCheckUseCase.cleanup();
    }
  }
}
