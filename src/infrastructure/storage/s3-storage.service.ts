import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { injectable } from 'tsyringe';
import { getS3Client } from '@/infrastructure/config/s3-client';
import { appConfig } from '@/infrastructure/config/env';
import { logS3Operation } from '@/infrastructure/monitoring';
import type { IS3StorageService } from '@/domain/repositories/s3-storage.interface';

@injectable()
export class S3StorageService implements IS3StorageService {
  private readonly s3Client = getS3Client();
  private readonly bucket = appConfig.aws.s3Bucket;

  async uploadFile(file: Buffer, key: string, contentType: string): Promise<void> {
    const startTime = Date.now();
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file,
        ContentType: contentType,
        ServerSideEncryption: 'AES256',
        StorageClass: 'STANDARD',
      });

      await this.s3Client.send(command);
      
      const duration = Date.now() - startTime;
      logS3Operation({
        operation: 's3.upload',
        bucket: this.bucket,
        key,
        duration,
        size: file.length,
        success: true,
      });
      
      console.log(`File uploaded to S3: ${key}`);
    } catch (error) {
      const duration = Date.now() - startTime;
      logS3Operation({
        operation: 's3.upload',
        bucket: this.bucket,
        key,
        duration,
        size: file.length,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      console.error(`Error uploading file to S3: ${key}`, error);
      throw new Error(`Failed to upload file to S3: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getSignedUrl(prefix: string, _expiresIn: number): Promise<string> {
    try {
      const s3Uri = `s3://${this.bucket}/${prefix}`;
      
      console.log(`Generated S3 URI: ${s3Uri}`);
      return s3Uri;
    } catch (error) {
      console.error(`Error generating signed URL for prefix: ${prefix}`, error);
      throw new Error(`Failed to generate signed URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getSignedUrlForFile(key: string, expiresIn: number): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn,
      });

      console.log(`Generated signed URL for file: ${key}`);
      return signedUrl;
    } catch (error) {
      console.error(`Error generating signed URL for file: ${key}`, error);
      throw new Error(`Failed to generate signed URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteFolder(prefix: string): Promise<void> {
    const startTime = Date.now();
    try {
      const listCommand = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
      });

      const listedObjects = await this.s3Client.send(listCommand);

      if (!listedObjects.Contents || listedObjects.Contents.length === 0) {
        console.log(`No objects found to delete with prefix: ${prefix}`);
        const duration = Date.now() - startTime;
        logS3Operation({
          operation: 's3.delete',
          bucket: this.bucket,
          prefix,
          duration,
          success: true,
        });
        return;
      }

      const deleteCommand = new DeleteObjectsCommand({
        Bucket: this.bucket,
        Delete: {
          Objects: listedObjects.Contents.map((obj) => ({ Key: obj.Key })),
          Quiet: true,
        },
      });

      await this.s3Client.send(deleteCommand);
      
      const duration = Date.now() - startTime;
      logS3Operation({
        operation: 's3.delete',
        bucket: this.bucket,
        prefix,
        duration,
        success: true,
      });
      
      console.log(`Deleted ${listedObjects.Contents.length} objects from S3: ${prefix}`);

      if (listedObjects.IsTruncated) {
        await this.deleteFolder(prefix);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      logS3Operation({
        operation: 's3.delete',
        bucket: this.bucket,
        prefix,
        duration,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      console.error(`Error deleting folder from S3: ${prefix}`, error);
      throw new Error(`Failed to delete folder from S3: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async uploadMultipleFiles(
    files: Array<{ buffer: Buffer; key: string; contentType: string }>
  ): Promise<void> {
    try {
      const uploadPromises = files.map((file) =>
        this.uploadFile(file.buffer, file.key, file.contentType)
      );

      await Promise.all(uploadPromises);
      console.log(`Successfully uploaded ${files.length} files in parallel`);
    } catch (error) {
      console.error('Error uploading multiple files', error);
      throw new Error(`Failed to upload files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Gera presigned URL para listagem de objetos em uma pasta
   * 
   * Retorna URL assinada que permite listar todos os arquivos de uma pasta.
   * Frontend pode usar essa URL para descobrir quais arquivos estão disponíveis.
   * 
   * @param prefix - Pasta no S3 (ex: "email@example.com/jobId/input/")
   * @param expiresIn - Tempo de expiração em segundos (default: 3600 = 1 hora)
   */
  async getPresignedFolderUrl(prefix: string, expiresIn: number = 3600): Promise<string> {
    const startTime = Date.now();
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn,
      });

      const duration = Date.now() - startTime;
      logS3Operation({
        operation: 's3.getPresignedFolderUrl',
        bucket: this.bucket,
        prefix,
        duration,
        success: true,
      });

      console.log(`Generated presigned folder URL for: ${prefix}`);
      return signedUrl;
    } catch (error) {
      const duration = Date.now() - startTime;
      logS3Operation({
        operation: 's3.getPresignedFolderUrl',
        bucket: this.bucket,
        prefix,
        duration,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      console.error(`Error generating presigned folder URL: ${prefix}`, error);
      throw new Error(`Failed to generate presigned folder URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
