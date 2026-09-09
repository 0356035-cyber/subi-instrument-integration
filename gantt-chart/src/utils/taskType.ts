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

/** 甘特条优先用环节上保存的颜色，没有再回退到类型预设色。 */
export function getTaskBarColor(task: {
  color?: string;
  taskType: TaskType;
}): string {
  return task.color || getTaskDisplayColor(task.taskType);
}

export const WORKFLOW_COLOR_PALETTE = [
  '#1890ff',
  '#722ed1',
  '#13c2c2',
  '#52c41a',
  '#fa8c16',
  '#eb2f96',
  '#2f54eb',
  '#a0d911',
  '#fa541c',
  '#36cfc9',
  '#9254de',
  '#f5222d',
  '#08979c',
  '#d4b106',
  '#531dab',
  '#237804',
];

/** 同一类型共用一色，不同类型从色板依次分配。 */
export function assignWorkflowColors(
  steps: WorkflowStepTemplate[]
): WorkflowStepTemplate[] {
  const colorByType = new Map<string, string>();
  let next = 0;
  return steps.map((step) => {
    const key = step.taskType || step.name || step.id;
    let color = colorByType.get(key);
    if (!color) {
      color = WORKFLOW_COLOR_PALETTE[next % WORKFLOW_COLOR_PALETTE.length];
      colorByType.set(key, color);
      next += 1;
    }
    return { ...step, color };
  });
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
      color: step.color || getTaskDisplayColor(step.taskType),
    });
  }

  return items;
}

export function getTaskTypeSuggestions(
  steps: WorkflowStepTemplate[] = []
): { value: string; label: string }[] {
  const seen = new Set<string>();
  const options: { value: string; label: string }[] = [];
  const sorted = [...steps].sort((a, b) => a.order - b.order);
  for (const step of sorted) {
    const value = step.taskType?.trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    options.push({ value, label: getTaskTypeLabel(value) });
  }
  return options;
}