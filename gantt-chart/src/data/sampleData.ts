import type {
  Project,
  Resource,
  ScheduleSettings,
  Subject,
  Task,
} from '../types';
import { getTaskDisplayColor } from '../utils/taskType';
import { hhmmToMinutes } from '../utils/time';
import { DEFAULT_WORKFLOW_STEPS } from './defaultWorkflow';

export const sampleResources: Resource[] = [
  {
    id: 'VISIA_01',
    name: 'VISIA 01',
    type: 'device',
    capacity: 1,
    active: true,
  },
  {
    id: 'TEWL_01',
    name: 'TEWL 01',
    type: 'device',
    capacity: 1,
    active: true,
  },
  {
    id: 'Waiting_Area',
    name: '等待区',
    type: 'area',
    capacity: 3,
    active: true,
  },
  {
    id: 'Operator_A',
    name: '操作员 A',
    type: 'staff',
    capacity: 1,
    active: true,
  },
];

export const defaultSettings: ScheduleSettings = {
  displayGranularityMin: 5,
  snapGranularityMin: 5,
  calculationGranularitySec: 60,
  viewStartMin: hhmmToMinutes('08:00'),
  viewEndMin: hhmmToMinutes('12:00'),
  timezone: 'Asia/Shanghai',
  dragMode: 'single',
  visitDate: '2026-07-08',
  activeProjectId: 'project-skin-01',
};

const SAMPLE_PROJECT: Project = {
  id: 'project-skin-01',
  name: '皮肤临床研究',
  workflowSteps: DEFAULT_WORKFLOW_STEPS,
};

const SAMPLE_SUBJECTS: Subject[] = [
  {
    id: 'S01',
    name: '受试者 01',
    visitDate: defaultSettings.visitDate,
    arrivalMin: hhmmToMinutes('09:08'),
    projectId: SAMPLE_PROJECT.id,
    status: 'scheduled',
  },
  {
    id: 'S02',
    name: '受试者 02',
    visitDate: defaultSettings.visitDate,
    arrivalMin: hhmmToMinutes('09:23'),
    projectId: SAMPLE_PROJECT.id,
    status: 'scheduled',
  },
  {
    id: 'S03',
    name: '受试者 03',
    visitDate: defaultSettings.visitDate,
    arrivalMin: hhmmToMinutes('09:25'),
    projectId: SAMPLE_PROJECT.id,
    status: 'scheduled',
  },
];

function task(
  subjectId: string,
  stepId: string,
  name: string,
  taskType: string,
  resourceIds: string[],
  startMin: number,
  durationMin: number,
  extra: Partial<Task> = {}
): Task {
  return {
    id: `${subjectId}-${stepId}`,
    subjectId,
    workflowStepId: stepId,
    name,
    taskType,
    resourceIds,
    startMin,
    endMin: startMin + durationMin,
    durationMin,
    isElastic: false,
    movable: true,
    status: 'planned',
    color: getTaskDisplayColor(taskType),
    ...extra,
  };
}

/** 内置示例任务：含 S01↔S03 VISIA 重叠 4min、S02 30min 超窗 3min */
export function createSampleTasks(): Task[] {
  const s01ProductEnd = hhmmToMinutes('09:41');

  const s01: Task[] = [
    task('S01', 'adaptation', '环境适应', 'adaptation', ['Waiting_Area'], hhmmToMinutes('09:08'), 20),
    task('S01', 'bl-visia', 'BL VISIA', 'visia', ['VISIA_01'], hhmmToMinutes('09:28'), 8, {
      visitPoint: 'BL',
      dependencyTaskId: 'S01-adaptation',
    }),
    task('S01', 'product', '产品使用', 'product_use', ['Operator_A'], hhmmToMinutes('09:36'), 5, {
      dependencyTaskId: 'S01-bl-visia',
    }),
    task('S01', 'imm-visia', '即刻 VISIA', 'visia', ['VISIA_01'], hhmmToMinutes('09:41'), 8, {
      visitPoint: 'Immediate',
      dependencyTaskId: 'S01-product',
      anchorTaskId: 'S01-product',
      targetOffsetMin: 0,
    }),
    task('S01', 'wait-30', '等待至30min', 'waiting', ['Waiting_Area'], hhmmToMinutes('09:41'), 30, {
      isElastic: true,
      anchorTaskId: 'S01-product',
      targetOffsetMin: 30,
    }),
    task('S01', 'visia-30', '30min VISIA', 'visia', ['VISIA_01'], s01ProductEnd + 30, 8, {
      visitPoint: '30min',
      dependencyTaskId: 'S01-wait-30',
      anchorTaskId: 'S01-product',
      targetOffsetMin: 30,
      windowBeforeMin: 5,
      windowAfterMin: 5,
    }),
  ];

  const s02ProductEnd = hhmmToMinutes('09:56');

  const s02: Task[] = [
    task('S02', 'adaptation', '环境适应', 'adaptation', ['Waiting_Area'], hhmmToMinutes('09:23'), 20),
    task('S02', 'bl-visia', 'BL VISIA', 'visia', ['VISIA_01'], hhmmToMinutes('09:43'), 8, {
      visitPoint: 'BL',
      dependencyTaskId: 'S02-adaptation',
    }),
    task('S02', 'product', '产品使用', 'product_use', ['Operator_A'], hhmmToMinutes('09:51'), 5, {
      dependencyTaskId: 'S02-bl-visia',
    }),
    task('S02', 'imm-visia', '即刻 VISIA', 'visia', ['VISIA_01'], s02ProductEnd, 8, {
      visitPoint: 'Immediate',
      dependencyTaskId: 'S02-product',
      anchorTaskId: 'S02-product',
      targetOffsetMin: 0,
    }),
    task('S02', 'wait-30', '等待至30min', 'waiting', ['Waiting_Area'], s02ProductEnd, 30, {
      isElastic: true,
      anchorTaskId: 'S02-product',
      targetOffsetMin: 30,
    }),
    task('S02', 'visia-30', '30min VISIA', 'visia', ['VISIA_01'], hhmmToMinutes('10:34'), 8, {
      visitPoint: '30min',
      dependencyTaskId: 'S02-wait-30',
      anchorTaskId: 'S02-product',
      targetOffsetMin: 30,
      windowBeforeMin: 5,
      windowAfterMin: 5,
    }),
  ];

  const s03: Task[] = [
    task('S03', 'adaptation', '环境适应', 'adaptation', ['Waiting_Area'], hhmmToMinutes('09:25'), 20),
    task('S03', 'bl-visia', 'BL VISIA', 'visia', ['VISIA_01'], hhmmToMinutes('09:45'), 8, {
      visitPoint: 'BL',
      dependencyTaskId: 'S03-adaptation',
    }),
    task('S03', 'product', '产品使用', 'product_use', ['Operator_A'], hhmmToMinutes('09:53'), 5, {
      dependencyTaskId: 'S03-bl-visia',
    }),
    task('S03', 'imm-visia', '即刻 VISIA', 'visia', ['VISIA_01'], hhmmToMinutes('09:58'), 8, {
      visitPoint: 'Immediate',
      dependencyTaskId: 'S03-product',
      anchorTaskId: 'S03-product',
      targetOffsetMin: 0,
    }),
    task('S03', 'wait-30', '等待至30min', 'waiting', ['Waiting_Area'], hhmmToMinutes('09:58'), 30, {
      isElastic: true,
      anchorTaskId: 'S03-product',
      targetOffsetMin: 30,
    }),
    task('S03', 'visia-30', '30min VISIA', 'visia', ['VISIA_01'], hhmmToMinutes('10:28'), 8, {
      visitPoint: '30min',
      dependencyTaskId: 'S03-wait-30',
      anchorTaskId: 'S03-product',
      targetOffsetMin: 30,
      windowBeforeMin: 5,
      windowAfterMin: 5,
    }),
  ];

  return [...s01, ...s02, ...s03];
}

export function getInitialState() {
  return {
    projects: [SAMPLE_PROJECT],
    subjects: SAMPLE_SUBJECTS,
    resources: sampleResources,
    tasks: createSampleTasks(),
    settings: { ...defaultSettings },
  };
}