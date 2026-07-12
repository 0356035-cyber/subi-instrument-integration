import { describe, expect, it } from 'vitest';
import { DEFAULT_WORKFLOW_STEPS } from '../../data/defaultWorkflow';
import { buildTasksFromWorkflow } from '../workflow';
import { hhmmToMinutes } from '../time';

describe('buildTasksFromWorkflow', () => {
  it('generates same step structure for all subjects', () => {
    const t1 = buildTasksFromWorkflow('S01', hhmmToMinutes('09:00'), DEFAULT_WORKFLOW_STEPS);
    const t2 = buildTasksFromWorkflow('S02', hhmmToMinutes('09:30'), DEFAULT_WORKFLOW_STEPS);
    expect(t1).toHaveLength(DEFAULT_WORKFLOW_STEPS.length);
    expect(t2).toHaveLength(DEFAULT_WORKFLOW_STEPS.length);
    expect(t1.map((t) => t.workflowStepId)).toEqual(
      t2.map((t) => t.workflowStepId)
    );
    expect(t1.map((t) => t.color)).toEqual(t2.map((t) => t.color));
  });

  it('uses step colors on tasks', () => {
    const tasks = buildTasksFromWorkflow('S01', hhmmToMinutes('09:00'), DEFAULT_WORKFLOW_STEPS);
    const visia = tasks.find((t) => t.workflowStepId === 'bl-visia')!;
    const step = DEFAULT_WORKFLOW_STEPS.find((s) => s.id === 'bl-visia')!;
    expect(visia.color).toBe(step.color);
  });

  it('offsets by arrival time', () => {
    const tasks = buildTasksFromWorkflow('S01', hhmmToMinutes('10:00'), DEFAULT_WORKFLOW_STEPS);
    expect(tasks[0].startMin).toBe(hhmmToMinutes('10:00'));
  });
});