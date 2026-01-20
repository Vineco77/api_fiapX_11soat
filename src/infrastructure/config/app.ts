import express, { type Application, type Request, type Response } from 'express';
import { healthRoutes } from '@/infrastructure/routes/health.routes';

export class App {
  public app: Application;

  constructor() {
    this.app = express();
    this.setupMiddlewares();
    this.setupRoutes();
  }

  private setupMiddlewares(): void {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  }

  private setupRoutes(): void {
    this.app.get('/health', (_req: Request, res: Response) => {
      res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
      });
    });

    this.app.use('/health', healthRoutes);

    this.app.get('/', (_req: Request, res: Response) => {
      res.status(200).json({
        message: 'API de Processamento de Vídeos - FIAP 11SOAT',
        version: process.env.API_VERSION || 'v1',
        docs: '/api/docs',
      });
    });

    this.app.use((_req: Request, res: Response) => {
      res.status(404).json({
        error: 'Route not found',
      });
    });
  }

  public listen(): void {
    const port = Number(process.env.PORT) || 3000;
    this.app.listen(port, () => {
      console.log(`🚀 Server is running on port ${port}`);
      console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Health check: http://localhost:${port}/health`);
    });
  }
}
