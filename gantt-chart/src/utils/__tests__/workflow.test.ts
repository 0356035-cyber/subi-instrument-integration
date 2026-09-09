import { describe, expect, it } from 'vitest';
import { DEFAULT_WORKFLOW_STEPS } from '../../data/defaultWorkflow';
import {
  buildTasksFromWorkflow,
  moveWorkflowStep,
  normalizeStepOrders,
} from '../workflow';
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

  it('uses task type colors on tasks', () => {
    const tasks = buildTasksFromWorkflow('S01', hhmmToMinutes('09:00'), DEFAULT_WORKFLOW_STEPS);
    const blVisia = tasks.find((t) => t.workflowStepId === 'bl-visia')!;
    const immVisia = tasks.find((t) => t.workflowStepId === 'imm-visia')!;
    const visia30 = tasks.find((t) => t.workflowStepId === 'visia-30')!;
    expect(blVisia.color).toBe(immVisia.color);
    expect(blVisia.color).toBe(visia30.color);
  });

  it('offsets by arrival time', () => {
    const tasks = buildTasksFromWorkflow('S01', hhmmToMinutes('10:00'), DEFAULT_WORKFLOW_STEPS);
    expect(tasks[0].startMin).toBe(hhmmToMinutes('10:00'));
  });

  it('uses saved step order when generating tasks', () => {
    const reordered = moveWorkflowStep(DEFAULT_WORKFLOW_STEPS, 'bl-visia', 1);
    const tasks = buildTasksFromWorkflow('S01', hhmmToMinutes('09:00'), reordered);
    expect(normalizeStepOrders(reordered).map((step) => step.id).slice(0, 3)).toEqual([
      'adaptation',
      'product',
      'bl-visia',
    ]);
    expect(tasks.map((task) => task.workflowStepId).slice(0, 3)).toEqual([
      'adaptation',
      'product',
      'bl-visia',
    ]);
  });
});