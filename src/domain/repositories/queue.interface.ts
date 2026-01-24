import { VideoProcessingMessageDTO } from '../dtos';

export interface IQueueRepository {
  /**
   * Publica mensagem de processamento de vídeo na fila video.processing
   * @param message - Dados do job para o Worker processar
   * @throws QueueUnavailableError se RabbitMQ estiver indisponível
   */
  publishVideoProcessing(message: VideoProcessingMessageDTO): Promise<void>;

  /**
   * Fecha a conexão com RabbitMQ
   * Deve ser chamado no shutdown da aplicação
   */
  close(): Promise<void>;
}
