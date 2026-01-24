export interface VideoCallbackDTO {
  jobId: string;
  status: 'COMPLETED' | 'FAILED';
  error?: string;
  framesExtracted?: number;
}
