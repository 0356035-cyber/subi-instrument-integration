import type { DisplayGranularity } from '../types';
import { generateTimeSlots } from '../utils/time';
import { getSlotWidthPx } from '../utils/layout';

type TimeAxisProps = {
  viewStartMin: number;
  viewEndMin: number;
  granularityMin: DisplayGranularity;
  labelWidth: number;
  timelineWidthPx: number;
};

export function TimeAxis({
  viewStartMin,
  viewEndMin,
  granularityMin,
  labelWidth,
  timelineWidthPx,
}: TimeAxisProps) {
  const slots = generateTimeSlots(viewStartMin, viewEndMin, granularityMin);
  const slotWidthPx = getSlotWidthPx(granularityMin);

  return (
    <div className="gantt-axis-row">
      <div
        className="gantt-row-label gantt-axis-label gantt-sticky-label"
        style={{ width: labelWidth }}
      >
        时间
      </div>
      <div
        className="gantt-timeline gantt-axis-timeline"
        style={{ width: timelineWidthPx, minWidth: timelineWidthPx }}
      >
        {slots.slice(0, -1).map((slot) => (
          <div
            key={slot}
            className="time-slot"
            style={{ width: slotWidthPx, minWidth: slotWidthPx }}
          >
            <span>{slot}</span>
          </div>
        ))}
      </div>
    </div>
  );
}