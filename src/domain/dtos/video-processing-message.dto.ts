export interface VideoProcessingMessageDTO {

  jobId: string;
  clientId: string;
  inputUrlStorage: string;
  outputUrlStorage: string;
  framesPerSecond: number;
  format: string;
}
