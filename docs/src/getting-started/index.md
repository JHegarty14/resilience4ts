# Introduction

---

Resilience4ts is a distributed-first fault tolerance library for TypeScript inspired by resilience4j, Hystrix, and Polly. Following in the footsteps of its namesake [resilience4j](https://resilience4j.readme.io/docs/getting-started), Resilience4ts also aims to be a transparent fault-tolerance layer via higher-order functions (decorators). Decorators can be stacked to create reusable pipelines of decorators, and can be applied to any asynchronous function or method.

## Modularization

Resilience4ts decorators are modularized into separate packages, each with its own peer dependencies. This allows you to install only the decorators you need, and to avoid installing unnecessary dependencies.

### All Core Modules and Pipeline Decorators

- @forts/resilience4ts-all

### Core Modules

- @forts/resilience4ts-bulkhead
- @forts/resilience4ts-cache
- @forts/resilience4ts-circuit-breaker
- @forts/resilience4ts-concurrent-lock
- @forts/resilience4ts-concurrent-queue
- @forts/resilience4ts-fallback
- @forts/resilience4ts-hedge
- @forts/resilience4ts-rate-limiter
- @forts/resilience4ts-retry
- @forts/resilience4ts-timeout

### Framework Modules

- @forts/resilience4ts-nestjs
