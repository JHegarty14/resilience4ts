## @forts/resilience4ts-cache

Cache pattern implementation for resilience4ts.

### Installation

`npm install @forts/resilience4ts-cache`

### Usage

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

### Options

```typescript
const cache = Cache.of('my-cache', {
  extractKey: (...args: Parameters<MyDecoratedMethod>) => UniqueId, // Function that returns a unique id for the call from the decorated function args.
  expiration: 1000, // Time to live in milliseconds.
  maxCapacity: 100, // Maximum number of entries in the cache.
});
```
