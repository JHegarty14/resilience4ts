import { DynamicModule, Inject, Module, OnModuleInit } from '@nestjs/common';
import {
  ResilienceConfig,
  ResilienceProviderService,
  NoopTelemetryProvider,
  AbstractTelemetryProvider,
  ConfigLoader,
  ResilienceConfigImpl,
  ResilienceDecorator,
} from '@forts/resilience4ts-core';
import { Tokens } from './constants';
import { DiscoveryModule, DiscoveryService } from '@golevelup/nestjs-discovery';
import { RESILIENCE_METRICS } from './constants/metadata.constants';

@Module({
  imports: [DiscoveryModule],
  providers: [
    {
      provide: Tokens.ResilienceCore,
      useFactory: ResilienceProviderService.forRoot,
    },
    {
      provide: Tokens.ResilienceTelemetryProvider,
      useClass: NoopTelemetryProvider,
    },
  ],
  exports: [
    {
      provide: Tokens.ResilienceCore,
      useFactory: ResilienceProviderService.forRoot,
    },
  ],
})
export class ResilienceModule implements OnModuleInit {
  constructor(
    @Inject(DiscoveryService)
    private readonly discoveryService: DiscoveryService,

    @Inject(Tokens.ResilienceTelemetryProvider)
    private readonly resilienceTelemetryProvider: AbstractTelemetryProvider,
  ) {}

  static forRoot(config?: ResilienceConfig): DynamicModule {
    return {
      module: ResilienceModule,
      providers: [
        {
          provide: Tokens.ResilienceCore,
          useFactory: () => ResilienceProviderService.forRoot(config),
        },
        {
          provide: Tokens.ResilienceTelemetryProvider,
          useClass: NoopTelemetryProvider,
        },
      ],
      exports: [
        {
          provide: Tokens.ResilienceCore,
          useFactory: () => ResilienceProviderService.forRoot(config),
        },
      ],
    };
  }

  static forRootWithMetrics<T extends AbstractTelemetryProvider>(
    metricsProvider: T,
    config?: ResilienceConfig,
  ): DynamicModule {
    const resolvedConfig: ResilienceConfig = config ?? ConfigLoader.loadConfig('./resilience.toml');
    const configImpl = new ResilienceConfigImpl(resolvedConfig);
    return {
      module: ResilienceModule,
      imports: [DiscoveryModule],
      providers: [
        {
          provide: Tokens.ResilienceConfig,
          useValue: configImpl,
        },
        {
          provide: Tokens.ResilienceCore,
          useFactory: () => ResilienceProviderService.forRoot(configImpl),
        },
        {
          provide: Tokens.ResilienceTelemetryProvider,
          useFactory: () => metricsProvider.forRoot(configImpl),
        },
      ],
      exports: [
        {
          provide: Tokens.ResilienceCore,
          useFactory: () => ResilienceProviderService.forRoot(configImpl),
        },
      ],
    };
  }

  async onModuleInit() {
    await this.registerMetrics();
  }

  private async registerMetrics() {
    const scanResult = await this.discoveryService.providerMethodsWithMetaAtKey(RESILIENCE_METRICS);
    const decoratorsByType = new Map<string, ResilienceDecorator[]>();

    scanResult.forEach((result) => {
      const resilienceComponents = result.meta as ResilienceDecorator[];
      resilienceComponents.forEach((component) => {
        const type = Object.getPrototypeOf(component).constructor.name.toLowerCase();
        const existing = decoratorsByType.get(type) ?? [];
        decoratorsByType.set(type, [...existing, component]);
      });
    });

    decoratorsByType.forEach((decorators, type) => {
      this.resilienceTelemetryProvider.register(type, decorators);
    });
  }
}
