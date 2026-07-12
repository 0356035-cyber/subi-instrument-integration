import { PlusOutlined } from '@ant-design/icons';
import { Button, Form, Input, Modal, TimePicker } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useState } from 'react';
import { useScheduleStore } from '../store/scheduleStore';
import { hhmmToMinutes } from '../utils/time';

export function AddSubjectButton() {
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const { addSubject, subjects, settings } = useScheduleStore();

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
    });
    setOpen(true);
  };

  const handleOk = async () => {
    const values = await form.validateFields();
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
        onCancel={() => setOpen(false)}
        okText="添加"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
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
        </Form>
      </Modal>
    </>
  );
}