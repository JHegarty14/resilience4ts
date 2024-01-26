# Fallback

---

### Introduction

The fallback strategy provides an interface to define a callback that will be executed if the decorated function fails. This strategy is useful when you want to provide a default value or behavior in the event of a failure. For example, you may want to return a cached value or a default value from a configuration file. The fallback strategy is also useful for providing a graceful degradation of functionality when a service is unavailable, although you should consider using the circuit breaker strategy for this purpose as it provides more control over the failure state.

Given the limitations of Typescript's type system, specifically when dealing with method decoators, you may find it most appropriate to type the decorated function to use a `Result` or `Either` monad. This approach will allow you to gracefully handle both the success and failure cases. Helpfull packages for this strategy include [oxide.ts](https://github.com/traverse1984/oxide.ts) or [neverthrow](https://github.com/supermacro/neverthrow).

### Installation

`npm i @forts/resilience4ts-fallback`

### Create and Configure a Fallback

```typescript
import { Fallback } from '@forts/resilience4ts-fallback';

const fallback = Fallback.of('my-fallback', {
  fallbackAction: async () => {
    return 'my fallback value';
  },
});

const result = await fallback.on(async () => {
  // do something
})();
```

### Options

| Config Property | Default Value | Description                                                                                        |
| --------------- | ------------- | -------------------------------------------------------------------------------------------------- |
| fallbackAction  |               | Function that returns a fallback value or executes a fallback action.                              |
| shouldHandle    |               | `PredicateBuilder` that evaluates to a boolean indicating whether the fallback should be executed. |
