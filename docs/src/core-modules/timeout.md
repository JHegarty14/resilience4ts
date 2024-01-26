# Timeout

The timeout module provides a way to limit the amount of time a function may take to execute. If the function does not complete within the specified time, the module will throw an error.

### Installation

`npm i @forts/resilience4ts-timeout`

### Create and Configure a Timeout

```typescript
import { Timeout } from '@forts/resilience4ts-timeout';

const timeout = Timeout.of('my-timeout', {
  timeout: 1000,
});

const result = await timeout.on(async () => {
  // do something
})();
```

### Options

| Config Property | Default Value | Description              |
| --------------- | ------------- | ------------------------ |
| timeout         |               | Timeout in milliseconds. |
