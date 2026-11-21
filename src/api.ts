import AsyncStorage from '@react-native-async-storage/async-storage';
import { Folder, Project, Subtask, Task, TaskComment, TaskPriority, TaskRecurrence, TaskStatus, Tag, User } from './types';

const TOKEN_KEY = 'taskflow_mobile_token';
const USER_KEY = 'taskflow_mobile_user';
const SERVER_URL_KEY = 'taskflow_mobile_api_url';

let cachedToken: string | null = null;
let cachedServerUrl: string | null = null;

export function getDefaultApiBaseUrl(): string {
  if (typeof window !== 'undefined' && window.location?.hostname) {
    return `${window.location.protocol}//${window.location.hostname}/task_management/backend-php/api`;
  }
  return 'http://127.0.0.1/task_management/backend-php/api';
}

export function getApiBaseUrl(): string {
  if (cachedServerUrl && cachedServerUrl.trim()) {
    return cachedServerUrl.trim().replace(/\/+$/, '');
  }
  return getDefaultApiBaseUrl();
}

export async function loadPersistedConfig(): Promise<{ token: string | null; user: User | null; serverUrl: string }> {
  const [token, userJson, serverUrl] = await Promise.all([
    AsyncStorage.getItem(TOKEN_KEY),
    AsyncStorage.getItem(USER_KEY),
    AsyncStorage.getItem(SERVER_URL_KEY),
  ]);
  cachedToken = token;
  cachedServerUrl = serverUrl;
  let user: User | null = null;
  if (userJson) {
    try {
      user = JSON.parse(userJson);
    } catch {
      user = null;
    }
  }
  return {
    token,
    user,
    serverUrl: serverUrl || getDefaultApiBaseUrl(),
  };
}

export async function saveServerUrl(url: string): Promise<void> {
  const clean = url.trim().replace(/\/+$/, '');
  cachedServerUrl = clean || null;
  if (clean) {
    await AsyncStorage.setItem(SERVER_URL_KEY, clean);
  } else {
    await AsyncStorage.removeItem(SERVER_URL_KEY);
  }
}

export async function saveSession(token: string, user: User): Promise<void> {
  cachedToken = token;
  await Promise.all([
    AsyncStorage.setItem(TOKEN_KEY, token),
    AsyncStorage.setItem(USER_KEY, JSON.stringify(user)),
  ]);
}

export async function clearSession(): Promise<void> {
  cachedToken = null;
  await Promise.all([
    AsyncStorage.removeItem(TOKEN_KEY),
    AsyncStorage.removeItem(USER_KEY),
  ]);
}

function getHeaders(token?: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    headers['X-Auth-Token'] = token;
  }
  return headers;
}

async function apiFetch<T>(path: string, options: RequestInit = {}, authRequired = true): Promise<T> {
  const token = cachedToken;
  if (authRequired && !token) {
    throw new Error('Unauthorized');
  }
  const base = getApiBaseUrl();
  const sep = path.includes('?') ? '&' : '?';
  const url = token ? `${base}${path}${sep}auth_token=${encodeURIComponent(token)}` : `${base}${path}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      ...getHeaders(token),
      ...(options.headers as Record<string, string> | undefined),
    },
  });

  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Unexpected server response (HTTP ${res.status})`);
  }
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  token?: string;
  user?: User;
}

export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  const res = await apiFetch<AuthResponse>(
    '/auth/login.php',
    {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    },
    false
  );
  if (res.success && res.token && res.user) {
    await saveSession(res.token, res.user);
  }
  return res;
}

export async function registerUser(name: string, email: string, password: string): Promise<AuthResponse> {
  const res = await apiFetch<AuthResponse>(
    '/auth/register.php',
    {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    },
    false
  );
  if (res.success && res.token && res.user) {
    await saveSession(res.token, res.user);
  }
  return res;
}

export interface BootstrapResponse {
  success: boolean;
  message?: string;
  user?: User;
  tasks?: Task[];
  projects?: Project[];
  folders?: Folder[];
  sync_fingerprint?: string;
}

export async function getDashboardBootstrap(): Promise<BootstrapResponse> {
  return apiFetch<BootstrapResponse>('/dashboard/bootstrap.php', { method: 'GET' });
}

export async function checkSyncState(fingerprint: string): Promise<{
  success: boolean;
  has_changes?: boolean;
  fingerprint?: string;
}> {
  return apiFetch(`/sync/check.php?fingerprint=${encodeURIComponent(fingerprint)}`, {
    method: 'GET',
  });
}

export async function createTask(data: {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  category?: string;
  due_date?: string;
  recurrence?: TaskRecurrence;
  project_id?: number | null;
  subtasks?: string[];
  estimated_minutes?: number | null;
}): Promise<{ success: boolean; message?: string; task?: Task; sync_fingerprint?: string }> {
  return apiFetch('/tasks/create.php', {
    method: 'POST',
    body: JSON.stringify({ ...data, auth_token: cachedToken }),
  });
}

export async function batchCreateTasks(
  tasks: {
    title: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    category?: string;
    due_date?: string;
    recurrence?: TaskRecurrence;
    project_id?: number | null;
    subtasks?: string[];
    estimated_minutes?: number | null;
  }[]
): Promise<{ success: boolean; message?: string; tasks?: Task[]; sync_fingerprint?: string }> {
  return apiFetch('/tasks/batch_create.php', {
    method: 'POST',
    body: JSON.stringify({ tasks, auth_token: cachedToken }),
  });
}

export async function updateTask(data: {
  id: number;
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string | null;
  recurrence?: TaskRecurrence;
  project_id?: number | null;
  estimated_minutes?: number | null;
  tags?: (number | string | { id?: number; name: string; color?: string })[];
}): Promise<{ success: boolean; message?: string; task?: Task; sync_fingerprint?: string }> {
  return apiFetch('/tasks/update.php', {
    method: 'POST',
    body: JSON.stringify({ ...data, auth_token: cachedToken }),
  });
}

export async function deleteTask(id: number): Promise<{ success: boolean; message?: string; sync_fingerprint?: string }> {
  return apiFetch('/tasks/delete.php', {
    method: 'POST',
    body: JSON.stringify({ id, auth_token: cachedToken }),
  });
}

export async function createSubtask(
  taskId: number,
  title: string
): Promise<{ success: boolean; message?: string; subtask?: Subtask; sync_fingerprint?: string }> {
  return apiFetch('/subtasks/create.php', {
    method: 'POST',
    body: JSON.stringify({ task_id: taskId, title, auth_token: cachedToken }),
  });
}

export async function updateSubtask(
  id: number,
  data: { is_completed?: boolean; title?: string }
): Promise<{ success: boolean; message?: string; subtask?: Subtask; sync_fingerprint?: string }> {
  return apiFetch('/subtasks/update.php', {
    method: 'POST',
    body: JSON.stringify({ id, ...data, auth_token: cachedToken }),
  });
}

export async function deleteSubtask(
  id: number
): Promise<{ success: boolean; message?: string; sync_fingerprint?: string }> {
  return apiFetch('/subtasks/delete.php', {
    method: 'POST',
    body: JSON.stringify({ id, auth_token: cachedToken }),
  });
}

export async function getTags(): Promise<{ success: boolean; tags?: Tag[]; message?: string }> {
  return apiFetch('/tags/list.php', { method: 'GET' });
}

export async function createTag(
  name: string,
  color?: string
): Promise<{ success: boolean; tag?: Tag; message?: string }> {
  return apiFetch('/tags/create.php', {
    method: 'POST',
    body: JSON.stringify({ name, color, auth_token: cachedToken }),
  });
}

export async function getTaskComments(taskId: number): Promise<{
  success: boolean;
  comments?: TaskComment[];
  message?: string;
}> {
  return apiFetch(`/comments/list.php?task_id=${taskId}`, { method: 'GET' });
}

export async function createTaskComment(
  taskId: number,
  body: string
): Promise<{ success: boolean; comment?: TaskComment; message?: string }> {
  return apiFetch('/comments/create.php', {
    method: 'POST',
    body: JSON.stringify({ task_id: taskId, body, auth_token: cachedToken }),
  });
}

export async function deleteTaskComment(
  id: number
): Promise<{ success: boolean; message?: string }> {
  return apiFetch('/comments/delete.php', {
    method: 'POST',
    body: JSON.stringify({ id, auth_token: cachedToken }),
  });
}

