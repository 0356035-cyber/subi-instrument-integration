import type { Resource, Subject, Task } from '../types';
import {
  buildScheduleExportFilename,
  deserializePersistedSchedule,
  serializePersistedState,
  type PersistedScheduleState,
  type ScheduleDomainState,
} from './persistence';
import { formatMinuteRange, minutesToHHmm } from './time';

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function buildExportRows(
  tasks: Task[],
  subjects: Subject[],
  resources: Resource[]
) {
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));
  const resourceMap = new Map(resources.map((r) => [r.id, r]));

  return tasks
    .slice()
    .sort(
      (a, b) =>
        a.subjectId.localeCompare(b.subjectId) || a.startMin - b.startMin
    )
    .map((task) => ({
      subjectId: task.subjectId,
      subjectName: subjectMap.get(task.subjectId)?.name ?? '',
      taskName: task.name,
      visitPoint: task.visitPoint ?? '',
      taskType: task.taskType,
      resourceIds: task.resourceIds.join(';'),
      resourceNames: task.resourceIds
        .map((id) => resourceMap.get(id)?.name ?? id)
        .join(';'),
      startTime: minutesToHHmm(task.startMin),
      endTime: minutesToHHmm(task.endMin),
      timeRange: formatMinuteRange(task.startMin, task.endMin),
      durationMin: task.durationMin,
      status: task.status ?? 'planned',
    }));
}

export function exportScheduleToCSV(
  state: ScheduleDomainState,
  filename?: string
): void {
  const rows = buildExportRows(state.tasks, state.subjects, state.resources);
  const headers = Object.keys(rows[0] ?? {});

  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const val = String((row as Record<string, unknown>)[h] ?? '');
          return val.includes(',') ? `"${val.replace(/"/g, '""')}"` : val;
        })
        .join(',')
    ),
  ].join('\n');

  const projectName =
    state.projects.find((p) => p.id === state.settings.activeProjectId)?.name ??
    'schedule';
  const blob = new Blob(['\uFEFF' + csvContent], {
    type: 'text/csv;charset=utf-8;',
  });
  downloadBlob(
    blob,
    filename ??
      buildScheduleExportFilename(
        state.settings.visitDate,
        projectName,
        'csv'
      )
  );
}

export function exportScheduleToJSON(
  state: ScheduleDomainState,
  filename?: string
): void {
  const payload = serializePersistedState(state);
  const projectName =
    state.projects.find((p) => p.id === state.settings.activeProjectId)?.name ??
    'schedule';
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8;',
  });
  downloadBlob(
    blob,
    filename ??
      buildScheduleExportFilename(
        state.settings.visitDate,
        projectName,
        'json'
      )
  );
}

export function parseScheduleJSON(text: string): PersistedScheduleState | null {
  try {
    const raw = JSON.parse(text) as unknown;
    return deserializePersistedSchedule(raw);
  } catch {
    return null;
  }
}