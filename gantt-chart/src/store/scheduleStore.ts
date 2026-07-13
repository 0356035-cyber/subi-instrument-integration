import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { getInitialState } from '../data/sampleData';
import type {
  Conflict,
  Project,
  Resource,
  ScheduleSettings,
  Subject,
  Task,
  TaskRiskState,
  WorkflowStepTemplate,
} from '../types';
import { buildTaskRiskMap, runP0Validations } from '../utils/conflicts';
import { updateTaskTime } from '../utils/drag';
import {
  deserializePersistedSchedule,
  serializePersistedState,
  STORAGE_KEY,
  type PersistedScheduleState,
} from '../utils/persistence';
import { createSubject, generateNextSubjectId } from '../utils/subjectFactory';
import { planBatchSchedule, type AutoSchedulePlan } from '../utils/autoSchedule';
import { solveExactSchedule } from '../utils/exactOptimizer';
import {
  buildTasksFromWorkflow,
  normalizeStepOrders,
  rebuildProjectTasks,
} from '../utils/workflow';

type ScheduleState = {
  projects: Project[];
  subjects: Subject[];
  resources: Resource[];
  tasks: Task[];
  settings: ScheduleSettings;
  conflicts: Conflict[];
  taskRiskMap: Map<string, TaskRiskState>;
  selectedTaskId: string | null;
  editingProjectId: string | null;
  editingSubjectId: string | null;
  resourceManagerOpen: boolean;
  highlightedTaskIds: Set<string>;
  setSettings: (partial: Partial<ScheduleSettings>) => void;
  moveTask: (taskId: string, newStartMin: number) => void;
  moveSubjectWhole: (subjectId: string, deltaMin: number) => void;
  addSubject: (
    name: string | undefined,
    arrivalMin: number,
    projectId: string
  ) => void;
  previewOptimizedSubjects: (
    count: number,
    startMin: number,
    endMin: number,
    stepMin: number,
    projectId: string
  ) => OptimizedSubjectPlan | null;
  commitOptimizedSubjects: (candidate: OptimizedSubjectPlan) => void;
  previewRescheduleScheduledSubjects: (
    startMin: number,
    endMin: number,
    stepMin: number,
    projectId: string
  ) => OptimizedReschedulePlan | null;
  commitRescheduledSubjects: (candidate: OptimizedReschedulePlan) => void;
  previewExactRescheduleScheduledSubjects: (startMin: number, endMin: number, stepMin: number, projectId: string) => Promise<OptimizedReschedulePlan | null>;
  previewInsertAndExactReschedule: (count: number, startMin: number, endMin: number, stepMin: number, projectId: string) => Promise<OptimizedInsertPlan | null>;
  commitInsertAndExactReschedule: (candidate: OptimizedInsertPlan) => void;
  updateSubject: (
    subjectId: string,
    patch: Partial<Pick<Subject, 'name' | 'arrivalMin' | 'status'>>
  ) => void;
  deleteSubject: (subjectId: string) => void;
  openProjectWorkflowEditor: (projectId?: string) => void;
  closeProjectWorkflowEditor: () => void;
  saveProjectWorkflow: (
    projectId: string,
    steps: WorkflowStepTemplate[]
  ) => void;
  openSubjectEditor: (subjectId: string) => void;
  closeSubjectEditor: () => void;
  openResourceManager: () => void;
  closeResourceManager: () => void;
  saveResources: (
    resources: Resource[],
    idChanges?: Map<string, string>
  ) => void;
  selectTask: (taskId: string | null) => void;
  highlightTasks: (taskIds: string[]) => void;
  clearHighlight: () => void;
  runValidation: () => void;
  importSchedule: (data: PersistedScheduleState) => boolean;
  resetSampleData: () => void;
};

export type OptimizedSubjectPlan = {
  plan: AutoSchedulePlan;
  subjects: Subject[];
};

export type OptimizedReschedulePlan = {
  plan: AutoSchedulePlan;
  subjects: Subject[];
  exact?: true;
  overloadMinutes?: number;
};

export type OptimizedInsertPlan = {
  plan: AutoSchedulePlan;
  updatedSubjects: Subject[];
  newSubjects: Subject[];
  overloadMinutes: number;
};

function revalidate(
  tasks: Task[],
  resources: Resource[]
): Pick<ScheduleState, 'conflicts' | 'taskRiskMap'> {
  const conflicts = runP0Validations(tasks, resources);
  const taskRiskMap = buildTaskRiskMap(conflicts);
  return { conflicts, taskRiskMap };
}

function clearTransientUiState(): Pick<
  ScheduleState,
  | 'selectedTaskId'
  | 'editingProjectId'
  | 'editingSubjectId'
  | 'resourceManagerOpen'
  | 'highlightedTaskIds'
> {
  return {
    selectedTaskId: null,
    editingProjectId: null,
    editingSubjectId: null,
    resourceManagerOpen: false,
    highlightedTaskIds: new Set(),
  };
}

function applyDomainState(
  domain: Omit<PersistedScheduleState, 'version'>
): Pick<
  ScheduleState,
  | 'projects'
  | 'subjects'
  | 'resources'
  | 'tasks'
  | 'settings'
  | 'conflicts'
  | 'taskRiskMap'
> {
  const validation = revalidate(domain.tasks, domain.resources);
  return {
    projects: domain.projects,
    subjects: domain.subjects,
    resources: domain.resources,
    tasks: domain.tasks,
    settings: domain.settings,
    ...validation,
  };
}

const seed = getInitialState();
const seedValidation = revalidate(seed.tasks, seed.resources);

export const useScheduleStore = create<ScheduleState>()(
  persist(
    (set, get) => ({
      projects: seed.projects,
      subjects: seed.subjects,
      resources: seed.resources,
      tasks: seed.tasks,
      settings: seed.settings,
      conflicts: seedValidation.conflicts,
      taskRiskMap: seedValidation.taskRiskMap,
      ...clearTransientUiState(),

      setSettings: (partial) => {
        set((state) => {
          const next = { ...state.settings, ...partial };
          if (
            next.viewEndMin != null &&
            next.viewStartMin != null &&
            next.viewEndMin <= next.viewStartMin
          ) {
            return state;
          }
          return { settings: next };
        });
      },

      moveTask: (taskId, newStartMin) => {
        const { tasks, settings, resources } = get();
        const updated = updateTaskTime(taskId, newStartMin, tasks, settings);
        const validation = revalidate(updated, resources);
        set({ tasks: updated, ...validation });
      },

      moveSubjectWhole: (subjectId, deltaMin) => {
        const { tasks, settings, resources } = get();
        const firstTask = tasks
          .filter((t) => t.subjectId === subjectId)
          .sort((a, b) => a.startMin - b.startMin)[0];
        if (!firstTask) return;
        const wholeSettings = { ...settings, dragMode: 'whole_subject' as const };
        const updated = updateTaskTime(
          firstTask.id,
          firstTask.startMin + deltaMin,
          tasks,
          wholeSettings
        );
        const validation = revalidate(updated, resources);
        set({ tasks: updated, ...validation });
      },

      addSubject: (name, arrivalMin, projectId) => {
        const { subjects, tasks, resources, settings, projects } = get();
        const project = projects.find((p) => p.id === projectId);
        if (!project) return;

        const id = generateNextSubjectId(subjects);
        const subject = createSubject(
          id,
          arrivalMin,
          settings.visitDate,
          projectId,
          name
        );
        const newTasks = buildTasksFromWorkflow(
          id,
          arrivalMin,
          project.workflowSteps
        );
        const updatedTasks = [...tasks, ...newTasks];
        const validation = revalidate(updatedTasks, resources);
        set({
          subjects: [...subjects, subject],
          tasks: updatedTasks,
          ...validation,
        });
      },

      previewOptimizedSubjects: (count, startMin, endMin, stepMin, projectId) => {
        const { subjects, tasks, resources, settings, projects } = get();
        const project = projects.find((item) => item.id === projectId);
        const safeCount = Math.floor(count);
        if (!project || safeCount < 1 || endMin <= startMin) return null;

        const plannedSubjects = [...subjects];
        const subjectIds: string[] = [];
        for (let index = 0; index < safeCount; index += 1) {
          const id = generateNextSubjectId(plannedSubjects);
          subjectIds.push(id);
          plannedSubjects.push(createSubject(id, startMin, settings.visitDate, projectId));
        }

        const plan = planBatchSchedule(tasks, project.workflowSteps, resources, {
          subjectIds,
          startMin,
          endMin,
          stepMin,
        });
        if (plan.unscheduledSubjectIds.length > 0) {
          return { plan, subjects: [] };
        }

        const addedSubjects = plan.assignments.map((assignment) =>
          createSubject(assignment.subjectId, assignment.arrivalMin, settings.visitDate, projectId)
        );
        return { plan, subjects: addedSubjects };
      },

      commitOptimizedSubjects: (candidate) => {
        const { resources } = get();
        const validation = revalidate(candidate.plan.tasks, resources);
        set({
          subjects: [...get().subjects, ...candidate.subjects],
          tasks: candidate.plan.tasks,
          ...validation,
        });
      },

      previewRescheduleScheduledSubjects: (startMin, endMin, stepMin, projectId) => {
        const { subjects, tasks, resources, projects } = get();
        const project = projects.find((item) => item.id === projectId);
        if (!project || endMin <= startMin) return null;

        // 已到场、已完成、已取消受试者视为锁定，不参与重新排程。
        const targets = subjects.filter(
          (subject) => subject.projectId === projectId && subject.status === 'scheduled'
        );
        if (targets.length === 0) return null;
        const targetIds = new Set(targets.map((subject) => subject.id));
        const fixedTasks = tasks.filter((task) => !targetIds.has(task.subjectId));
        const plan = planBatchSchedule(fixedTasks, project.workflowSteps, resources, {
          subjectIds: targets.map((subject) => subject.id),
          startMin,
          endMin,
          stepMin,
        });
        if (plan.unscheduledSubjectIds.length > 0) return { plan, subjects: [] };

        const arrivalBySubjectId = new Map(
          plan.assignments.map((assignment) => [assignment.subjectId, assignment.arrivalMin])
        );
        return {
          plan,
          subjects: targets.map((subject) => ({
            ...subject,
            arrivalMin: arrivalBySubjectId.get(subject.id) ?? subject.arrivalMin,
          })),
        };
      },

      previewExactRescheduleScheduledSubjects: async (startMin, endMin, stepMin, projectId) => {
        const { subjects, tasks, resources, projects } = get();
        const project = projects.find((item) => item.id === projectId);
        const targets = subjects.filter((subject) => subject.projectId === projectId && subject.status === 'scheduled');
        if (!project || targets.length === 0 || endMin <= startMin) return null;
        const targetIds = new Set(targets.map((subject) => subject.id));
        const result = await solveExactSchedule(tasks.filter((task) => !targetIds.has(task.subjectId)), project.workflowSteps, resources, {
          subjectIds: targets.map((subject) => subject.id), startMin, endMin, stepMin,
        });
        if (result.status !== 'optimal') return null;
        const arrivalById = new Map(result.assignments.map((assignment) => [assignment.subjectId, assignment.arrivalMin]));
        return {
          exact: true,
          overloadMinutes: result.overloadMinutes,
          plan: { assignments: result.assignments.map((assignment) => ({ ...assignment, newConflictCount: 0, newOverlapMin: 0 })), tasks: result.tasks, unscheduledSubjectIds: [] },
          subjects: targets.map((subject) => ({ ...subject, arrivalMin: arrivalById.get(subject.id) ?? subject.arrivalMin })),
        };
      },

      previewInsertAndExactReschedule: async (count, startMin, endMin, stepMin, projectId) => {
        const { subjects, tasks, resources, projects, settings } = get();
        const project = projects.find((item) => item.id === projectId);
        const safeCount = Math.floor(count);
        if (!project || safeCount < 1 || endMin <= startMin) return null;
        const scheduled = subjects.filter((subject) => subject.projectId === projectId && subject.status === 'scheduled');
        const idsForGeneration = [...subjects];
        const newIds: string[] = [];
        for (let index = 0; index < safeCount; index += 1) {
          const id = generateNextSubjectId(idsForGeneration);
          newIds.push(id);
          idsForGeneration.push(createSubject(id, startMin, settings.visitDate, projectId));
        }
        const movableIds = new Set([...scheduled.map((subject) => subject.id), ...newIds]);
        const result = await solveExactSchedule(tasks.filter((task) => !movableIds.has(task.subjectId)), project.workflowSteps, resources, {
          subjectIds: [...scheduled.map((subject) => subject.id), ...newIds], startMin, endMin, stepMin,
        });
        if (result.status !== 'optimal') return null;
        const arrivalById = new Map(result.assignments.map((assignment) => [assignment.subjectId, assignment.arrivalMin]));
        return {
          plan: { assignments: result.assignments.map((assignment) => ({ ...assignment, newConflictCount: 0, newOverlapMin: 0 })), tasks: result.tasks, unscheduledSubjectIds: [] },
          updatedSubjects: scheduled.map((subject) => ({ ...subject, arrivalMin: arrivalById.get(subject.id) ?? subject.arrivalMin })),
          newSubjects: newIds.map((id) => createSubject(id, arrivalById.get(id) ?? startMin, settings.visitDate, projectId)),
          overloadMinutes: result.overloadMinutes,
        };
      },

      commitInsertAndExactReschedule: (candidate) => {
        const { subjects, resources } = get();
        const replacements = new Map(candidate.updatedSubjects.map((subject) => [subject.id, subject]));
        const validation = revalidate(candidate.plan.tasks, resources);
        set({
          subjects: [...subjects.map((subject) => replacements.get(subject.id) ?? subject), ...candidate.newSubjects],
          tasks: candidate.plan.tasks,
          ...validation,
        });
      },

      commitRescheduledSubjects: (candidate) => {
        const { subjects, resources } = get();
        const replacementById = new Map(candidate.subjects.map((subject) => [subject.id, subject]));
        const validation = revalidate(candidate.plan.tasks, resources);
        set({
          subjects: subjects.map((subject) => replacementById.get(subject.id) ?? subject),
          tasks: candidate.plan.tasks,
          ...validation,
        });
      },

      updateSubject: (subjectId, patch) => {
        const { subjects, tasks, resources, projects } = get();
        const idx = subjects.findIndex((s) => s.id === subjectId);
        if (idx === -1) return;

        const prev = subjects[idx];
        const next = { ...prev, ...patch };
        const updatedSubjects = [...subjects];
        updatedSubjects[idx] = next;

        let updatedTasks = tasks;
        if (patch.arrivalMin != null && patch.arrivalMin !== prev.arrivalMin) {
          const project = projects.find((p) => p.id === next.projectId);
          if (project) {
            const others = tasks.filter((t) => t.subjectId !== subjectId);
            const regen = buildTasksFromWorkflow(
              subjectId,
              patch.arrivalMin,
              project.workflowSteps
            );
            updatedTasks = [...others, ...regen];
          }
        }

        const validation = revalidate(updatedTasks, resources);
        set({
          subjects: updatedSubjects,
          tasks: updatedTasks,
          ...validation,
        });
      },

      deleteSubject: (subjectId) => {
        const {
          subjects,
          tasks,
          resources,
          selectedTaskId,
          editingSubjectId,
          highlightedTaskIds,
        } = get();
        if (!subjects.some((s) => s.id === subjectId)) return;

        const removedTaskIds = new Set(
          tasks.filter((t) => t.subjectId === subjectId).map((t) => t.id)
        );
        const updatedSubjects = subjects.filter((s) => s.id !== subjectId);
        const updatedTasks = tasks.filter((t) => t.subjectId !== subjectId);
        const validation = revalidate(updatedTasks, resources);

        const nextHighlighted = new Set(highlightedTaskIds);
        for (const taskId of removedTaskIds) {
          nextHighlighted.delete(taskId);
        }

        set({
          subjects: updatedSubjects,
          tasks: updatedTasks,
          selectedTaskId:
            selectedTaskId && removedTaskIds.has(selectedTaskId)
              ? null
              : selectedTaskId,
          editingSubjectId:
            editingSubjectId === subjectId ? null : editingSubjectId,
          highlightedTaskIds: nextHighlighted,
          ...validation,
        });
      },

      openProjectWorkflowEditor: (projectId) => {
        const id = projectId ?? get().settings.activeProjectId;
        set({ editingProjectId: id, editingSubjectId: null });
      },

      closeProjectWorkflowEditor: () => set({ editingProjectId: null }),

      saveProjectWorkflow: (projectId, steps) => {
        const { projects, subjects, tasks, resources } = get();
        const normalized = normalizeStepOrders(steps);
        const updatedProjects = projects.map((p) =>
          p.id === projectId ? { ...p, workflowSteps: normalized } : p
        );
        const project = updatedProjects.find((p) => p.id === projectId)!;
        const updatedTasks = rebuildProjectTasks(subjects, tasks, project);
        const validation = revalidate(updatedTasks, resources);
        set({
          projects: updatedProjects,
          tasks: updatedTasks,
          editingProjectId: null,
          ...validation,
        });
      },

      openSubjectEditor: (subjectId) =>
        set({ editingSubjectId: subjectId, editingProjectId: null }),

      closeSubjectEditor: () => set({ editingSubjectId: null }),

      openResourceManager: () => set({ resourceManagerOpen: true }),

      closeResourceManager: () => set({ resourceManagerOpen: false }),

      saveResources: (resources, idChanges) => {
        const { projects, subjects, tasks } = get();
        let updatedProjects = projects;

        if (idChanges && idChanges.size > 0) {
          updatedProjects = projects.map((p) => ({
            ...p,
            workflowSteps: p.workflowSteps.map((step) => ({
              ...step,
              resourceIds: step.resourceIds.map((rid) => {
                for (const [oldId, newId] of idChanges) {
                  if (rid === oldId) return newId;
                }
                return rid;
              }),
            })),
          }));
        }

        const activeProject = updatedProjects.find(
          (p) => p.id === get().settings.activeProjectId
        );
        let updatedTasks = tasks;
        if (activeProject) {
          updatedTasks = rebuildProjectTasks(subjects, tasks, activeProject);
        }

        const validation = revalidate(updatedTasks, resources);
        set({
          resources,
          projects: updatedProjects,
          tasks: updatedTasks,
          ...validation,
        });
      },

      selectTask: (taskId) => {
        set({ selectedTaskId: taskId });
      },

      highlightTasks: (taskIds) =>
        set({ highlightedTaskIds: new Set(taskIds) }),

      clearHighlight: () => set({ highlightedTaskIds: new Set() }),

      runValidation: () => {
        const { tasks, resources } = get();
        set(revalidate(tasks, resources));
      },

      importSchedule: (data) => {
        const parsed = deserializePersistedSchedule(data);
        if (!parsed) return false;
        set({
          ...applyDomainState(parsed),
          ...clearTransientUiState(),
        });
        return true;
      },

      resetSampleData: () => {
        const fresh = getInitialState();
        set({
          ...applyDomainState({
            projects: fresh.projects,
            subjects: fresh.subjects,
            resources: fresh.resources,
            tasks: fresh.tasks,
            settings: fresh.settings,
          }),
          ...clearTransientUiState(),
        });
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) =>
        serializePersistedState({
          projects: state.projects,
          subjects: state.subjects,
          resources: state.resources,
          tasks: state.tasks,
          settings: state.settings,
        }),
      merge: (persistedState, currentState) => {
        const parsed = deserializePersistedSchedule(persistedState);
        if (!parsed) {
          return currentState;
        }
        return {
          ...currentState,
          ...applyDomainState(parsed),
          ...clearTransientUiState(),
        };
      },
    }
  )
);
