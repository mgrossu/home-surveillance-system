/**
 * frontend/src/api/backend.ts
 * Typed wrappers around the FastAPI backend endpoints.
 * Vite proxy forwards /api → http://localhost:8008 during dev.
 */

const BASE = '/api';

export interface BackendStatus {
  camera_enabled: boolean;
  recording: boolean;
  dev_mode: boolean;
  rtsp_url: string | null;
  stream_alive: boolean | null;
}

export interface RecordingFile {
  name: string;
  size_mb: number;
  created: string;
}

async function call<T>(path: string, method = 'GET'): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { method });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any).detail ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const backend = {
  status:         () => call<BackendStatus>('/status'),
  enableCamera:   () => call<{ camera_enabled: boolean }>('/camera/enable', 'POST'),
  disableCamera:  () => call<{ camera_enabled: boolean }>('/camera/disable', 'POST'),
  startRecording: () => call<{ recording: boolean; file: string }>('/recording/start', 'POST'),
  stopRecording:  () => call<{ recording: boolean }>('/recording/stop', 'POST'),
  recordings:     () => call<RecordingFile[]>('/recordings'),
  snapshotUrl:    () => `${BASE}/snapshot?t=${Date.now()}`,
};

export async function pingBackend(): Promise<boolean> {
  try {
    await backend.status();
    return true;
  } catch {
    return false;
  }
}
