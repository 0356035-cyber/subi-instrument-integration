import { PlusOutlined } from '@ant-design/icons';
import { Alert, Button, Descriptions, Form, Input, InputNumber, Modal, Segmented, Table, TimePicker, message } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useState } from 'react';
import { type OptimizedInsertPlan, type OptimizedSubjectPlan, useScheduleStore } from '../store/scheduleStore';
import { hhmmToMinutes, minutesToHHmm } from '../utils/time';

export function AddSubjectButton() {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<OptimizedSubjectPlan | null>(null);
  const [globalPreview, setGlobalPreview] = useState<OptimizedInsertPlan | null>(null);
  const [form] = Form.useForm();
  const { addSubject, previewOptimizedSubjects, commitOptimizedSubjects, previewInsertAndExactReschedule, commitInsertAndExactReschedule, subjects, settings } = useScheduleStore();

  const suggestedArrival = () => {
    if (subjects.length === 0) return dayjs().hour(9).minute(0);
    const last = [...subjects].sort((a, b) => b.arrivalMin - a.arrivalMin)[0];
    const nextMin = last.arrivalMin + 15;
    return dayjs().hour(Math.floor(nextMin / 60)).minute(nextMin % 60);
  };

  const handleOpen = () => {
    form.setFieldsValue({
      name: '',
      arrival: suggestedArrival(),
      mode: 'single',
      count: 1,
      rangeStart: suggestedArrival(),
      rangeEnd: dayjs().hour(18).minute(0),
      interval: 5,
    });
    setOpen(true);
    setPreview(null);
    setGlobalPreview(null);
  };

  const handleOk = async () => {
    if (preview) {
      commitOptimizedSubjects(preview);
      message.success(`已写入 ${preview.subjects.length} 名受试者的自动排程。`);
      setPreview(null);
      setOpen(false);
      form.resetFields();
      return;
    }
    if (globalPreview) {
      commitInsertAndExactReschedule(globalPreview);
      message.success(`已新增 ${globalPreview.newSubjects.length} 名受试者，并全局重排 ${globalPreview.updatedSubjects.length} 名未到场受试者。`);
      setGlobalPreview(null);
      setOpen(false);
      form.resetFields();
      return;
    }
    const values = await form.validateFields();
    if (values.mode === 'optimized' || values.mode === 'global_exact') {
      const startMin = hhmmToMinutes((values.rangeStart as Dayjs).format('HH:mm'));
      const endMin = hhmmToMinutes((values.rangeEnd as Dayjs).format('HH:mm'));
      if (values.mode === 'global_exact') {
        const candidate = await previewInsertAndExactReschedule(values.count, startMin, endMin, values.interval, settings.activeProjectId);
        if (!candidate) {
          message.warning('未能得到全局最优解，请检查人数、时间范围或稍后重试。');
          return;
        }
        setGlobalPreview(candidate);
        return;
      }
      const candidate = previewOptimizedSubjects(
        values.count,
        startMin,
        endMin,
        values.interval,
        settings.activeProjectId
      );
      if (!candidate) {
        message.error('自动排程参数无效，请检查人数和时间范围');
        return;
      }
      if (candidate.plan.unscheduledSubjectIds.length > 0) {
        message.warning('时间范围不足以容纳完整流程，未写入任何受试者；请扩大安排时段。');
        return;
      }
      setPreview(candidate);
      return;
    }
    const arrival = values.arrival as Dayjs;
    const arrivalMin = hhmmToMinutes(arrival.format('HH:mm'));
    addSubject(
      values.name?.trim() || undefined,
      arrivalMin,
      settings.activeProjectId
    );
    setOpen(false);
    form.resetFields();
  };

  return (
    <>
      <Button type="primary" icon={<PlusOutlined />} onClick={handleOpen}>
        添加受试者
      </Button>
      <Modal
        title="添加受试者"
        open={open}
        onOk={handleOk}
        onCancel={() => {
          setPreview(null);
          setGlobalPreview(null);
          setOpen(false);
        }}
        okText={preview || globalPreview ? '确认写入排程' : '添加'}
        cancelText="取消"
        destroyOnClose
      >
        {preview || globalPreview ? (
          <>
            {(() => {
              const overlap = preview ? preview.plan.assignments.reduce((sum, item) => sum + item.newOverlapMin, 0) : globalPreview!.overloadMinutes;
              return (
                <Alert
                  type={overlap === 0 ? 'success' : 'warning'}
                  showIcon
                  message={globalPreview ? (overlap === 0 ? '已证明新增后全局零冲突最优' : `已证明全局最小超容量：${overlap} 分钟`) : (overlap === 0 ? '已找到零新增资源冲突方案' : `无法完全避免冲突，新增重叠共 ${overlap} 分钟`)}
                  description={globalPreview ? `确认后新增 ${globalPreview.newSubjects.length} 名受试者，并同时调整 ${globalPreview.updatedSubjects.length} 名 scheduled 受试者；已到场、已完成和已取消记录保持锁定。` : '确认后才会写入排程。流程内部的环节顺序、耗时、锚点和时间窗保持不变。'}
                  style={{ marginTop: 16, marginBottom: 16 }}
                />
              );
            })()}
            <Descriptions size="small" column={2} bordered style={{ marginBottom: 16 }}>
              <Descriptions.Item label="新增受试者">{globalPreview ? globalPreview.newSubjects.length : preview!.subjects.length} 名</Descriptions.Item>
              <Descriptions.Item label="候选方案">{globalPreview ? '全局精确（OPTIMAL）' : '按资源冲突最小化'}</Descriptions.Item>
            </Descriptions>
            <Table
              size="small"
              rowKey="subjectId"
              pagination={false}
              dataSource={(preview ?? globalPreview!).plan.assignments}
              columns={[
                { title: '受试者', dataIndex: 'subjectId' },
                { title: '建议到场', dataIndex: 'arrivalMin', render: (value: number) => minutesToHHmm(value) },
                { title: '新增重叠', dataIndex: 'newOverlapMin', render: (value: number) => `${value} 分钟` },
                { title: '新增冲突', dataIndex: 'newConflictCount', render: (value: number) => `${value} 项` },
              ]}
            />
          </>
        ) : <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="mode"
            label="添加方式"
          >
            <Segmented
              block
              options={[
                { label: '手动添加 1 名', value: 'single' },
                { label: '自动安排多名（MVP）', value: 'optimized' },
                { label: '新增并全局精确重排', value: 'global_exact' },
              ]}
            />
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, current) => prev.mode !== current.mode}>
            {({ getFieldValue }) =>
              getFieldValue('mode') === 'optimized' || getFieldValue('mode') === 'global_exact' ? (
                <>
                  <Form.Item name="count" label="受试者人数" rules={[{ required: true, message: '请输入人数' }]}>
                    <InputNumber min={1} max={30} precision={0} style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item label="可安排到场时间" required>
                    <Input.Group compact>
                      <Form.Item name="rangeStart" noStyle rules={[{ required: true, message: '请选择开始时间' }]}>
                        <TimePicker format="HH:mm" minuteStep={5} style={{ width: '50%' }} needConfirm={false} />
                      </Form.Item>
                      <Form.Item name="rangeEnd" noStyle rules={[{ required: true, message: '请选择结束时间' }]}>
                        <TimePicker format="HH:mm" minuteStep={5} style={{ width: '50%' }} needConfirm={false} />
                      </Form.Item>
                    </Input.Group>
                  </Form.Item>
                  <Form.Item name="interval" label="候选间隔" extra="系统不会改变流程内环节的先后顺序，只选择每名受试者的到场时间。">
                    <InputNumber min={1} max={30} precision={0} addonAfter="分钟" style={{ width: '100%' }} />
                  </Form.Item>
                </>
              ) : (
                <>
                  <Form.Item
            name="name"
            label="姓名（可选）"
            extra="将按当前项目流程模板自动生成排程"
          >
            <Input placeholder="受试者姓名" maxLength={32} />
          </Form.Item>
          <Form.Item
            name="arrival"
            label="到场时间"
            rules={[{ required: true, message: '请选择到场时间' }]}
            extra={`访视日期：${settings.visitDate}`}
          >
            <TimePicker
              format="HH:mm"
              minuteStep={5}
              style={{ width: '100%' }}
              needConfirm={false}
            />
          </Form.Item>
                </>
              )
            }
          </Form.Item>
        </Form>}
      </Modal>
    </>
  );
}
