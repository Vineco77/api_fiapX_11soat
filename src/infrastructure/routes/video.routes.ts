import { Router } from 'express';
import { ProcessVideoController } from '@/infrastructure/controllers/process-video.controller';
import { GetVideosController } from '@/infrastructure/controllers/get-videos.controller';
import { uploadVideos } from '@/infrastructure/middlewares/upload.middleware';
import { asyncHandler } from '@/infrastructure/middlewares/errors';

/**
 * Rotas de vídeos
 */
const router = Router();
const processController = new ProcessVideoController();
const getVideosController = new GetVideosController();

/**
 * GET /videos
 * Lista vídeos do cliente com paginação e filtros
 * 
 * Query params:
 * - page: número da página (default: 1)
 * - limit: itens por página (default: 10, max: 100)
 * - status: filtro por status (opcional)
 */
router.get(
  '/',
  asyncHandler(getVideosController.list.bind(getVideosController))
);

/**
 * POST /videos/process
 * Upload e processamento de vídeos
 * 
 * Middlewares aplicados:
 * 1. uploadVideos - Multer (upload multipart)
 * 2. asyncHandler - Captura erros assíncronos
 * 3. controller.process - Lógica de negócio
 */
router.post(
  '/process',
  uploadVideos,
  asyncHandler(processController.process.bind(processController))
);

export { router as videoRoutes };
