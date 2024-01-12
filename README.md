# resilience4ts

`resilience4ts` is a suite of packages that provide ergonomic tools for building performant and safe distributed systems with Typescript. While there are other Typescript ports of Java libraries like Hystrix and resilience4j, or .NET packages like Polly, it is designed to be used specifically in highly-concurrent, distributed applications.

<p align="center">
	<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
</p>

## Description

Following in the footsteps of its namesake [resilience4j](https://resilience4j.readme.io/docs/getting-started), resilience4ts also aims to be a transparent fault-tolerance layer via higher-order functions (decorators).

Resilience4ts provides 10 core decorators for the following patterns:

- `resilience4ts-bulkhead`: [Bulkhead pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/bulkhead)
- `resilience4ts-circuitbreaker`: [Circuit Breaker pattern](https://docs.microsoft.com/en-us/azure/architecture/patterns/circuit-breaker)
- `resilience4ts-cache`: Provides distributed or request-scoped [Caching](https://learn.microsoft.com/en-us/azure/architecture/patterns/cache-aside)
- `resilience4ts-concurrent-lock`: [Distributed Lock](https://www.dremio.com/wiki/distributed-locking/)
- `resilience4ts-hedge`: [Hedge pattern](https://www.linkedin.com/pulse/hedged-request-pattern-golang-harleen-mann/)
- `resilience4ts-fallback`: [Fallback pattern](https://www.codecentric.de/wissens-hub/blog/resilience-design-patterns-retry-fallback-timeout-circuit-breaker)
- `resilience4ts-rate-limiter`: [Rate-Limiting pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/rate-limiting-pattern)
- `resilience4ts-retry`: [Retry pattern](https://dev.to/abh1navv/retry-pattern-in-microservices-4m39)
- `resilience4ts-timeout`: [Timeout pattern](https://8thlight.com/insights/microservices-arent-magic-handling-timeouts)

:rocket: The `@resilience4ts-all` package provides all of the above decorators in a single package, along with additional decorators for building reusable pipelines of decorators.

:bulb: For effortless integration into NestJS applications, check out the `resilience4ts-nestjs` package!

## Installation

```bash
$ npm install @forts/resilience4ts-all
```

Or to install individual packages:

```bash
$ npm install @forts/resilience4ts-bulkhead
```

```bash
$ npm install @forts/resilience4ts-circuitbreaker
```

```bash
$ npm install @forts/resilience4ts-cache
```

```bash
$ npm install @forts/resilience4ts-concurrent-lock
```

```bash
$ npm install @forts/resilience4ts-hedge
```

```bash
$ npm install @forts/resilience4ts-fallback
```

```bash
$ npm install @forts/resilience4ts-rate-limiter
```

```bash
$ npm install @forts/resilience4ts-retry
```

```bash
$ npm install @forts/resilience4ts-timeout
```

```bash
$ npm install @forts/resilience4ts-nestjs
```

## Usage Examples

#### Bulkhead

```typescript
import { Bulkhead } from '@forts/resilience4ts-bulkhead';

const myFunction = async (...args: unknown[]) => {
  // do something
};

const bulkhead = Bulkhead.of({
  maxConcurrentCalls: 10,
  maxWaitDuration: 1000,
});

const decoratedFn = bulkhead.on(myFunction);

const result = await decoratedFn(...args);
```

#### Cache

```typescript
import { Cache } from '@forts/resilience4ts-cache';

const cache = Cache.of('my-cache', {
  extractKey: (...args: Parameters<MyDecoratedMethod>) => UniqueId, // Function that returns a unique id for the call from the decorated function args.
  ttl: 1000, // Time to live in milliseconds.
  maxCapacity: 100, // Maximum number of entries in the cache.
});

const result = await cache.on(async () => {
  // do something
});
```

#### Request-Scoped Cache

```typescript
import { RequestScopedCache, RequestScopedCacheType } from '@forts/resilience4ts-cache';

const cache = RequestScopedCache.of('my-cache', {
  extractScope: (...args: Parameters<MyDecoratedMethod>) => Record<string, any>, //Function that returns a "scope" to associate with the cache entry from the decorated function args.
  extractKey: (...args: Parameters<MyDecoratedMethod>) => UniqueId, // Function that returns a unique id for the call.
  type: RequestScopedCacheType.Local | RequestScopedCacheType.Distributed, // RequestScopedCacheType.Local uses a WeakMap to store the cache entries and is GC'd once the `extractScope` value falls out of scope, RequestScopedCacheType.Distributed uses a distributed cache.
  clearOnRequestEnd: boolean, // Distributed only. Whether to clear the cache when the request ends, or persist it for the next request with the same scope.
});

const result = await cache.on(async () => {
  // do something
});
```

#### CacheBuster

```typescript
import { CacheBuster } from '@forts/resilience4ts-cache';
import { PredicateBuilder } from '@forts/resilience4ts-core';


const cacheBuster = CacheBuster.of('my-cache-buster', {
	invalidatesKeys: (...args: any[]) => string | string[], // key(s) that should be invalidated upon decorated method execution.
  invalidateOnException: true, // Whether to invalidate the cache if the decorated method throws an exception.
  shouldInvalidate?: PredicateBuilder, // Constructs a predicate that is evaluated upon completion of the decorated method. If the predicate returns true, the cache is invalidated.
});
```

#### Circuit Breaker

```typescript
import { CircuitBreaker, CircuitBreakerStrategy } from '@forts/resilience4ts-circuit-breaker';

const circuitBreaker = CircuitBreaker.of('my-circuit-breaker', {
  strategy: CircuitBreakerStrategy.Percentage,
  threshold: 0.5,
  interval: 1000 * 60 * 15,
  minimumFailures: 3,
  whitelist: [], // Error[]. If the decorated method throws an error that is in the whitelist, the circuit breaker will not record it as a failure.
  circuitConnectionRetries: 3,
  halfOpenLimit: 3,
});

const result = await circuitBreaker.on(async () => {
  // do something
});
```

#### Concurrent Lock

```typescript
import { ConcurrentLock } from '@forts/resilience4ts-concurrent-lock';

const lock = ConcurrentLock.of('my-lock', {
  withKey: (...args: Parameters<MyDecoratedMethod>) => UniqueId,
});

const result = await lock.on(async () => {
  // do something
});
```

#### Hedge

```typescript
import { Hedge } from '@forts/resilience4ts-hedge';

const hedge = Hedge.of('my-hedge', {
  delay: 1000,
});

const result = await hedge.on(async () => {
  // do something
});
```

#### Fallback

```typescript
import { Fallback } from '@forts/resilience4ts-fallback';

const fallback = Fallback.of('my-fallback', {
  shouldHandle?: PredicateBuilder,
  fallbackAction: (...args: Parameters<MyDecoratedMethod>[]) => Promise<MyDecoratedMethodReturn> | MyDecoratedMethodReturn,
});

const result = await fallback.on(async () => {
  // do something
});
```

#### Rate Limiter

```typescript
import { RateLimiter } from '@forts/resilience4ts-rate-limiter';

const rateLimiter = RateLimiter.of('my-rate-limiter', {
  permitLimit: 1000,
  window: 1000,
});

const result = await rateLimiter.on(async () => {
  // do something
});
```

#### Retry

```typescript
import { Retry } from '@forts/resilience4ts-retry';

const retry = Retry.of('my-retry', {
  maxAttempts: 3,
  backoff: 1000,
});

const result = await retry.on(async () => {
  // do something
});
```

#### Timeout

```typescript
import { Timeout } from '@forts/resilience4ts-timeout';

const timeout = Timeout.of('my-timeout', {
  timeout: 1000,
});

const result = await timeout.on(async () => {
  // do something
});
```

## Roadmap

### v0.1.0

- [x] Bulkhead implmentation
- [x] Circuit Breaker implementation
- [x] Cache implementation
- [x] Request-scoped implementation
- [x] Concurrent lock implementation
- [x] Hedge implementation
- [x] Fallback implementation
- [x] Rate Limiter implementation
- [x] Retry implementation
- [x] Timeout implementation
- [ ] NestJS package
  - [x] Decorators
  - [x] r4t component discovery
  - [ ] Register async clients with pipes/filters/interceptors/guards
- [ ] Metrics/Telemetry Module
  - [x] Create common IMetrics interface for integration into resilience packages
  - [x] opentelemetry integration
- [ ] documentation
- [ ] quick start examples
  - [ ] NestJS quickstart
  - [ ] Express quickstart

### v1.0.0

- [ ] HttpClient
  - [ ] supports cancellable requests
- [ ] GrpcClient
  - [ ] supports cancellable requests
- [ ] DistributedContext module
- [ ] Chaos Engineering module
- [ ] ACL Resolver for Redis Clusters (execute Redis commands as Lua scripts or fall back to `node-redis` built-ins based on `@exec` / `@execSha` permissions)
- [ ] Metrics
  - [ ] Datadog integration
  - [ ] MetricsController / Service for @forts/resilience4ts-nestjs
