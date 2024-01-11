import { MetricsBucketWindow, RetentionWindow } from '../../types';

const VALID = ['ms', 's', 'm', 'h', 'd', 'w'] as const;

type ValidUnit = (typeof VALID)[number];

const SecondToMs = 1000;

const MinuteToMs = 60 * SecondToMs;

const HourToMs = 60 * MinuteToMs;

const DayToMs = 24 * HourToMs;

const WeekToMs = 7 * DayToMs;

const isValidUnitGuard = (unit: string): unit is ValidUnit => VALID.includes(unit as ValidUnit);

export const parseReadableWindow = (window: RetentionWindow | MetricsBucketWindow): number => {
  const wArr = window.trim().split('');
  const unit = wArr.pop() ?? '';
  const value = Number(wArr.join(''));

  if (!isValidUnitGuard(unit)) {
    throw new Error(`Invalid window unit: ${unit}`);
  }

  switch (unit) {
    case 'ms':
      return value;
    case 's':
      return value * SecondToMs;
    case 'm':
      return value * MinuteToMs;
    case 'h':
      return value * HourToMs;
    case 'd':
      return value * DayToMs;
    case 'w':
      return value * WeekToMs;
  }
};
