# Circuit Breaker

---

### Introduction

The CircuitBreaker is implemented via a finite state machine with three normal states: `CLOSED`, `OPEN` and `HALF_OPEN`. The `CLOSED` state is the normal state of the circuit breaker. In this state, the circuit breaker is allowing executions of the decorated function. If the decorated function fails, the circuit breaker will record the failure. If the number of failures exceeds the configured threshold, the circuit breaker will transition to the `OPEN` state. In the `OPEN` state, the circuit breaker will not allow executions of the decorated function. After the configured interval has elapsed, the circuit breaker will transition to the `HALF_OPEN` state. In the `HALF_OPEN` state, the circuit breaker will allow a configurable number of executions of the decorated function. If all executions succeed, the circuit breaker will transition back to the `CLOSED` state. If any executions fail, the circuit breaker will transition back to the `OPEN` state.

### Count-based sliding window

The count-based sliding window is implemented with a circular array of N measurements.
If the count window size is 10, the circular array has always 10 measurements.
The sliding window incrementally updates a total aggregation. The total aggregation is updated when a new call outcome is recorded. When the oldest measurement is evicted, the measurement is subtracted from the total aggregation and the bucket is reset. (Subtract-on-Evict)

### Time-based sliding window

The time-based sliding window is implemented with a circular array of N partial aggregations (buckets).
If the time window size is 10 seconds, the circular array has always 10 partial aggregations (buckets). Every bucket aggregates the outcome of all calls which happen in a certain epoch second. (Partial aggregation). The head bucket of the circular array stores the call outcomes of the current epoch second. The other partial aggregations store the call outcomes of the previous seconds.
The sliding window does not store call outcomes individually, but incrementally updates partial aggregations (bucket) and a total aggregation.
The total aggregation is updated incrementally when a new call outcome is recorded. When the oldest bucket is evicted, the partial total aggregation of that bucket is subtracted from the total aggregation and the bucket is reset. (Subtract-on-Evict)

### Failure Rate Threshold

The state of the CircuitBreaker changes from `CLOSED` to `OPEN` when the failure rate is equal or greater than a configurable threshold. For example when more than 50% of the recorded calls have failed.
By default all exceptions count as a failure. You can define a list of exceptions which should count as a failure. All other exceptions are then counted as a success, unless they are ignored. Exceptions can also be ignored so that they neither count as a failure nor success.

The failure rate can only be calculated, if a minimum number of calls were recorded. For example, if the minimum number of required calls is 10, then at least 10 calls must be recorded, before the failure rate can be calculated. If only 9 calls have been evaluated the CircuitBreaker will not trip open even if all 9 calls have failed.

### Create and Configure a CircuitBreaker

```typescript
import { CircuitBreaker, CircuitBreakerStrategy } from '@forts/resilience4ts-circuit-breaker';

const circuitBreaker = CircuitBreaker.of('my-circuit-breaker', {
  strategy: CircuitBreakerStrategy.Percentage,
  threshold: 0.5,
  interval: 1000 * 60 * 15,
  minimumFailures: 3,
  whitelist: [],
  circuitConnectionRetries: 3,
  halfOpenLimit: 3,
});

const result = await circuitBreaker.on(async () => {
  // do something
})();
```

### Options

| Config Property          | Default Value                       | Description                                                                                                                                                                                                                                                                |
| ------------------------ | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| strategy                 | `CircuitBreakerStrategy.Percentage` | Strategy to use for circuit breaker.                                                                                                                                                                                                                                       |
| threshold                | 0.5                                 | Threshold for circuit breaker. When `strategy` is `Percentage`-based, this threshold represents the maximum allowable failure rate as a percent. When `strategy` is `Volume`-based, this threshold represents the maximum allowable failures in the configured time window |
| interval                 | 1000 _ 60 _ 15                      | Interval in milliseconds that the circuit breaker will transition to the `HALF_OPEN` state after being in the `OPEN` state.                                                                                                                                                |
| minimumFailures          | 3                                   | Minimum number of failures that must be recorded before the circuit breaker can trip open.                                                                                                                                                                                 |
| whitelist                | []                                  | Error[]. If the decorated method throws an error that is in the whitelist, the circuit breaker will not record it as a failure.                                                                                                                                            |
| circuitConnectionRetries | 3                                   | Number of times to retry connecting to the circuit breaker store.                                                                                                                                                                                                          |
| halfOpenLimit            | 3                                   | Number of executions allowed in the `HALF_OPEN` state.                                                                                                                                                                                                                     |

#### Default Circuit Breaker Config

```typescript
const DefaultCircuitBreakerConfig = {
  strategy: CircuitBreakerStrategy.Percentage,
  threshold: 0.5,
  interval: 1000 * 15,
  minimumFailures: 3,
  whitelist: [],
  circuitConnectionRetries: 3,
  halfOpenLimit: 3,
};
```
