/**
 * Constrói o path base para um job (processamento)
 * Formato: {email}/{jobId}/
 */
export function buildJobPath(email: string, jobId: string): string {
  return `${email}/${jobId}/`;
}

/**
 * Constrói o path base para um vídeo específico
 * Formato: {email}/{jobId}/{videoId}/
 */
export function buildVideoPath(email: string, jobId: string, videoId: string): string {
  return `${buildJobPath(email, jobId)}${videoId}/`;
}

/**
 * Constrói o path para a pasta de input de um vídeo
 * Formato: {email}/{jobId}/{videoId}/input/
 */
export function buildVideoInputPath(email: string, jobId: string, videoId: string): string {
  return `${buildVideoPath(email, jobId, videoId)}input/`;
}

/**
 * Constrói o path para a pasta de output de um vídeo
 * Formato: {email}/{jobId}/{videoId}/output/
 */
export function buildVideoOutputPath(email: string, jobId: string, videoId: string): string {
  return `${buildVideoPath(email, jobId, videoId)}output/`;
}

/**
 * Constrói o path completo para o arquivo de vídeo (input)
 * Formato: {email}/{jobId}/{videoId}/input/{filename}
 */
export function buildVideoFilePath(
  email: string,
  jobId: string,
  videoId: string,
  filename: string
): string {
  return `${buildVideoInputPath(email, jobId, videoId)}${filename}`;
}

/**
 * Manter para compatibilidade temporária
 */
export function buildInputPath(email: string, jobId: string): string {
  return `${buildJobPath(email, jobId)}input/`;
}

/**
 * Manter para compatibilidade temporária
 */
export function buildOutputPath(email: string, jobId: string): string {
  return `${buildJobPath(email, jobId)}output/`;
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
