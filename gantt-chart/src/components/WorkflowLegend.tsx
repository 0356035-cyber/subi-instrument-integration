import { Typography } from 'antd';
import type { WorkflowStepTemplate } from '../types';
import { getTaskTypeLegendItems } from '../utils/taskType';

const { Text } = Typography;

export function WorkflowLegend({
  steps,
  projectName,
}: {
  steps: WorkflowStepTemplate[];
  projectName: string;
}) {
  const legendItems = getTaskTypeLegendItems(steps);

  return (
    <div className="workflow-legend">
      <Text type="secondary" style={{ fontSize: 12, marginRight: 8 }}>
        {projectName} · 环节配色：
      </Text>
      {legendItems.map((item) => (
        <span
          key={item.taskType}
          className="workflow-legend-item"
          title={item.label}
        >
          <span
            className="workflow-swatch"
            style={{ background: item.color }}
          />
          <Text style={{ fontSize: 12 }}>{item.label}</Text>
        </span>
      ))}
    </div>
  );
}