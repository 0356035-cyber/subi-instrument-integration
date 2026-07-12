import { describe, expect, it } from 'vitest';
import type { Task } from '../../types';
import {
  computeTaskLabelLayouts,
  getTaskBarDisplayWidth,
  getTaskContentLabel,
  getVisitPointBarLabel,
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

const narrowTask = (id: string, name: string, visitPoint: Task['visitPoint']): Task => ({
  ...baseTask,
  id,
  name,
  visitPoint,
});

describe('taskLabel helpers', () => {
  it('shows compact labels for narrow bars', () => {
    expect(shouldShowOutsideLabel(TASK_LABEL_INSIDE_MIN_PX - 1)).toBe(true);
    expect(shouldShowOutsideLabel(TASK_LABEL_INSIDE_MIN_PX)).toBe(false);
  });

  it('keeps a minimum visible bar width', () => {
    expect(getTaskBarDisplayWidth(3)).toBeGreaterThanOrEqual(10);
    expect(getTaskBarDisplayWidth(120)).toBe(120);
  });

  it('shows visit point inside narrow bars', () => {
    expect(getVisitPointBarLabel(baseTask)).toBe('BL');
    expect(
      getVisitPointBarLabel({ ...baseTask, visitPoint: 'Immediate', name: '即刻 VISIA' })
    ).toBe('即刻');
    expect(
      getVisitPointBarLabel({ ...baseTask, visitPoint: '30min', name: '30min TEWL' })
    ).toBe('30分钟');
  });

  it('strips visit point prefix from content label', () => {
    expect(getTaskContentLabel(baseTask)).toBe('水分');
    expect(getTaskContentLabel({ ...baseTask, name: 'BL VISIA' })).toBe('VISIA');
    expect(
      getTaskContentLabel({ ...baseTask, visitPoint: 'Immediate', name: '即刻 TEWL' })
    ).toBe('TEWL');
    expect(
      getTaskContentLabel({ ...baseTask, visitPoint: '30min', name: '30min VISIA' })
    ).toBe('VISIA');
    expect(
      getTaskContentLabel({ ...baseTask, visitPoint: 'Other', name: '环境适应' })
    ).toBe('环境适应');
  });

  it('always uses above labels for narrow bars', () => {
    const layouts = computeTaskLabelLayouts([
      { task: narrowTask('a', 'BL VISIA', 'BL'), leftPx: 0, widthPx: 20 },
      { task: narrowTask('b', 'BL TEWL', 'BL'), leftPx: 22, widthPx: 20 },
    ]);

    expect(layouts.get('a')?.mode).toBe('above');
    expect(layouts.get('b')?.mode).toBe('above');
  });

  it('uses inside labels for wide bars', () => {
    const layouts = computeTaskLabelLayouts([
      { task: baseTask, leftPx: 0, widthPx: 140 },
    ]);
    expect(layouts.get('t1')?.mode).toBe('inside');
  });
});