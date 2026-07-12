import { describe, expect, it } from 'vitest';
import { getInitialState } from '../../data/sampleData';
import {
  buildScheduleExportFilename,
  deserializePersistedSchedule,
  serializePersistedState,
} from '../persistence';

describe('persistence helpers', () => {
  it('round-trips schedule state', () => {
    const initial = getInitialState();
    const serialized = serializePersistedState(initial);
    const restored = deserializePersistedSchedule(serialized);

    expect(restored?.projects).toHaveLength(initial.projects.length);
    expect(restored?.subjects).toHaveLength(initial.subjects.length);
    expect(restored?.tasks).toHaveLength(initial.tasks.length);
    expect(restored?.settings.visitDate).toBe(initial.settings.visitDate);
  });

  it('rejects invalid payloads', () => {
    expect(deserializePersistedSchedule(null)).toBeNull();
    expect(deserializePersistedSchedule({ version: 99 })).toBeNull();
  });

  it('builds safe export filenames', () => {
    expect(buildScheduleExportFilename('2026-07-08', '皮肤临床研究', 'csv')).toBe(
      '皮肤临床研究-2026-07-08.csv'
    );
  });
});