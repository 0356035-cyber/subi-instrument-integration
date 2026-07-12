import { LockOutlined } from '@ant-design/icons';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Tooltip } from 'antd';
import type { Task, TaskRiskState } from '../types';
import { colorWithAlpha } from '../utils/color';
import {
  buildTaskTooltipLines,
  getTaskBarDisplayWidth,
  getTaskContentLabel,
  getVisitPointBarLabel,
  type TaskLabelLayout,
} from '../utils/taskLabel';

type TaskBarProps = {
  task: Task;
  taskColor: string;
  leftPx: number;
  widthPx: number;
  rowHeight: number;
  labelLayout: TaskLabelLayout;
  risk?: TaskRiskState;
  highlighted: boolean;
  onSelect: (taskId: string) => void;
};

export function TaskBar({
  task,
  taskColor,
  leftPx,
  widthPx,
  rowHeight,
  labelLayout,
  risk,
  highlighted,
  onSelect,
}: TaskBarProps) {
  const disabled = task.locked || !task.movable;

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: task.id,
      disabled,
    });

  let border = '1px solid rgba(0,0,0,0.15)';
  let background = taskColor;

  if (task.status === 'completed') {
    background = `${taskColor}88`;
  }
  if (risk?.resourceConflict) {
    background = '#ff4d4f';
    border = '2px solid #cf1322';
  }
  const boxShadow = highlighted
    ? '0 0 0 2px rgba(22,119,255,0.35)'
    : undefined;
  if (highlighted) {
    border = '2px solid #1677ff';
  }

  const barWidth = getTaskBarDisplayWidth(widthPx);
  const contentLabel = getTaskContentLabel(task);
  const visitPointLabel = getVisitPointBarLabel(task);
  const isNarrow = labelLayout.mode === 'above';
  const barTop = isNarrow ? 18 : 4;
  const barHeight = rowHeight - (isNarrow ? 22 : 8);

  const dragTransform = transform
    ? CSS.Translate.toString({ ...transform, y: 0 })
    : undefined;

  const tooltip = (
    <div className="task-tooltip">
      {buildTaskTooltipLines(task).map((line) => (
        <div key={line}>{line}</div>
      ))}
    </div>
  );

  const bar = (
    <div
      ref={setNodeRef}
      id={`task-bar-${task.id}`}
      className={`task-bar ${isNarrow ? 'compact' : ''} ${isDragging ? 'dragging' : ''} ${task.locked ? 'locked' : ''}`}
      style={{
        left: leftPx,
        width: barWidth,
        top: barTop,
        height: barHeight,
        background,
        border,
        boxShadow,
        transform: dragTransform,
        cursor: disabled ? 'not-allowed' : 'grab',
        opacity: isDragging ? 0.85 : task.status === 'completed' ? 0.65 : 1,
        zIndex: isDragging ? 20 : 2,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(task.id);
      }}
      {...listeners}
      {...attributes}
    >
      {task.locked && <LockOutlined className="task-lock" />}
      {labelLayout.mode === 'inside' ? (
        <span className="task-label">{contentLabel}</span>
      ) : (
        <span className="task-chip">{visitPointLabel}</span>
      )}
    </div>
  );

  return (
    <>
      <Tooltip title={tooltip} mouseEnterDelay={0.2}>
        {bar}
      </Tooltip>
      {isNarrow && (
        <div
          className="task-above-label"
          style={{
            left: leftPx,
            top: 0,
            width: barWidth,
            background: colorWithAlpha(taskColor, 0.22),
            borderColor: colorWithAlpha(taskColor, 0.42),
            color: '#262626',
          }}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(task.id);
          }}
        >
          {contentLabel}
        </div>
      )}
    </>
  );
}