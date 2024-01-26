# @forts/resilience4ts-nestjs

Getting started with resilience4ts + NestJS

### Introduction

While resilience4ts works well as a standalone library, it also provides a set of decorators for NestJS. These decorators can be used to decorate any NestJS controller or service method. `@forts/resilience4ts-nestjs` wraps all the core resilience4ts decorators plus the `@forts/resilience4ts-all` decorator into a single package, and re-exports all of them along with convenient method decorators for use with NestJS controllers and services.

### Installation

`npm i @forts/resilience4ts-nestjs`

### Adding Decorators to a NestJS Injectable Service

Taken from the [NestJS example](https://github.com/JHegarty14/resilience4ts/blob/main/examples/nestjs/src/app.service.ts)

```typescript
import {
  Bulkhead,
  CircuitBreaker,
  Fallback,
  CircuitBreakerImpl,
  CircuitBreakerStrategy,
} from '@forts/resilience4ts-nestjs';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { AppGateway } from './app.gateway';

type HelloWorldArgs = {
  id: string;
};

@Injectable()
export class AppService {
  constructor(
    @Inject('AppGateway')
    private readonly appGateway: AppGateway,
  ) {}

  // decorators can be stacked, and will be applied in the order they are listed
  @Bulkhead({
    getUniqueId: (args: HelloWorldArgs) => args.id,
    maxConcurrent: 1,
    maxWait: 250,
  })
  @Fallback({
    shouldHandle: new PredicateBuilder(UnauthorizedException).or(
      (e: Error) => e.message === 'asdf',
    ),
    fallbackAction: async () => 'fallback',
  })
  @CircuitBreaker({
    strategy: CircuitBreakerStrategy.Percentage,
    threshold: 0.2,
  })
  async getHello(args: Record<'id', string>) {
    // The original, functional decorators are also available
    // To use them import them as their name + Impl
    // e.g. CircuitBreakerImpl, CacheImpl, etc.
    return await CircuitBreakerImpl.of('gateway.call', {
      strategy: CircuitBreakerStrategy.Percentage,
      threshold: 0.2,
    }).on(this.appGateway.getHello)(args);
  }
}
```
