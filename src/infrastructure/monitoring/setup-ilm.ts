import { Client } from '@elastic/elasticsearch';
import { appConfig } from '@/infrastructure/config/env';

export async function setupElasticsearchILM(): Promise<void> {
  const client = new Client({
    node: appConfig.elasticsearch.url,
  });

  const indexName = appConfig.elasticsearch.index;
  const policyName = `${indexName}-ilm-policy`;

  try {
    console.log('[Elasticsearch] Creating ILM policy...');
    await client.ilm.putLifecycle({
      name: policyName,
      policy: {
        phases: {
          hot: {
            min_age: '0ms',
            actions: {
              rollover: {
                max_age: '1d',
                max_primary_shard_size: '50gb',
              },
              set_priority: {
                priority: 100,
              },
            },
          },
          delete: {
            min_age: '7d',
            actions: {
              delete: {},
            },
          },
        },
      },
    });
    console.log(`ILM policy "${policyName}" created successfully`);

    console.log('[Elasticsearch] Creating index template...');
    await client.indices.putIndexTemplate({
      name: `${indexName}-template`,
      index_patterns: [`${indexName}-*`],
      template: {
        settings: {
          number_of_shards: 1,
          number_of_replicas: 0,
          'index.lifecycle.name': policyName,
          'index.lifecycle.rollover_alias': indexName,
        },
        mappings: {
          properties: {
            '@timestamp': { type: 'date' },
            level: { type: 'keyword' },
            message: { type: 'text' },
            service: { type: 'keyword' },
            environment: { type: 'keyword' },
            type: { type: 'keyword' },
            traceId: { type: 'keyword' },
            clientId: { type: 'keyword' },
            email: { type: 'keyword' },
            jobId: { type: 'keyword' },
            statusCode: { type: 'integer' },
            duration: { type: 'integer' },
            method: { type: 'keyword' },
            url: { type: 'text' },
            operation: { type: 'keyword' },
            bucket: { type: 'keyword' },
            key: { type: 'text' },
            queue: { type: 'keyword' },
            model: { type: 'keyword' },
            hit: { type: 'boolean' },
            success: { type: 'boolean' },
            error: { type: 'text' },
            errorType: { type: 'keyword' },
            stack: { type: 'text' },
          },
        },
      },
    });
    console.log(`Index template "${indexName}-template" created successfully`);

    const initialIndex = `${indexName}-000001`;
    const indexExists = await client.indices.exists({ index: initialIndex });

    if (indexExists) {
      console.log(`Initial index "${initialIndex}" already exists`);
    } else {
      console.log(`[Elasticsearch] Creating initial index "${initialIndex}"...`);
      await client.indices.create({
        index: initialIndex,
        aliases: {
          [indexName]: {
            is_write_index: true,
          },
        },
      });
      console.log(`Initial index "${initialIndex}" created successfully`);
    }

    console.log('Elasticsearch ILM setup completed successfully!');
    console.log(`Logs will be retained for 7 days`);
    console.log(`Index will rollover daily or at 50GB`);
  } catch (error) {
    console.error('Error setting up Elasticsearch ILM:', error);
    throw error;
  } finally {
    await client.close();
  }
}

if (require.main === module) {
  void setupElasticsearchILM()
    .then(() => {
      console.log('ILM setup finished');
      process.exit(0);
    })
    .catch((error: Error) => {
      console.error('ILM setup failed:', error);
      process.exit(1);
    });
}
