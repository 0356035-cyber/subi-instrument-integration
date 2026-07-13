import type { Resource, Task, WorkflowStepTemplate } from '../types';
import { detectResourceConflicts } from './conflicts';
import { buildTasksFromWorkflow } from './workflow';

export type AutoScheduleOptions = {
  subjectIds: string[];
  startMin: number;
  endMin: number;
  stepMin: number;
};

export type AutoScheduleAssignment = {
  subjectId: string;
  arrivalMin: number;
  newConflictCount: number;
  newOverlapMin: number;
};

export type AutoSchedulePlan = {
  assignments: AutoScheduleAssignment[];
  tasks: Task[];
  unscheduledSubjectIds: string[];
};

function fitsResourceAvailability(tasks: Task[], resources: Resource[]): boolean {
  const resourceById = new Map(resources.map((resource) => [resource.id, resource]));
  return tasks.every((task) =>
    task.resourceIds.every((resourceId) => {
      const resource = resourceById.get(resourceId);
      if (!resource) return true;
      return (
        (resource.availableStartMin == null || task.startMin >= resource.availableStartMin) &&
        (resource.availableEndMin == null || task.endMin <= resource.availableEndMin)
      );
    })
  );
}

/**
 * 为一批新受试者逐名寻找最优到场时间。
 *
 * 每个候选时间都由同一份流程模板生成任务，因此不会改变受试者内部的
 * 环节顺序、耗时、锚点或时间窗。评分优先级为：新增资源重叠分钟数、
 * 新增冲突对数、流程结束时间、到场时间。
 */
export function planBatchSchedule(
  existingTasks: Task[],
  workflow: WorkflowStepTemplate[],
  resources: Resource[],
  options: AutoScheduleOptions
): AutoSchedulePlan {
  const stepMin = Math.max(1, Math.floor(options.stepMin));
  let plannedTasks = [...existingTasks];
  const assignments: AutoScheduleAssignment[] = [];
  const unscheduledSubjectIds: string[] = [];

  for (const subjectId of options.subjectIds) {
    let best:
      | { arrivalMin: number; tasks: Task[]; conflictCount: number; overlapMin: number; endMin: number }
      | undefined;

    for (let arrivalMin = options.startMin; arrivalMin <= options.endMin; arrivalMin += stepMin) {
      const candidateTasks = buildTasksFromWorkflow(subjectId, arrivalMin, workflow);
      const candidateEndMin = Math.max(arrivalMin, ...candidateTasks.map((task) => task.endMin));
      if (candidateEndMin > options.endMin || !fitsResourceAvailability(candidateTasks, resources)) {
        continue;
      }

      const candidateTaskIds = new Set(candidateTasks.map((task) => task.id));
      const newConflicts = detectResourceConflicts(
        [...plannedTasks, ...candidateTasks],
        resources
      ).filter(
        (conflict) =>
          candidateTaskIds.has(conflict.taskId) ||
          (conflict.relatedTaskId != null && candidateTaskIds.has(conflict.relatedTaskId))
      );
      const conflictCount = newConflicts.length;
      const overlapMin = newConflicts.reduce(
        (sum, conflict) => sum + (conflict.overlapMin ?? 0),
        0
      );

      const candidate = {
        arrivalMin,
        tasks: candidateTasks,
        conflictCount,
        overlapMin,
        endMin: candidateEndMin,
      };
      if (
        !best ||
        candidate.overlapMin < best.overlapMin ||
        (candidate.overlapMin === best.overlapMin && candidate.conflictCount < best.conflictCount) ||
        (candidate.overlapMin === best.overlapMin &&
          candidate.conflictCount === best.conflictCount &&
          candidate.endMin < best.endMin) ||
        (candidate.overlapMin === best.overlapMin &&
          candidate.conflictCount === best.conflictCount &&
          candidate.endMin === best.endMin &&
          candidate.arrivalMin < best.arrivalMin)
      ) {
        best = candidate;
      }
    }

    if (!best) {
      unscheduledSubjectIds.push(subjectId);
      continue;
    }

    plannedTasks = [...plannedTasks, ...best.tasks];
    assignments.push({
      subjectId,
      arrivalMin: best.arrivalMin,
      newConflictCount: best.conflictCount,
      newOverlapMin: best.overlapMin,
    });
  }

  return { assignments, tasks: plannedTasks, unscheduledSubjectIds };
}
