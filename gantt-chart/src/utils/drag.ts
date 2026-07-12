import type { ScheduleSettings, Task } from '../types';
import { snapMinutes } from './time';

function sortSubjectTasks(tasks: Task[], subjectId: string): Task[] {
  return tasks
    .filter((t) => t.subjectId === subjectId)
    .sort((a, b) => a.startMin - b.startMin || a.id.localeCompare(b.id));
}

function updateFixedTask(task: Task, startMin: number): Task {
  return {
    ...task,
    startMin,
    endMin: startMin + task.durationMin,
  };
}

function applyElasticPass(subjectTasks: Task[]): Task[] {
  const sorted = [...subjectTasks].sort((a, b) => a.startMin - b.startMin);
  const taskMap = new Map(sorted.map((t) => [t.id, { ...t }]));

  for (let i = 0; i < sorted.length; i++) {
    const task = taskMap.get(sorted[i].id)!;
    if (!task.isElastic) continue;

    const prev = i > 0 ? taskMap.get(sorted[i - 1].id) : undefined;
    const next = i < sorted.length - 1 ? taskMap.get(sorted[i + 1].id) : undefined;

    const newStart = prev ? prev.endMin : task.startMin;
    const newEnd = next ? next.startMin : task.endMin;

    taskMap.set(task.id, {
      ...task,
      startMin: newStart,
      endMin: Math.max(newEnd, newStart),
      durationMin: Math.max(0, Math.max(newEnd, newStart) - newStart),
    });
  }

  return sorted.map((t) => taskMap.get(t.id)!);
}

export function updateTaskTime(
  taskId: string,
  newStartMin: number,
  tasks: Task[],
  settings: ScheduleSettings
): Task[] {
  const taskIndex = tasks.findIndex((t) => t.id === taskId);
  if (taskIndex === -1) return tasks;

  const task = tasks[taskIndex];
  if (task.locked || !task.movable) return tasks;

  const snappedStart = snapMinutes(
    newStartMin,
    settings.snapGranularityMin,
    'nearest'
  );
  const deltaMin = snappedStart - task.startMin;

  let updated = [...tasks];

  if (settings.dragMode === 'single') {
    updated[taskIndex] = updateFixedTask(task, snappedStart);
    return updated;
  }

  if (settings.dragMode === 'whole_subject') {
    return updated.map((t) => {
      if (t.subjectId !== task.subjectId || t.locked || !t.movable) return t;
      return updateFixedTask(t, t.startMin + deltaMin);
    });
  }

  // cascade：后续非弹性任务等距平移，弹性任务自动伸缩
  const subjectTasks = sortSubjectTasks(updated, task.subjectId);
  const currentIdx = subjectTasks.findIndex((t) => t.id === taskId);
  const subsequent = subjectTasks.slice(currentIdx);
  const subsequentIds = new Set(subsequent.map((t) => t.id));

  updated = updated.map((t) => {
    if (!subsequentIds.has(t.id) || t.locked || !t.movable) return t;
    if (t.id === taskId) {
      return updateFixedTask(t, snappedStart);
    }
    if (t.isElastic) return t;
    return updateFixedTask(t, t.startMin + deltaMin);
  });

  const subjectUpdated = sortSubjectTasks(updated, task.subjectId);
  const reflowed = applyElasticPass(subjectUpdated);
  const reflowMap = new Map(reflowed.map((t) => [t.id, t]));

  return updated.map((t) => reflowMap.get(t.id) ?? t);
}