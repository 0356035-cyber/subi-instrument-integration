import { describe, expect, it } from 'vitest';
import type { Task } from '../../types';
import {
  computeTaskLabelLayouts,
  getTaskBarDisplayWidth,
  getTaskContentLabel,
  getVisitPointBarLabel,
  getVisitPointHeaderLabel,
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
  it('keeps a minimum visible bar width', () => {
    expect(getTaskBarDisplayWidth(3)).toBeGreaterThanOrEqual(10);
    expect(getTaskBarDisplayWidth(120)).toBe(120);
  });

  it('puts visit point on the header for every bar', () => {
    expect(getVisitPointHeaderLabel(baseTask)).toBe('BL');
    expect(
      getVisitPointHeaderLabel({ ...baseTask, visitPoint: 'Immediate', name: '即刻 VISIA' })
    ).toBe('即刻');
    expect(
      getVisitPointHeaderLabel({ ...baseTask, visitPoint: '30min', name: '30min TEWL' })
    ).toBe('30分钟');
    expect(
      getVisitPointHeaderLabel({ ...baseTask, visitPoint: '1h', name: '1h 问卷' })
    ).toBe('1小时');
    expect(
      getVisitPointHeaderLabel({ ...baseTask, visitPoint: 'Other', name: '环境适应' })
    ).toBe('其他');
    expect(
      getVisitPointHeaderLabel({ ...baseTask, visitPoint: undefined, name: '问卷' })
    ).toBe('—');
    expect(getVisitPointBarLabel(baseTask)).toBe('BL');
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

  it('uses stacked labels for both narrow and wide bars', () => {
    const layouts = computeTaskLabelLayouts([
      { task: { ...baseTask, id: 'a' }, leftPx: 0, widthPx: 20 },
      { task: { ...baseTask, id: 'b' }, leftPx: 0, widthPx: 140 },
    ]);
    expect(layouts.get('a')?.mode).toBe('stacked');
    expect(layouts.get('b')?.mode).toBe('stacked');
  });
});
