import { Form, Input, Modal, Select, TimePicker } from 'antd';
import dayjs from 'dayjs';
import { useEffect } from 'react';
import type { SubjectStatus } from '../types';
import { useScheduleStore } from '../store/scheduleStore';
import { hhmmToMinutes } from '../utils/time';

const STATUS_OPTIONS: { value: SubjectStatus; label: string }[] = [
  { value: 'scheduled', label: '已排程' },
  { value: 'arrived', label: '已到场' },
  { value: 'completed', label: '已完成' },
  { value: 'late', label: '迟到' },
  { value: 'cancelled', label: '取消' },
];

export function SubjectInfoModal() {
  const {
    editingSubjectId,
    closeSubjectEditor,
    subjects,
    updateSubject,
  } = useScheduleStore();
  const [form] = Form.useForm();
  const subject = subjects.find((s) => s.id === editingSubjectId);

  useEffect(() => {
    if (subject) {
      form.setFieldsValue({
        name: subject.name,
        status: subject.status,
        arrival: dayjs()
          .hour(Math.floor(subject.arrivalMin / 60))
          .minute(subject.arrivalMin % 60),
      });
    }
  }, [subject, form]);

  const handleOk = async () => {
    if (!subject) return;
    const values = await form.validateFields();
    updateSubject(subject.id, {
      name: values.name,
      status: values.status,
      arrivalMin: hhmmToMinutes(values.arrival.format('HH:mm')),
    });
    closeSubjectEditor();
  };

  return (
    <Modal
      title={subject ? `受试者信息 · ${subject.id}` : ''}
      open={!!editingSubjectId}
      onOk={handleOk}
      onCancel={closeSubjectEditor}
      okText="保存"
      cancelText="取消"
      destroyOnClose
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item name="name" label="姓名">
          <Input placeholder="受试者姓名" />
        </Form.Item>
        <Form.Item
          name="arrival"
          label="到场时间"
          rules={[{ required: true }]}
          extra="修改后将按项目流程模板重新生成该受试者排程"
        >
          <TimePicker format="HH:mm" needConfirm={false} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="status" label="状态">
          <Select options={STATUS_OPTIONS} />
        </Form.Item>
      </Form>
    </Modal>
  );
}