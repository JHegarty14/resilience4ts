# resilience4ts

`resilience4ts` is a suite of packages that provide ergonomic tools for building performant and safe distributed systems in Typescript. Unlike existing Typescript ports of Java libraries like Hystrix and resilience4j, or .NET packages like Polly, it is designed to be used specifically in highly-concurrent, distributed applications.

## Roadmap

### v0.1.0

- [x] Bulkhead implmentation
- [x] Circuit Breaker implementation
- [x] Cache implementation
- [x] Request-scoped implementation
- [x] Concurrent lock implementation
- [x] Hedge implementation
- [x] Fallback implementation
- [x] Rate Limiter implementation
- [x] Retry implementation
- [x] Timeout implementation
- [ ] NestJS package
	- [x] Decorators
	- [x] r4t component discovery
	- [ ] Register async clients with pipes/filters/interceptors/guards
- [ ] Metrics/Telemetry Module
	- [x] Create common IMetrics interface for integration into resilience packages
	- [x] opentelemetry integration
- [ ] documentation
- [ ] quick start examples
  - [ ] NestJS quickstart
  - [ ] Express quickstart 

### v1.0.0

- [ ] HttpClient
	- [ ] supports cancellable requests
- [ ] GrpcClient
	- [ ] supports cancellable requests
- [ ] DistributedContext module
- [ ] Chaos Engineering module
- [ ] ACL Resolver for Redis Clusters
- [ ] Metrics
	- [ ] Datadog integration
	- [ ] MetricsController / Service for @forts/resilience4ts-nestjs
