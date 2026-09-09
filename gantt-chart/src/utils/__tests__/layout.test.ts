import { describe, expect, it } from 'vitest';
import {
  getPixelsPerMinute,
  getSlotWidthPx,
  getTimelineWidthPx,
  minutesToPixels,
} from '../layout';

describe('timeline scale', () => {
  it('widens slots when scale increases', () => {
    const base = getSlotWidthPx(5, 1);
    expect(getSlotWidthPx(5, 2)).toBe(base * 2);
    expect(getPixelsPerMinute(5, 2)).toBeCloseTo(getPixelsPerMinute(5, 1) * 2);
    expect(getTimelineWidthPx(480, 720, 5, 2)).toBe(getTimelineWidthPx(480, 720, 5, 1) * 2);
  });

  it('scales bar left and width with the axis', () => {
    const start = 540;
    const barStart = 600;
    const barEnd = 605;
    const left1 = minutesToPixels(barStart, start, 5, 1);
    const left2 = minutesToPixels(barStart, start, 5, 2);
    const width1 = (barEnd - barStart) * getPixelsPerMinute(5, 1);
    const width2 = (barEnd - barStart) * getPixelsPerMinute(5, 2);
    expect(left2).toBeCloseTo(left1 * 2);
    expect(width2).toBeCloseTo(width1 * 2);
    expect(left2 / (barStart - start)).toBeCloseTo(width2 / (barEnd - barStart));
  });
});
