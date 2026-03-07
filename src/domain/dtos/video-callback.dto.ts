export interface VideoCallbackDTO {
  id: string;
  id_processamento: string;
  status: 'COMPLETED' | 'FAILED';
  error?: string;
}
