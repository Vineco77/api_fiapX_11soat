import express, { type Application, type Request, type Response } from 'express';
import 'reflect-metadata';
import { healthRoutes } from '@/infrastructure/routes/health.routes';
import { videoRoutes } from '@/infrastructure/routes/video.routes';
import { errorHandler } from '@/infrastructure/middlewares/errors';
import { loggingMiddleware } from '@/infrastructure/middlewares';
import { logger } from '@/infrastructure/monitoring';
import './container';

export class App {
  public app: Application;

  constructor() {
    this.app = express();
    this.setupMiddlewares();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddlewares(): void {
    this.app.use(loggingMiddleware);
    
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  }

  private setupRoutes(): void {
    this.app.get('/', (_req: Request, res: Response) => {
      res.status(200).json({
        message: 'API de Processamento de Vídeos - FIAP 11SOAT',
        version: process.env.API_VERSION || 'v1',
        endpoints: {
          health: '/health',
          videos: '/videos',
        },
      });
    });

    this.app.use('/health', healthRoutes);

    this.app.use('/videos', videoRoutes);

    this.app.use((_req: Request, res: Response) => {
      const traceId = (_req as any).traceId;
      const method = _req.method;
      const url = _req.originalUrl || _req.url;
      const userAgent = _req.get('user-agent');
      const referer = _req.get('referer');
      
      logger.warn(
        {
          type: 'http.404',
          traceId,
          method,
          url,
          userAgent,
          referer,
        },
        `Route not found: ${method} ${url}`
      );

      res.status(404).json({
        error: 'Route not found',
      });
    });
  }

  private setupErrorHandling(): void {
    this.app.use(errorHandler);
  }

  public listen(): void {
    const port = Number(process.env.PORT) || 3001;
    this.app.listen(port, () => {
      logger.info(
        {
          type: 'application.startup',
          port,
          nodeEnv: process.env.NODE_ENV || 'development',
        },
        '🚀 Server is running'
      );
      console.log(`🚀 Server is running on port ${port}`);
      console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Health check: http://localhost:${port}/health`);
      console.log(`🎥 Videos endpoint: http://localhost:${port}/videos/process`);
      console.log(`📊 Kibana dashboard: http://localhost:5601`);
    });
  }
}
