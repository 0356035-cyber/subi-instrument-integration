import { beforeEach, describe, expect, it } from 'vitest';
import { useScheduleStore } from '../scheduleStore';

describe('scheduleStore deleteSubject', () => {
  beforeEach(() => {
    useScheduleStore.getState().resetSampleData();
  });

  it('removes subject and all associated tasks', () => {
    const subjectId = useScheduleStore.getState().subjects[0].id;
    const taskCountBefore = useScheduleStore.getState().tasks.length;
    const subjectTaskCount = useScheduleStore.getState().tasks.filter(
      (t) => t.subjectId === subjectId
    ).length;

    useScheduleStore.getState().deleteSubject(subjectId);

    const state = useScheduleStore.getState();
    expect(state.subjects.some((s) => s.id === subjectId)).toBe(false);
    expect(state.tasks.some((t) => t.subjectId === subjectId)).toBe(false);
    expect(state.tasks).toHaveLength(taskCountBefore - subjectTaskCount);
    expect(state.editingSubjectId).toBeNull();
  });

  it('clears selected task when it belonged to deleted subject', () => {
    const subjectId = useScheduleStore.getState().subjects[0].id;
    const taskId = useScheduleStore
      .getState()
      .tasks.find((t) => t.subjectId === subjectId)!.id;

    useScheduleStore.getState().selectTask(taskId);
    useScheduleStore.getState().deleteSubject(subjectId);

    expect(useScheduleStore.getState().selectedTaskId).toBeNull();
  });

  it('ignores unknown subject id', () => {
    const before = useScheduleStore.getState().subjects.length;
    useScheduleStore.getState().deleteSubject('S999');
    expect(useScheduleStore.getState().subjects).toHaveLength(before);
  });
});