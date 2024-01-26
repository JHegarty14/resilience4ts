## @forts/resilience4ts-bulkhead

Bulkhead pattern implementation for resilience4ts.

### Installation

`npm install @forts/resilience4ts-bulkhead`

### Usage

```typescript
import { Bulkhead } from '@forts/resilience4ts-bulkhead';

const bulkhead = Bulkhead.of('my-bulkhead', {
  maxConcurrentCalls: 10,
  maxWait: 1000,
});

const result = await bulkhead.on(async () => {
  // do something
});
```

### Options

```typescript
const bulkhead = Bulkhead.of('my-bulkhead', {
  getUniqueId: (...args: Parameters<MyDecoratedMethod>) => UniqueId, // Function that returns a unique id for the call from the decorated function args.
  maxConcurrent?: number, //
  maxWai?t: number, // Maximum duration in milliseconds that a call is allowed to wait for a permit to be issued.
  executionTimeout?: number, // Maximum duration in milliseconds that a call is allowed to wait for execution.
  kind?: BulkheadStrategy.Semaphore | BulkheadStrategy.ThreadPool, // Strategy to use for bulkhead.
});
```
