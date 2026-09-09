import type { Resource, ResourceType, WorkflowStepTemplate } from '../types';
import {
  generateNextResourceId,
  isResourceIdValid,
} from './resourceFactory';

export type EnsureWorkflowResourcesResult = {
  steps: WorkflowStepTemplate[];
  resources: Resource[];
  created: Resource[];
};

function compact(value: string): string {
  return value.toLowerCase().replace(/[\s_\-]/g, '');
}

function namesLooseMatch(a: string, b: string): boolean {
  const left = compact(a);
  const right = compact(b);
  if (!left || !right) return false;
  if (left === right) return true;
  if (left.length >= 2 && right.includes(left)) return true;
  if (right.length >= 2 && left.includes(right)) return true;
  return false;
}

export function findExistingResource(
  resources: Resource[],
  type: ResourceType,
  name: string
): Resource | undefined {
  return resources.find(
    (resource) =>
      resource.type === type &&
      (namesLooseMatch(resource.name, name) || namesLooseMatch(resource.id, name))
  );
}

function ensureResource(
  pool: Resource[],
  spec: {
    type: ResourceType;
    name: string;
    preferredId?: string;
    capacity?: number;
  }
): { resource: Resource; pool: Resource[]; created: boolean } {
  const found = findExistingResource(pool, spec.type, spec.name);
  if (found) return { resource: found, pool, created: false };

  const preferredOk =
    spec.preferredId &&
    isResourceIdValid(spec.preferredId) &&
    !pool.some((resource) => resource.id === spec.preferredId);
  const resource: Resource = {
    id: preferredOk
      ? spec.preferredId!
      : generateNextResourceId(pool, spec.type),
    name: spec.name,
    type: spec.type,
    capacity: spec.capacity ?? (spec.type === 'area' ? 3 : 1),
    active: true,
  };
  return { resource, pool: [...pool, resource], created: true };
}

export function cleanInstrumentName(name: string): string {
  const cleaned = name
    .replace(/产品使用后\s*\d+\s*(?:分钟|min|分)?/i, '')
    .replace(/^(?:BL|基线|即刻|Immediate|IMM|30\s*min|30分钟|1h|1小时)\s*/i, '')
    .trim();
  return cleaned || name.trim();
}

/** 类型列：用导入环节自己的名称，不再折成内置 visia/tewl 等预设键。 */
export function activityTypeFromName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '自定义环节';
  if (/等待(?!区)|休息/.test(trimmed) && /至|后/.test(trimmed)) return '等待';
  return cleanInstrumentName(trimmed) || trimmed;
}

export function isProductActivity(name: string, taskType?: string): boolean {
  const text = `${name} ${taskType ?? ''}`;
  return /产品|涂抹|product_use/i.test(text) && !/后\s*\d+/.test(text);
}

export function isInstrumentLike(step: Pick<WorkflowStepTemplate, 'name' | 'taskType'>): boolean {
  const text = `${step.name} ${step.taskType}`;
  if (isProductActivity(step.name, step.taskType)) return false;
  if (/等待(?!区)|休息|适应|问卷|question|评估|医生/.test(text)) return false;
  if (/仪器|visia|tewl|tivi|cutometer|corneo|皮肤镜|vc-?20|探头|成像|相机/i.test(text)) {
    return true;
  }
  if (/水分/.test(text) || /仪/.test(text)) return true;
  return /[a-zA-Z]{2,}\d{2,}/.test(text);
}

function preferredAsciiId(name: string): string | undefined {
  const slug = name.replace(/\s+/g, '_').replace(/[^A-Za-z0-9_-]/g, '');
  if (slug && isResourceIdValid(slug)) return slug;
  return undefined;
}

function staffNameFor(activity: string): string {
  return activity.endsWith('人员') ? activity : `${activity}人员`;
}

/** 按环节生成占用资源。replace 时不复用已有目录，全部按本次流程新建。 */
export function ensureWorkflowResources(
  steps: WorkflowStepTemplate[],
  existing: Resource[] = [],
  options: { replace?: boolean } = {}
): EnsureWorkflowResourcesResult {
  let pool = options.replace ? [] : [...existing];
  const created: Resource[] = [];

  const take = (spec: {
    type: ResourceType;
    name: string;
    preferredId?: string;
    capacity?: number;
  }): Resource => {
    const result = ensureResource(pool, spec);
    pool = result.pool;
    if (result.created) created.push(result.resource);
    return result.resource;
  };

  const nextSteps = steps.map((step) => {
    const activity = activityTypeFromName(step.name) || step.taskType || '环节';
    const ids: string[] = [];

    if (
      /适应/.test(`${step.name}${step.taskType}`) ||
      activity === '等待' ||
      /等待(?!区)|休息/.test(step.name)
    ) {
      ids.push(
        take({
          type: 'area',
          name: '等待区',
          preferredId: 'Waiting_Area',
          capacity: 3,
        }).id
      );
    }

    if (isInstrumentLike(step)) {
      ids.push(
        take({
          type: 'device',
          name: activity,
          preferredId: preferredAsciiId(activity),
        }).id
      );
    }

    ids.push(
      take({
        type: 'staff',
        name: staffNameFor(activity),
        preferredId: preferredAsciiId(staffNameFor(activity)),
      }).id
    );

    return { ...step, resourceIds: [...new Set(ids)] };
  });

  return { steps: nextSteps, resources: pool, created };
}
