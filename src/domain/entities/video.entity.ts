import { VideoStatus } from '@prisma/client';

export class Video {
  id: string;
  jobId: string;
  status: VideoStatus;
  clientId: string;
  framesPerSecond: number;
  inputUrlStorage: string;
  outputUrlStorage: string;
  size: bigint;
  format: string;
  error?: string | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(props: VideoProps) {
    this.id = props.id;
    this.jobId = props.jobId;
    this.status = props.status;
    this.clientId = props.clientId;
    this.framesPerSecond = props.framesPerSecond;
    this.inputUrlStorage = props.inputUrlStorage;
    this.outputUrlStorage = props.outputUrlStorage;
    this.size = props.size;
    this.format = props.format;
    this.error = props.error;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  belongsTo(clientId: string): boolean {
    return this.clientId === clientId;
  }

  isProcessing(): boolean {
    return this.status === VideoStatus.PROCESSING;
  }

  isCompleted(): boolean {
    return this.status === VideoStatus.COMPLETED;
  }

  isFailed(): boolean {
    return this.status === VideoStatus.FAILED;
  }

  isPending(): boolean {
    return this.status === VideoStatus.PENDING;
  }
}

export interface VideoProps {
  id: string;
  jobId: string;
  status: VideoStatus;
  clientId: string;
  framesPerSecond: number;
  inputUrlStorage: string;
  outputUrlStorage: string;
  size: bigint;
  format: string;
  error?: string | null;
  createdAt: Date;
  updatedAt: Date;
}
