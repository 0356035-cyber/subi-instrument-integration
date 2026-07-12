import type { ScheduleSettings, Task } from '../types';
import { snapMinutes } from './time';

export type TaskPatch = Partial<
  Pick<
    Task,
    | 'name'
    | 'taskType'
    | 'visitPoint'
    | 'resourceIds'
    | 'startMin'
    | 'durationMin'
    | 'movable'
    | 'locked'
    | 'isElastic'
  >
>;

export function patchTask(
  taskId: string,
  patch: TaskPatch,
  tasks: Task[],
  settings: ScheduleSettings
): Task[] {
  const idx = tasks.findIndex((t) => t.id === taskId);
  if (idx === -1) return tasks;

  const task = tasks[idx];
  let startMin = patch.startMin ?? task.startMin;
  let durationMin = patch.durationMin ?? task.durationMin;

  if (patch.startMin != null) {
    startMin = snapMinutes(
      patch.startMin,
      settings.snapGranularityMin,
      'nearest'
    );
  }

  const updated: Task = {
    ...task,
    ...patch,
    startMin,
    durationMin,
    endMin: startMin + durationMin,
  };

  const result = [...tasks];
  result[idx] = updated;
  return result;
}

export function replaceSubjectTasks(
  subjectId: string,
  newTasks: Task[],
  allTasks: Task[]
): Task[] {
  const others = allTasks.filter((t) => t.subjectId !== subjectId);
  return [...others, ...newTasks];
}