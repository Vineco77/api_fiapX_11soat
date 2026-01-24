import express, { type Application, type Request, type Response } from 'express';
import 'reflect-metadata'; // Necessário para TSyringe
import { healthRoutes } from '@/infrastructure/routes/health.routes';
import { videoRoutes } from '@/infrastructure/routes/video.routes';
import { errorHandler } from '@/infrastructure/middlewares/errors';
import './container'; // Registra injeções de dependência

export class App {
  public app: Application;

  constructor() {
    this.app = express();
    this.setupMiddlewares();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddlewares(): void {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  }

  private setupRoutes(): void {
    // Root
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

    // Health check
    this.app.use('/health', healthRoutes);

    // Video routes
    this.app.use('/videos', videoRoutes);

    // 404 - Not Found (deve ser a última rota)
    this.app.use((_req: Request, res: Response) => {
      res.status(404).json({
        error: 'Route not found',
      });
    });
  }

  private setupErrorHandling(): void {
    // Error handler deve ser o ÚLTIMO middleware
    this.app.use(errorHandler);
  }

  public listen(): void {
    const port = Number(process.env.PORT) || 3000;
    this.app.listen(port, () => {
      console.log(`🚀 Server is running on port ${port}`);
      console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Health check: http://localhost:${port}/health`);
      console.log(`🎥 Videos endpoint: http://localhost:${port}/videos/process`);
    });
  }
}
