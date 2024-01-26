# Cache

---

### Introduction

Resilience4ts provides decorators for two caching strategies along with a decorator for busting cached values.

### Installation

`npm i @forts/resilience4ts-cache`

### Distributed Cache

The `DistributedCache` decorator is a distributed-first implementation of the cache pattern. It is backed by Redis, and will work across multiple instances of your application.

```typescript
import { Cache } from '@forts/resilience4ts-cache';

const cache = Cache.of('my-cache', {
  extractKey: (...args: Parameters<MyDecoratedMethod>) => UniqueId, // Function that returns a unique id for the call from the decorated function args.
  ttl: 1000, // Time to live in milliseconds.
  maxCapacity: 100, // Maximum number of entries in the cache.
});

const result = await cache.on(async () => {
  // do something
})();
```

### Request-Scoped Cache

The `RequestScopedCache` decorator is an instance-scoped implementation of the cache pattern. It is backed by a simple in-memory store, and will only cache values within the lifecycle of a single request. Once the configured `RequestContext` object is garbage-collected, any cached values under that context will be garbage-collected as well.

```typescript
import { RequestScopedCache, RequestScopedCacheType } from '@forts/resilience4ts-cache';

const cache = RequestScopedCache.of('my-cache', {
  extractScope: (...args: Parameters<MyDecoratedMethod>) => Record<string, any>, // Function that returns a "scope" to associate with the cache entry from the decorated function args.
  extractKey: (...args: Parameters<MyDecoratedMethod>) => UniqueId, // Function that returns a unique id for the call from the decorated function args.
});

const result = await cache.on(async () => {
  // do something
})();
```

### Cache Buster

The `CacheBuster` decorator is used to bust cached values and is used as a companion to the distributed `@Cache` decorator. It can be used to bust one or more cached values based on the result of the decorated function.

```typescript
import { CacheBuster } from '@forts/resilience4ts-cache';

const cacheBuster = CacheBuster.of('my-cache-buster', {
  invalidatesKeys: (...args: Parameters<MyDecoratedMethod>) => string | string[], // Function that returns a key or list of keys to bust from the cache.
});

const result = await cacheBuster.on(async () => {
  // do something
})();
```

A `CacheBuster` can optionally take a `PredicateBuilder` via the `shouldInvalidate` property to determine whether or not the cache should be busted based on the result of the decorated function.

```typescript
import { CacheBuster, PredicateBuilder } from '@forts/resilience4ts-cache';

const cacheBuster = CacheBuster.of('my-cache-buster', {
  invalidatesKeys: (...args: Parameters<MyDecoratedMethod>) => string | string[], // Function that returns a key or list of keys to bust from the cache.
  shouldInvalidate: new PredicateBuilder().isnot(OperationCancelledException), // Optional. Function that returns a boolean to determine whether or not the cache should be busted based on the result of the decorated function.
});
```

By default, the `CacheBuster` will only bust the cache if the decorated function does not throw an error.
