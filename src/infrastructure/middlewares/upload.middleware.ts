import multer from 'multer';
import { appConfig } from '@/infrastructure/config/env';

const maxFileSize = appConfig.limits.maxFileSizeMB * 1024 * 1024;

const maxFiles = appConfig.limits.maxVideosPerRequest;

const storage = multer.memoryStorage();

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  if (file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}. Only video files are allowed.`));
  }
};


export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: maxFileSize,
    files: maxFiles,
    // Performance: Limites adicionais para evitar DoS
    fieldNameSize: 100,
    fieldSize: 1024 * 1024, // 1MB para campos de texto
    fields: 10, 
  },
});


export const uploadVideos = uploadMiddleware.array('files', maxFiles);
