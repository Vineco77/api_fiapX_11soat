export class ProcessVideoResponseDTO {
  jobId: string;
  status: string;
  videosCount: number;
  message: string;

  constructor(jobId: string, videosCount: number) {
    this.jobId = jobId;
    this.status = 'PROCESSING';
    this.videosCount = videosCount;
    this.message = 'Videos sent to processing';
  }
}
