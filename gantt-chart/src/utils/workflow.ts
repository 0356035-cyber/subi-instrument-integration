import type {
  Project,
  Subject,
  Task,
  WorkflowStepTemplate,
} from '../types';

function sortedSteps(workflow: WorkflowStepTemplate[]): WorkflowStepTemplate[] {
  return [...workflow].sort((a, b) => a.order - b.order);
}

/** 根据项目流程模板 + 受试者到场时间生成任务实例 */
export function buildTasksFromWorkflow(
  subjectId: string,
  arrivalMin: number,
  workflow: WorkflowStepTemplate[]
): Task[] {
  const steps = sortedSteps(workflow);
  const tasks: Task[] = [];
  const byStepId = new Map<string, Task>();
  let cursor = arrivalMin;

  for (const step of steps) {
    let startMin: number;
    let endMin: number;
    let durationMin = step.durationMin;
    const anchor = step.anchorStepId
      ? byStepId.get(step.anchorStepId)
      : undefined;

    if (step.scheduling === 'anchor_offset' && anchor) {
      startMin = anchor.endMin + (step.targetOffsetMin ?? 0);
      endMin = startMin + durationMin;
    } else if (step.scheduling === 'elastic_fill' && anchor) {
      startMin = cursor;
      endMin = anchor.endMin + (step.targetOffsetMin ?? 0);
      durationMin = Math.max(0, endMin - startMin);
    } else {
      startMin = cursor;
      endMin = startMin + durationMin;
    }

    const depTask = step.dependsOnStepId
      ? byStepId.get(step.dependsOnStepId)
      : undefined;

    const task: Task = {
      id: `${subjectId}-${step.id}`,
      subjectId,
      workflowStepId: step.id,
      name: step.name,
      taskType: step.taskType,
      visitPoint: step.visitPoint,
      resourceIds: [...step.resourceIds],
      startMin,
      endMin,
      durationMin,
      dependencyTaskId: depTask?.id,
      anchorTaskId: anchor?.id,
      targetOffsetMin: step.targetOffsetMin,
      windowBeforeMin: step.windowBeforeMin,
      windowAfterMin: step.windowAfterMin,
      isElastic: step.scheduling === 'elastic_fill',
      movable: true,
      status: 'planned',
      color: step.color,
    };

    tasks.push(task);
    byStepId.set(step.id, task);
    cursor = endMin;
  }

  return tasks;
}

export function buildAllSubjectTasks(
  subjects: Subject[],
  project: Project
): Task[] {
  return subjects
    .filter((s) => s.projectId === project.id)
    .flatMap((s) =>
      buildTasksFromWorkflow(s.id, s.arrivalMin, project.workflowSteps)
    );
}

export function rebuildProjectTasks(
  subjects: Subject[],
  tasks: Task[],
  project: Project
): Task[] {
  const others = tasks.filter((t) => {
    const sub = subjects.find((s) => s.id === t.subjectId);
    return sub?.projectId !== project.id;
  });
  const regenerated = buildAllSubjectTasks(subjects, project);
  return [...others, ...regenerated];
}

export function createDefaultStep(order: number): WorkflowStepTemplate {
  const id = `step-${Date.now()}`;
  return {
    id,
    order,
    name: '新环节',
    taskType: '自定义环节',
    visitPoint: 'Other',
    resourceIds: ['Operator_A'],
    durationMin: 5,
    color: '#8c8c8c',
    scheduling: 'sequential',
  };
}

export function normalizeStepOrders(
  steps: WorkflowStepTemplate[]
): WorkflowStepTemplate[] {
  return sortedSteps(steps).map((s, i) => ({ ...s, order: i }));
}