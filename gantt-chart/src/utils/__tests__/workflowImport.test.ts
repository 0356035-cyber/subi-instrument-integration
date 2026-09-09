import { describe, expect, it } from 'vitest';
import { buildTasksFromWorkflow } from '../workflow';
import { parseWorkflowText } from '../workflowImport';

describe('parseWorkflowText', () => {
  it('splits newline process into sequential gantt steps', () => {
    const text = [
      '环境适应 20分钟 等待区',
      'BL VISIA 8分钟 VISIA',
      '产品使用 5分钟 操作员',
      '即刻 VISIA 8分钟 VISIA',
      '等待至30min',
      '30min VISIA 8分钟 VISIA',
    ].join('\n');

    const { steps, warnings } = parseWorkflowText(text);
    expect(steps).toHaveLength(6);
    expect(steps.map((step) => step.name)).toEqual([
      '环境适应',
      'BL VISIA',
      '产品使用',
      '即刻 VISIA',
      '等待至30min',
      '30min VISIA',
    ]);
    expect(steps[0].durationMin).toBe(20);
    expect(steps[0].taskType).toBe('环境适应');
    expect(steps[1].visitPoint).toBe('BL');
    expect(steps[1].taskType).toBe('VISIA');
    expect(steps[3].taskType).toBe('VISIA');
    expect(steps[3].color).toBe(steps[1].color);
    expect(steps[2].color).not.toBe(steps[1].color);
    expect(steps[3].scheduling).toBe('anchor_offset');
    expect(steps[4].scheduling).toBe('elastic_fill');
    expect(steps[4].targetOffsetMin).toBe(30);
    expect(steps[5].scheduling).toBe('anchor_offset');
    expect(steps.map((step) => step.order)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(warnings.some((item) => item.includes('未写耗时'))).toBe(false);
  });

  it('splits arrow-separated one-liners', () => {
    const { steps } = parseWorkflowText(
      '环境适应20分钟 → BL VISIA 8分钟 → 产品使用 5分钟'
    );
    expect(steps).toHaveLength(3);
    expect(steps[0].durationMin).toBe(20);
    expect(steps[1].taskType).toBe('VISIA');
  });

  it('parses csv tables', () => {
    const text = [
      '环节,耗时(min),资源',
      '环境适应,20,等待区',
      'VISIA,8,VISIA 01',
      'TEWL,5,TEWL 01',
    ].join('\n');
    const { steps } = parseWorkflowText(text);
    expect(steps).toHaveLength(3);
    expect(steps[2].taskType).toBe('TEWL');
  });

  it('returns a warning for empty input', () => {
    const { steps, warnings } = parseWorkflowText('   ');
    expect(steps).toHaveLength(0);
    expect(warnings[0]).toMatch(/没有识别到/);
  });

  it('anchors only the first test in a post-product round and chains the rest', () => {
    const text = [
      '产品使用 5分钟',
      '产品使用后5分钟 仪器1',
      '产品使用后5分钟 仪器2',
      '产品使用后30分钟 VISIA 8分钟',
      '产品使用后30分钟 TEWL 5分钟',
    ].join('\n');
    const { steps } = parseWorkflowText(text);
    expect(steps.map((step) => step.name)).toEqual([
      '产品使用',
      '仪器1',
      '仪器2',
      'VISIA',
      'TEWL',
    ]);
    expect(steps[1].scheduling).toBe('anchor_offset');
    expect(steps[1].targetOffsetMin).toBe(5);
    expect(steps[2].scheduling).toBe('sequential');
    expect(steps[3].scheduling).toBe('anchor_offset');
    expect(steps[3].targetOffsetMin).toBe(30);
    expect(steps[3].durationMin).toBe(8);
    expect(steps[4].scheduling).toBe('sequential');
    expect(steps[4].durationMin).toBe(5);

    const tasks = buildTasksFromWorkflow('S01', 540, steps);
    const product = tasks.find((task) => task.workflowStepId === steps[0].id)!;
    const first = tasks.find((task) => task.workflowStepId === steps[1].id)!;
    const second = tasks.find((task) => task.workflowStepId === steps[2].id)!;
    const visia = tasks.find((task) => task.workflowStepId === steps[3].id)!;
    const tewl = tasks.find((task) => task.workflowStepId === steps[4].id)!;
    expect(first.startMin).toBe(product.endMin + 5);
    expect(second.startMin).toBe(first.endMin);
    expect(visia.startMin).toBe(product.endMin + 30);
    expect(tewl.startMin).toBe(visia.endMin);
  });

  it('treats 即刻/30min groups the same way', () => {
    const text = [
      '产品使用 5分钟',
      '即刻 VISIA 8分钟',
      '即刻 TEWL 5分钟',
      '等待至30min',
      '30min VISIA 8分钟',
      '30min 水分 5分钟',
    ].join('\n');
    const { steps } = parseWorkflowText(text);
    expect(steps[1].scheduling).toBe('anchor_offset');
    expect(steps[1].targetOffsetMin).toBe(0);
    expect(steps[2].scheduling).toBe('sequential');
    expect(steps[4].scheduling).toBe('anchor_offset');
    expect(steps[4].targetOffsetMin).toBe(30);
    expect(steps[5].scheduling).toBe('sequential');
  });
});
