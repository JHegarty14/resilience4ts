# Bulkhead

---

### Introduction

Resilience4ts provides two implementations of the bulkhead pattern: `Distributed` and `Instance`. The `Distributed` bulkhead is a distributed-first implementation of the bulkhead pattern, while the `Instance` bulkhead is an instance-scoped implementation. The `Distributed` implementation is backed by Redis, and will work across multiple instances of your application. The `Instance` implementation is backed by a simple in-memory store, and will only limit the number of concurrent executions within a single instance of your application.''

Defaults to `Distributed` bulkhead.

### Create and Configure a Bulkhead

```typescript
import { Bulkhead } from '@forts/resilience4ts-bulkhead';

const bulkhead = Bulkhead.of('my-bulkhead', {
  maxConcurrentCalls: 10,
  maxWait: 1000,
});

const result = await bulkhead.on(async () => {
  // do something
})();
```

### Options

| Config Property  | Default Value                  | Description                                                                                |
| ---------------- | ------------------------------ | ------------------------------------------------------------------------------------------ |
| getUniqueId      |                                | Function that returns a unique id for the call from the decorated function args.           |
| maxConcurrent    | 10                             | Maximum duration in milliseconds that a call is allowed to wait for a permit to be issued. |
| executionTimeout | 1000                           | Maximum duration in milliseconds that a call is allowed to wait for execution.             |
| maxWait          | 1000                           | Maximum duration in milliseconds that a call is allowed to wait for execution.             |
| kind             | `BulkheadStrategy.Distributed` | Strategy to use for bulkhead.                                                              |
