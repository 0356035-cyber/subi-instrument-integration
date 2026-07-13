import { Model, sum } from '@bubblyworld/highs-ts';
import type { Resource, Task, WorkflowStepTemplate } from '../types';
import { buildTasksFromWorkflow } from './workflow';

export type ExactOptimizationResult = {
  status: 'optimal' | 'infeasible' | 'error';
  assignments: { subjectId: string; arrivalMin: number }[];
  tasks: Task[];
  overloadMinutes: number;
};

type Candidate = { subjectId: string; arrivalMin: number; tasks: Task[] };

/**
 * 精确 MILP：所有受试者同时选择一个离散到场时间。
 * 在给定候选粒度和分钟级资源容量模型下，`optimal` 表示已证明全局最优。
 */
export async function solveExactSchedule(
  fixedTasks: Task[],
  workflow: WorkflowStepTemplate[],
  resources: Resource[],
  options: { subjectIds: string[]; startMin: number; endMin: number; stepMin: number }
): Promise<ExactOptimizationResult> {
  const activeResources = resources.filter((resource) => resource.active);
  const resourceById = new Map(resources.map((resource) => [resource.id, resource]));
  const candidatesBySubject = new Map<string, Candidate[]>();
  for (const subjectId of options.subjectIds) {
    const candidates: Candidate[] = [];
    for (let arrivalMin = options.startMin; arrivalMin <= options.endMin; arrivalMin += options.stepMin) {
      const tasks = buildTasksFromWorkflow(subjectId, arrivalMin, workflow);
      const withinAvailability = tasks.every((task) => task.resourceIds.every((resourceId) => {
        const resource = resourceById.get(resourceId);
        return resource == null || (
          (resource.availableStartMin == null || task.startMin >= resource.availableStartMin) &&
          (resource.availableEndMin == null || task.endMin <= resource.availableEndMin)
        );
      }));
      if (Math.max(arrivalMin, ...tasks.map((task) => task.endMin)) <= options.endMin && withinAvailability) {
        candidates.push({ subjectId, arrivalMin, tasks });
      }
    }
    if (candidates.length === 0) return { status: 'infeasible', assignments: [], tasks: fixedTasks, overloadMinutes: 0 };
    candidatesBySubject.set(subjectId, candidates);
  }

  const model = new Model();
  const candidateVars = new Map<Candidate, ReturnType<Model['boolVar']>>();
  const allCandidates = [...candidatesBySubject.values()].flat();
  for (const [index, candidate] of allCandidates.entries()) {
    candidateVars.set(candidate, model.boolVar(`arrival_${index}`));
  }
  for (const candidates of candidatesBySubject.values()) {
    model.addExactly(1, ...candidates.map((candidate) => candidateVars.get(candidate)!));
  }

  const fixedUsage = new Map<string, number>();
  const candidateUsage = new Map<Candidate, Set<string>>();
  const occupancy = (tasks: Task[]) => {
    const result = new Set<string>();
    for (const task of tasks) for (const resourceId of task.resourceIds) {
      if (!activeResources.some((resource) => resource.id === resourceId)) continue;
      for (let minute = task.startMin; minute < task.endMin; minute += 1) result.add(`${resourceId}:${minute}`);
    }
    return result;
  };
  for (const key of occupancy(fixedTasks)) fixedUsage.set(key, (fixedUsage.get(key) ?? 0) + 1);
  for (const candidate of allCandidates) candidateUsage.set(candidate, occupancy(candidate.tasks));

  const overloadVars: ReturnType<Model['numVar']>[] = [];
  for (const resource of activeResources) for (let minute = options.startMin; minute < options.endMin; minute += 1) {
    const key = `${resource.id}:${minute}`;
    const occupying = allCandidates.filter((candidate) => candidateUsage.get(candidate)!.has(key));
    const fixed = fixedUsage.get(key) ?? 0;
    if (occupying.length === 0 && fixed <= resource.capacity) continue;
    const overflow = model.numVar(0, options.subjectIds.length + fixed, `overflow_${resource.id}_${minute}`);
    overloadVars.push(overflow);
    model.addConstraint(sum(...occupying.map((candidate) => candidateVars.get(candidate)!), overflow.neg()).leq(resource.capacity - fixed));
  }

  // 一个超容量分钟的权重高于任意到场时间总和，形成严格的词典序目标。
  const overloadWeight = options.subjectIds.length * 1440 + 1;
  const objective = sum(
    ...overloadVars.map((variable) => variable.times(overloadWeight)),
    ...allCandidates.map((candidate) => candidateVars.get(candidate)!.times(candidate.arrivalMin))
  );
  model.minimize(objective);
  const solution = await model.solve();
  if (solution.status !== 'optimal') return { status: solution.status === 'infeasible' ? 'infeasible' : 'error', assignments: [], tasks: fixedTasks, overloadMinutes: 0 };

  const chosen = allCandidates.filter((candidate) => (solution.getValue(candidateVars.get(candidate)!) ?? 0) > 0.5);
  return {
    status: 'optimal',
    assignments: chosen.map((candidate) => ({ subjectId: candidate.subjectId, arrivalMin: candidate.arrivalMin })),
    tasks: [...fixedTasks, ...chosen.flatMap((candidate) => candidate.tasks)],
    overloadMinutes: overloadVars.reduce((total, variable) => total + Math.round(solution.getValue(variable) ?? 0), 0),
  };
}
