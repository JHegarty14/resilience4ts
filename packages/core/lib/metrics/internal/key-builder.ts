import { ResilienceKeyBuilder } from '../../util';

export class KeyBuilder {
  static metricsBucketKey(key: string, bucketUid: string) {
    return ResilienceKeyBuilder.build('metrics', key, 'bucket', bucketUid);
  }

  static metricsTimeseriesKey(key: string) {
    return ResilienceKeyBuilder.build('metrics', 'timeseries', key);
  }
}
