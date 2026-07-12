import { describe, expect, it } from 'vitest';
import {
  getDefaultColorForTaskType,
  getTaskTypeLabel,
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
});