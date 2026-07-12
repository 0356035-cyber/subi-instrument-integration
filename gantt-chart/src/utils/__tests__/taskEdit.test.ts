import { describe, expect, it } from 'vitest';
import { defaultSettings } from '../../data/sampleData';
import type { Task } from '../../types';
import { patchTask } from '../taskEdit';

const baseTask: Task = {
  id: 't1',
  subjectId: 'S01',
  workflowStepId: 'bl-visia',
  name: 'BL VISIA',
  taskType: 'visia',
  resourceIds: ['VISIA_01'],
  startMin: 560,
  endMin: 568,
  durationMin: 8,
  isElastic: false,
  movable: true,
  color: '#722ed1',
};

describe('patchTask', () => {
  it('updates duration and recalculates endMin', () => {
    const result = patchTask('t1', { durationMin: 10 }, [baseTask], defaultSettings);
    expect(result[0].durationMin).toBe(10);
    expect(result[0].endMin).toBe(570);
  });
});