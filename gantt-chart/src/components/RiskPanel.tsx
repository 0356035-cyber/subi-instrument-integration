import { AlertOutlined, WarningOutlined } from '@ant-design/icons';
import { Badge, Empty, List, Tag, Typography } from 'antd';
import type { Conflict } from '../types';
import { useScheduleStore } from '../store/scheduleStore';

const { Text, Title } = Typography;

export function RiskPanel() {
  const { conflicts, highlightTasks, clearHighlight } = useScheduleStore();

  const resourceConflicts = conflicts.filter(
    (c) => c.type === 'resource_conflict'
  );

  return (
    <div className="risk-panel">
      <Title level={5}>
        <AlertOutlined /> 风险提示
        <Badge
          count={resourceConflicts.length}
          style={{ marginLeft: 8 }}
          showZero
          color={resourceConflicts.length > 0 ? '#ff4d4f' : '#52c41a'}
        />
      </Title>

      <Text type="secondary" className="risk-hint">
        P0 阶段仅展示资源冲突（P1 将加入时间窗 / 依赖检测）
      </Text>

      {resourceConflicts.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="暂无资源冲突"
        />
      ) : (
        <List
          size="small"
          dataSource={resourceConflicts}
          renderItem={(item: Conflict) => (
            <List.Item
              className="risk-item"
              onMouseEnter={() =>
                highlightTasks(
                  [item.taskId, item.relatedTaskId].filter(Boolean) as string[]
                )
              }
              onMouseLeave={clearHighlight}
              onClick={() =>
                highlightTasks(
                  [item.taskId, item.relatedTaskId].filter(Boolean) as string[]
                )
              }
            >
              <div>
                <Tag color="red" icon={<WarningOutlined />}>
                  资源冲突
                </Tag>
                <Text>{item.message}</Text>
                {item.overlapMin != null && (
                  <Text type="secondary"> （重叠 {item.overlapMin} min）</Text>
                )}
              </div>
            </List.Item>
          )}
        />
      )}
    </div>
  );
}