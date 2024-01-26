# Hedge

---

### Introduction

The hedging strategy enables the re-execution of a user-defined callback if the previous execution takes too long. This approach gives you the option to either run the original callback again or specify a new callback for subsequent hedged attempts. Implementing a hedging strategy can boost the overall responsiveness of the system. However, it's essential to note that this improvement comes at the cost of increased resource utilization. If low latency is not a critical requirement, you may find the retry strategy is more appropriate.

### Installation

`npm i @forts/resilience4ts-hedge`

### Create and Configure a Hedge

```typescript
import { Hedge } from '@forts/resilience4ts-hedge';

const hedge = Hedge.of('my-hedge', {
  maxAttempts: 3,
  delay: 1000,
});

const result = await hedge.on(async () => {
  // do something
})();
```
