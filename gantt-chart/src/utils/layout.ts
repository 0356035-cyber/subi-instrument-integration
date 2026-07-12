import type { DisplayGranularity } from '../types';

/** 每个显示刻度槽的像素宽度（显示粒度越细，单槽越窄以保持可滚动总宽度合理） */
const SLOT_WIDTH_BY_GRANULARITY: Record<DisplayGranularity, number> = {
  1: 28,
  2: 32,
  5: 48,
  10: 56,
  15: 64,
  30: 80,
};

export function getSlotWidthPx(granularityMin: DisplayGranularity): number {
  return SLOT_WIDTH_BY_GRANULARITY[granularityMin];
}

export function getPixelsPerMinute(granularityMin: DisplayGranularity): number {
  return getSlotWidthPx(granularityMin) / granularityMin;
}

export function getTimelineWidthPx(
  viewStartMin: number,
  viewEndMin: number,
  granularityMin: DisplayGranularity
): number {
  const duration = viewEndMin - viewStartMin;
  const slotCount = duration / granularityMin;
  return slotCount * getSlotWidthPx(granularityMin);
}

export function minutesToPixels(
  minutes: number,
  viewStartMin: number,
  granularityMin: DisplayGranularity
): number {
  return (minutes - viewStartMin) * getPixelsPerMinute(granularityMin);
}

export function pixelsToMinutes(
  pixels: number,
  viewStartMin: number,
  granularityMin: DisplayGranularity
): number {
  return viewStartMin + pixels / getPixelsPerMinute(granularityMin);
}

export function deltaPixelsToMinutes(
  deltaPx: number,
  granularityMin: DisplayGranularity
): number {
  return deltaPx / getPixelsPerMinute(granularityMin);
}