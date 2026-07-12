import { create } from 'zustand';
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
import { createSubject, generateNextSubjectId } from '../utils/subjectFactory';
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
  resetSampleData: () => void;
};

function revalidate(
  tasks: Task[],
  resources: Resource[]
): Pick<ScheduleState, 'conflicts' | 'taskRiskMap'> {
  const conflicts = runP0Validations(tasks, resources);
  const taskRiskMap = buildTaskRiskMap(conflicts);
  return { conflicts, taskRiskMap };
}

const initial = getInitialState();
const initialValidation = revalidate(initial.tasks, initial.resources);

export const useScheduleStore = create<ScheduleState>()((set, get) => ({
  projects: initial.projects,
  subjects: initial.subjects,
  resources: initial.resources,
  tasks: initial.tasks,
  settings: initial.settings,
  conflicts: initialValidation.conflicts,
  taskRiskMap: initialValidation.taskRiskMap,
  selectedTaskId: null,
  editingProjectId: null,
  editingSubjectId: null,
  resourceManagerOpen: false,
  highlightedTaskIds: new Set(),

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

  resetSampleData: () => {
    const fresh = getInitialState();
    const validation = revalidate(fresh.tasks, fresh.resources);
    set({
      projects: fresh.projects,
      subjects: fresh.subjects,
      resources: fresh.resources,
      tasks: fresh.tasks,
      settings: fresh.settings,
      selectedTaskId: null,
      editingProjectId: null,
      editingSubjectId: null,
      resourceManagerOpen: false,
      highlightedTaskIds: new Set(),
      ...validation,
    });
  },
}));