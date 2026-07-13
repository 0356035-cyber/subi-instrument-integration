import { describe, expect, it } from 'vitest';
import type { Resource, WorkflowStepTemplate } from '../../types';
import { solveExactSchedule } from '../exactOptimizer';

describe('solveExactSchedule', () => {
  it('proves a zero-overload global solution for two subjects', async () => {
    const resources: Resource[] = [{ id: 'device', name: '设备', type: 'device', capacity: 1, active: true }];
    const workflow: WorkflowStepTemplate[] = [{ id: 'task', order: 0, name: '检测', taskType: '检测', resourceIds: ['device'], durationMin: 10, color: '#000', scheduling: 'sequential' }];
    const result = await solveExactSchedule([], workflow, resources, { subjectIds: ['S01', 'S02'], startMin: 540, endMin: 570, stepMin: 5 });
    expect(result.status).toBe('optimal');
    expect(result.overloadMinutes).toBe(0);
    expect(result.assignments).toHaveLength(2);
  });
});
