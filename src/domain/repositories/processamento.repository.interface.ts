import { Processamento } from '../entities/processamento.entity';

export interface IProcessamentoRepository {
  /**
   * Cria um novo Processamento no banco de dados
   */
  create(data: CreateProcessamentoData): Promise<Processamento>;

  /**
   * Busca um Processamento pelo jobId
   */
  findByJobId(jobId: string): Promise<Processamento | null>;

  /**
   * Busca um Processamento pelo ID
   */
  findById(id: string): Promise<Processamento | null>;

  /**
   * Lista Processamentos de um cliente por clientId com paginação
   * Inclui os vídeos relacionados
   */
  findByClientId(
    clientId: string,
    skip: number,
    take: number,
    status?: string
  ): Promise<{ processamentos: Processamento[]; total: number }>;

  /**
   * Atualiza a soma do tamanho total dos vídeos
   */
  updateTotalSize(jobId: string, totalSize: bigint): Promise<void>;

  /**
   * Atualiza o erro de um Processamento
   */
  updateError(jobId: string, error: string): Promise<void>;

  /**
   * Marca o processamento como processado (atualiza processedAt)
   */
  markAsProcessed(jobId: string): Promise<void>;

  /**
   * Deleta um Processamento (cascade deleta os vídeos também)
   */
  delete(jobId: string): Promise<void>;

  /**
   * Busca email do cliente pelo jobId (usado para S3 paths)
   */
  getEmailByJobId(jobId: string): Promise<string | null>;

  /**
   * Busca clientId pelo jobId (usado para invalidação de cache)
   */
  getClientIdByJobId(jobId: string): Promise<string | null>;
}

export interface CreateProcessamentoData {
  jobId: string;
  clientId: string;
  email: string;
  framesPerSecond: number;
  format: string;
  size?: bigint;
  error?: string;
}
