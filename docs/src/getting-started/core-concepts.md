# Core Concepts

---

Across all modules under the `@forts/resilience4ts` namespace, there are a few core concepts that are shared to provide a consistent experience.

## Core Configuration

All `@forts/resiliencets` decorators are backended by the `ResilienceProviderService` class, which is responsible for providing a unified interface for interacting with the underlying logging and persistence mechanisms. The `ResilienceProviderService` needs to be initialized prior to using any of the decorators. This can be done by calling the `ResilienceProviderService.forRoot`, method, which takes in a `ResilienceConfig` object, or by defining a `resilience.toml` file in the root of your project.

#### Example `resilience.toml` file:

```toml
[resilience]
serviceName = "my-service"
collectResourceUsage = true
observationInterval = 3000
maxUtilization = 0.9
maxSafeUtilization = 0.75
maxCpuUtilization = 0.9
maxSafeCpuUtilization = 0.75
delimiter = "::"

[redis]
redisHost = "localhost"
redisPort = 6379
redisPrefix = "local"
maxConnectionAttempts = 100
maxBackoff = 3000
maxIncrBackoff = 500
```

#### Example `ResilienceConfig` object:

```typescript
type ResilienceConfig = {
  resilience: {
    serviceName: string;
    serviceVersion?: string;
    delimiter?: string;
    collectResourceUsage?: boolean;
    observationInterval?: number;
    maxUtilization?: number;
    maxSafeUtilization?: number;
    maxCpuUtilization?: number;
    maxSafeCpuUtilization?: number;
  };
  redis: {
    redisHost: string;
    redisPort: number;
    redisPassword?: string;
    redisUser?: string;
    redisPrefix?: string;
    maxConnectionAttempts?: number;
    maxBackoff?: number;
    maxIncrBackoff?: number;
    rejectUnauthorized?: boolean;
    useTls?: boolean;
  };
};
```

#### Example `ResilienceProviderService.forRoot` call:

```typescript
import { ResilienceProviderService } from '@forts/resilience4ts-core';

async function bootstrap() {
  svc = ResilienceProviderService.forRoot({
    resilience: {
      serviceName: 'r4t-test',
    },
    redis: {
      redisHost: 'localhost',
      redisPort: 6379,
      redisPassword: 'pwd',
      redisUser: 'user',
      redisPrefix: 'r4t-test',
    },
  });
  await svc.start();
}

bootstrap();
```

## PredicateBuilder

A `PredicateBuilder` is a function that takes in a `Predicate` and returns a `Predicate`. A `Predicate` is a function that takes in a `Context` and returns a `boolean`. In the context of a resilience4ts decorator, the `Context` is typically the result of the decorated function. `PredicateBuilder`s are commonly used to create `Predicate`s that check the result of the decorated function for a certain value, or to check the `Context` for a certain value. An example of this can be found in the `@forts/resilience4ts-fallback` module, where the optional `shouldHandle` property on the `Fallback` decorator config takes a `PredicateBuilder` to determine whether or not the fallback action should be executed based on the result of the decorated function.

```typescript
import { PredicateBuilder, OperationCancelledException } from '@forts/resilience4ts-core';
import { Fallback } from '@forts/resilience4ts-fallback';

const fallback = Fallback.of('my-fallback', {
  shouldHandle: new PredicateBuilder().isnot(OperationCancelledException),
  fallbackAction: () => 'fallback',
});

const result = await fallback.on(async () => {
  // do something
})();
```
