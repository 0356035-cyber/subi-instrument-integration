import { describe, expect, it } from 'vitest';
import type { Resource, WorkflowStepTemplate } from '../../types';
import { planBatchSchedule } from '../autoSchedule';

const resources: Resource[] = [
  { id: 'device', name: '设备', type: 'device', capacity: 1, active: true },
];

const workflow: WorkflowStepTemplate[] = [
  {
    id: 'measure',
    order: 0,
    name: '检测',
    taskType: '检测',
    resourceIds: ['device'],
    durationMin: 10,
    color: '#000000',
    scheduling: 'sequential',
  },
];

describe('planBatchSchedule', () => {
  it('keeps workflow timing intact and finds zero-overlap slots', () => {
    const plan = planBatchSchedule([], workflow, resources, {
      subjectIds: ['S01', 'S02'],
      startMin: 540,
      endMin: 570,
      stepMin: 5,
    });

    expect(plan.unscheduledSubjectIds).toEqual([]);
    expect(plan.assignments.map((item) => item.arrivalMin)).toEqual([540, 550]);
    expect(plan.assignments.every((item) => item.newOverlapMin === 0)).toBe(true);
    expect(plan.tasks.map((task) => task.durationMin)).toEqual([10, 10]);
  });

  it('uses the least-overlap slot when no zero-conflict slot exists', () => {
    const plan = planBatchSchedule([], workflow, resources, {
      subjectIds: ['S01', 'S02'],
      startMin: 540,
      endMin: 555,
      stepMin: 5,
    });

    expect(plan.assignments).toHaveLength(2);
    expect(plan.assignments[1].newOverlapMin).toBe(5);
  });

  it('does not create a partial plan when a subject cannot fit the time range', () => {
    const plan = planBatchSchedule([], workflow, resources, {
      subjectIds: ['S01'],
      startMin: 540,
      endMin: 545,
      stepMin: 5,
    });

    expect(plan.assignments).toEqual([]);
    expect(plan.unscheduledSubjectIds).toEqual(['S01']);
  });
});
