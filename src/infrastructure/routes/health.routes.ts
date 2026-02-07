import { Router } from 'express';
import { HealthController } from '@/infrastructure/controllers/health.controller';

const router = Router();
const healthController = new HealthController();

router.get('/', (req, res) => healthController.basic(req, res));
router.get('/detailed', (req, res) => healthController.detailed(req, res));

export { router as healthRoutes };
