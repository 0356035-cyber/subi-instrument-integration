import type { Resource, Subject, Task } from '../types';
import { formatMinuteRange, minutesToHHmm } from './time';

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

/** P1 功能：CSV 导出 */
export function exportScheduleToCSV(
  tasks: Task[],
  subjects: Subject[],
  resources: Resource[],
  filename = 'schedule.csv'
): void {
  const rows = buildExportRows(tasks, subjects, resources);
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

  const blob = new Blob(['\uFEFF' + csvContent], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}