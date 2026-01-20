import { Router } from 'express';
import { HealthController } from '@/infrastructure/controllers/health.controller';

const router = Router();
const healthController = new HealthController();

router.get('/detailed', (req, res) => healthController.detailed(req, res));

export { router as healthRoutes };
