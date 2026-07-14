import type { Project } from '../types';
import { DEFAULT_WORKFLOW_STEPS } from './defaultWorkflow';

export const DEFAULT_PROJECT_ID = 'proj-main';

export const sampleProjects: Project[] = [
  {
    id: DEFAULT_PROJECT_ID,
    name: '皮肤临床研究',
    workflowSteps: DEFAULT_WORKFLOW_STEPS.map((s) => ({ ...s })),
  },
];