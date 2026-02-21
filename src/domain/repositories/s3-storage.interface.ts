export interface IS3StorageService {
  /**
   * Faz upload de um arquivo para o S3
   * @param file - Buffer do arquivo
   * @param key - Caminho completo no bucket (ex: email/jobId/input/filename.mp4)
   * @param contentType - MIME type do arquivo
   */
  uploadFile(file: Buffer, key: string, contentType: string): Promise<void>;

  /**
   * Upload paralelo de múltiplos arquivos
   * @param files - Array de arquivos para upload
   */
  uploadMultipleFiles(
    files: Array<{ buffer: Buffer; key: string; contentType: string }>
  ): Promise<void>;

  /**
   * Gera URL assinada para acesso a uma pasta/prefixo no S3
   * @param prefix - Prefixo/pasta (ex: email/jobId/input/)
   * @param expiresIn - Tempo de expiração em segundos
   * @returns URL assinada
   */
  getSignedUrl(prefix: string, expiresIn: number): Promise<string>;

  /**
   * Gera presigned URL para download de um arquivo específico
   * @param key - Caminho completo do arquivo (ex: email/jobId/input/video.mp4)
   * @param expiresIn - Tempo de expiração em segundos
   * @returns Presigned URL para GetObject
   */
  getSignedUrlForFile(key: string, expiresIn: number): Promise<string>;

  /**
   * Gera presigned URL para listagem de objetos em uma pasta
   * Útil para frontend listar arquivos de uma pasta específica
   * @param prefix - Prefixo/pasta (ex: email/jobId/input/)
   * @param expiresIn - Tempo de expiração em segundos (default: 3600)
   * @returns Presigned URL para ListObjectsV2
   */
  getPresignedFolderUrl(prefix: string, expiresIn?: number): Promise<string>;

  /**
   * Deleta todos os arquivos de uma pasta (prefixo)
   * @param prefix - Prefixo/pasta a ser deletada (ex: email/jobId/)
   */
  deleteFolder(prefix: string): Promise<void>;
}

export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
  key?: string;
  location?: string;
  bucket?: string;
  etag?: string;
}
