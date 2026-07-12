import { describe, expect, it } from 'vitest';
import { getInitialState } from '../../data/sampleData';
import { parseScheduleJSON } from '../export';
import { serializePersistedState } from '../persistence';

describe('export helpers', () => {
  it('parses exported JSON schedule backups', () => {
    const initial = getInitialState();
    const json = JSON.stringify(serializePersistedState(initial));
    const parsed = parseScheduleJSON(json);

    expect(parsed?.subjects).toHaveLength(initial.subjects.length);
    expect(parsed?.tasks).toHaveLength(initial.tasks.length);
  });

  it('returns null for invalid JSON', () => {
    expect(parseScheduleJSON('not-json')).toBeNull();
  });
});