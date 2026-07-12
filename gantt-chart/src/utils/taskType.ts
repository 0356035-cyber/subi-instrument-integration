import {
  DEFAULT_CUSTOM_TASK_TYPE_COLOR,
  PRESET_TASK_TYPE_KEYS,
  TASK_TYPE_COLORS,
  TASK_TYPE_LABELS,
  type PresetTaskTypeKey,
  type TaskType,
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

export function getTaskTypeSuggestions(): { value: string; label: string }[] {
  return PRESET_TASK_TYPE_KEYS.map((key) => ({
    value: key,
    label: `${TASK_TYPE_LABELS[key]}（${key}）`,
  }));
}