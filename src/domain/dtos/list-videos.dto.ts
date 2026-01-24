export interface ListVideosQueryDTO {
  page?: number;
  limit?: number;
}

export interface ListVideosResponseDTO {
  page: number;
  limit: number;
  total: number;
  data: VideoItemDTO[];
}

export interface VideoItemDTO {
  id: string;
  jobId: string;
  status: string;
  framesPerSecond: number;
  format: string;
  size: bigint | number;
  createdAt: Date;
  updatedAt: Date;
  error: string | null;
}
