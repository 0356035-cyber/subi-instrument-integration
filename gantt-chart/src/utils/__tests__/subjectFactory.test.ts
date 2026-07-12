import { describe, expect, it } from 'vitest';
import { DEFAULT_WORKFLOW_STEPS } from '../../data/defaultWorkflow';
import { generateNextSubjectId } from '../subjectFactory';
import { buildTasksFromWorkflow } from '../workflow';
import { hhmmToMinutes } from '../time';

describe('buildTasksFromWorkflow via subject', () => {
  it('generates sequential flow from arrival time', () => {
    const tasks = buildTasksFromWorkflow('S99', hhmmToMinutes('10:00'), DEFAULT_WORKFLOW_STEPS);
    expect(tasks).toHaveLength(DEFAULT_WORKFLOW_STEPS.length);
    expect(tasks[0].startMin).toBe(hhmmToMinutes('10:00'));

    const product = tasks.find((t) => t.workflowStepId === 'product')!;
    const visia30 = tasks.find((t) => t.workflowStepId === 'visia-30')!;
    expect(visia30.startMin).toBe(product.endMin + 30);
  });
});

describe('generateNextSubjectId', () => {
  it('increments from existing subjects', () => {
    expect(
      generateNextSubjectId([
        { id: 'S01', visitDate: '2026-01-01', arrivalMin: 0, projectId: 'p1', status: 'scheduled' },
        { id: 'S04', visitDate: '2026-01-01', arrivalMin: 0, projectId: 'p1', status: 'scheduled' },
      ])
    ).toBe('S05');
  });
});