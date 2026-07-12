import type { Task } from '../types';
import { formatMinuteRange } from './time';

/** 条内可完整显示文字的最小像素宽度 */
export const TASK_LABEL_INSIDE_MIN_PX = 88;

/** 极短环节仍保留可点击/可拖拽的最小条宽 */
export const TASK_BAR_MIN_PX = 10;

export function shouldShowOutsideLabel(widthPx: number): boolean {
  return widthPx < TASK_LABEL_INSIDE_MIN_PX;
}

export function getTaskBarDisplayWidth(widthPx: number): number {
  return Math.max(widthPx, TASK_BAR_MIN_PX);
}

export function getTaskShortLabel(task: Task): string {
  if (task.visitPoint && task.visitPoint !== 'Other') {
    return task.visitPoint;
  }
  const compact = task.name.replace(/\s+/g, '');
  return compact.length > 4 ? `${compact.slice(0, 4)}…` : compact || task.name;
}

export function buildTaskTooltipLines(task: Task): string[] {
  const lines = [
    `${task.subjectId} · ${task.name}`,
    formatMinuteRange(task.startMin, task.endMin),
    `时长 ${task.durationMin} 分钟`,
  ];
  if (task.visitPoint && task.visitPoint !== 'Other') {
    lines.push(`访视点 ${task.visitPoint}`);
  }
  if (task.resourceIds.length > 0) {
    lines.push(`资源 ${task.resourceIds.join(', ')}`);
  }
  return lines;
}