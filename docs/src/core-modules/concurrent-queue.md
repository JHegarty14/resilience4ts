# Concurrent Queue

---

## Introduction

The `ConcurrentQueue` decorator wraps a function with a distributed, blocking queue that ensures only one instance of the function is running at a time. If the function is called while another instance is running, the function will be queued and executed when the previous instance completes.

Because the queue is blocking, the caller will wait until the function completes before continuing. If the caller fails to acquire the lock, a `QueueWaitExceeded` exception will be thrown. The use-cases for this are limited, but it can be useful in some situations so please consider your application's needs before using this module.

## Installation

`npm i @forts/resilience4ts-concurrent-queue`

## Create and Configure a Queue

```typescript
import { ConcurrentQueue } from '@forts/resilience4ts-concurrent-queue';

const queue = ConcurrentQueue.of('my-queue', {
  withKey: (...args: Parameters<MyDecoratedMethod>) => UniqueId,
});

const result = await queue.on(async () => {
  // do something
})();
```

## Options

| Config Property | Default Value | Description                                                                      |
| --------------- | ------------- | -------------------------------------------------------------------------------- |
| withKey         |               | Function that returns a unique id for the call from the decorated function args. |
| maxAttempts     | 10            | Maximum number of attempts to acquire the lock and execute the function.         |
| backoff         | 0.01          | Backoff factor to use when retrying to acquire the lock.                         |
