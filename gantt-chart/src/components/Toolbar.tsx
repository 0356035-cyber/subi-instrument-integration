import {
  DownloadOutlined,
  EditOutlined,
  ImportOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { Button, Dropdown, Select, Space, TimePicker, Typography, message } from 'antd';
import type { MenuProps } from 'antd';
import dayjs from 'dayjs';
import { useRef } from 'react';
import type { DisplayGranularity, DragMode, SnapGranularity } from '../types';
import { useScheduleStore } from '../store/scheduleStore';
import { exportScheduleToCSV, exportScheduleToJSON, parseScheduleJSON } from '../utils/export';
import { hhmmToMinutes } from '../utils/time';
import { AddSubjectButton } from './AddSubjectModal';
import { ResourceManagerButton } from './ResourceManager';
import { WorkflowLegend } from './WorkflowLegend';
import { OptimizeScheduleButton } from './OptimizeScheduleModal';

const { Title, Text } = Typography;

const DISPLAY_OPTIONS: { value: DisplayGranularity; label: string }[] = [
  { value: 1, label: '1 min' },
  { value: 2, label: '2 min' },
  { value: 5, label: '5 min' },
  { value: 10, label: '10 min' },
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
];

const SNAP_OPTIONS: { value: SnapGranularity | 'none'; label: string }[] = [
  { value: 'none', label: '不吸附' },
  { value: 1, label: '1 min' },
  { value: 2, label: '2 min' },
  { value: 5, label: '5 min' },
  { value: 10, label: '10 min' },
  { value: 15, label: '15 min' },
];

export function Toolbar() {
  const importInputRef = useRef<HTMLInputElement>(null);
  const {
    settings,
    setSettings,
    runValidation,
    resetSampleData,
    importSchedule,
    conflicts,
    projects,
    subjects,
    resources,
    tasks,
    openProjectWorkflowEditor,
  } = useScheduleStore();

  const activeProject = projects.find((p) => p.id === settings.activeProjectId);
  const exportState = { projects, subjects, resources, tasks, settings };

  const viewStart = dayjs()
    .hour(Math.floor(settings.viewStartMin / 60))
    .minute(settings.viewStartMin % 60);
  const viewEnd = dayjs()
    .hour(Math.floor(settings.viewEndMin / 60))
    .minute(settings.viewEndMin % 60);

  const exportMenuItems: MenuProps['items'] = [
    {
      key: 'csv',
      label: '导出 CSV（排程表）',
      onClick: () => exportScheduleToCSV(exportState),
    },
    {
      key: 'json',
      label: '导出 JSON（完整备份）',
      onClick: () => exportScheduleToJSON(exportState),
    },
  ];

  const handleImportJson = async (file: File) => {
    const text = await file.text();
    const parsed = parseScheduleJSON(text);
    if (!parsed) {
      message.error('无法识别排程文件，请确认是有效的 JSON 备份');
      return;
    }
    const ok = importSchedule(parsed);
    if (ok) {
      message.success('排程数据已导入');
    } else {
      message.error('导入失败，文件格式不正确');
    }
  };

  return (
    <div className="toolbar-wrapper">
      <input
        ref={importInputRef}
        type="file"
        accept="application/json,.json"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            void handleImportJson(file);
          }
          e.target.value = '';
        }}
      />
      <div className="toolbar">
        <div className="toolbar-left">
          <Title level={4} style={{ margin: 0 }}>
            {activeProject?.name ?? '临床研究排程'}
          </Title>
          <Text type="secondary">{settings.visitDate}</Text>
        </div>

        <div className="toolbar-center">
          <Space wrap size="small">
            <span className="toolbar-label">时间轴</span>
            <TimePicker
              format="HH:mm"
              needConfirm={false}
              value={viewStart}
              onChange={(t) =>
                t &&
                setSettings({
                  viewStartMin: hhmmToMinutes(t.format('HH:mm')),
                })
              }
            />
            <Text type="secondary">—</Text>
            <TimePicker
              format="HH:mm"
              needConfirm={false}
              value={viewEnd}
              onChange={(t) =>
                t &&
                setSettings({
                  viewEndMin: hhmmToMinutes(t.format('HH:mm')),
                })
              }
            />
            <span className="toolbar-label">显示粒度</span>
            <Select
              value={settings.displayGranularityMin}
              onChange={(v: DisplayGranularity) =>
                setSettings({ displayGranularityMin: v })
              }
              style={{ width: 90 }}
              options={DISPLAY_OPTIONS}
            />
            <span className="toolbar-label">拖拽精度</span>
            <Select
              value={settings.snapGranularityMin ?? 'none'}
              onChange={(v) =>
                setSettings({
                  snapGranularityMin:
                    v === 'none' ? null : (v as SnapGranularity),
                })
              }
              style={{ width: 90 }}
              options={SNAP_OPTIONS}
            />
            <span className="toolbar-label">拖拽模式</span>
            <Select
              value={settings.dragMode}
              onChange={(v: DragMode) => setSettings({ dragMode: v })}
              style={{ width: 140 }}
              options={[
                { value: 'whole_subject', label: '整体流程拖动' },
                { value: 'single', label: '单任务拖动' },
              ]}
            />
          </Space>
        </div>

        <div className="toolbar-right">
          <Space>
            <Button
              icon={<EditOutlined />}
              onClick={() => openProjectWorkflowEditor()}
            >
              编辑项目流程
            </Button>
            <ResourceManagerButton />
            <AddSubjectButton />
            <OptimizeScheduleButton />
            <Dropdown menu={{ items: exportMenuItems }} trigger={['click']}>
              <Button icon={<DownloadOutlined />}>导出</Button>
            </Dropdown>
            <Button
              icon={<ImportOutlined />}
              onClick={() => importInputRef.current?.click()}
            >
              导入
            </Button>
            <Button
              icon={<SafetyCertificateOutlined />}
              onClick={runValidation}
              type={conflicts.length > 0 ? 'primary' : 'default'}
              danger={conflicts.length > 0}
            >
              检查冲突 {conflicts.length > 0 ? `(${conflicts.length})` : ''}
            </Button>
            <Button icon={<ReloadOutlined />} onClick={resetSampleData}>
              重置示例数据
            </Button>
          </Space>
        </div>
      </div>
      {activeProject && (
        <WorkflowLegend
          steps={activeProject.workflowSteps}
          projectName={activeProject.name}
        />
      )}
    </div>
  );
}
