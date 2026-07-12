import { describe, expect, it } from 'vitest';
import {
  formatMinuteRange,
  generateTimeSlots,
  hhmmToMinutes,
  minutesToHHmm,
  snapMinutes,
} from '../time';

describe('snapMinutes', () => {
  it('returns original when granularity is null', () => {
    expect(snapMinutes(17, null)).toBe(17);
  });

  it('snaps nearest to 5 min', () => {
    expect(snapMinutes(17, 5, 'nearest')).toBe(15);
    expect(snapMinutes(18, 5, 'nearest')).toBe(20);
  });

  it('snaps ceil and floor', () => {
    expect(snapMinutes(17, 5, 'ceil')).toBe(20);
    expect(snapMinutes(17, 5, 'floor')).toBe(15);
  });
});

describe('minute formatting', () => {
  it('converts hh:mm ↔ minutes', () => {
    expect(hhmmToMinutes('09:41')).toBe(581);
    expect(minutesToHHmm(581)).toBe('09:41');
  });

  it('formats range', () => {
    expect(formatMinuteRange(581, 589)).toBe('09:41–09:49');
  });

  it('generates time slots', () => {
    const slots = generateTimeSlots(540, 550, 5);
    expect(slots).toEqual(['09:00', '09:05', '09:10']);
  });
});