import { PrismaClient } from '@prisma/client';
import { logDatabaseOperation } from '@/infrastructure/monitoring';

/**
 * Singleton do Prisma Client com Extension de Logging
 * Performance: Evita múltiplas instâncias e gerencia pool de conexões
 */
class PrismaClientSingleton {
  private static instance: PrismaClient | null = null;

  private constructor() {}

  public static getInstance(): PrismaClient {
    if (!PrismaClientSingleton.instance) {
      const basePrisma = new PrismaClient({
        log:
          process.env.NODE_ENV === 'development'
            ? ['query', 'error', 'warn']
            : ['error'],
        datasources: {
          db: {
            url: process.env.DATABASE_URL,
          },
        },
      });

      PrismaClientSingleton.instance = basePrisma.$extends({
        query: {
          $allModels: {
            async $allOperations({ operation, model, args, query }) {
              const startTime = Date.now();
              
              try {
                const result = await query(args);
                const duration = Date.now() - startTime;
                
                logDatabaseOperation({
                  operation: operation as 'query' | 'create' | 'update' | 'delete',
                  model: model || 'unknown',
                  duration,
                  success: true,
                });
                
                return result;
              } catch (error) {
                const duration = Date.now() - startTime;
                
                logDatabaseOperation({
                  operation: operation as 'query' | 'create' | 'update' | 'delete',
                  model: model || 'unknown',
                  duration,
                  success: false,
                  error: error instanceof Error ? error.message : 'Unknown error',
                });
                
                throw error;
              }
            },
          },
        },
      }) as unknown as PrismaClient;

      console.log('✅ Prisma Client initialized with logging extension');
    }

    return PrismaClientSingleton.instance;
  }


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
