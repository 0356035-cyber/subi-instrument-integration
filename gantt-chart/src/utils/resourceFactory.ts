import type { Resource, ResourceType } from '../types';

const TYPE_PREFIX: Record<ResourceType, string> = {
  device: 'DEV',
  staff: 'STAFF',
  room: 'ROOM',
  area: 'AREA',
};

export const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  device: '设备',
  staff: '人员',
  room: '房间',
  area: '区域',
};

export function generateNextResourceId(
  resources: Resource[],
  type: ResourceType
): string {
  const prefix = TYPE_PREFIX[type];
  const pattern = new RegExp(`^${prefix}_(\\d+)$`);
  const nums = resources
    .map((r) => pattern.exec(r.id)?.[1])
    .filter(Boolean)
    .map(Number);
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `${prefix}_${String(next).padStart(2, '0')}`;
}

export function createDefaultResource(
  resources: Resource[],
  type: ResourceType = 'device'
): Resource {
  const id = generateNextResourceId(resources, type);
  return {
    id,
    name: '',
    type,
    capacity: 1,
    active: true,
  };
}

export function isResourceIdValid(id: string): boolean {
  return /^[A-Za-z0-9_-]+$/.test(id) && id.length > 0 && id.length <= 32;
}