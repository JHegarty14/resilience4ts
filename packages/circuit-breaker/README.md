## @forts/resilience4ts-circuit-breaker

Circuit breaker pattern implementation for resilience4ts.

### Installation

`npm install @forts/resilience4ts-circuit-breaker`

### Usage

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
});
```

### Options

```typescript
const circuitBreaker = CircuitBreaker.of('my-circuit-breaker', {
  strategy: CircuitBreakerStrategy.Percentage, // Strategy to use for circuit breaker. Percentage or Volume-based.
  threshold: 0.5, // Threshold for circuit breaker. For percentage-based circuit breakers, the threshold is the error percentage at which the circuit breaker will trip open. For volume-based circuit breakers, the threshold is the number of failures before the circuit breaker will trip open.
  interval: 1000 * 60 * 15, // Interval in milliseconds between circuit breaker resets.
  minimumFailures: 3, // Minimum number of failures before the circuit breaker will trip open.
  whitelist: [], // Array of whitelisted errors that will not trip the circuit breaker.
  circuitConnectionRetries: 3, // Number of retries to attempt when the circuit breaker is open.
  halfOpenLimit: 3, // Number of concurrent calls to allow when the circuit breaker is half-open.
});
```
