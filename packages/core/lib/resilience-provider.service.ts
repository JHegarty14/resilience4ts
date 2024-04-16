import EventEmitter from 'events';
import { pino, BaseLogger } from 'pino';
import { ICacheFacade } from './cache/cache-facade.interface';
import { PersistenceFactory, RedisClientInstance } from './cache/cache.service';
import { RedisCmdFacade } from './cache/redis-cmd.facade';
import { ResilienceConfig } from './types';
import { ConfigLoader, ResilienceKeyBuilder } from './util';

export class ResilienceProviderService {
  static instance?: ResilienceProviderService;
  cache!: RedisClientInstance;
  cacheFacade!: ICacheFacade;
  readonly logger: BaseLogger;

  private initialized: Promise<void>;

  private constructor(
    readonly config: ResilienceConfig,
    private readonly _cache: Promise<RedisClientInstance>,
    logger?: BaseLogger,
    readonly emitter = new EventEmitter(),
  ) {
    ResilienceKeyBuilder.new(config.resilience.serviceName, config.resilience.delimiter);
    this.logger = logger ?? pino();
    this.initialized = this.init();
  }

  static forRoot(config?: ResilienceConfig): ResilienceProviderService;
  static forRoot(logger: BaseLogger): ResilienceProviderService;
  static forRoot(envFile: string, logger: BaseLogger): ResilienceProviderService;
  static forRoot(config: ResilienceConfig, logger: BaseLogger): ResilienceProviderService;
  static forRoot(
    envFileOrConfig: ResilienceConfig | string,
    logger: BaseLogger,
  ): ResilienceProviderService;
  static forRoot(
    configOrLogger: ResilienceConfig | string | BaseLogger | undefined,
    logger: BaseLogger = pino(),
  ): ResilienceProviderService {
    if (ResilienceProviderService.instance) {
      return ResilienceProviderService.instance;
    }

    if (typeof configOrLogger === 'string') {
      const config: ResilienceConfig = ConfigLoader.loadConfig(configOrLogger);
      ResilienceProviderService.instance = new ResilienceProviderService(
        config,
        PersistenceFactory(config.redis, logger),
        logger,
      );
    } else if (!configOrLogger || 'info' in configOrLogger) {
      const config: ResilienceConfig = ConfigLoader.loadConfig('./resilience.toml');
      ResilienceProviderService.instance = new ResilienceProviderService(
        config,
        PersistenceFactory(config.redis, configOrLogger ?? pino()),
      );
    } else {
      ResilienceProviderService.instance = new ResilienceProviderService(
        configOrLogger,
        PersistenceFactory(configOrLogger.redis, logger),
        logger,
      );
    }

    return ResilienceProviderService.instance;
  }

  private async init(): Promise<void> {
    this.cache = await this._cache;
    this.cacheFacade = new RedisCmdFacade(this.cache, this.logger);
  }

  async start() {
    await this.initialized;

    return;
  }

  async stop() {
    await this.cache.disconnect();

    ResilienceProviderService.instance = undefined;
  }
}
