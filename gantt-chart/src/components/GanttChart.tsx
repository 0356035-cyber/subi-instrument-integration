import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useDraggable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';
import { DragOutlined, EditOutlined } from '@ant-design/icons';
import { useCallback, useMemo } from 'react';
import type { DragMode, Subject, Task, TaskRiskState } from '../types';
import {
  deltaPixelsToMinutes,
  getPixelsPerMinute,
  getTimelineWidthPx,
  minutesToPixels,
} from '../utils/layout';
import { computeTaskLabelLayouts } from '../utils/taskLabel';
import { getTaskDisplayColor } from '../utils/taskType';
import { TaskBar } from './TaskBar';
import { TimeAxis } from './TimeAxis';

const LABEL_WIDTH = 156;
const ROW_HEIGHT = 56;

type GanttChartProps = {
  subjects: Subject[];
  tasks: Task[];
  settings: {
    viewStartMin: number;
    viewEndMin: number;
    displayGranularityMin: import('../types').DisplayGranularity;
    dragMode: DragMode;
  };
  taskRiskMap: Map<string, TaskRiskState>;
  highlightedTaskIds: Set<string>;
  onSelectTask: (id: string) => void;
  onEditSubject: (subjectId: string) => void;
  onMoveTask: (id: string, newStartMin: number) => void;
  onMoveSubjectWhole: (subjectId: string, deltaMin: number) => void;
};

function SubjectRowHandle({
  subjectId,
  firstTaskId,
  label,
  labelWidth,
  rowHeight,
  onEdit,
}: {
  subjectId: string;
  firstTaskId: string | undefined;
  label: string;
  labelWidth: number;
  rowHeight: number;
  onEdit: (id: string) => void;
}) {
  const canDragRow = !!firstTaskId;
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `row-${subjectId}`,
      disabled: !canDragRow,
    });

  const style = transform
    ? { transform: CSS.Translate.toString({ ...transform, x: 0, y: 0 }) }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      className={`gantt-row-label gantt-sticky-label ${canDragRow ? 'row-draggable' : ''} ${isDragging ? 'row-dragging' : ''}`}
      style={{ width: labelWidth, height: rowHeight, ...style }}
      title="拖动图标整体移动；铅笔可编辑或删除受试者"
    >
      {canDragRow && (
        <span className="row-drag-handle" {...listeners} {...attributes}>
          <DragOutlined className="row-drag-icon" />
        </span>
      )}
      <span className="row-label-text">{label}</span>
      <button
        type="button"
        className="row-edit-btn"
        title="编辑受试者信息"
        onClick={(e) => {
          e.stopPropagation();
          onEdit(subjectId);
        }}
      >
        <EditOutlined />
      </button>
    </div>
  );
}

export function GanttChart({
  subjects,
  tasks,
  settings,
  taskRiskMap,
  highlightedTaskIds,
  onSelectTask,
  onEditSubject,
  onMoveTask,
  onMoveSubjectWhole,
}: GanttChartProps) {
  const granularity = settings.displayGranularityMin;
  const timelineWidthPx = getTimelineWidthPx(
    settings.viewStartMin,
    settings.viewEndMin,
    granularity
  );
  const pxPerMin = getPixelsPerMinute(granularity);

  const rows = useMemo(
    () =>
      subjects.map((s) => ({
        id: s.id,
        label: `${s.id}${s.name ? ` · ${s.name}` : ''}`,
      })),
    [subjects]
  );

  const tasksByRow = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const row of rows) {
      map.set(row.id, []);
    }
    for (const task of tasks) {
      const list = map.get(task.subjectId) ?? [];
      list.push(task);
      map.set(task.subjectId, list);
    }
    return map;
  }, [rows, tasks]);

  const firstTaskBySubject = useMemo(() => {
    const map = new Map<string, string>();
    for (const [subjectId, subjectTasks] of tasksByRow) {
      const sorted = [...subjectTasks].sort((a, b) => a.startMin - b.startMin);
      if (sorted[0]) map.set(subjectId, sorted[0].id);
    }
    return map;
  }, [tasksByRow]);

  const gridSlotCount = useMemo(() => {
    return (settings.viewEndMin - settings.viewStartMin) / granularity;
  }, [settings, granularity]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, delta } = event;
      const id = String(active.id);
      const deltaMin = deltaPixelsToMinutes(delta.x, granularity);

      if (id.startsWith('row-')) {
        onMoveSubjectWhole(id.replace('row-', ''), deltaMin);
        return;
      }

      const task = tasks.find((t) => t.id === id);
      if (!task) return;
      onMoveTask(id, task.startMin + deltaMin);
    },
    [tasks, granularity, onMoveTask, onMoveSubjectWhole]
  );

  return (
    <DndContext
      sensors={sensors}
      modifiers={[restrictToHorizontalAxis]}
      onDragEnd={handleDragEnd}
    >
      <div className="gantt-scroll-hint">← 可左右滚动查看完整时间轴 →</div>
      <div className="gantt-scroll-container">
        <div
          className="gantt-chart"
          style={{ minWidth: LABEL_WIDTH + timelineWidthPx }}
        >
          <TimeAxis
            viewStartMin={settings.viewStartMin}
            viewEndMin={settings.viewEndMin}
            granularityMin={granularity}
            labelWidth={LABEL_WIDTH}
            timelineWidthPx={timelineWidthPx}
          />
          <div className="gantt-body">
            {rows.map((row) => (
              <div key={row.id} className="gantt-row">
                <SubjectRowHandle
                  subjectId={row.id}
                  firstTaskId={firstTaskBySubject.get(row.id)}
                  label={row.label}
                  labelWidth={LABEL_WIDTH}
                  rowHeight={ROW_HEIGHT}
                  onEdit={onEditSubject}
                />
                <div
                  className="gantt-timeline"
                  style={{
                    width: timelineWidthPx,
                    minWidth: timelineWidthPx,
                    height: ROW_HEIGHT,
                  }}
                >
                  {Array.from({ length: gridSlotCount + 1 }, (_, i) => (
                    <div
                      key={i}
                      className="grid-line"
                      style={{
                        left: i * (timelineWidthPx / gridSlotCount),
                      }}
                    />
                  ))}
                  {(() => {
                    const rowTasks = (tasksByRow.get(row.id) ?? []).flatMap(
                      (task) => {
                        const leftPx = minutesToPixels(
                          task.startMin,
                          settings.viewStartMin,
                          granularity
                        );
                        const widthPx = (task.endMin - task.startMin) * pxPerMin;

                        if (
                          task.endMin < settings.viewStartMin ||
                          task.startMin > settings.viewEndMin
                        ) {
                          return [];
                        }

                        return [{ task, leftPx, widthPx }];
                      }
                    );
                    const labelLayouts = computeTaskLabelLayouts(rowTasks);

                    return rowTasks.map(({ task, leftPx, widthPx }) => (
                      <TaskBar
                        key={task.id}
                        task={task}
                        taskColor={getTaskDisplayColor(task.taskType)}
                        leftPx={leftPx}
                        widthPx={widthPx}
                        rowHeight={ROW_HEIGHT}
                        labelLayout={
                          labelLayouts.get(task.id) ?? { mode: 'inside' }
                        }
                        risk={taskRiskMap.get(task.id)}
                        highlighted={highlightedTaskIds.has(task.id)}
                        onSelect={onSelectTask}
                      />
                    ));
                  })()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DndContext>
  );
}