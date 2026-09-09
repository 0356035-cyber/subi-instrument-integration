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
    const initial = useScheduleStore.getState();
    initial.updateSubject(initial.subjects[0].id, { status: 'arrived' });
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

describe('scheduleStore workflow copy and apply', () => {
  beforeEach(() => {
    useScheduleStore.getState().resetSampleData();
  });

  it('copies an existing subject timeline onto a new subject', () => {
    const before = useScheduleStore.getState();
    const source = before.subjects[0];
    const sourceFirst = before.tasks
      .filter((task) => task.subjectId === source.id)
      .sort((a, b) => a.startMin - b.startMin)[0];

    before.addSubject('复制对象', source.arrivalMin + 45, source.projectId, source.id);

    const after = useScheduleStore.getState();
    const added = after.subjects.find((subject) => subject.name === '复制对象')!;
    const copied = after.tasks
      .filter((task) => task.subjectId === added.id)
      .sort((a, b) => a.startMin - b.startMin);
    expect(copied).toHaveLength(
      before.tasks.filter((task) => task.subjectId === source.id).length
    );
    expect(copied[0].startMin).toBe(sourceFirst.startMin + 45);
    expect(copied.map((task) => task.workflowStepId)).toEqual(
      before.tasks
        .filter((task) => task.subjectId === source.id)
        .sort((a, b) => a.startMin - b.startMin)
        .map((task) => task.workflowStepId)
    );
  });

  it('applies one subject workflow to the project template and other subjects', () => {
    const store = useScheduleStore.getState();
    const source = store.subjects[0];
    const project = store.projects.find((item) => item.id === source.projectId)!;
    const reversed = [...project.workflowSteps].reverse();
    store.saveProjectWorkflow(project.id, reversed);

    const afterSave = useScheduleStore.getState();
    const sourceTasks = afterSave.tasks.filter((task) => task.subjectId === source.id);
    const other = afterSave.subjects.find((subject) => subject.id !== source.id)!;
    afterSave.moveTask(sourceTasks[0].id, sourceTasks[0].startMin + 10);

    const ok = useScheduleStore.getState().applySubjectWorkflowToProject(source.id);
    expect(ok).toBe(true);
    const after = useScheduleStore.getState();
    const otherTasks = after.tasks
      .filter((task) => task.subjectId === other.id)
      .sort((a, b) => a.startMin - b.startMin);
    const newSourceTasks = after.tasks
      .filter((task) => task.subjectId === source.id)
      .sort((a, b) => a.startMin - b.startMin);
    expect(otherTasks.map((task) => task.workflowStepId)).toEqual(
      newSourceTasks.map((task) => task.workflowStepId)
    );
  });
});

describe('scheduleStore clear workflow and resources', () => {
  beforeEach(() => {
    useScheduleStore.getState().resetSampleData();
  });

  it('clears the active project workflow and regenerates empty subject tasks', () => {
    const before = useScheduleStore.getState();
    const projectId = before.settings.activeProjectId;
    expect(before.projects[0].workflowSteps.length).toBeGreaterThan(0);
    expect(before.tasks.length).toBeGreaterThan(0);

    before.clearProjectWorkflow(projectId);

    const after = useScheduleStore.getState();
    expect(after.projects.find((project) => project.id === projectId)?.workflowSteps).toEqual([]);
    expect(after.tasks.filter((task) => after.subjects.some((subject) => subject.id === task.subjectId && subject.projectId === projectId))).toEqual([]);
    expect(after.resources.length).toBeGreaterThan(0);
  });

  it('clears all resources and unlinks them from workflow steps', () => {
    const before = useScheduleStore.getState();
    expect(before.resources.length).toBeGreaterThan(0);
    expect(before.projects[0].workflowSteps.some((step) => step.resourceIds.length > 0)).toBe(true);

    before.clearAllResources();

    const after = useScheduleStore.getState();
    expect(after.resources).toEqual([]);
    expect(after.projects.every((project) => project.workflowSteps.every((step) => step.resourceIds.length === 0))).toBe(true);
  });
});

describe('scheduleStore insert and exact reschedule', () => {
  beforeEach(() => {
    useScheduleStore.getState().resetSampleData();
  });

  it('adds the new subject while preserving locked arrived subjects', async () => {
    const initial = useScheduleStore.getState();
    initial.updateSubject(initial.subjects[0].id, { status: 'arrived' });
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
