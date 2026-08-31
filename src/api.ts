import type { Annotation, AnnotationStatus, PendingAnnotation, ProjectState } from './types';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || '请求失败');
  return payload as T;
}

export const api = {
  session: () => request<{ authenticated: boolean; user: string | null }>('/api/session'),
  login: (name: string, code: string) => request<{ authenticated: boolean; user: string }>('/api/login', { method: 'POST', body: JSON.stringify({ name, code }) }),
  logout: () => request<{ ok: boolean }>('/api/logout', { method: 'POST', body: '{}' }),
  state: () => request<ProjectState>('/api/state'),
  createAnnotation: (selection: PendingAnnotation, note: string) => request<Annotation>('/api/annotations', { method: 'POST', body: JSON.stringify({ ...selection, taskId: null, note }) }),
  updateAnnotation: (id: string, body: { status: AnnotationStatus }) => request<Annotation>(`/api/annotations/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteAnnotation: (id: string) => request<{ ok: boolean }>(`/api/annotations/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  reply: (id: string, text: string, parentId?: string) => request(`/api/annotations/${encodeURIComponent(id)}/comments`, { method: 'POST', body: JSON.stringify({ text, parentId: parentId || null }) }),
  deleteComment: (annotationId: string, commentId: string) => request<{ ok: boolean; mode: 'removed' | 'tombstone' }>(`/api/annotations/${encodeURIComponent(annotationId)}/comments/${encodeURIComponent(commentId)}`, { method: 'DELETE' })
};
