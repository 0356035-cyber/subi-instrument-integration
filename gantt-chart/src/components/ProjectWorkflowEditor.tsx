import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  PlusOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import {
  AutoComplete,
  Button,
  ColorPicker,
  Drawer,
  Input,
  InputNumber,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { AggregationColor } from 'antd/es/color-picker/color';
import { useEffect, useMemo, useState } from 'react';
import type { StepScheduling, WorkflowStepTemplate } from '../types';
import { useScheduleStore } from '../store/scheduleStore';
import { getTaskTypeSuggestions } from '../utils/taskType';
import { createDefaultStep, normalizeStepOrders } from '../utils/workflow';

const { Text } = Typography;

const SCHEDULING_OPTIONS: { value: StepScheduling; label: string }[] = [
  { value: 'sequential', label: '顺序衔接' },
  { value: 'anchor_offset', label: '锚点偏移' },
  { value: 'elastic_fill', label: '弹性填充' },
];

const TYPE_SUGGESTIONS = getTaskTypeSuggestions();

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
    projects,
    resources,
    openResourceManager,
  } = useScheduleStore();

  const project = projects.find((p) => p.id === editingProjectId);
  const [steps, setSteps] = useState<WorkflowStepTemplate[]>([]);

  useEffect(() => {
    if (project) {
      setSteps(project.workflowSteps.map((s) => ({ ...s })));
    }
  }, [project, editingProjectId]);

  const sorted = useMemo(
    () => [...steps].sort((a, b) => a.order - b.order),
    [steps]
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
    const list = normalizeStepOrders(steps);
    const idx = list.findIndex((s) => s.id === id);
    const target = idx + dir;
    if (target < 0 || target >= list.length) return;
    const next = [...list];
    [next[idx], next[target]] = [next[target], next[idx]];
    setSteps(normalizeStepOrders(next));
  };

  const removeStep = (id: string) => {
    setSteps((prev) => normalizeStepOrders(prev.filter((s) => s.id !== id)));
  };

  const addStep = () => {
    setSteps((prev) => [...prev, createDefaultStep(prev.length)]);
  };

  const columns = [
    {
      title: '顺序',
      width: 72,
      fixed: 'left' as const,
      render: (_: unknown, record: WorkflowStepTemplate) => (
        <Space size={2}>
          <Button
            type="text"
            size="small"
            icon={<ArrowUpOutlined />}
            onClick={() => moveStep(record.id, -1)}
          />
          <Button
            type="text"
            size="small"
            icon={<ArrowDownOutlined />}
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
          options={TYPE_SUGGESTIONS}
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
          min={1}
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
      width={1080}
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
          <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
            <strong>类型</strong>可从预设中选择，也可直接输入自定义名称（如
            Cutometer、皮肤镜）；<strong>占用资源</strong>支持多选，选项来自
            <Button type="link" size="small" style={{ padding: 0 }} onClick={openResourceManager}>
              管理资源
            </Button>
            。修改后请点击「保存并应用」。
          </Text>

          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={addStep}
            style={{ marginBottom: 12 }}
          >
            添加环节
          </Button>

          <Table
            size="small"
            rowKey="id"
            dataSource={sorted}
            columns={columns}
            pagination={false}
            scroll={{ x: 1050 }}
          />
        </>
      )}
    </Drawer>
  );
}