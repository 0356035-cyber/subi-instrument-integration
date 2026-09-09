import { describe, expect, it } from 'vitest';
import { DEFAULT_WORKFLOW_STEPS } from '../../data/defaultWorkflow';
import { cloneSubjectTimeline, inferWorkflowFromSubjectTasks } from '../subjectWorkflow';
import { buildTasksFromWorkflow, moveWorkflowStep } from '../workflow';
import { hhmmToMinutes } from '../time';

describe('cloneSubjectTimeline', () => {
  it('shifts a subject timeline to a new arrival while keeping relative gaps', () => {
    const source = buildTasksFromWorkflow(
      'S01',
      hhmmToMinutes('09:00'),
      DEFAULT_WORKFLOW_STEPS
    );
    const cloned = cloneSubjectTimeline(
      source,
      hhmmToMinutes('09:00'),
      'S09',
      hhmmToMinutes('10:00')
    );

    expect(cloned).toHaveLength(source.length);
    expect(cloned.every((task) => task.subjectId === 'S09')).toBe(true);
    expect(cloned[0].id).toBe('S09-adaptation');
    expect(cloned[0].startMin - source[0].startMin).toBe(60);
    expect(cloned[1].startMin - cloned[0].endMin).toBe(
      source[1].startMin - source[0].endMin
    );
    expect(cloned[1].dependencyTaskId).toBe('S09-adaptation');
  });
});

describe('inferWorkflowFromSubjectTasks', () => {
  it('rebuilds template order from actual task start times', () => {
    const moved = moveWorkflowStep(DEFAULT_WORKFLOW_STEPS, 'product', -1);
    const tasks = buildTasksFromWorkflow('S01', hhmmToMinutes('09:00'), moved);
    const inferred = inferWorkflowFromSubjectTasks(tasks, moved);
    expect(inferred.map((step) => step.id).slice(0, 3)).toEqual([
      'adaptation',
      'product',
      'bl-visia',
    ]);
  });
});
