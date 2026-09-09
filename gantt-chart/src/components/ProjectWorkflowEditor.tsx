import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  HolderOutlined,
  ImportOutlined,
  PlusOutlined,
  SaveOutlined,
  UserSwitchOutlined,
} from '@ant-design/icons';
import {
  Alert,
  AutoComplete,
  Button,
  ColorPicker,
  Drawer,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Radio,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { AggregationColor } from 'antd/es/color-picker/color';
import { useEffect, useMemo, useState } from 'react';
import type { StepScheduling, WorkflowStepTemplate } from '../types';
import { useScheduleStore } from '../store/scheduleStore';
import { inferWorkflowFromSubjectTasks } from '../utils/subjectWorkflow';
import { getTaskTypeSuggestions } from '../utils/taskType';
import {
  createDefaultStep,
  moveWorkflowStep,
  normalizeStepOrders,
  relinkSequentialDependencies,
  reorderWorkflowSteps,
} from '../utils/workflow';
import { ensureWorkflowResources } from '../utils/workflowResources';
import {
  WORKFLOW_IMPORT_EXAMPLE,
  parseWorkflowText,
} from '../utils/workflowImport';

const { Text } = Typography;

const SCHEDULING_OPTIONS: { value: StepScheduling; label: string }[] = [
  { value: 'sequential', label: '顺序衔接' },
  { value: 'anchor_offset', label: '锚点偏移' },
  { value: 'elastic_fill', label: '弹性填充' },
];



function toHex(color: AggregationColor | string): string {
  if (typeof color === 'string') return color;
  const hex = color.toHexString?.();
  return hex ?? '#8c8c8c';
}

export function ProjectWorkflowEditor() {
  const {
    editingProjectId,
    closeProjectWorkflowEditor,
    saveProjectWorkflow,
    clearProjectWorkflow,
    projects,
    resources,
    subjects,
    tasks,
    openResourceManager,
    mergeResources,
    replaceResources,
  } = useScheduleStore();

  const project = projects.find((p) => p.id === editingProjectId);
  const [steps, setSteps] = useState<WorkflowStepTemplate[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState(WORKFLOW_IMPORT_EXAMPLE);
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');
  const [sourceSubjectId, setSourceSubjectId] = useState<string>();

  useEffect(() => {
    if (project) {
      setSteps(project.workflowSteps.map((s) => ({ ...s })));
      setSourceSubjectId(undefined);
    }
  }, [project, editingProjectId]);

  const sorted = useMemo(
    () => [...steps].sort((a, b) => a.order - b.order),
    [steps]
  );
  const typeSuggestions = useMemo(
    () => getTaskTypeSuggestions(sorted),
    [sorted]
  );

  const projectSubjects = useMemo(
    () =>
      subjects.filter((subject) => subject.projectId === project?.id),
    [subjects, project?.id]
  );

  const stepOptions = sorted.map((s) => ({ value: s.id, label: s.name }));

  const resourceOptions = useMemo(() => {
    const selectedIds = new Set(steps.flatMap((s) => s.resourceIds));
    return resources
      .filter((r) => r.active || selectedIds.has(r.id))
      .map((r) => ({
        value: r.id,
        label: r.active
          ? `${r.name}（${r.id}）`
          : `${r.name}（${r.id}，已停用）`,
        disabled: !r.active,
      }));
  }, [resources, steps]);

  const updateStep = (id: string, patch: Partial<WorkflowStepTemplate>) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...patch } : s))
    );
  };

  const moveStep = (id: string, dir: -1 | 1) => {
    setSteps((prev) => moveWorkflowStep(prev, id, dir));
  };

  const dropOn = (targetId: string) => {
    if (!dragId) return;
    setSteps((prev) => reorderWorkflowSteps(prev, dragId, targetId));
    setDragId(null);
    setDragOverId(null);
  };

  const removeStep = (id: string) => {
    setSteps((prev) =>
      relinkSequentialDependencies(
        normalizeStepOrders(prev.filter((s) => s.id !== id))
      )
    );
  };

  const addStep = () => {
    setSteps((prev) =>
      relinkSequentialDependencies([...prev, createDefaultStep(prev.length)])
    );
  };

  const loadFromSubject = () => {
    if (!sourceSubjectId) {
      message.warning('请先选择一名受试者');
      return;
    }
    const sourceTasks = tasks.filter((task) => task.subjectId === sourceSubjectId);
    if (sourceTasks.length === 0) {
      message.warning('该受试者还没有排程任务');
      return;
    }
    setSteps(inferWorkflowFromSubjectTasks(sourceTasks, steps));
    message.success('已读入该受试者当前甘特图顺序和耗时，请核对后保存');
  };

  const handleImport = () => {
    const parsed = parseWorkflowText(importText);
    if (parsed.steps.length === 0) {
      message.error(parsed.warnings[0] ?? '未能拆出环节');
      return;
    }
    const incoming =
      importMode === 'append'
        ? relinkSequentialDependencies(
            normalizeStepOrders([...steps, ...parsed.steps])
          )
        : parsed.steps;
    const replace = importMode === 'replace';
    const ensured = ensureWorkflowResources(
      incoming,
      replace ? [] : resources,
      { replace }
    );
    if (replace) {
      replaceResources(ensured.resources);
    } else if (ensured.created.length > 0) {
      mergeResources(ensured.created);
    }
    setSteps(ensured.steps);
    parsed.warnings
      .filter((warning) => !warning.includes('未匹配到已有资源'))
      .forEach((warning) => message.warning(warning));
    message.success(
      ensured.created.length > 0
        ? `已拆出 ${parsed.steps.length} 个环节，并按流程生成资源：${ensured.created.map((item) => item.name).join('、')}`
        : `已拆出 ${parsed.steps.length} 个环节，请核对后保存并应用`
    );
    setImportOpen(false);
  };

  const columns = [
    {
      title: '顺序',
      width: 132,
      fixed: 'left' as const,
      render: (_: unknown, record: WorkflowStepTemplate, index: number) => (
        <Space size={2}>
          <span
            className="workflow-drag-handle"
            title="拖动调整顺序"
            draggable
            onDragStart={(event) => {
              event.dataTransfer.setData('text/plain', record.id);
              event.dataTransfer.effectAllowed = 'move';
              setDragId(record.id);
            }}
            onDragEnd={() => {
              setDragId(null);
              setDragOverId(null);
            }}
          >
            <HolderOutlined />
          </span>
          <Text style={{ width: 18, display: 'inline-block' }}>{index + 1}</Text>
          <Button
            type="text"
            size="small"
            icon={<ArrowUpOutlined />}
            disabled={index === 0}
            title="上移"
            onClick={() => moveStep(record.id, -1)}
          />
          <Button
            type="text"
            size="small"
            icon={<ArrowDownOutlined />}
            disabled={index === sorted.length - 1}
            title="下移"
            onClick={() => moveStep(record.id, 1)}
          />
        </Space>
      ),
    },
    {
      title: '颜色',
      width: 56,
      render: (_: unknown, record: WorkflowStepTemplate) => (
        <ColorPicker
          size="small"
          value={record.color}
          onChange={(c) => updateStep(record.id, { color: toHex(c) })}
        />
      ),
    },
    {
      title: '环节名称',
      width: 120,
      render: (_: unknown, record: WorkflowStepTemplate) => (
        <Input
          size="small"
          value={record.name}
          onChange={(e) => updateStep(record.id, { name: e.target.value })}
        />
      ),
    },
    {
      title: '类型',
      width: 160,
      render: (_: unknown, record: WorkflowStepTemplate) => (
        <AutoComplete
          size="small"
          style={{ width: '100%' }}
          value={record.taskType}
          options={typeSuggestions}
          placeholder="预设或自定义"
          filterOption={(input, option) =>
            (option?.label ?? '')
              .toString()
              .toLowerCase()
              .includes(input.toLowerCase()) ||
            (option?.value ?? '')
              .toString()
              .toLowerCase()
              .includes(input.toLowerCase())
          }
          onChange={(v) => updateStep(record.id, { taskType: v.trim() })}
          onBlur={() => {
            if (!record.taskType.trim()) {
              updateStep(record.id, { taskType: '自定义环节' });
            }
          }}
        />
      ),
    },
    {
      title: '耗时(min)',
      width: 88,
      render: (_: unknown, record: WorkflowStepTemplate) => (
        <InputNumber
          size="small"
          min={0}
          max={240}
          style={{ width: '100%' }}
          value={record.durationMin}
          disabled={record.scheduling === 'elastic_fill'}
          onChange={(v) => v != null && updateStep(record.id, { durationMin: v })}
        />
      ),
    },
    {
      title: '排程方式',
      width: 120,
      render: (_: unknown, record: WorkflowStepTemplate) => (
        <Select
          size="small"
          style={{ width: '100%' }}
          value={record.scheduling}
          options={SCHEDULING_OPTIONS}
          onChange={(v: StepScheduling) =>
            updateStep(record.id, { scheduling: v })
          }
        />
      ),
    },
    {
      title: '占用资源',
      width: 220,
      render: (_: unknown, record: WorkflowStepTemplate) => (
        <Select
          size="small"
          mode="multiple"
          allowClear
          placeholder="选择设备/人员"
          style={{ width: '100%' }}
          value={record.resourceIds}
          maxTagCount="responsive"
          options={resourceOptions}
          onChange={(vals) =>
            updateStep(record.id, { resourceIds: vals as string[] })
          }
          tagRender={({ label, closable, onClose }) => (
            <Tag
              closable={closable}
              onClose={onClose}
              style={{ marginInlineEnd: 4, fontSize: 11 }}
            >
              {label}
            </Tag>
          )}
        />
      ),
    },
    {
      title: '锚点/偏移(min)',
      width: 168,
      render: (_: unknown, record: WorkflowStepTemplate) =>
        record.scheduling !== 'sequential' ? (
          <Space size={4}>
            <Select
              size="small"
              placeholder="锚点环节"
              style={{ width: 100 }}
              value={record.anchorStepId}
              options={stepOptions.filter((o) => o.value !== record.id)}
              onChange={(v) => updateStep(record.id, { anchorStepId: v })}
            />
            <InputNumber
              size="small"
              style={{ width: 56 }}
              value={record.targetOffsetMin ?? 0}
              onChange={(v) =>
                updateStep(record.id, { targetOffsetMin: v ?? 0 })
              }
            />
          </Space>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: '',
      width: 48,
      fixed: 'right' as const,
      render: (_: unknown, record: WorkflowStepTemplate) => (
        <Popconfirm
          title="删除此环节？"
          description="保存后将重新生成所有受试者排程"
          onConfirm={() => removeStep(record.id)}
        >
          <Button type="text" size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <Drawer
      title={project ? `编辑项目流程 · ${project.name}` : '编辑项目流程'}
      open={!!editingProjectId}
      onClose={closeProjectWorkflowEditor}
      width={1120}
      extra={
        project && (
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={() => saveProjectWorkflow(project.id, steps)}
          >
            保存并应用
          </Button>
        )
      }
    >
      {project && (
        <>
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 12 }}
            message="顺序会直接决定甘特图生成顺序。可用左侧拖动手柄或上下箭头调整，保存后按新模板重建该项目全部受试者排程。"
          />
          <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
            <strong>类型</strong>可从预设中选择，也可直接输入自定义名称（如
            Cutometer、皮肤镜）；<strong>占用资源</strong>支持多选，选项来自
            <Button type="link" size="small" style={{ padding: 0 }} onClick={openResourceManager}>
              管理资源
            </Button>
            。修改后请点击「保存并应用」。
          </Text>

          <Space wrap style={{ marginBottom: 12 }}>
            <Button type="dashed" icon={<PlusOutlined />} onClick={addStep}>
              添加环节
            </Button>
            <Button icon={<ImportOutlined />} onClick={() => setImportOpen(true)}>
              导入完整流程
            </Button>
            <Select
              allowClear
              placeholder="从受试者读取当前排程"
              style={{ minWidth: 220 }}
              value={sourceSubjectId}
              options={projectSubjects.map((subject) => ({
                value: subject.id,
                label: `${subject.id} ${subject.name ?? ''}`.trim(),
              }))}
              onChange={(value) => setSourceSubjectId(value)}
            />
            <Button
              icon={<UserSwitchOutlined />}
              disabled={!sourceSubjectId}
              onClick={loadFromSubject}
            >
              读入并待保存
            </Button>
            <Popconfirm
              title="清空当前项目流程？"
              description="将删除全部环节，并按空模板重建该项目受试者排程。资源列表不会删除。"
              okText="清空"
              okButtonProps={{ danger: true }}
              cancelText="取消"
              onConfirm={() => {
                if (!project) return;
                clearProjectWorkflow(project.id);
                setSteps([]);
                message.success('项目流程已清空');
              }}
            >
              <Button danger icon={<DeleteOutlined />} disabled={steps.length === 0}>
                清空流程
              </Button>
            </Popconfirm>
          </Space>

          <Table
            size="small"
            rowKey="id"
            dataSource={sorted}
            columns={columns}
            pagination={false}
            scroll={{ x: 1100 }}
            onRow={(record) => ({
              onDragOver: (event) => {
                if (!dragId) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
                if (dragOverId !== record.id) setDragOverId(record.id);
              },
              onDrop: (event) => {
                event.preventDefault();
                dropOn(record.id);
              },
              className: dragOverId === record.id ? 'workflow-row-drag-over' : undefined,
            })}
          />

          <Modal
            title="导入完整流程"
            open={importOpen}
            onCancel={() => setImportOpen(false)}
            onOk={handleImport}
            okText="拆解并填入表格"
            width={640}
            destroyOnClose
          >
            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
              粘贴整段流程。「替换当前流程」会清空旧资源，按本次文本生成类型、颜色，以及每项对应的人员和仪器。同一仪器在不同访视点共用设备和人员。导入后请再核对，不自动定稿。
            </Text>
            <Radio.Group
              value={importMode}
              onChange={(event) => setImportMode(event.target.value)}
              style={{ marginBottom: 8 }}
            >
              <Radio.Button value="replace">替换当前流程</Radio.Button>
              <Radio.Button value="append">追加到末尾</Radio.Button>
            </Radio.Group>
            <Input.TextArea
              value={importText}
              onChange={(event) => setImportText(event.target.value)}
              rows={12}
              placeholder={WORKFLOW_IMPORT_EXAMPLE}
            />
          </Modal>
        </>
      )}
    </Drawer>
  );
}
