import { CalendarOutlined } from '@ant-design/icons';
import { Alert, Button, Descriptions, Form, Input, InputNumber, Modal, Segmented, Table, TimePicker, message } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useState } from 'react';
import { type OptimizedReschedulePlan, useScheduleStore } from '../store/scheduleStore';
import { hhmmToMinutes, minutesToHHmm } from '../utils/time';

export function OptimizeScheduleButton() {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<OptimizedReschedulePlan | null>(null);
  const [form] = Form.useForm();
  const {
    settings,
    subjects,
    previewRescheduleScheduledSubjects,
    previewExactRescheduleScheduledSubjects,
    commitRescheduledSubjects,
  } = useScheduleStore();

  const scheduledCount = subjects.filter(
    (subject) => subject.projectId === settings.activeProjectId && subject.status === 'scheduled'
  ).length;

  const openModal = () => {
    form.setFieldsValue({
      start: dayjs().hour(Math.floor(settings.viewStartMin / 60)).minute(settings.viewStartMin % 60),
      end: dayjs().hour(Math.floor(settings.viewEndMin / 60)).minute(settings.viewEndMin % 60),
      interval: 5,
      mode: 'quick',
    });
    setPreview(null);
    setOpen(true);
  };

  const handleOk = async () => {
    if (preview) {
      commitRescheduledSubjects(preview);
      message.success(`已重新安排 ${preview.subjects.length} 名未到场受试者。`);
      setPreview(null);
      setOpen(false);
      return;
    }

    const values = await form.validateFields();
    const args: [number, number, number, string] = [
      hhmmToMinutes((values.start as Dayjs).format('HH:mm')),
      hhmmToMinutes((values.end as Dayjs).format('HH:mm')),
      values.interval,
      settings.activeProjectId,
    ];
    const candidate = values.mode === 'exact'
      ? await previewExactRescheduleScheduledSubjects(...args)
      : previewRescheduleScheduledSubjects(...args);
    if (!candidate) {
      message.info('当前项目没有可重新安排的 scheduled 状态受试者，或时间范围无效。');
      return;
    }
    if (candidate.plan.unscheduledSubjectIds.length > 0) {
      message.warning('时间范围不足以容纳全部未到场受试者，未修改排程；请扩大安排时段。');
      return;
    }
    setPreview(candidate);
  };

  const overlap = preview?.plan.assignments.reduce(
    (sum, assignment) => sum + assignment.newOverlapMin,
    0
  ) ?? 0;

  return (
    <>
      <Button icon={<CalendarOutlined />} onClick={openModal} disabled={scheduledCount === 0}>
        优化未到场排程
      </Button>
      <Modal
        title="优化未到场受试者排程"
        open={open}
        onOk={handleOk}
        onCancel={() => {
          setPreview(null);
          setOpen(false);
        }}
        okText={preview ? '确认应用方案' : '生成预览'}
        cancelText="取消"
        destroyOnClose
      >
        {preview ? (
          <>
            <Alert
              type={overlap === 0 ? 'success' : 'warning'}
              showIcon
              message={preview.exact ? (preview.overloadMinutes === 0 ? '已证明全局零冲突最优' : `已证明全局最小超容量：${preview.overloadMinutes} 分钟`) : (overlap === 0 ? '已找到零新增资源冲突方案' : `新增重叠共 ${overlap} 分钟`)}
              description={preview.exact ? '精确模式在当前候选间隔与分钟级资源模型下返回 OPTIMAL。' : '仅重新安排 scheduled 状态受试者；已到场、已完成和已取消受试者保持锁定。'}
              style={{ marginTop: 16, marginBottom: 16 }}
            />
            <Descriptions size="small" bordered column={1} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="重新安排范围">{preview.subjects.length} 名 scheduled 受试者</Descriptions.Item>
            </Descriptions>
            <Table
              size="small"
              rowKey="subjectId"
              pagination={false}
              dataSource={preview.plan.assignments}
              columns={[
                { title: '受试者', dataIndex: 'subjectId' },
                { title: '建议到场', dataIndex: 'arrivalMin', render: (value: number) => minutesToHHmm(value) },
                { title: '新增重叠', dataIndex: 'newOverlapMin', render: (value: number) => `${value} 分钟` },
              ]}
            />
          </>
        ) : (
          <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
            <Alert
              type="info"
              showIcon
              message={`将重新安排 ${scheduledCount} 名未到场受试者`}
              description="已到场、已完成和已取消受试者将保持原位置，不会被移动。"
              style={{ marginBottom: 16 }}
            />
            <Form.Item label="可安排到场时间" required>
              <Input.Group compact>
                <Form.Item name="start" noStyle rules={[{ required: true, message: '请选择开始时间' }]}>
                  <TimePicker format="HH:mm" minuteStep={5} style={{ width: '50%' }} needConfirm={false} />
                </Form.Item>
                <Form.Item name="end" noStyle rules={[{ required: true, message: '请选择结束时间' }]}>
                  <TimePicker format="HH:mm" minuteStep={5} style={{ width: '50%' }} needConfirm={false} />
                </Form.Item>
              </Input.Group>
            </Form.Item>
            <Form.Item name="mode" label="优化模式">
              <Segmented block options={[{ label: '快速建议', value: 'quick' }, { label: '全局精确（MILP）', value: 'exact' }]} />
            </Form.Item>
            <Form.Item name="interval" label="候选间隔">
              <InputNumber min={1} max={30} precision={0} addonAfter="分钟" style={{ width: '100%' }} />
            </Form.Item>
          </Form>
        )}
      </Modal>
    </>
  );
}
