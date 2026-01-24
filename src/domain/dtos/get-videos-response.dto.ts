export interface VideoItemDTO {
  jobId: string;
  clientId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  inputFolderUrl: string;
  outputFolderUrl?: string;
  uploadedAt: string;
  processedAt?: string;
  framesPerSecond: number;
  format: string;
  error?: string;
}

export interface GetVideosResponseDTO {
  videos: VideoItemDTO[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
