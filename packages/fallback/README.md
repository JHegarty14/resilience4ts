## @forts/resilience4ts-fallback

fallback pattern implementation for resilience4ts.

### Installation

`npm install @forts/resilience4ts-fallback`

### Usage

```typescript
import { Fallback } from '@forts/resilience4ts-fallback';

const fallback = Fallback.of('my-fallback', {
  shouldHandle?: PredicateBuilder,
  fallbackAction: (...args: Parameters<MyDecoratedMethod>[]) => Promise<MyDecoratedMethodReturn> | MyDecoratedMethodReturn,
});

const result = await fallback.on(async () => {
  // do something
});
```

### Options

```typescript
const fallback = Fallback.of('my-fallback', {
  shouldHandle?: PredicateBuilder, // PredicateBuilder that determines whether the fallback should be applied.
  fallbackAction: (...args: Parameters<MyDecoratedMethod>[]) => Promise<MyDecoratedMethodReturn> | MyDecoratedMethodReturn, // Function that returns the fallback result. Can accept the same arguments as the decorated method.
});
```
