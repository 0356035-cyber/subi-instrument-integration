import {
  NEAR_WINDOW_THRESHOLD_MIN,
  type Conflict,
  type Resource,
  type Task,
  type TaskRiskState,
} from '../types';
import { minutesToHHmm } from './time';

function intervalsOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number
): boolean {
  return aStart < bEnd && aEnd > bStart;
}

function overlapMinutes(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number
): number {
  const start = Math.max(aStart, bStart);
  const end = Math.min(aEnd, bEnd);
  return Math.max(0, Math.round(end - start));
}

type ResourceOccupancy = {
  task: Task;
  resourceId: string;
};

function expandTaskResources(tasks: Task[]): ResourceOccupancy[] {
  const result: ResourceOccupancy[] = [];
  for (const task of tasks) {
    if (task.status === 'cancelled') continue;
    for (const resourceId of task.resourceIds) {
      result.push({ task, resourceId });
    }
  }
  return result;
}

export function detectResourceConflicts(
  tasks: Task[],
  resources: Resource[]
): Conflict[] {
  const conflicts: Conflict[] = [];
  const resourceMap = new Map(resources.map((r) => [r.id, r]));
  const byResource = new Map<string, Task[]>();

  for (const { task, resourceId } of expandTaskResources(tasks)) {
    const list = byResource.get(resourceId) ?? [];
    if (!list.some((t) => t.id === task.id)) {
      list.push(task);
    }
    byResource.set(resourceId, list);
  }

  for (const [resourceId, resourceTasks] of byResource) {
    const resource = resourceMap.get(resourceId);
    if (!resource || !resource.active) continue;

    const { capacity } = resource;

    if (capacity === 1) {
      for (let i = 0; i < resourceTasks.length; i++) {
        for (let j = i + 1; j < resourceTasks.length; j++) {
          const a = resourceTasks[i];
          const b = resourceTasks[j];
          if (
            a.id !== b.id &&
            intervalsOverlap(a.startMin, a.endMin, b.startMin, b.endMin)
          ) {
            const overlap = overlapMinutes(
              a.startMin,
              a.endMin,
              b.startMin,
              b.endMin
            );
            conflicts.push({
              id: `rc-${resourceId}-${a.id}-${b.id}`,
              type: 'resource_conflict',
              severity: 'high',
              taskId: a.id,
              relatedTaskId: b.id,
              overlapMin: overlap,
              message: `${resource.name} 冲突：${a.subjectId} ${a.name} 与 ${b.subjectId} ${b.name} 重叠 ${overlap} min`,
            });
          }
        }
      }
    } else {
      // capacity > 1：扫描线并发计数
      const events: { time: number; delta: number; taskId: string }[] = [];
      for (const task of resourceTasks) {
        events.push({ time: task.startMin, delta: 1, taskId: task.id });
        events.push({ time: task.endMin, delta: -1, taskId: task.id });
      }
      events.sort((a, b) => a.time - b.time || b.delta - a.delta);

      let active = 0;
      const activeSet = new Set<string>();
      const reported = new Set<string>();

      for (const event of events) {
        if (event.delta > 0) {
          activeSet.add(event.taskId);
          active++;
          if (active > capacity) {
            const activeIds = [...activeSet];
            for (let i = 0; i < activeIds.length; i++) {
              for (let j = i + 1; j < activeIds.length; j++) {
                const key = [activeIds[i], activeIds[j]].sort().join('-');
                if (reported.has(key)) continue;
                const a = resourceTasks.find((t) => t.id === activeIds[i])!;
                const b = resourceTasks.find((t) => t.id === activeIds[j])!;
                if (
                  intervalsOverlap(a.startMin, a.endMin, b.startMin, b.endMin)
                ) {
                  reported.add(key);
                  const overlap = overlapMinutes(
                    a.startMin,
                    a.endMin,
                    b.startMin,
                    b.endMin
                  );
                  conflicts.push({
                    id: `rc-cap-${resourceId}-${key}`,
                    type: 'resource_conflict',
                    severity: 'high',
                    taskId: a.id,
                    relatedTaskId: b.id,
                    overlapMin: overlap,
                    message: `${resource.name} 超容（容量 ${capacity}）：${a.subjectId} ${a.name} 与 ${b.subjectId} ${b.name} 同时占用`,
                  });
                }
              }
            }
          }
        } else {
          activeSet.delete(event.taskId);
          active = Math.max(0, active - 1);
        }
      }
    }
  }

  return conflicts;
}

export function detectTimeWindowViolations(tasks: Task[]): Conflict[] {
  const conflicts: Conflict[] = [];
  const taskMap = new Map(tasks.map((t) => [t.id, t]));

  for (const task of tasks) {
    if (
      task.anchorTaskId == null ||
      task.targetOffsetMin == null ||
      task.status === 'cancelled'
    ) {
      continue;
    }

    const anchor = taskMap.get(task.anchorTaskId);
    if (!anchor) continue;

    const targetMin = anchor.endMin + task.targetOffsetMin;
    const windowEarliest = targetMin - (task.windowBeforeMin ?? 0);
    const windowLatest = targetMin + (task.windowAfterMin ?? 0);

    if (task.startMin < windowEarliest || task.startMin > windowLatest) {
      const overBy = task.startMin > windowLatest
        ? task.startMin - windowLatest
        : windowEarliest - task.startMin;
      conflicts.push({
        id: `tw-${task.id}`,
        type: 'time_window_violation',
        severity: 'high',
        taskId: task.id,
        overlapMin: Math.round(overBy),
        message: `${task.subjectId} ${task.name} 超窗：目标 ${minutesToHHmm(targetMin)}，允许 ${minutesToHHmm(windowEarliest)}–${minutesToHHmm(windowLatest)}，实际 ${minutesToHHmm(task.startMin)}`,
      });
    }
  }

  return conflicts;
}

export function detectNearTimeWindow(tasks: Task[]): Conflict[] {
  const conflicts: Conflict[] = [];
  const taskMap = new Map(tasks.map((t) => [t.id, t]));

  for (const task of tasks) {
    if (
      task.anchorTaskId == null ||
      task.targetOffsetMin == null ||
      task.status === 'cancelled'
    ) {
      continue;
    }

    const anchor = taskMap.get(task.anchorTaskId);
    if (!anchor) continue;

    const targetMin = anchor.endMin + task.targetOffsetMin;
    const windowEarliest = targetMin - (task.windowBeforeMin ?? 0);
    const windowLatest = targetMin + (task.windowAfterMin ?? 0);

    if (task.startMin >= windowEarliest && task.startMin <= windowLatest) {
      const distToEarliest = task.startMin - windowEarliest;
      const distToLatest = windowLatest - task.startMin;
      const nearest = Math.min(distToEarliest, distToLatest);

      if (nearest <= NEAR_WINDOW_THRESHOLD_MIN) {
        conflicts.push({
          id: `ntw-${task.id}`,
          type: 'near_time_window',
          severity: 'low',
          taskId: task.id,
          message: `${task.subjectId} ${task.name} 接近时间窗边界（距边界 ≤ ${NEAR_WINDOW_THRESHOLD_MIN} min）`,
        });
      }
    }
  }

  return conflicts;
}

export function detectDependencyViolations(tasks: Task[]): Conflict[] {
  const conflicts: Conflict[] = [];
  const taskMap = new Map(tasks.map((t) => [t.id, t]));

  for (const task of tasks) {
    if (!task.dependencyTaskId || task.status === 'cancelled') continue;

    const dep = taskMap.get(task.dependencyTaskId);
    if (!dep) continue;

    if (task.startMin < dep.endMin) {
      conflicts.push({
        id: `dep-${task.id}`,
        type: 'dependency_violation',
        severity: 'medium',
        taskId: task.id,
        relatedTaskId: dep.id,
        message: `${task.subjectId} ${task.name} 顺序错误：开始 ${minutesToHHmm(task.startMin)} 早于前置 ${dep.name} 结束 ${minutesToHHmm(dep.endMin)}`,
      });
    }
  }

  return conflicts;
}

/** P0：仅资源冲突 */
export function runP0Validations(
  tasks: Task[],
  resources: Resource[]
): Conflict[] {
  return detectResourceConflicts(tasks, resources);
}

export function runAllValidations(
  tasks: Task[],
  resources: Resource[]
): Conflict[] {
  return [
    ...detectResourceConflicts(tasks, resources),
    ...detectTimeWindowViolations(tasks),
    ...detectNearTimeWindow(tasks),
    ...detectDependencyViolations(tasks),
  ];
}

export function buildTaskRiskMap(
  conflicts: Conflict[]
): Map<string, TaskRiskState> {
  const map = new Map<string, TaskRiskState>();

  const ensure = (taskId: string): TaskRiskState => {
    if (!map.has(taskId)) {
      map.set(taskId, {
        resourceConflict: false,
        timeWindowViolation: false,
        nearTimeWindow: false,
        dependencyViolation: false,
      });
    }
    return map.get(taskId)!;
  };

  for (const c of conflicts) {
    const entry = ensure(c.taskId);
    if (c.type === 'resource_conflict') entry.resourceConflict = true;
    if (c.type === 'time_window_violation') entry.timeWindowViolation = true;
    if (c.type === 'near_time_window') entry.nearTimeWindow = true;
    if (c.type === 'dependency_violation') entry.dependencyViolation = true;
    if (c.relatedTaskId) {
      const related = ensure(c.relatedTaskId);
      if (c.type === 'resource_conflict') related.resourceConflict = true;
      if (c.type === 'dependency_violation') related.dependencyViolation = true;
    }
  }

  return map;
}