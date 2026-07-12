import type { Subject } from '../types';

export function generateNextSubjectId(subjects: Subject[]): string {
  const nums = subjects
    .map((s) => /^S(\d+)$/.exec(s.id)?.[1])
    .filter(Boolean)
    .map(Number);
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `S${String(next).padStart(2, '0')}`;
}

export function createSubject(
  id: string,
  arrivalMin: number,
  visitDate: string,
  projectId: string,
  name?: string
): Subject {
  return {
    id,
    name: name ?? `受试者 ${id.replace('S', '')}`,
    visitDate,
    arrivalMin,
    projectId,
    status: 'scheduled',
  };
}