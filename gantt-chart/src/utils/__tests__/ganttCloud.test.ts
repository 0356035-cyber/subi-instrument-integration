import { describe, expect, it } from 'vitest';
import {
  CLOUD_AUTH_KEY,
  clearCloudAuth,
  loadCloudAuth,
  saveCloudAuth,
} from '../ganttCloud';

describe('ganttCloud auth storage', () => {
  it('round-trips auth and clears it', () => {
    saveCloudAuth({ accessToken: 'tok', employeeId: '3267' });
    expect(loadCloudAuth()).toEqual({
      accessToken: 'tok',
      employeeId: '3267',
    });
    expect(localStorage.getItem(CLOUD_AUTH_KEY)).toContain('3267');
    clearCloudAuth();
    expect(loadCloudAuth()).toBeNull();
  });
});
