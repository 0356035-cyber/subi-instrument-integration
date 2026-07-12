import {
  AppstoreOutlined,
  DeleteOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import {
  Button,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import type { Resource, ResourceType } from '../types';
import { useScheduleStore } from '../store/scheduleStore';
import {
  RESOURCE_TYPE_LABELS,
  createDefaultResource,
  isResourceIdValid,
} from '../utils/resourceFactory';

const { Text } = Typography;

type DraftResource = Resource & { _draftKey: string };

const TYPE_OPTIONS = (Object.keys(RESOURCE_TYPE_LABELS) as ResourceType[]).map(
  (t) => ({ value: t, label: RESOURCE_TYPE_LABELS[t] })
);

export function ResourceManagerModal() {
  const resourceManagerOpen = useScheduleStore((s) => s.resourceManagerOpen);
  const closeResourceManager = useScheduleStore((s) => s.closeResourceManager);
  const resources = useScheduleStore((s) => s.resources);
  const projects = useScheduleStore((s) => s.projects);
  const saveResources = useScheduleStore((s) => s.saveResources);

  const [draft, setDraft] = useState<DraftResource[]>([]);

  useEffect(() => {
    if (resourceManagerOpen) {
      setDraft(resources.map((r) => ({ ...r, _draftKey: r.id })));
    }
  }, [resourceManagerOpen, resources]);

  const usageMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const project of projects) {
      for (const step of project.workflowSteps) {
        for (const rid of step.resourceIds) {
          const list = map.get(rid) ?? [];
          list.push(`${project.name} · ${step.name}`);
          map.set(rid, list);
        }
      }
    }
    return map;
  }, [projects]);

  const updateDraft = (draftKey: string, patch: Partial<Resource>) => {
    setDraft((prev) =>
      prev.map((r) =>
        r._draftKey === draftKey ? { ...r, ...patch } : r
      )
    );
  };

  const addResource = () => {
    const created = createDefaultResource(resources);
    setDraft((prev) => [
      ...prev,
      { ...created, _draftKey: `new_${Date.now()}` },
    ]);
  };

  const removeResource = (draftKey: string, id: string) => {
    const usedBy = usageMap.get(id);
    if (usedBy && usedBy.length > 0) {
      message.warning(
        `该资源已被流程环节引用（${usedBy.slice(0, 2).join('、')}${usedBy.length > 2 ? ' 等' : ''}），请先取消引用或改为停用`
      );
      return;
    }
    setDraft((prev) => prev.filter((r) => r._draftKey !== draftKey));
  };

  const handleSave = () => {
    const ids = draft.map((r) => r.id.trim());
    if (ids.some((id) => !id)) {
      message.error('资源 ID 不能为空');
      return;
    }
    if (new Set(ids).size !== ids.length) {
      message.error('资源 ID 不能重复');
      return;
    }
    if (ids.some((id) => !isResourceIdValid(id))) {
      message.error('资源 ID 仅允许字母、数字、下划线和连字符');
      return;
    }
    if (draft.some((r) => !r.name.trim())) {
      message.error('请填写资源名称');
      return;
    }
    if (draft.some((r) => r.capacity < 1)) {
      message.error('容量至少为 1');
      return;
    }

    const idChanges = new Map<string, string>();
    for (const row of draft) {
      if (row._draftKey !== row.id.trim()) {
        idChanges.set(row._draftKey, row.id.trim());
      }
    }

    const normalized: Resource[] = draft.map((r) => ({
      id: r.id.trim(),
      name: r.name.trim(),
      type: r.type,
      capacity: r.capacity,
      active: r.active,
      availableStartMin: r.availableStartMin,
      availableEndMin: r.availableEndMin,
    }));
    saveResources(normalized, idChanges);
    message.success('资源已保存');
  };

  const columns = [
    {
      title: 'ID',
      width: 120,
      render: (_: unknown, record: DraftResource) => (
        <Input
          size="small"
          value={record.id}
          onChange={(e) =>
            updateDraft(record._draftKey, { id: e.target.value })
          }
        />
      ),
    },
    {
      title: '名称',
      width: 140,
      render: (_: unknown, record: DraftResource) => (
        <Input
          size="small"
          placeholder="如 VISIA、操作员 A"
          value={record.name}
          onChange={(e) =>
            updateDraft(record._draftKey, { name: e.target.value })
          }
        />
      ),
    },
    {
      title: '类型',
      width: 100,
      render: (_: unknown, record: DraftResource) => (
        <Select
          size="small"
          style={{ width: '100%' }}
          value={record.type}
          options={TYPE_OPTIONS}
          onChange={(v: ResourceType) =>
            updateDraft(record._draftKey, { type: v })
          }
        />
      ),
    },
    {
      title: '容量',
      width: 80,
      render: (_: unknown, record: DraftResource) => (
        <InputNumber
          size="small"
          min={1}
          max={99}
          style={{ width: '100%' }}
          value={record.capacity}
          onChange={(v) =>
            v != null && updateDraft(record._draftKey, { capacity: v })
          }
        />
      ),
    },
    {
      title: '启用',
      width: 64,
      render: (_: unknown, record: DraftResource) => (
        <Switch
          size="small"
          checked={record.active}
          onChange={(v) => updateDraft(record._draftKey, { active: v })}
        />
      ),
    },
    {
      title: '引用',
      width: 80,
      render: (_: unknown, record: DraftResource) => {
        const usedBy = usageMap.get(record.id);
        if (!usedBy?.length) return <Text type="secondary">—</Text>;
        return (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {usedBy.length} 个环节
          </Text>
        );
      },
    },
    {
      title: '',
      width: 48,
      render: (_: unknown, record: DraftResource) => (
        <Popconfirm
          title="删除此资源？"
          description={
            usageMap.get(record.id)?.length
              ? '该资源仍被流程引用，无法删除'
              : '删除后不可恢复'
          }
          onConfirm={() => removeResource(record._draftKey, record.id)}
          disabled={!!usageMap.get(record.id)?.length}
        >
          <Button
            type="text"
            size="small"
            danger
            icon={<DeleteOutlined />}
            disabled={!!usageMap.get(record.id)?.length}
          />
        </Popconfirm>
      ),
    },
  ];

  return (
    <Modal
      title="管理资源"
      open={resourceManagerOpen}
      onCancel={closeResourceManager}
      onOk={handleSave}
      okText="保存"
      cancelText="取消"
      width={820}
      zIndex={1200}
      destroyOnClose
      styles={{ body: { maxHeight: '60vh', overflow: 'auto' } }}
    >
      <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
        在此添加、编辑设备、人员、房间等区域资源。流程编辑器中「占用资源」下拉选项来自此列表。
        已被流程引用的资源无法删除，可改为<strong>停用</strong>。
      </Text>

      <Space style={{ marginBottom: 12 }}>
        <Button type="dashed" icon={<PlusOutlined />} onClick={addResource}>
          添加资源
        </Button>
        <Tag color="blue">{draft.filter((r) => r.active).length} 个启用</Tag>
        <Tag>{draft.length} 个总计</Tag>
      </Space>

      <Table
        size="small"
        rowKey="_draftKey"
        dataSource={draft}
        columns={columns}
        pagination={false}
        scroll={{ y: 360 }}
      />
    </Modal>
  );
}

export function ResourceManagerButton() {
  const openResourceManager = useScheduleStore((s) => s.openResourceManager);

  return (
    <Button icon={<AppstoreOutlined />} onClick={openResourceManager}>
      管理资源
    </Button>
  );
}

