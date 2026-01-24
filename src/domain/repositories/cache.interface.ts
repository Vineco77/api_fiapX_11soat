export interface ICacheService {
  /**
   * Armazena um valor no cache
   * @param key - Chave do cache
   * @param value - Valor a ser armazenado (será serializado como JSON)
   * @param ttlSeconds - Tempo de vida em segundos
   */
  set(key: string, value: any, ttlSeconds: number): Promise<void>;

  /**
   * Recupera um valor do cache
   * @param key - Chave do cache
   * @returns Valor deserializado ou null se não existir
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Remove uma chave do cache
   * @param key - Chave a ser removida
   */
  delete(key: string): Promise<void>;

  /**
   * Remove múltiplas chaves que correspondem a um pattern
   * @param pattern - Pattern para buscar chaves (ex: videos:clientId:*)
   */
  deletePattern(pattern: string): Promise<void>;

  /**
   * Verifica se chave existe no cache
   * @param key - Chave do cache
   */
  exists(key: string): Promise<boolean>;
}
