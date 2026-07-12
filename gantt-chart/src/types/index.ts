export type SubjectStatus = 'scheduled' | 'arrived' | 'completed' | 'late' | 'cancelled';

/** 环节排程方式 */
export type StepScheduling = 'sequential' | 'anchor_offset' | 'elastic_fill';

/** 项目级流程环节模板（所有受试者共享） */
export type WorkflowStepTemplate = {
  id: string;
  order: number;
  name: string;
  taskType: TaskType;
  visitPoint?: VisitPoint;
  resourceIds: string[];
  durationMin: number;
  /** 该环节在甘特图中的颜色 */
  color: string;
  scheduling: StepScheduling;
  dependsOnStepId?: string;
  anchorStepId?: string;
  targetOffsetMin?: number;
  windowBeforeMin?: number;
  windowAfterMin?: number;
};

export type Project = {
  id: string;
  name: string;
  workflowSteps: WorkflowStepTemplate[];
};

export type Subject = {
  id: string;
  name?: string;
  visitDate: string;
  arrivalMin: number;
  projectId: string;
  group?: string;
  status: SubjectStatus;
};

export type ResourceType = 'device' | 'staff' | 'room' | 'area';

export type Resource = {
  id: string;
  name: string;
  type: ResourceType;
  capacity: number;
  availableStartMin?: number;
  availableEndMin?: number;
  active: boolean;
};

export type VisitPoint = 'BL' | 'Immediate' | '30min' | '1h' | 'Other';

/** 环节类型：可使用内置预设，也可填写任意自定义名称 */
export type TaskType = string;

export const PRESET_TASK_TYPE_KEYS = [
  'adaptation',
  'visia',
  'tewl',
  'moisture',
  'product_use',
  'waiting',
  'questionnaire',
  'doctor_assessment',
] as const;

export type PresetTaskTypeKey = (typeof PRESET_TASK_TYPE_KEYS)[number];

export type TaskStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';

export type Task = {
  id: string;
  subjectId: string;
  workflowStepId: string;
  visitPoint?: VisitPoint;
  name: string;
  taskType: TaskType;
  resourceIds: string[];
  startMin: number;
  endMin: number;
  durationMin: number;
  dependencyTaskId?: string;
  anchorTaskId?: string;
  targetOffsetMin?: number;
  windowBeforeMin?: number;
  windowAfterMin?: number;
  isElastic: boolean;
  movable: boolean;
  locked?: boolean;
  status?: TaskStatus;
  color: string;
};

export type DisplayGranularity = 1 | 2 | 5 | 10 | 15 | 30;
export type SnapGranularity = 1 | 2 | 5 | 10 | 15 | null;
export type DragMode = 'single' | 'cascade' | 'whole_subject';

export type ScheduleSettings = {
  displayGranularityMin: DisplayGranularity;
  snapGranularityMin: SnapGranularity;
  calculationGranularitySec: number;
  viewStartMin: number;
  viewEndMin: number;
  timezone: string;
  dragMode: DragMode;
  visitDate: string;
  /** 当前查看/编辑的项目 */
  activeProjectId: string;
};

export type ConflictType =
  | 'resource_conflict'
  | 'time_window_violation'
  | 'near_time_window'
  | 'dependency_violation';

export type ConflictSeverity = 'low' | 'medium' | 'high';

export type Conflict = {
  id: string;
  type: ConflictType;
  severity: ConflictSeverity;
  taskId: string;
  relatedTaskId?: string;
  overlapMin?: number;
  message: string;
};

export type TaskRiskState = {
  resourceConflict: boolean;
  timeWindowViolation: boolean;
  nearTimeWindow: boolean;
  dependencyViolation: boolean;
};

export const TASK_TYPE_LABELS: Record<PresetTaskTypeKey, string> = {
  adaptation: '环境适应',
  visia: 'VISIA',
  tewl: 'TEWL',
  moisture: '水分',
  product_use: '产品使用',
  waiting: '等待',
  questionnaire: '问卷',
  doctor_assessment: '医生评估',
};

export const TASK_TYPE_COLORS: Record<PresetTaskTypeKey, string> = {
  adaptation: '#1890ff',
  visia: '#722ed1',
  tewl: '#52c41a',
  moisture: '#95de64',
  product_use: '#fa8c16',
  waiting: '#8c8c8c',
  questionnaire: '#fadb14',
  doctor_assessment: '#13c2c2',
};

export const DEFAULT_CUSTOM_TASK_TYPE_COLOR = '#595959';

export const NEAR_WINDOW_THRESHOLD_MIN = 2;