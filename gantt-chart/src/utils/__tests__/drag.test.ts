import { describe, expect, it } from 'vitest';
import { defaultSettings } from '../../data/sampleData';
import type { ScheduleSettings, Task } from '../../types';
import { updateTaskTime } from '../drag';
import { hhmmToMinutes } from '../time';

const baseSettings: ScheduleSettings = {
  ...defaultSettings,
  snapGranularityMin: 5,
  dragMode: 'single',
};

function makeTask(overrides: Partial<Task> & Pick<Task, 'id' | 'startMin'>): Task {
  const duration = overrides.durationMin ?? 10;
  return {
    subjectId: 'S01',
    workflowStepId: 'step-1',
    name: '测试任务',
    taskType: 'visia',
    resourceIds: ['VISIA_01'],
    endMin: overrides.startMin + duration,
    durationMin: duration,
    isElastic: false,
    movable: true,
    color: '#722ed1',
    ...overrides,
  };
}

describe('updateTaskTime', () => {
  it('snaps and preserves duration in single mode', () => {
    const tasks = [makeTask({ id: 't1', startMin: 100, durationMin: 8 })];
    const updated = updateTaskTime('t1', 107, tasks, baseSettings);
    expect(updated[0].startMin).toBe(105);
    expect(updated[0].endMin).toBe(113);
  });

  it('shifts all subject tasks in whole_subject mode', () => {
    const settings: ScheduleSettings = {
      ...baseSettings,
      dragMode: 'whole_subject',
    };
    const tasks: Task[] = [
      makeTask({ id: 't1', startMin: hhmmToMinutes('09:00'), durationMin: 10 }),
      makeTask({
        id: 't2',
        subjectId: 'S02',
        startMin: hhmmToMinutes('09:30'),
        durationMin: 10,
      }),
    ];

    const updated = updateTaskTime(
      't1',
      hhmmToMinutes('09:05'),
      tasks,
      settings
    );

    expect(updated.find((t) => t.id === 't1')!.startMin).toBe(
      hhmmToMinutes('09:05')
    );
    expect(updated.find((t) => t.id === 't2')!.startMin).toBe(
      hhmmToMinutes('09:30')
    );
  });
});