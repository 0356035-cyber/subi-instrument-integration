import { DeleteOutlined } from '@ant-design/icons';
import { Button, Form, Input, Modal, Popconfirm, Select, Space, TimePicker } from 'antd';
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
    deleteSubject,
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

  const handleDelete = () => {
    if (!subject) return;
    deleteSubject(subject.id);
    closeSubjectEditor();
  };

  return (
    <Modal
      title={subject ? `受试者信息 · ${subject.id}` : ''}
      open={!!editingSubjectId}
      onCancel={closeSubjectEditor}
      destroyOnClose
      footer={
        <div className="subject-modal-footer">
          <Popconfirm
            title="确定删除该受试者？"
            description="将一并删除其全部排程任务，且不可恢复。"
            onConfirm={handleDelete}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button danger icon={<DeleteOutlined />}>
              删除受试者
            </Button>
          </Popconfirm>
          <Space>
            <Button onClick={closeSubjectEditor}>取消</Button>
            <Button type="primary" onClick={handleOk}>
              保存
            </Button>
          </Space>
        </div>
      }
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