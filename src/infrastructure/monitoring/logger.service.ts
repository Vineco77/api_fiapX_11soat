
import pino from 'pino';
import { Client } from '@elastic/elasticsearch';
import { appConfig } from '@/infrastructure/config/env';

const isDevelopment = appConfig.nodeEnv === 'development';

const esClient = new Client({
  node: appConfig.elasticsearch.url,
});

let logBuffer: any[] = [];
const BATCH_SIZE = 50;
const FLUSH_INTERVAL = 5000;

async function flushLogs(): Promise<void> {
  if (logBuffer.length === 0) return;

  const logsToSend = [...logBuffer];
  logBuffer = [];

  try {
    const body = logsToSend.flatMap(log => [
      { index: { _index: appConfig.elasticsearch.index } },
      log
    ]);

    await esClient.bulk({ body, refresh: false });
  } catch (error) {
    if (isDevelopment) {
      console.error('Failed to bulk write to Elasticsearch:', error);
    }
  }
}

function bufferLog(log: any): void {
  logBuffer.push({
    ...log,
    '@timestamp': new Date().toISOString()
  });

  if (logBuffer.length >= BATCH_SIZE) {
    flushLogs().catch(() => {});
  }
}

setInterval(() => {
  flushLogs().catch(() => {});
}, FLUSH_INTERVAL);

process.on('beforeExit', () => {
  flushLogs().catch(() => {});
});

const streams: pino.StreamEntry[] = [
  {
    level: 'info',
    stream: isDevelopment
      ? pino.transport({
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        })
      : process.stdout,
  },
];

export const logger = pino(
  {
    level: process.env.LOG_LEVEL || 'debug',
    formatters: {
      level: (label) => {
        return { level: label };
      },
      bindings: () => {
        return {
          service: 'api-fiapx-11soat',
          environment: appConfig.nodeEnv,
          hostname: process.env.HOSTNAME || 'unknown',
        };
      },
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    serializers: {
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res,
      err: pino.stdSerializers.err,
    },
    hooks: {
      logMethod(args: any[], method: any) {
        if (args.length >= 2) {
          const logObject = typeof args[0] === 'object' ? args[0] : {};
          bufferLog({ 
            ...logObject, 
            message: args.at(-1),
          });
        }
        method.apply(this, args);
      },
    },
  },
  pino.multistream(streams)
);


export function createContextLogger(context: Record<string, unknown>) {
  return logger.child(context);
}


export function logRequest(context: {
  traceId: string;
  method: string;
  url: string;
  userAgent?: string;
  clientId?: string;
  email?: string;
}) {
  logger.info(
    {
      type: 'http.request',
      ...context,
    },
    'HTTP Request received'
  );
}


export function logResponse(context: {
  traceId: string;
  method: string;
  url: string;
  statusCode: number;
  duration: number;
  clientId?: string;
}) {
  let level: 'error' | 'warn' | 'info' = 'info';
  
  if (context.statusCode >= 500) {
    level = 'error';
  } else if (context.statusCode >= 400) {
    level = 'warn';
  }

  logger[level](
    {
      type: 'http.response',
      ...context,
    },
    `HTTP Response sent - ${context.statusCode} - ${context.duration}ms`
  );
}


export function logS3Operation(context: {
  traceId?: string;
  operation: 's3.upload' | 's3.delete' | 's3.getPresignedUrl' | 's3.getPresignedFolderUrl';
  bucket: string;
  key?: string;
  prefix?: string;
  duration: number;
  size?: number;
  success: boolean;
  error?: string;
}) {
  const level = context.success ? 'info' : 'error';

  logger[level](
    {
      type: 'storage.s3',
      ...context,
    },
    `S3 ${context.operation} - ${context.success ? 'SUCCESS' : 'FAILED'} - ${context.duration}ms`
  );
}


export function logRabbitMQOperation(context: {
  traceId?: string;
  operation: 'publish' | 'consume' | 'connect' | 'disconnect';
  queue: string;
  messageId?: string;
  jobId?: string;
  duration?: number;
  success: boolean;
  error?: string;
  payload?: unknown;
}) {
  const level = context.success ? 'info' : 'error';

  logger[level](
    {
      type: 'queue.rabbitmq',
      ...context,
    },
    `RabbitMQ ${context.operation} - ${context.queue} - ${context.success ? 'SUCCESS' : 'FAILED'}`
  );
}


export function logDatabaseOperation(context: {
  traceId?: string;
  operation: 'query' | 'create' | 'update' | 'delete';
  model: string;
  duration: number;
  success: boolean;
  error?: string;
}) {
  const level = context.success ? 'info' : 'error';

  logger[level](
    {
      type: 'database.postgresql',
      ...context,
    },
    `PostgreSQL ${context.operation} - ${context.model} - ${context.duration}ms`
  );
}

export function logCacheOperation(context: {
  traceId?: string;
  operation: 'get' | 'set' | 'delete' | 'invalidate';
  key: string;
  hit?: boolean;
  duration: number;
  success: boolean;
  error?: string;
}) {
  const level = context.success ? 'info' : 'error';
  
  let hitStatus = '';
  if (context.hit !== undefined) {
    hitStatus = context.hit ? 'HIT' : 'MISS';
  }

  logger[level](
    {
      type: 'cache.redis',
      hit: context.hit ?? null,
      ...context,
    },
    `Redis ${context.operation} - ${context.key} - ${hitStatus} - ${context.duration}ms`
  );
}


export function logUseCaseExecution(context: {
  traceId?: string;
  useCase: string;
  phase: 'start' | 'end' | 'error';
  duration?: number;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
}) {
  const level = context.phase === 'error' ? 'error' : 'info';

  logger[level](
    {
      type: 'use-case',
      ...context,
    },
    `Use Case ${context.useCase} - ${context.phase.toUpperCase()}`
  );
}


export function logError(context: {
  traceId?: string;
  errorType: string;
  errorMessage: string;
  stack?: string;
  statusCode?: number;
  clientId?: string;
  jobId?: string;
  url?: string;
}) {
  logger.error(
    {
      type: 'error',
      ...context,
    },
    `Error: ${context.errorType} - ${context.errorMessage}`
  );
}


export async function checkElasticsearchHealth(): Promise<boolean> {
  try {
    const health = await esClient.cluster.health();
    logger.info(
      {
        type: 'health-check',
        service: 'elasticsearch',
        status: health.status,
      },
      'Elasticsearch health check'
    );
    return health.status !== 'red';
  } catch (error) {
    logger.error(
      {
        type: 'health-check',
        service: 'elasticsearch',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      'Elasticsearch health check failed'
    );
    return false;
  }
}

export { esClient };
