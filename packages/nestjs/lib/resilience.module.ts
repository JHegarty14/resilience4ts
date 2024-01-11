import { DynamicModule, Module } from '@nestjs/common';
import { ResilienceConfig, ResilienceProviderService } from '@forts/resilience4ts-core';
import { Tokens } from './constants';

@Module({
  providers: [
    {
      provide: Tokens.ResilienceCore,
      useFactory: ResilienceProviderService.forRoot,
    },
  ],
  exports: [
    {
      provide: Tokens.ResilienceCore,
      useFactory: ResilienceProviderService.forRoot,
    },
  ],
})
export class ResilienceModule {
  static forRoot(config?: ResilienceConfig): DynamicModule {
    return {
      module: ResilienceModule,
      providers: [
        {
          provide: Tokens.ResilienceCore,
          useFactory: () => ResilienceProviderService.forRoot(config),
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
}
