import { PredicateBuilder } from '@forts/resilience4ts-core';
import {
  Bulkhead,
  CircuitBreaker,
  Retry,
  Fallback,
  CircuitBreakerImpl,
  CircuitBreakerStrategy,
  CacheImpl,
  ResiliencePipeBuilder,
  ResiliencePipeline,
} from '@forts/resilience4ts-nestjs';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { AppGateway } from './app.gateway';

type HelloWorldArgs = {
  id: string;
};

const PreconfiguredCache = CacheImpl.of('preconfigured', {
  expiration: 1000,
  extractKey: (one: number, two: number[]) => `${one}-${two.join('-')}`,
});

const PreconfiguredPipe = new ResiliencePipeBuilder().with(PreconfiguredCache);

@Injectable()
export class AppService {
  constructor(
    @Inject('AppGateway')
    private readonly appGateway: AppGateway,
  ) {}

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
    return await CircuitBreakerImpl.of('gateway.call', {
      strategy: CircuitBreakerStrategy.Percentage,
      threshold: 0.2,
    }).on(this.appGateway.getHello)(args);
  }

  async receiveHello(args: unknown) {
    console.log('RECEIVED', args);
    return;
  }

  @Retry({
    maxAttempts: 3,
    wait: 500,
  })
  async postHello(body: any) {
    console.log('POST HELLO BODY', body);
    throw new Error('asdf');
  }

  async receivePostHello(args: unknown) {
    console.log('RECEIVED', args);
    return;
  }

  @ResiliencePipeline(new ResiliencePipeBuilder().with(PreconfiguredCache))
  async pipelineTest(one: number, two: number[]) {
    return two.map((t) => t * one);
  }

  @ResiliencePipeline(PreconfiguredCache)
  async pipelineTest2(one: number, two: number[]) {
    return two.map((t) => t * one);
  }

  @ResiliencePipeline(PreconfiguredPipe)
  async pipelineTest3(one: number, two: number[]) {
    return two.map((t) => t * one);
  }
}
