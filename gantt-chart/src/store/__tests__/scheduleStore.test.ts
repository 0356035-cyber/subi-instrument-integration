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

describe('scheduleStore optimized subject preview', () => {
  beforeEach(() => {
    useScheduleStore.getState().resetSampleData();
  });

  it('does not write before confirmation and writes the previewed plan on commit', () => {
    const before = useScheduleStore.getState();
    const subjectCount = before.subjects.length;
    const candidate = before.previewOptimizedSubjects(
      1,
      720,
      960,
      5,
      before.settings.activeProjectId
    );

    expect(candidate).not.toBeNull();
    expect(candidate?.plan.unscheduledSubjectIds).toEqual([]);
    expect(useScheduleStore.getState().subjects).toHaveLength(subjectCount);

    useScheduleStore.getState().commitOptimizedSubjects(candidate!);
    expect(useScheduleStore.getState().subjects).toHaveLength(subjectCount + 1);
  });
});

describe('scheduleStore reschedule scheduled subjects', () => {
  beforeEach(() => {
    useScheduleStore.getState().resetSampleData();
  });

  it('keeps arrived subjects locked and only changes scheduled subjects after confirmation', () => {
    const before = useScheduleStore.getState();
    const arrived = before.subjects.find((subject) => subject.status === 'arrived')!;
    const candidate = before.previewRescheduleScheduledSubjects(
      540,
      1080,
      5,
      before.settings.activeProjectId
    );

    expect(candidate).not.toBeNull();
    expect(candidate?.subjects.every((subject) => subject.status === 'scheduled')).toBe(true);
    expect(useScheduleStore.getState().subjects.find((subject) => subject.id === arrived.id)?.arrivalMin)
      .toBe(arrived.arrivalMin);

    useScheduleStore.getState().commitRescheduledSubjects(candidate!);
    expect(useScheduleStore.getState().subjects.find((subject) => subject.id === arrived.id)?.arrivalMin)
      .toBe(arrived.arrivalMin);
  });
});

describe('scheduleStore insert and exact reschedule', () => {
  beforeEach(() => {
    useScheduleStore.getState().resetSampleData();
  });

  it('adds the new subject while preserving locked arrived subjects', async () => {
    const before = useScheduleStore.getState();
    const arrived = before.subjects.find((subject) => subject.status === 'arrived')!;
    const candidate = await before.previewInsertAndExactReschedule(
      1,
      540,
      1080,
      5,
      before.settings.activeProjectId
    );

    expect(candidate).not.toBeNull();
    expect(candidate?.newSubjects).toHaveLength(1);
    expect(useScheduleStore.getState().subjects).toHaveLength(before.subjects.length);

    useScheduleStore.getState().commitInsertAndExactReschedule(candidate!);
    const after = useScheduleStore.getState();
    expect(after.subjects).toHaveLength(before.subjects.length + 1);
    expect(after.subjects.find((subject) => subject.id === arrived.id)?.arrivalMin)
      .toBe(arrived.arrivalMin);
  });
});
