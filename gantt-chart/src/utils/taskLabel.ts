import type { Task, VisitPoint } from '../types';
import { formatMinuteRange } from './time';

/** 条内可完整显示环节内容的最小像素宽度 */
export const TASK_LABEL_INSIDE_MIN_PX = 100;

/** 极短环节仍保留可点击/可拖拽的最小条宽 */
export const TASK_BAR_MIN_PX = 10;

export type TaskLabelMode = 'stacked';

export type TaskLabelLayout = {
  mode: TaskLabelMode;
};

export type TaskGeometry = {
  task: Task;
  leftPx: number;
  widthPx: number;
};

const VISIT_POINT_BAR_LABELS: Record<VisitPoint, string> = {
  BL: 'BL',
  Immediate: '即刻',
  '30min': '30分钟',
  '1h': '1小时',
  Other: '其他',
};

const CONTENT_PREFIX_PATTERNS = [
  /^BL\s+/i,
  /^即刻\s*/,
  /^30min\s+/i,
  /^30分钟\s*/,
  /^1h\s+/i,
  /^1小时\s*/,
];

export function shouldShowOutsideLabel(_widthPx: number): boolean {
  return true;
}

export function getTaskBarDisplayWidth(widthPx: number): number {
  return Math.max(widthPx, TASK_BAR_MIN_PX);
}

/** 上条：时间节点。无访视点时从名称推断，再没有则显示 — */
export function getVisitPointHeaderLabel(task: Task): string {
  if (task.visitPoint) {
    return VISIT_POINT_BAR_LABELS[task.visitPoint];
  }
  const name = task.name.trim();
  if (/^BL\b/i.test(name)) return 'BL';
  if (/^即刻/.test(name)) return '即刻';
  if (/^30\s*min/i.test(name) || /^30分钟/.test(name)) return '30分钟';
  if (/^1\s*h\b/i.test(name) || /^1小时/.test(name)) return '1小时';
  return '—';
}

/** @deprecated 与 getVisitPointHeaderLabel 相同，保留给旧调用 */
export function getVisitPointBarLabel(task: Task): string {
  return getVisitPointHeaderLabel(task);
}

/** 去掉名称中的访视点前缀，仅保留项目内容 */
export function getTaskContentLabel(task: Task): string {
  let name = task.name.trim();
  for (const pattern of CONTENT_PREFIX_PATTERNS) {
    if (pattern.test(name)) {
      const stripped = name.replace(pattern, '').trim();
      return stripped || task.name;
    }
  }
  return name;
}

/** 全部环节统一上下两层：上时间节点、下具体内容 */
export function computeTaskLabelLayouts(
  geometries: TaskGeometry[]
): Map<string, TaskLabelLayout> {
  const result = new Map<string, TaskLabelLayout>();
  for (const { task } of geometries) {
    result.set(task.id, { mode: 'stacked' });
  }
  return result;
}

export function buildTaskTooltipLines(task: Task): string[] {
  const lines = [
    `${task.subjectId} · ${task.name}`,
    `${formatMinuteRange(task.startMin, task.endMin)}（${task.durationMin} 分钟）`,
  ];
  const visitLabel = getVisitPointHeaderLabel(task);
  if (visitLabel !== '—') {
    lines.push(`时间节点 ${visitLabel}`);
  }
  if (task.resourceIds.length > 0) {
    lines.push(`资源 ${task.resourceIds.join(', ')}`);
  }
  return lines;
}