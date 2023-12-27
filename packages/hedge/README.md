## @forts/resilience4ts-hedge

Hedge pattern implementation for resilience4ts.

### Installation

`npm install @forts/resilience4ts-hedge`

### Usage

```typescript
import { Hedge } from '@forts/resilience4ts-hedge';

const hedge = Hedge.of('my-hedge', {
  delay: 1000,
});

const result = await hedge.on(async () => {
  // do something
});
```

### Options

```typescript
const hedge = Hedge.of('my-hedge', {
  shouldHandle?: PredicateBuilder, // PredicateBuilder that determines whether the hedge should be applied.
  delay: number, // Delay in milliseconds before the hedge is executed.
  maxHedgedAttempts?: number, // Maximum number of attempts to execute the decorated method.
  actionGenerator?:
    | (<Args, Ret>(...args: Args extends unknown[] ? Args : [Args]) => Promise<Ret>)
    | null, // Function that returns the fallback result. Can accept the same arguments as the decorated method.
  exceptOnHedge?: boolean, // Whether to throw an exception if the hedge is executed.
});
```
