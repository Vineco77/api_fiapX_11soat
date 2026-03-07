export interface PersonDTO {
  clientId: string;
  name: string;
  email: string;
}

export interface VideoProcessingItemDTO {
  id: string;
  id_processamento: string;
  framesPerSecond: number;
  format: string;
  input_url: string;
  output_url: string;
}

export interface VideoProcessingMessageDTO {
  person: PersonDTO;
  videos: VideoProcessingItemDTO[];
}
