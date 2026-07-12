import { describe, expect, it } from 'vitest';
import type { Task } from '../../types';
import {
  getTaskBarDisplayWidth,
  getTaskShortLabel,
  shouldShowOutsideLabel,
  TASK_LABEL_INSIDE_MIN_PX,
} from '../taskLabel';

const baseTask: Task = {
  id: 't1',
  subjectId: 'S01',
  workflowStepId: 'bl-moisture',
  visitPoint: 'BL',
  name: 'BL 水分',
  taskType: 'moisture',
  resourceIds: ['Moisture_01'],
  startMin: 600,
  endMin: 603,
  durationMin: 3,
  color: '#aaa',
  status: 'planned',
  locked: false,
  movable: true,
  isElastic: false,
};

describe('taskLabel helpers', () => {
  it('shows outside label for narrow bars', () => {
    expect(shouldShowOutsideLabel(TASK_LABEL_INSIDE_MIN_PX - 1)).toBe(true);
    expect(shouldShowOutsideLabel(TASK_LABEL_INSIDE_MIN_PX)).toBe(false);
  });

  it('keeps a minimum visible bar width', () => {
    expect(getTaskBarDisplayWidth(3)).toBeGreaterThanOrEqual(10);
    expect(getTaskBarDisplayWidth(120)).toBe(120);
  });

  it('prefers visit point as short label', () => {
    expect(getTaskShortLabel(baseTask)).toBe('BL');
  });
});