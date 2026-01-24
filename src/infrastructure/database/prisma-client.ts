import { PrismaClient } from '@prisma/client';

/**
 * Singleton do Prisma Client
 * Performance: Evita múltiplas instâncias e gerencia pool de conexões
 */
class PrismaClientSingleton {
  private static instance: PrismaClient | null = null;

  private constructor() {}

  public static getInstance(): PrismaClient {
    if (!PrismaClientSingleton.instance) {
      PrismaClientSingleton.instance = new PrismaClient({
        log:
          process.env.NODE_ENV === 'development'
            ? ['query', 'error', 'warn']
            : ['error'],
        // Performance: Configurações de pool de conexões
        datasources: {
          db: {
            url: process.env.DATABASE_URL,
          },
        },
      });

      console.log('✅ Prisma Client initialized');
    }

    return PrismaClientSingleton.instance;
  }

  /**
   * Desconecta o cliente (útil para testes e shutdown)
   */
  public static async disconnect(): Promise<void> {
    if (PrismaClientSingleton.instance) {
      await PrismaClientSingleton.instance.$disconnect();
      PrismaClientSingleton.instance = null;
      console.log('🔌 Prisma Client disconnected');
    }
  }
}

export const getPrismaClient = (): PrismaClient =>
  PrismaClientSingleton.getInstance();
export const disconnectPrisma = (): Promise<void> =>
  PrismaClientSingleton.disconnect();
