import { describe, expect, it } from 'vitest';
import type { WorkflowStepTemplate } from '../../types';
import { ensureWorkflowResources } from '../workflowResources';

function step(
  overrides: Partial<WorkflowStepTemplate> & Pick<WorkflowStepTemplate, 'id' | 'name' | 'taskType'>
): WorkflowStepTemplate {
  return {
    order: 0,
    resourceIds: [],
    durationMin: 5,
    color: '#8c8c8c',
    scheduling: 'sequential',
    ...overrides,
  };
}

describe('ensureWorkflowResources', () => {
  it('gives each activity its own staff and instruments a device', () => {
    const { steps, created } = ensureWorkflowResources(
      [
        step({ id: 'a', name: '临床评估', taskType: '临床评估' }),
        step({ id: 'b', name: 'TIVI700', taskType: 'TIVI700' }),
        step({ id: 'c', name: '问卷', taskType: '问卷' }),
      ],
      [],
      { replace: true }
    );

    const names = created.map((item) => item.name);
    expect(names).toEqual(
      expect.arrayContaining(['临床评估人员', 'TIVI700', 'TIVI700人员', '问卷人员'])
    );
    expect(names).not.toContain('检测人员');

    const clinicalStaff = created.find((item) => item.name === '临床评估人员')!;
    const tivi = created.find((item) => item.name === 'TIVI700')!;
    const tiviStaff = created.find((item) => item.name === 'TIVI700人员')!;
    expect(clinicalStaff.type).toBe('staff');
    expect(tivi.type).toBe('device');
    expect(steps[0].resourceIds).toEqual([clinicalStaff.id]);
    expect(steps[1].resourceIds).toEqual(
      expect.arrayContaining([tivi.id, tiviStaff.id])
    );
    expect(steps[0].resourceIds).not.toContain(tiviStaff.id);
  });

  it('shares staff and device across the same instrument at different visits', () => {
    const { steps, created } = ensureWorkflowResources(
      [
        step({ id: 'a', name: '即刻 VISIA', taskType: 'VISIA' }),
        step({ id: 'b', name: '30min VISIA', taskType: 'VISIA' }),
      ],
      [],
      { replace: true }
    );
    expect(created.filter((item) => item.name === 'VISIA人员')).toHaveLength(1);
    expect(created.filter((item) => item.type === 'device' && item.name === 'VISIA')).toHaveLength(1);
    expect(steps[0].resourceIds).toEqual(steps[1].resourceIds);
  });

  it('does not keep sample resources when replace is set', () => {
    const { resources, steps } = ensureWorkflowResources(
      [step({ id: 'v', name: 'TIVI700', taskType: 'TIVI700' })],
      [
        {
          id: 'VISIA_01',
          name: 'VISIA 01',
          type: 'device',
          capacity: 1,
          active: true,
        },
      ],
      { replace: true }
    );
    expect(resources.some((item) => item.id === 'VISIA_01')).toBe(false);
    expect(steps[0].resourceIds.some((id) => id === 'VISIA_01')).toBe(false);
  });

  it('adds a waiting area plus a dedicated person for adaptation', () => {
    const { created, steps } = ensureWorkflowResources(
      [step({ id: 'w', name: '环境适应', taskType: '环境适应' })],
      [],
      { replace: true }
    );
    expect(created.map((item) => item.name).sort()).toEqual(
      ['等待区', '环境适应人员'].sort()
    );
    expect(steps[0].resourceIds).toHaveLength(2);
  });
});
