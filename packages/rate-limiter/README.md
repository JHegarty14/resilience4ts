## @forts/resilience4ts-rate-limiter

Rate limiter pattern implementation for resilience4ts.

### Installation

`npm install @forts/resilience4ts-rate-limiter`

### Usage

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

### Options

```typescript
const limiter = RateLimiter.of('my-rate-limiter', {
  permitLimit: number, // Maximum number of permits.
  queueLimit: number, // Maximum number of queued executions.
  window: number, // Window in milliseconds.
});
```
