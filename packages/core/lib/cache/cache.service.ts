import type { BaseLogger } from 'pino';
import {
  ConnectionTimeoutError,
  createClient,
  type RedisClientOptions,
  type RedisClientType,
  type RedisFunctions,
  type RedisModules,
  type RedisScripts,
} from 'redis';
import type { ResilienceRedisConfig } from '../types';

export type RedisClientInstance = RedisClientType<RedisModules, RedisFunctions, RedisScripts>;

let client: RedisClientInstance;

export async function PersistenceFactory(
  config: ResilienceRedisConfig,
  logger?: BaseLogger,
): Promise<RedisClientInstance> {
  function handleConnectionError(error: Error & { code?: any }): Error | null {
    if (error instanceof ConnectionTimeoutError) {
      return new Error("Can't find the cache server.");
    }

    switch (error.code) {
      case 'ECONNREFUSED':
        return new Error('The cache server refused the connection.');
      case 'ENOTFOUND':
        return new Error("Can't find the cache server.");
      default:
        return null;
    }
  }

  function retryStrategy(retries: number, cause: Error): Error | number {
    if (cause) {
      // Determine if a critical stop server error or not
      const error = handleConnectionError(cause);
      if (error !== null) {
        return error;
      }
    }

    if (retries > (config.maxConnectionAttempts ?? 10)) {
      return new Error('Retry attempts exhausted');
    }
    // reconnect after
    return Math.min(retries * (config.maxIncrBackoff ?? 100), config.maxBackoff ?? 3000);
  }

  if (!client) {
    if (config.redisHost === null) {
      throw new Error('Missing Cache host. CacheClient disabled');
    }

    const options: RedisClientOptions = {
      url: `redis://${config.redisHost}:${config.redisPort}`,
      socket: {
        reconnectStrategy: retryStrategy,
      },
    };

    if (config.redisPassword) {
      if (config.redisUser) {
        options.username = config.redisUser;
      }
      options.password = config.redisPassword;
      options.socket = {
        ...options.socket,
        tls: true,
        rejectUnauthorized: config.rejectUnauthorized ?? false,
        checkServerIdentity: () => undefined,
      };
    }

    client = createClient(options);
    client.on('error', (err) => {
      logger?.error(err, `Redis Client Error: ${JSON.stringify(config)}`);
    });
    await client.connect();
  }

  return client;
}
