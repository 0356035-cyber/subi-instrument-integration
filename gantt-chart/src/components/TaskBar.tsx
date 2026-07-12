import { LockOutlined } from '@ant-design/icons';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Tooltip } from 'antd';
import type { Task, TaskRiskState } from '../types';
import {
  buildTaskTooltipLines,
  getTaskBarDisplayWidth,
  getTaskShortLabel,
  shouldShowOutsideLabel,
} from '../utils/taskLabel';
import { formatMinuteRange } from '../utils/time';

type TaskBarProps = {
  task: Task;
  taskColor: string;
  leftPx: number;
  widthPx: number;
  rowHeight: number;
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
  const outsideLabel = shouldShowOutsideLabel(widthPx);
  const barHeight = rowHeight - 8;

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
      className={`task-bar ${outsideLabel ? 'compact' : ''} ${isDragging ? 'dragging' : ''} ${task.locked ? 'locked' : ''}`}
      style={{
        left: leftPx,
        width: barWidth,
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
      {outsideLabel ? (
        <span className="task-chip">{getTaskShortLabel(task)}</span>
      ) : (
        <>
          <span className="task-label">
            <strong>{task.subjectId}</strong> {task.name}
            {task.visitPoint && task.visitPoint !== 'Other' && (
              <em className="visit-point"> [{task.visitPoint}]</em>
            )}
          </span>
          <span className="task-time">
            {formatMinuteRange(task.startMin, task.endMin)}
          </span>
        </>
      )}
    </div>
  );

  return (
    <>
      <Tooltip title={tooltip} mouseEnterDelay={0.2}>
        {bar}
      </Tooltip>
      {outsideLabel && (
        <div
          className="task-outside-label"
          style={{
            left: leftPx + barWidth + 4,
            top: 4,
            height: barHeight,
          }}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(task.id);
          }}
        >
          <span className="task-outside-name">{task.name}</span>
          <span className="task-outside-time">
            {formatMinuteRange(task.startMin, task.endMin)}
          </span>
        </div>
      )}
    </>
  );
}