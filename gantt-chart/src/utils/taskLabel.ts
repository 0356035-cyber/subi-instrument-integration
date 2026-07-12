import type { Task, VisitPoint } from '../types';
import { formatMinuteRange } from './time';

/** 条内可完整显示环节内容的最小像素宽度 */
export const TASK_LABEL_INSIDE_MIN_PX = 100;

/** 极短环节仍保留可点击/可拖拽的最小条宽 */
export const TASK_BAR_MIN_PX = 10;

export type TaskLabelMode = 'inside' | 'above';

export type TaskLabelLayout = {
  mode: TaskLabelMode;
};

export type TaskGeometry = {
  task: Task;
  leftPx: number;
  widthPx: number;
};

const VISIT_POINT_BAR_LABELS: Record<Exclude<VisitPoint, 'Other'>, string> = {
  BL: 'BL',
  Immediate: '即刻',
  '30min': '30分钟',
  '1h': '1小时',
};

const CONTENT_PREFIX_PATTERNS = [
  /^BL\s+/i,
  /^即刻\s*/,
  /^30min\s+/i,
  /^30分钟\s*/,
  /^1h\s+/i,
  /^1小时\s*/,
];

export function shouldShowOutsideLabel(widthPx: number): boolean {
  return widthPx < TASK_LABEL_INSIDE_MIN_PX;
}

export function getTaskBarDisplayWidth(widthPx: number): number {
  return Math.max(widthPx, TASK_BAR_MIN_PX);
}

/** 窄条内：访视点缩写；无访视点时显示环节内容缩写 */
export function getVisitPointBarLabel(task: Task): string {
  if (task.visitPoint && task.visitPoint !== 'Other') {
    return VISIT_POINT_BAR_LABELS[task.visitPoint];
  }
  const content = getTaskContentLabel(task);
  return content.length > 4 ? `${content.slice(0, 3)}…` : content;
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

/** 窄条一律在上方完整展示项目内容（允许与相邻标签重叠） */
export function computeTaskLabelLayouts(
  geometries: TaskGeometry[]
): Map<string, TaskLabelLayout> {
  const result = new Map<string, TaskLabelLayout>();

  for (const { task, widthPx } of geometries) {
    result.set(task.id, {
      mode: shouldShowOutsideLabel(widthPx) ? 'above' : 'inside',
    });
  }

  return result;
}

export function buildTaskTooltipLines(task: Task): string[] {
  const lines = [
    `${task.subjectId} · ${task.name}`,
    `${formatMinuteRange(task.startMin, task.endMin)}（${task.durationMin} 分钟）`,
  ];
  if (task.visitPoint && task.visitPoint !== 'Other') {
    lines.push(`访视点 ${VISIT_POINT_BAR_LABELS[task.visitPoint]}`);
  }
  if (task.resourceIds.length > 0) {
    lines.push(`资源 ${task.resourceIds.join(', ')}`);
  }
  return lines;
}