import { Typography } from 'antd';
import type { WorkflowStepTemplate } from '../types';
import { getTaskTypeLabel } from '../utils/taskType';

const { Text } = Typography;

export function WorkflowLegend({
  steps,
  projectName,
}: {
  steps: WorkflowStepTemplate[];
  projectName: string;
}) {
  const sorted = [...steps].sort((a, b) => a.order - b.order);

  return (
    <div className="workflow-legend">
      <Text type="secondary" style={{ fontSize: 12, marginRight: 8 }}>
        {projectName} · 环节配色：
      </Text>
      {sorted.map((step) => (
        <span
          key={step.id}
          className="workflow-legend-item"
          title={`${step.name}（${getTaskTypeLabel(step.taskType)}）`}
        >
          <span
            className="workflow-swatch"
            style={{ background: step.color }}
          />
          <Text style={{ fontSize: 12 }}>{step.name}</Text>
        </span>
      ))}
    </div>
  );
}