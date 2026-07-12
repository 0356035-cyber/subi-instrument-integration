import type {
  Project,
  Resource,
  ScheduleSettings,
  Subject,
  Task,
} from '../types';

export const PERSISTENCE_VERSION = 1;
export const STORAGE_KEY = 'clinical-gantt-schedule-v1';

export type PersistedScheduleState = {
  version: number;
  projects: Project[];
  subjects: Subject[];
  resources: Resource[];
  tasks: Task[];
  settings: ScheduleSettings;
};

export type ScheduleDomainState = Omit<PersistedScheduleState, 'version'>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function hasArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

export function serializePersistedState(state: ScheduleDomainState): PersistedScheduleState {
  return {
    version: PERSISTENCE_VERSION,
    projects: state.projects,
    subjects: state.subjects,
    resources: state.resources,
    tasks: state.tasks,
    settings: state.settings,
  };
}

export function deserializePersistedSchedule(
  raw: unknown
): PersistedScheduleState | null {
  if (!isRecord(raw)) return null;
  if (raw.version !== PERSISTENCE_VERSION) return null;
  if (
    !hasArray(raw.projects) ||
    !hasArray(raw.subjects) ||
    !hasArray(raw.resources) ||
    !hasArray(raw.tasks) ||
    !isRecord(raw.settings)
  ) {
    return null;
  }

  const settings = raw.settings as ScheduleSettings;
  if (
    typeof settings.visitDate !== 'string' ||
    typeof settings.activeProjectId !== 'string' ||
    typeof settings.viewStartMin !== 'number' ||
    typeof settings.viewEndMin !== 'number'
  ) {
    return null;
  }

  return {
    version: PERSISTENCE_VERSION,
    projects: raw.projects as Project[],
    subjects: raw.subjects as Subject[],
    resources: raw.resources as Resource[],
    tasks: raw.tasks as Task[],
    settings,
  };
}

export function buildScheduleExportFilename(
  visitDate: string,
  projectName: string,
  extension: 'csv' | 'json'
): string {
  const safeDate = visitDate.replace(/[^\d-]/g, '') || 'schedule';
  const safeProject = projectName.replace(/[\\/:*?"<>|]/g, '_').trim() || 'project';
  return `${safeProject}-${safeDate}.${extension}`;
}