# Retry

### Introduction

The retry strategy enables the re-execution of a user-defined callback if the previous execution fails. This approach gives you the option to either run the original callback again or specify a new callback for subsequent attempts. Implementing a retry strategy can boost the overall reliability of the system. However, it's essential to note that this improvement comes at the cost of increased resource utilization. If high availability is not a critical requirement, you may find the hedging strategy is more appropriate.

### Installation

`npm i @forts/resilience4ts-retry`

### Create and Configure a Retry

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

| Config Property | Default Value      | Description                                                                   |
| --------------- | ------------------ | ----------------------------------------------------------------------------- |
| wait            | 500                | Wait in milliseconds before retrying.                                         |
| maxAttempts     | 3                  | Maximum number of attempts to retry.                                          |
| maxInterval     | 60000              | Maximum wait in milliseconds between retries.                                 |
| retryMode       | `RetryMode.Linear` | Strategy to use for calculating backoff.                                      |
| validateResult  |                    | Function returning a boolean indicating whether the result should be retried. |
| whitelistErrors |                    | Array of errors that should be ignored, skipping retry.                       |
| onRuntimeError  |                    | Callback function to execute when an error occurs.                            |
