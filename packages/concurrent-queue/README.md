## @forts/resilience4ts-concurrent-queue

Concurrent queue pattern implementation for resilience4ts.

### Installation

`npm install @forts/resilience4ts-concurrent-queue`

### Usage

```typescript
import { ConcurrentQueue } from '@forts/resilience4ts-concurrent-queue';

const queue = ConcurrentQueue.of('my-queue', {
  withKey: (...args: Parameters<MyDecoratedMethod>) => UniqueId,
});

const result = await queue.on(async () => {
  // do something
});
```

### Options

```typescript
const queue = ConcurrentQueue.of('my-queue', {
  withKey: (...args: Parameters<MyDecoratedMethod>) => UniqueId, // Function that returns a unique id for the call from the decorated function args.
  maxAttempts?: number; // Maximum number of attempts to execute the decorated method.
  backoff?: number; // Backoff in milliseconds between attempts.
});
```
