import { VideoStatus } from '@prisma/client';

export class Video {
  id: string;
  fileName: string;
  fileFormat: string;
  processamentoId: string;
  status: VideoStatus;
  inputUrlStorage: string;
  outputUrlStorage: string;
  size: bigint;
  error?: string | null;
  uploadedAt: Date;
  processedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(props: VideoProps) {
    this.id = props.id;
    this.fileName = props.fileName;
    this.fileFormat = props.fileFormat;
    this.processamentoId = props.processamentoId;
    this.status = props.status;
    this.inputUrlStorage = props.inputUrlStorage;
    this.outputUrlStorage = props.outputUrlStorage;
    this.size = props.size;
    this.error = props.error;
    this.uploadedAt = props.uploadedAt;
    this.processedAt = props.processedAt;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  belongsToProcessamento(processamentoId: string): boolean {
    return this.processamentoId === processamentoId;
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
  fileName: string;
  fileFormat: string;
  processamentoId: string;
  status: VideoStatus;
  inputUrlStorage: string;
  outputUrlStorage: string;
  size: bigint;
  error?: string | null;
  uploadedAt: Date;
  processedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

