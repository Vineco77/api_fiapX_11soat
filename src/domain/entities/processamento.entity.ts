import { Video } from './video.entity';

export class Processamento {
  id: string;
  jobId: string;
  clientId: string;
  email: string;
  framesPerSecond: number;
  format: string;
  size: bigint;
  error?: string | null;
  uploadedAt: Date;
  processedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  videos: Video[];

  constructor(props: ProcessamentoProps) {
    this.id = props.id;
    this.jobId = props.jobId;
    this.clientId = props.clientId;
    this.email = props.email;
    this.framesPerSecond = props.framesPerSecond;
    this.format = props.format;
    this.size = props.size;
    this.error = props.error;
    this.uploadedAt = props.uploadedAt;
    this.processedAt = props.processedAt;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.videos = props.videos || [];
  }

  belongsTo(clientId: string): boolean {
    return this.clientId === clientId;
  }

  belongsToEmail(email: string): boolean {
    return this.email === email;
  }

  isAllVideosCompleted(): boolean {
    return this.videos.length > 0 && this.videos.every((video) => video.isCompleted());
  }

  hasAnyVideoFailed(): boolean {
    return this.videos.some((video) => video.isFailed());
  }

  hasAnyVideoProcessing(): boolean {
    return this.videos.some((video) => video.isProcessing());
  }

  getTotalVideos(): number {
    return this.videos.length;
  }

  getCompletedVideosCount(): number {
    return this.videos.filter((video) => video.isCompleted()).length;
  }

  getFailedVideosCount(): number {
    return this.videos.filter((video) => video.isFailed()).length;
  }

  getProcessingVideosCount(): number {
    return this.videos.filter((video) => video.isProcessing()).length;
  }
}

export interface ProcessamentoProps {
  id: string;
  jobId: string;
  clientId: string;
  email: string;
  framesPerSecond: number;
  format: string;
  size: bigint;
  error?: string | null;
  uploadedAt: Date;
  processedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  videos?: Video[];
}
