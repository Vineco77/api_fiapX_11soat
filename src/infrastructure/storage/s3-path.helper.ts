/**
 * Helpers para construção de paths do S3
 * Garante consistência na estrutura de pastas
 */

/**
 * Constrói o path base para um job
 * Formato: {email}/{jobId}/
 */
export function buildJobPath(email: string, jobId: string): string {
  return `${email}/${jobId}/`;
}

/**
 * Constrói o path para a pasta de input
 * Formato: {email}/{jobId}/input/
 */
export function buildInputPath(email: string, jobId: string): string {
  return `${buildJobPath(email, jobId)}input/`;
}

/**
 * Constrói o path para a pasta de output
 * Formato: {email}/{jobId}/output/
 */
export function buildOutputPath(email: string, jobId: string): string {
  return `${buildJobPath(email, jobId)}output/`;
}

/**
 * Constrói o path completo para um arquivo de vídeo
 * Formato: {email}/{jobId}/input/{filename}
 */
export function buildVideoFilePath(
  email: string,
  jobId: string,
  filename: string
): string {
  return `${buildInputPath(email, jobId)}${filename}`;
}

export function sanitizeFilename(filename: string): string {
  return filename
    .replaceAll('..', '')
    .replaceAll(/[^a-zA-Z0-9._-]/g, '_')
    .substring(0, 255);
}

/**
 * Extrai a extensão do arquivo
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? (parts.at(-1)?.toLowerCase() ?? '') : '';
}

/**
 * Valida se o arquivo é um vídeo baseado no MIME type
 */
export function isVideoFile(mimetype: string): boolean {
  return mimetype.startsWith('video/');
}
