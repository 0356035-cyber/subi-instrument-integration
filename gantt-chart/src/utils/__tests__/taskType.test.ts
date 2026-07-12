import { describe, expect, it } from 'vitest';
import { DEFAULT_WORKFLOW_STEPS } from '../../data/defaultWorkflow';
import {
  getDefaultColorForTaskType,
  getTaskTypeLabel,
  getTaskTypeLegendItems,
  isPresetTaskType,
} from '../taskType';

describe('taskType', () => {
  it('recognizes preset types', () => {
    expect(isPresetTaskType('visia')).toBe(true);
    expect(isPresetTaskType('Cutometer')).toBe(false);
  });

  it('returns custom label for custom types', () => {
    expect(getTaskTypeLabel('皮肤镜检测')).toBe('皮肤镜检测');
    expect(getTaskTypeLabel('visia')).toBe('VISIA');
  });

  it('returns default color for custom types', () => {
    expect(getDefaultColorForTaskType('皮肤镜')).toBe('#595959');
    expect(getDefaultColorForTaskType('visia')).toBe('#722ed1');
  });

  it('deduplicates legend items by task type', () => {
    const items = getTaskTypeLegendItems(DEFAULT_WORKFLOW_STEPS);
    const visiaCount = items.filter((item) => item.taskType === 'visia').length;
    expect(visiaCount).toBe(1);
    expect(items.find((item) => item.taskType === 'visia')?.label).toBe('VISIA');
  });
});