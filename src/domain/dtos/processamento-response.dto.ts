export interface VideoItemResponseDTO {
  id: string;
  fileName: string;
  fileFormat: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  inputUrlStorage: string;
  outputUrlStorage: string;
  size: string;
  error?: string | null;
  uploadedAt: string;
  processedAt?: string | null;
}

export interface ProcessamentoResponseDTO {
  id: string;
  jobId: string;
  clientId: string;
  email: string;
  framesPerSecond: number;
  format: string;
  size: string;
  error?: string | null;
  uploadedAt: string;
  processedAt?: string | null;
  videos: VideoItemResponseDTO[];
  stats: {
    totalVideos: number;
    completed: number;
    processing: number;
    failed: number;
    pending: number;
  };
}

export interface GetProcessamentosResponseDTO {
  processamentos: ProcessamentoResponseDTO[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
