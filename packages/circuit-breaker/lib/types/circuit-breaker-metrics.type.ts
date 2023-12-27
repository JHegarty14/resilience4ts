export type CircuitBreakerMetrics = {
  getFailureRate(): number;
  getSlowCallRate(): number;
  getNumberOfSlowCalls(): number;
  getNumberOfSlowSuccessfulCalls(): number;
  getNumberOfSlowFailedCalls(): number;
  getNumberOfHandledCalls(): number;
  getNumberOfFailedCalls(): number;
  getNumberOfNotPermittedCalls(): number;
  getNumberOfSuccessfulCalls(): number;
};
