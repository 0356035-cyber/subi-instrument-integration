import { describe, expect, it } from 'vitest';
import { createSampleTasks, sampleResources } from '../../data/sampleData';
import type { Task } from '../../types';
import {
  detectDependencyViolations,
  detectNearTimeWindow,
  detectResourceConflicts,
  detectTimeWindowViolations,
} from '../conflicts';
import { hhmmToMinutes } from '../time';

describe('detectResourceConflicts', () => {
  it('detects S01 即刻 VISIA vs S03 BL VISIA overlap 4min on VISIA_01', () => {
    const tasks = createSampleTasks();
    const conflicts = detectResourceConflicts(tasks, sampleResources);

    const visiaConflict = conflicts.find(
      (c) =>
        c.type === 'resource_conflict' &&
        c.overlapMin === 4 &&
        ((c.taskId === 'S01-imm-visia' && c.relatedTaskId === 'S03-bl-visia') ||
          (c.taskId === 'S03-bl-visia' && c.relatedTaskId === 'S01-imm-visia'))
    );

    expect(visiaConflict).toBeDefined();
    expect(visiaConflict?.severity).toBe('high');
    expect(visiaConflict?.message).toContain('VISIA');
  });

  it('uses scanline for capacity > 1 resources', () => {
    const tasks: Task[] = [
      {
        id: 't1',
        subjectId: 'S01',
        name: '等待 A',
        taskType: 'waiting',
        resourceIds: ['Waiting_Area'],
        startMin: 0,
        endMin: 10,
        durationMin: 10,
        workflowStepId: 'w1',
        isElastic: false,
        movable: true,
        color: '#8c8c8c',
      },
      {
        id: 't2',
        subjectId: 'S02',
        name: '等待 B',
        taskType: 'waiting',
        resourceIds: ['Waiting_Area'],
        startMin: 5,
        endMin: 15,
        durationMin: 10,
        workflowStepId: 'w2',
        isElastic: false,
        movable: true,
        color: '#8c8c8c',
      },
    ];

    const conflicts = detectResourceConflicts(tasks, sampleResources);
    expect(conflicts.some((c) => c.type === 'resource_conflict')).toBe(false);
  });
});

describe('detectTimeWindowViolations', () => {
  it('detects S02 30min VISIA 超窗 3min', () => {
    const tasks = createSampleTasks();
    const conflicts = detectTimeWindowViolations(tasks);

    const s02Window = conflicts.find((c) => c.taskId === 'S02-visia-30');
    expect(s02Window).toBeDefined();
    expect(s02Window?.severity).toBe('high');
    expect(s02Window?.overlapMin).toBe(3);
  });
});

describe('detectNearTimeWindow', () => {
  it('flags tasks within 2 min of window boundary', () => {
    const tasks: Task[] = [
      {
        id: 'anchor',
        subjectId: 'S01',
        name: '产品使用',
        taskType: 'product_use',
        resourceIds: ['Operator_A'],
        startMin: 0,
        endMin: 10,
        durationMin: 10,
        workflowStepId: 'product',
        isElastic: false,
        movable: true,
        color: '#fa8c16',
      },
      {
        id: 'target',
        subjectId: 'S01',
        name: '30min VISIA',
        taskType: 'visia',
        resourceIds: ['VISIA_01'],
        startMin: 43,
        endMin: 51,
        durationMin: 8,
        anchorTaskId: 'anchor',
        targetOffsetMin: 30,
        windowBeforeMin: 5,
        windowAfterMin: 5,
        workflowStepId: 'visia-30',
        isElastic: false,
        movable: true,
        color: '#722ed1',
      },
    ];

    const near = detectNearTimeWindow(tasks);
    expect(near.some((c) => c.taskId === 'target' && c.severity === 'low')).toBe(
      true
    );
  });
});

describe('detectDependencyViolations', () => {
  it('reports medium severity for order violations', () => {
    const tasks: Task[] = [
      {
        id: 'dep',
        subjectId: 'S01',
        name: '前置',
        taskType: 'adaptation',
        resourceIds: ['Waiting_Area'],
        startMin: hhmmToMinutes('09:00'),
        endMin: hhmmToMinutes('09:20'),
        durationMin: 20,
        workflowStepId: 'adaptation',
        isElastic: false,
        movable: true,
        color: '#1890ff',
      },
      {
        id: 'bad',
        subjectId: 'S01',
        name: '违规',
        taskType: 'visia',
        resourceIds: ['VISIA_01'],
        startMin: hhmmToMinutes('09:15'),
        endMin: hhmmToMinutes('09:23'),
        durationMin: 8,
        dependencyTaskId: 'dep',
        workflowStepId: 'bl-visia',
        isElastic: false,
        movable: true,
        color: '#722ed1',
      },
    ];

    const conflicts = detectDependencyViolations(tasks);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].severity).toBe('medium');
  });
});