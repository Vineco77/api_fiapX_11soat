import multer from 'multer';
import multerS3 from 'multer-s3';
import { v4 as uuidv4 } from 'uuid';
import { appConfig } from '@/infrastructure/config/env';
import { getS3Client } from '@/infrastructure/config/s3-client';
import {
  sanitizeFilename,
  buildVideoFilePath,
} from '@/infrastructure/storage/s3-path.helper';

const maxFileSize = appConfig.limits.maxFileSizeMB * 1024 * 1024;
const maxFiles = appConfig.limits.maxVideosPerRequest;

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  if (file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}. Only video files are allowed.`));
  }
};

const createStorage = (): multer.StorageEngine => {
  const useS3Streaming = appConfig.upload.useS3Streaming;

  if (useS3Streaming) {
    console.log('Using S3 streaming upload (multer-s3)');
    
    return multerS3({
      s3: getS3Client(),
      bucket: appConfig.aws.s3Bucket,
      contentType: multerS3.AUTO_CONTENT_TYPE,
      serverSideEncryption: 'AES256',
      metadata: (_req, file, cb) => {
        cb(null, {
          fieldName: file.fieldname,
          originalName: file.originalname,
          uploadedAt: new Date().toISOString(),
        });
      },
      key: (req, file, cb) => {
        const tempJobId = uuidv4();
        const videoId = uuidv4();
        const sanitized = sanitizeFilename(file.originalname);
        
        const user = (req as any).user;
        const email = user?.email || 'temp@temp.com';
        
        const s3Key = buildVideoFilePath(email, tempJobId, videoId, sanitized);
        
        const reqWithBody = req as any;
        if (!reqWithBody.body.uploadMetadata) {
          reqWithBody.body.uploadMetadata = [];
        }
        reqWithBody.body.uploadMetadata.push({
          originalName: file.originalname,
          videoId,
          tempJobId,
          s3Key,
        });
        
        console.log(`Streaming upload to S3: ${s3Key}`);
        cb(null, s3Key);
      },
    });
  } else {
    console.log('Using memory storage (traditional upload)');
    return multer.memoryStorage();
  }
};

const storage = createStorage();

export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: maxFileSize,
    files: maxFiles,
    fieldNameSize: 100,
    fieldSize: 1024 * 1024, // 1MB para campos de texto
    fields: 10,
  },
});

export const uploadVideos = uploadMiddleware.array('files', maxFiles);
