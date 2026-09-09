import {
  deserializePersistedSchedule,
  serializePersistedState,
  type PersistedScheduleState,
  type ScheduleDomainState,
} from './persistence';

export const CLOUD_AUTH_KEY = 'clinical-gantt-auth-v1';
export const CLOUD_STATE_KEY = 'default';
const API_PREFIX = '/api';

export type CloudAuth = {
  accessToken: string;
  employeeId: string;
};

export type CloudStateMeta = {
  key: string;
  name: string;
  updatedBy: string;
  updatedAt: string | null;
  schedule: PersistedScheduleState | null;
  empty: boolean;
};

async function readError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { detail?: unknown };
    if (typeof data.detail === 'string') return data.detail;
    if (Array.isArray(data.detail)) {
      return data.detail
        .map((item) =>
          typeof item === 'object' && item && 'msg' in item
            ? String((item as { msg: unknown }).msg)
            : JSON.stringify(item)
        )
        .join('; ');
    }
  } catch {
    /* ignore */
  }
  if (res.status === 401) return '登录已过期或未登录';
  if (res.status === 403) return '当前账号没有保存排程的权限（需要编辑/管理员）';
  return `请求失败（${res.status}）`;
}

export function loadCloudAuth(): CloudAuth | null {
  try {
    const raw = localStorage.getItem(CLOUD_AUTH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CloudAuth;
    if (!parsed.accessToken || !parsed.employeeId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveCloudAuth(auth: CloudAuth): void {
  localStorage.setItem(CLOUD_AUTH_KEY, JSON.stringify(auth));
}

export function clearCloudAuth(): void {
  localStorage.removeItem(CLOUD_AUTH_KEY);
}

export async function checkCloudHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_PREFIX}/gantt/health`);
    if (!res.ok) return false;
    const data = (await res.json()) as { ok?: boolean };
    return data.ok === true;
  } catch {
    return false;
  }
}

export async function loginToCloud(
  employeeId: string,
  password: string
): Promise<CloudAuth> {
  const body = new URLSearchParams();
  body.set('username', employeeId.trim());
  body.set('password', password);
  const res = await fetch(`${API_PREFIX}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    throw new Error(await readError(res));
  }
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new Error('登录响应缺少 access_token');
  }
  const auth = { accessToken: data.access_token, employeeId: employeeId.trim() };
  saveCloudAuth(auth);
  return auth;
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

function extractSchedule(payload: unknown): PersistedScheduleState | null {
  const direct = deserializePersistedSchedule(payload);
  if (direct) return direct;
  if (payload && typeof payload === 'object' && 'payload' in payload) {
    return deserializePersistedSchedule((payload as { payload: unknown }).payload);
  }
  return null;
}

export async function fetchCloudState(
  token: string,
  key = CLOUD_STATE_KEY
): Promise<CloudStateMeta> {
  const res = await fetch(
    `${API_PREFIX}/gantt/state?key=${encodeURIComponent(key)}`,
    { headers: authHeaders(token) }
  );
  if (!res.ok) {
    throw new Error(await readError(res));
  }
  const data = (await res.json()) as {
    key: string;
    name: string;
    payload: unknown;
    updated_by?: string;
    updated_at?: string | null;
  };
  const schedule = extractSchedule(data.payload);
  const empty =
    !data.payload ||
    (typeof data.payload === 'object' &&
      data.payload !== null &&
      Object.keys(data.payload as object).length === 0);
  return {
    key: data.key,
    name: data.name,
    updatedBy: data.updated_by ?? '',
    updatedAt: data.updated_at ?? null,
    schedule,
    empty: empty || !schedule,
  };
}

export async function saveCloudState(
  token: string,
  domain: ScheduleDomainState,
  name = '临床检测排程',
  key = CLOUD_STATE_KEY
): Promise<CloudStateMeta> {
  const payload = serializePersistedState(domain);
  const res = await fetch(`${API_PREFIX}/gantt/state`, {
    method: 'PUT',
    headers: {
      ...authHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ key, name, payload }),
  });
  if (!res.ok) {
    throw new Error(await readError(res));
  }
  const data = (await res.json()) as {
    key: string;
    name: string;
    payload: unknown;
    updated_by?: string;
    updated_at?: string | null;
  };
  return {
    key: data.key,
    name: data.name,
    updatedBy: data.updated_by ?? '',
    updatedAt: data.updated_at ?? null,
    schedule: extractSchedule(data.payload),
    empty: false,
  };
}
