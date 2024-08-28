import type { BaseLogger } from 'pino';
import {
  ConnectionTimeoutError,
  createClient,
  defineScript,
  type RedisClientOptions,
  type RedisClientType,
  type RedisFunctions,
  type RedisModules,
  type RedisScripts,
} from 'redis';
import type { ResilienceRedisConfig } from '../types';
import { ScriptLoader } from './commands/script-loader';

export type RedisClientInstance = RedisClientType<RedisModules, RedisFunctions, LuaScripts>;

let client: RedisClientInstance;

enum CommandStrategy {
  Redis,
  Lua,
}

export async function PersistenceFactory(
  config: ResilienceRedisConfig,
  logger?: BaseLogger,
  type = CommandStrategy.Redis,
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

    const options: RedisClientOptions<RedisModules, RedisFunctions, LuaScripts> = {
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

    if (type === CommandStrategy.Lua) {
      const scripts = await new ScriptLoader().loadScripts();
      options.scripts = scripts.reduce<LuaScripts>((acc, script) => {
        acc[script.name] = defineScript({
          SCRIPT: script.options.lua,
          NUMBER_OF_KEYS: script.options.numberOfKeys,
          transformArguments(...args: any[]) {
            return args;
          },
        });
        return acc;
      }, {} as LuaScripts);
    }

    client = createClient(options);
    client.on('error', (err) => {
      logger?.error(err, `Redis Client Error: ${JSON.stringify(config)}`);
    });
    await client.connect();
  }

  return client;
}

type LuaFunctionNames = 'extendLock' | 'releaseLock';

type LuaScripts = RedisScripts & {
  [name in LuaFunctionNames]: {
    SCRIPT: string;
    NUMBER_OF_KEYS: number;
    transformArguments(...args: any[]): any[];
  };
};
