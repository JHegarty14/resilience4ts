import { performance } from 'node:perf_hooks';
import os from 'node:os';

export class ResourceUtilizationStrategy {
  private maxUtilization: number;
  private maxSafeUtilization: number;
  private maxCpuUtilization: number;
  private maxSafeCpuUtilization: number;
  private observationInterval: number;

  constructor({
    maxUtilization,
    maxSafeUtilization,
    maxCpuUtilization,
    maxSafeCpuUtilization,
    observationInterval,
  }: {
    maxUtilization?: number;
    maxSafeUtilization?: number;
    maxCpuUtilization?: number;
    maxSafeCpuUtilization?: number;
    observationInterval?: number;
  }) {
    this.maxUtilization = maxUtilization ?? 0.9;
    this.maxSafeUtilization = maxSafeUtilization ?? 0.75;
    this.maxCpuUtilization = maxCpuUtilization ?? 0.9;
    this.maxSafeCpuUtilization = maxSafeCpuUtilization ?? 0.75;
    this.observationInterval = observationInterval ?? 1000;
  }

  withMaxUtilization(maxUtilization: number) {
    this.maxUtilization = maxUtilization;
    return this;
  }

  withMaxSafeUtilization(maxSafeUtilization: number) {
    this.maxSafeUtilization = maxSafeUtilization;
    return this;
  }

  withMaxCpuUtilization(maxCpuUtilization: number) {
    this.maxCpuUtilization = maxCpuUtilization;
    return this;
  }

  withMaxSafeCpuUtilization(maxSafeCpuUtilization: number) {
    this.maxSafeCpuUtilization = maxSafeCpuUtilization;
    return this;
  }

  collect() {
    const { utilization, cpuUtilization } = this.getUtilization();
    return new ResourceUtilizationCollection(
      utilization,
      cpuUtilization,
      this.maxUtilization,
      this.maxCpuUtilization,
      this.maxSafeUtilization,
      this.maxSafeCpuUtilization
    );
  }

  withObservationInterval(interval: number) {
    this.observationInterval = interval;
    return this;
  }

  get observationIntervalInMs() {
    return this.observationInterval;
  }

  private getUtilization() {
    const { active, idle } = performance.eventLoopUtilization();
    const cpuUtilization = this.getCpuLoad();
    const utilization = active / idle;
    return {
      utilization,
      cpuUtilization,
    };
  }

  private getCpuLoad() {
    const cpus = os.cpus();
    const dn = cpus.reduce((acc, curr) => {
      return acc + Object.values(curr.times).reduce((a, c) => a + c, 0);
    }, 0);

    const num = cpus.reduce((acc, curr) => {
      return acc + curr.times.idle;
    }, 0);

    return 1 - num / dn;
  }
}

class ResourceUtilizationCollection {
  constructor(
    readonly utilization: number,
    readonly cpuUtilization: number,
    readonly maxUtilization: number,
    readonly maxCpuUtilization: number,
    readonly maxSafeUtilization: number,
    readonly maxSafeCpuUtilization: number
  ) {}

  shouldPause() {
    return this.utilization > this.maxUtilization || this.cpuUtilization > this.maxCpuUtilization;
  }
  shouldResume() {
    return (
      this.utilization < this.maxSafeUtilization && this.cpuUtilization < this.maxSafeCpuUtilization
    );
  }
  shouldBackoff() {
    return (
      (this.utilization > this.maxSafeUtilization ||
        this.cpuUtilization > this.maxSafeCpuUtilization) &&
      !this.shouldPause()
    );
  }
}
