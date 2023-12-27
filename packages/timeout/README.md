## @forts/resilience4ts-timeout

Timeout pattern implementation for resilience4ts.

### Installation

`npm install @forts/resilience4ts-timeout`

### Usage

```typescript
import { Timeout } from '@forts/resilience4ts-timeout';

const timeout = Timeout.of('my-timeout', {
  timeout: 1000,
});

const result = await timeout.on(async () => {
  // do something
});
```

### Options

```typescript
const timeout = Timeout.of('my-timeout', {
  timeout: 1000, // Timeout in milliseconds.
});
```
