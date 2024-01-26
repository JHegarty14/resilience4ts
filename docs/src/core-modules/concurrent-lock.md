# Concurrent Lock

---

### Introduction

The `ConcurrentLock` module provides a distributed lock implementation. At a high level, there are two reasons why you might want a lock in a distributed application: for efficiency or for correctness [2]. To distinguish these cases, you can ask what would happen if the lock failed:

- Efficiency: Taking a lock saves you from unnecessarily doing the same work twice (e.g. some expensive computation). If the lock fails and two nodes end up doing the same piece of work, the result is a minor increase in cost (you end up paying 5 cents more to AWS than you otherwise would have) or a minor inconvenience (e.g. a user ends up getting the same email notification twice).
- Correctness: Taking a lock prevents concurrent processes from stepping on each others’ toes and messing up the state of your system. If the lock fails and two nodes concurrently work on the same piece of data, the result is a corrupted file, data loss, permanent inconsistency, the wrong dose of a drug administered to a patient, or some other serious problem.

### Installation

`npm i @forts/resilience4ts-concurrent-lock`

### Create and Configure a Lock

```typescript
import { ConcurrentLock } from '@forts/resilience4ts-concurrent-lock';

const lock = ConcurrentLock.of('my-lock', {
  withKey: (...args: Parameters<MyDecoratedMethod>) => UniqueId,
});

const result = await lock.on(async () => {
  // do something
})();
```

### Options

| Config Property | Default Value | Description                                                                      |
| --------------- | ------------- | -------------------------------------------------------------------------------- |
| withKey         |               | Function that returns a unique id for the call from the decorated function args. |
| duration        |               | Duration in milliseconds to wait for the lock to be released.                    |
| extensible      |               | Whether the lock is extensible.                                                  |
