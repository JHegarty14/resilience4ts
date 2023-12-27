import { DynamicModule, Inject, Module, OnModuleInit } from '@nestjs/common';
import {
  ApplicationConfig,
  DiscoveryService as NestDiscoveryService,
  GraphInspector,
  NestContainer,
} from '@nestjs/core';
import { ConsumerKeyBuilder } from '@forts/resilience4ts-all';
import {
  AbstractTelemetryProvider,
  ConfigLoader,
  NoopTelemetryProvider,
  ResilienceConfig,
  ResilienceConfigImpl,
  ResilienceDecorator,
  ResilienceProviderService,
} from '@forts/resilience4ts-core';
import { DiscoveryModule, DiscoveryService } from '@golevelup/nestjs-discovery';
import {
  RESILIENCE_CONSUMER,
  RESILIENCE_DISCOVERABLE,
  RESILIENCE_METRICS,
  RESILIENCE_TARGET,
  Tokens,
} from './constants';
import { ConsumerController } from './services/consumer-controller.service';
import { ContextCreator } from './context';
import { RpcProxy } from './context/rpc-proxy';
import { ExceptionFiltersContext } from './exceptions/exception-filters-context';
import { PipesConsumer, PipesContextCreator } from '@nestjs/core/pipes';
import { GuardsConsumer, GuardsContextCreator } from '@nestjs/core/guards';
import { InterceptorsConsumer, InterceptorsContextCreator } from '@nestjs/core/interceptors';
import { Injector } from '@nestjs/core/injector/injector';
import { Controller, Injectable } from '@nestjs/common/interfaces';
import { Server } from './server';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';

@Module({
  imports: [DiscoveryModule],
  providers: [
    {
      provide: 'NestDiscoveryService',
      useClass: NestDiscoveryService,
    },
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
  private consumerController!: ConsumerController;
  constructor(
    @Inject(DiscoveryService)
    private readonly discoveryService: DiscoveryService,

    @Inject('NestDiscoveryService')
    private readonly nestDiscoveryService: NestDiscoveryService,

    @Inject(Tokens.ResilienceCore)
    private readonly core: ResilienceProviderService,

    @Inject(Tokens.ResilienceTelemetryProvider)
    private readonly telemetryProvider: AbstractTelemetryProvider,
    s
  ) {}

  static forRoot(config?: ResilienceConfig): DynamicModule {
    return {
      module: ResilienceModule,
      imports: [DiscoveryModule],
      providers: [
        {
          provide: 'NestDiscoveryService',
          useClass: NestDiscoveryService,
        },
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
    config?: ResilienceConfig
  ): DynamicModule {
    const resolvedConfig: ResilienceConfig = config ?? ConfigLoader.loadConfig('./resilience.toml');
    const configImpl = new ResilienceConfigImpl(resolvedConfig);
    return {
      module: ResilienceModule,
      imports: [DiscoveryModule],
      providers: [
        {
          provide: 'NestDiscoveryService',
          useClass: NestDiscoveryService,
        },
        {
          provide: Tokens.ResilienceConfig,
          useValue: configImpl,
        },
        {
          provide: Tokens.ResilienceCore,
          useFactory: (cfg: ResilienceConfig) => ResilienceProviderService.forRoot(cfg),
        },
        {
          provide: Tokens.ResilienceTelemetryProvider,
          useFactory: (cfg: ResilienceConfig) => metricsProvider.forRoot(cfg),
          inject: [
            {
              token: Tokens.ResilienceConfig,
              optional: false,
            },
          ],
        },
      ],
      exports: [
        {
          provide: Tokens.ResilienceCore,
          useFactory: (cfg: ResilienceConfig) => ResilienceProviderService.forRoot(cfg),
        },
      ],
    };
  }

  async onModuleInit() {
    const promises = [this.registerConsumers(), this.discoverResilienceComponents()];

    console.log(this.core.config);
    if (this.core.config.metrics) {
      promises.push(this.registerMetrics());
    }

    const settled = await Promise.allSettled(promises);

    const rejected = settled.filter((result) => result.status === 'rejected');

    if (rejected.length > 0) {
      throw new Error(
        `Failed to register consumers: ${rejected
          .map((result) => (result as PromiseRejectedResult).reason)
          .join(', ')}`
      );
    }
  }

  private async discoverResilienceComponents(): Promise<Map<string, any>> {
    const map = new Map();
    const scanResult = await this.discoveryService.providerMethodsWithMetaAtKey(
      RESILIENCE_DISCOVERABLE
    );

    // console.log('SCAN RESULT', scanResult);

    const providers = this.nestDiscoveryService.getProviders();
    // console.log('providers', providers);

    // const a = this.modulesContainer.entries();
    // console.log('MODULES', a);

    for (const result of scanResult) {
      // console.log('RESULT', result);
      const resilienceProvider = providers.find(
        (provider) => provider.name === result.discoveredMethod.parentClass.name
      );
      console.log('RP', resilienceProvider);
      const blah = Reflect.getMetadata(RESILIENCE_TARGET, result.discoveredMethod.handler);
      console.log('BLAH', blah);
    }

    return map;
  }

  private async registerConsumers() {
    const scanResult = await this.discoveryService.providerMethodsWithMetaAtKey(
      RESILIENCE_CONSUMER
    );

    // const appConfig = new ApplicationConfig();
    // const container = new NestContainer(appConfig);
    // const exceptionFiltersContext = new ExceptionFiltersContext(container, appConfig);
    // const graphInspector = new GraphInspector(container);

    // const contextCreator = new ContextCreator(
    //   new RpcProxy(),
    //   exceptionFiltersContext,
    //   new PipesContextCreator(container, appConfig),
    //   new PipesConsumer(),
    //   new GuardsContextCreator(container, appConfig),
    //   new GuardsConsumer(),
    //   new InterceptorsContextCreator(container, appConfig),
    //   new InterceptorsConsumer()
    // );
    // const injector = new Injector();
    // this.consumerController = new ConsumerController(
    //   container,
    //   contextCreator,
    //   injector,
    //   exceptionFiltersContext,
    //   graphInspector
    // );

    // this.registerConsumerHandlers(
    //   container,
    //   {} as Server,
    //   'ResilienceModule'
    // )

    const consumers = scanResult.map((result: any) => {
      const eventName = result.meta || result.discoveredMethod.methodName;
      const name = ConsumerKeyBuilder.retryEventKey(eventName);
      const { handler, parentClass } = result.discoveredMethod;

      return { name, handler: handler.bind(parentClass.instance) };
    });

    for (const consumer of consumers) {
      this.core.emitter.addListener(consumer.name, consumer.handler);
    }
  }

  private registerConsumerHandlers(
    // eslint-disable-next-line @typescript-eslint/ban-types
    wrappers: Map<string | symbol | Function, InstanceWrapper<Controller | Injectable>>,
    server: Server,
    moduleName: string
  ) {
    wrappers.forEach((wrapper) =>
      this.consumerController.registerConsumerHandler(wrapper, server, moduleName)
    );
  }

  private async registerMetrics() {
    const scanResult = await this.discoveryService.providerMethodsWithMetaAtKey(RESILIENCE_METRICS);

    const decoratorsByType = new Map<string, ResilienceDecorator[]>();

    for (const result of scanResult) {
      const resilienceComponent = result.meta as ResilienceDecorator;
      const type = Object.getPrototypeOf(resilienceComponent).constructor.name.toLocaleLowerCase();
      if (!decoratorsByType.has(type)) {
        decoratorsByType.set(type, [resilienceComponent]);
      } else {
        decoratorsByType.get(type)?.push(resilienceComponent);
      }
    }

    for (const [type, decorators] of decoratorsByType.entries()) {
      this.telemetryProvider.register(type, decorators);
    }
  }
}
