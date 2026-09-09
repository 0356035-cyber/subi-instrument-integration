import type { DisplayGranularity } from '../types';

/** 每个显示刻度槽的基准像素宽度；再乘时间轴缩放。 */
const SLOT_WIDTH_BY_GRANULARITY: Record<DisplayGranularity, number> = {
  1: 36,
  2: 44,
  5: 72,
  10: 88,
  15: 104,
  30: 128,
};

export function clampTimelineScale(scale?: number): number {
  if (scale == null || !Number.isFinite(scale)) return 2;
  return Math.min(4, Math.max(1, scale));
}

export function getSlotWidthPx(
  granularityMin: DisplayGranularity,
  scale = 1
): number {
  return Math.round(
    SLOT_WIDTH_BY_GRANULARITY[granularityMin] * clampTimelineScale(scale)
  );
}

export function getPixelsPerMinute(
  granularityMin: DisplayGranularity,
  scale = 1
): number {
  return getSlotWidthPx(granularityMin, scale) / granularityMin;
}

export function getTimelineWidthPx(
  viewStartMin: number,
  viewEndMin: number,
  granularityMin: DisplayGranularity,
  scale = 1
): number {
  const duration = viewEndMin - viewStartMin;
  const slotCount = duration / granularityMin;
  return slotCount * getSlotWidthPx(granularityMin, scale);
}

export function minutesToPixels(
  minutes: number,
  viewStartMin: number,
  granularityMin: DisplayGranularity,
  scale = 1
): number {
  return (minutes - viewStartMin) * getPixelsPerMinute(granularityMin, scale);
}

export function pixelsToMinutes(
  pixels: number,
  viewStartMin: number,
  granularityMin: DisplayGranularity,
  scale = 1
): number {
  return viewStartMin + pixels / getPixelsPerMinute(granularityMin, scale);
}

export function deltaPixelsToMinutes(
  deltaPx: number,
  granularityMin: DisplayGranularity,
  scale = 1
): number {
  return deltaPx / getPixelsPerMinute(granularityMin, scale);
}