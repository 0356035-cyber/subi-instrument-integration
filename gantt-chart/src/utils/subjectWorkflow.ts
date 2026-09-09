import type { Subject, Task, WorkflowStepTemplate } from '../types';
import { getTaskDisplayColor } from './taskType';
import { normalizeStepOrders, relinkSequentialDependencies } from './workflow';

function remapTaskId(taskId: string | undefined, newSubjectId: string): string | undefined {
  if (!taskId) return undefined;
  const dash = taskId.indexOf('-');
  if (dash === -1) return `${newSubjectId}-${taskId}`;
  return `${newSubjectId}-${taskId.slice(dash + 1)}`;
}

/** 按到场时间差平移，复制一名受试者当前甘特图上的环节时间结构。 */
export function cloneSubjectTimeline(
  sourceTasks: Task[],
  sourceArrivalMin: number,
  newSubjectId: string,
  newArrivalMin: number
): Task[] {
  const delta = newArrivalMin - sourceArrivalMin;
  return [...sourceTasks]
    .sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin)
    .map((task) => ({
      ...task,
      id: `${newSubjectId}-${task.workflowStepId}`,
      subjectId: newSubjectId,
      startMin: task.startMin + delta,
      endMin: task.endMin + delta,
      dependencyTaskId: remapTaskId(task.dependencyTaskId, newSubjectId),
      anchorTaskId: remapTaskId(task.anchorTaskId, newSubjectId),
      status: 'planned',
      locked: false,
    }));
}

function roundMin(value: number): number {
  return Math.round(value);
}

/**
 * 从一名受试者当前任务反推项目流程模板：
 * 顺序按实际开始时间，耗时/资源按实际任务，锚点偏移按实际时间差重算。
 */
export function inferWorkflowFromSubjectTasks(
  sourceTasks: Task[],
  existingSteps: WorkflowStepTemplate[]
): WorkflowStepTemplate[] {
  const orderedTasks = [...sourceTasks].sort(
    (a, b) => a.startMin - b.startMin || a.endMin - b.endMin
  );
  const existingById = new Map(existingSteps.map((step) => [step.id, step]));
  const taskByStepId = new Map(orderedTasks.map((task) => [task.workflowStepId, task]));

  const inferred = orderedTasks.map((task, index) => {
    const prev = existingById.get(task.workflowStepId);
    const scheduling = prev?.scheduling ?? 'sequential';
    let anchorStepId = prev?.anchorStepId;
    let targetOffsetMin = prev?.targetOffsetMin;
    const anchorTask = anchorStepId ? taskByStepId.get(anchorStepId) : undefined;

    if (
      (scheduling === 'anchor_offset' || scheduling === 'elastic_fill') &&
      anchorTask
    ) {
      targetOffsetMin =
        scheduling === 'elastic_fill'
          ? roundMin(task.endMin - anchorTask.endMin)
          : roundMin(task.startMin - anchorTask.endMin);
    } else if (scheduling === 'sequential') {
      anchorStepId = undefined;
      targetOffsetMin = undefined;
    }

    const durationMin =
      scheduling === 'elastic_fill'
        ? 0
        : Math.max(1, roundMin(task.durationMin));

    return {
      id: task.workflowStepId || `step-${index + 1}`,
      order: index,
      name: task.name,
      taskType: task.taskType,
      visitPoint: task.visitPoint ?? prev?.visitPoint,
      resourceIds: [...task.resourceIds],
      durationMin,
      color: task.color || prev?.color || getTaskDisplayColor(task.taskType),
      scheduling,
      dependsOnStepId: prev?.dependsOnStepId,
      anchorStepId,
      targetOffsetMin,
      windowBeforeMin: task.windowBeforeMin ?? prev?.windowBeforeMin,
      windowAfterMin: task.windowAfterMin ?? prev?.windowAfterMin,
    } satisfies WorkflowStepTemplate;
  });

  return relinkSequentialDependencies(normalizeStepOrders(inferred));
}

export function canCopySubjectWorkflow(
  source: Subject | undefined,
  sourceTasks: Task[]
): boolean {
  return Boolean(source && sourceTasks.length > 0);
}
