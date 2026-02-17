import { Router } from 'express';
import { ProcessVideoController } from '@/infrastructure/controllers/process-video.controller';
import { GetVideosController } from '@/infrastructure/controllers/get-videos.controller';
import { VideoCallbackController } from '@/infrastructure/controllers/video-callback.controller';
import { uploadVideos } from '@/infrastructure/middlewares/upload.middleware';
import { authMiddleware } from '@/infrastructure/middlewares/auth.middleware';
import { asyncHandler } from '@/infrastructure/middlewares/errors';

const router = Router();
const processController = new ProcessVideoController();
const getVideosController = new GetVideosController();
const callbackController = new VideoCallbackController();

router.get(
  '/',
  authMiddleware,
  asyncHandler(getVideosController.list.bind(getVideosController))
);

router.post(
  '/process',
  authMiddleware,
  uploadVideos,
  asyncHandler(processController.process.bind(processController))
);

router.post(
  '/callback',
  asyncHandler(callbackController.callback.bind(callbackController))
);

export { router as videoRoutes };
