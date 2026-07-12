/** 将当天分钟偏移量吸附到指定粒度 */
export function snapMinutes(
  minutes: number,
  granularityMin: number | null,
  mode: 'nearest' | 'ceil' | 'floor' = 'nearest'
): number {
  if (granularityMin === null || granularityMin <= 0) {
    return minutes;
  }

  if (mode === 'nearest') {
    return Math.round(minutes / granularityMin) * granularityMin;
  }
  if (mode === 'ceil') {
    return Math.ceil(minutes / granularityMin) * granularityMin;
  }
  return Math.floor(minutes / granularityMin) * granularityMin;
}

/** @deprecated 保留别名，供测试/迁移引用 */
export const snapTime = (
  _date: Date,
  granularityMin: number | null,
  mode: 'nearest' | 'ceil' | 'floor' = 'nearest'
): Date => {
  const min = _date.getHours() * 60 + _date.getMinutes();
  const snapped = snapMinutes(min, granularityMin, mode);
  const d = new Date(_date);
  d.setHours(Math.floor(snapped / 60), snapped % 60, 0, 0);
  return d;
};

export function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToHHmm(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatMinuteRange(startMin: number, endMin: number): string {
  return `${minutesToHHmm(startMin)}–${minutesToHHmm(endMin)}`;
}

export function getViewDurationMin(viewStartMin: number, viewEndMin: number): number {
  return viewEndMin - viewStartMin;
}

export function generateTimeSlots(
  viewStartMin: number,
  viewEndMin: number,
  granularityMin: number
): string[] {
  const slots: string[] = [];
  for (let m = viewStartMin; m <= viewEndMin; m += granularityMin) {
    slots.push(minutesToHHmm(m));
  }
  return slots;
}

/** 任务 startMin 相对于视图起点的偏移（用于渲染） */
export function taskOffsetFromView(
  taskStartMin: number,
  viewStartMin: number
): number {
  return taskStartMin - viewStartMin;
}

export function taskDurationMin(task: { startMin: number; endMin: number }): number {
  return task.endMin - task.startMin;
}