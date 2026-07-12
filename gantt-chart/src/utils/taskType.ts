import {
  DEFAULT_CUSTOM_TASK_TYPE_COLOR,
  PRESET_TASK_TYPE_KEYS,
  TASK_TYPE_COLORS,
  TASK_TYPE_LABELS,
  type PresetTaskTypeKey,
  type TaskType,
  type WorkflowStepTemplate,
} from '../types';

export function isPresetTaskType(type: TaskType): type is PresetTaskTypeKey {
  return (PRESET_TASK_TYPE_KEYS as readonly string[]).includes(type);
}

export function getTaskTypeLabel(type: TaskType): string {
  if (isPresetTaskType(type)) {
    return TASK_TYPE_LABELS[type];
  }
  return type;
}

export function getDefaultColorForTaskType(type: TaskType): string {
  if (isPresetTaskType(type)) {
    return TASK_TYPE_COLORS[type];
  }
  return DEFAULT_CUSTOM_TASK_TYPE_COLOR;
}

/** 甘特条渲染配色：同一环节类型统一颜色，不区分访视点 */
export function getTaskDisplayColor(type: TaskType): string {
  return getDefaultColorForTaskType(type);
}

export function getTaskTypeLegendItems(
  steps: WorkflowStepTemplate[]
): { taskType: TaskType; label: string; color: string }[] {
  const seen = new Set<string>();
  const items: { taskType: TaskType; label: string; color: string }[] = [];
  const sorted = [...steps].sort((a, b) => a.order - b.order);

  for (const step of sorted) {
    if (seen.has(step.taskType)) continue;
    seen.add(step.taskType);
    items.push({
      taskType: step.taskType,
      label: getTaskTypeLabel(step.taskType),
      color: getTaskDisplayColor(step.taskType),
    });
  }

  return items;
}

export function getTaskTypeSuggestions(): { value: string; label: string }[] {
  return PRESET_TASK_TYPE_KEYS.map((key) => ({
    value: key,
    label: `${TASK_TYPE_LABELS[key]}（${key}）`,
  }));
}