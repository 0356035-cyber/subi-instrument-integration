import { CloseOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { Button, Descriptions, Empty, Typography } from 'antd';
import { useScheduleStore } from '../store/scheduleStore';
import { getTaskTypeLabel } from '../utils/taskType';
import { formatMinuteRange } from '../utils/time';

const { Text, Title } = Typography;

export function TaskSelectionPanel() {
  const { selectedTaskId, tasks, subjects, resources, selectTask } =
    useScheduleStore();
  const task = tasks.find((t) => t.id === selectedTaskId);
  const subject = task
    ? subjects.find((s) => s.id === task.subjectId)
    : undefined;

  if (!task) {
    return (
      <div className="task-selection-panel">
        <Title level={5}>
          <InfoCircleOutlined /> 环节详情
        </Title>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="点击甘特条查看完整环节信息"
        />
      </div>
    );
  }

  const resourceNames = task.resourceIds
    .map((id) => resources.find((r) => r.id === id)?.name ?? id)
    .join('、');

  return (
    <div className="task-selection-panel">
      <div className="task-selection-header">
        <Title level={5} style={{ margin: 0 }}>
          <InfoCircleOutlined /> 环节详情
        </Title>
        <Button
          type="text"
          size="small"
          icon={<CloseOutlined />}
          onClick={() => selectTask(null)}
          aria-label="关闭"
        />
      </div>
      <Descriptions size="small" column={1} bordered>
        <Descriptions.Item label="受试者">
          {task.subjectId}
          {subject?.name ? ` · ${subject.name}` : ''}
        </Descriptions.Item>
        <Descriptions.Item label="环节">{task.name}</Descriptions.Item>
        <Descriptions.Item label="类型">
          {getTaskTypeLabel(task.taskType)}
        </Descriptions.Item>
        <Descriptions.Item label="时间">
          {formatMinuteRange(task.startMin, task.endMin)}
        </Descriptions.Item>
        <Descriptions.Item label="时长">{task.durationMin} 分钟</Descriptions.Item>
        {task.visitPoint && task.visitPoint !== 'Other' && (
          <Descriptions.Item label="访视点">{task.visitPoint}</Descriptions.Item>
        )}
        <Descriptions.Item label="资源">
          {resourceNames || <Text type="secondary">未指定</Text>}
        </Descriptions.Item>
        <Descriptions.Item label="状态">{task.status}</Descriptions.Item>
      </Descriptions>
      <Text type="secondary" className="task-selection-hint">
        窄环节色块内显示访视点，上方居中显示完整项目内容；悬停可看时间与详情。
      </Text>
    </div>
  );
}