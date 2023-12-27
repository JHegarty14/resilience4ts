## @forts/resilience4ts-retry

Retry pattern implementation for resilience4ts.

### Installation

`npm install @forts/resilience4ts-retry`

### Usage

```typescript
import { Retry } from '@forts/resilience4ts-retry';

const retry = Retry.of('my-retry', {
  maxAttempts: 3,
  backoff: 1000,
});

const result = await retry.on(async () => {
  // do something
});
```

### Options

```typescript
const retry = Retry.of('my-retry', {
  wait?: number, // Wait in milliseconds before retrying.
  maxAttempts?: number, // Maximum number of attempts to execute the decorated method.
  failAfterMaxAttempts?: boolean, // Whether to throw an exception if the retry is executed.
  whitelist?: Array<Error>, // Array of errors that should be retried.
  scheduleRetry?: boolean, // Whether to schedule the retry.
  retryMode?: RetryBackoff, // Retry mode.
  maxInterval?: number, // Maximum interval in milliseconds between retries.

  validateResult?: <T>(result: T) => booleanalidateResultFn, // Function that determines whether the result should be retried.
  onRuntimeError?: (err: RetryException | ScheduledRetryException) => void, // Function that is called when a runtime error occurs.
});
```
