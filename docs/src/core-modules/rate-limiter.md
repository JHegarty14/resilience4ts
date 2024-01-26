# Rate Limiter

---

### Introduction

Rate limiting is an imperative technique to prepare your API for scale and establish high availability and reliability of your service. But also, this technique comes with a whole bunch of different options of how to handle a detected limits surplus, or what type of requests you want to limit. You can simply decline this over limit request, or build a queue to execute them later or combine these two approaches in some way.

The `@forts/resilience4ts-rate-limiter` module provides strategies for `Distributed` and `Instance`-scoped rate limiting. The `Distributed` implementation is backed by Redis, and will work across multiple instances of your application. The `Instance` implementation will only limit the number of concurrent executions within a single instance of your application.

### Installation

`npm i @forts/resilience4ts-rate-limiter`

### Create and Configure a Rate Limiter

```typescript
import { RateLimiter } from '@forts/resilience4ts-rate-limiter';

const rateLimiter = RateLimiter.of('my-rate-limiter', {
  permitLimit: 10,
  queueLimit: 1000,
  window: 1000,
});

const result = await rateLimiter.on(async () => {
  // do something
})();
```

### Options

| Config Property   | Default Value                     | Description                                                                        |
| ----------------- | --------------------------------- | ---------------------------------------------------------------------------------- |
| requestIdentifier |                                   | Function that returns a unique id for the call from the decorated function args.   |
| permitLimit       | 10                                | Maximum number of permits to issue per window.                                     |
| queueLimit        | 1000                              | Maximum number of requests to queue.                                               |
| window            | 1000                              | Duration in milliseconds that a call is allowed to wait for a permit to be issued. |
| scope             | `RateLimiterStrategy.Distributed` | Strategy to use for rate limiting.                                                 |
