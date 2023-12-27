## @forts/resilience4ts-concurrent-lock

Concurrent lock pattern implementation for resilience4ts.

### Installation

`npm install @forts/resilience4ts-concurrent-lock`

### Usage

```typescript
import { ConcurrentLock } from '@forts/resilience4ts-concurrent-lock';

const lock = ConcurrentLock.of('my-lock', {
  withKey: (...args: Parameters<MyDecoratedMethod>) => UniqueId,
});

const result = await lock.on(async () => {
  // do something
});
```

### Options

```typescript
const lock = ConcurrentLock.of('my-lock', {
  withKey: (...args: Parameters<MyDecoratedMethod>) => UniqueId, // Function that returns a unique id for the call from the decorated function args.
  duration: number, // Duration in milliseconds to wait for the lock to be released.
  driftFactor: number, // Drift factor to use for the lock.
  refreshInterval: number, // Interval in milliseconds to refresh the lock for executions that run beyond the configured duration. Only applies if the lock is extensible.
  extensible: boolean, // Whether the lock is extensible.
});
```
