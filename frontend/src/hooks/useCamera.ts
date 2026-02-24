/**
 * frontend/src/hooks/useCamera.ts — drop-in replacement for the Lovable original
 *
 * Auto-detects mode on mount by pinging the backend:
 *
 *  DEV MODE  (backend unreachable) → pure getUserMedia, identical to original
 *  PROD MODE (backend reachable)   → snapshot polling + REST API control
 *
 * Exports the same interface as the original hook so Index.tsx, CameraFeed,
 * ControlBar, and DeviceSelector need zero changes — except Index.tsx passes
 * the two new fields (snapshotUrl, backendMode) to CameraFeed.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { backend, pingBackend, BackendStatus } from '@/api/backend';

export interface VideoDevice {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
}

export interface CameraState {
  stream: MediaStream | null;
  devices: VideoDevice[];
  activeDeviceId: string | null;
  isLoading: boolean;
  error: string | null;
  isRecording: boolean;
}

const BACKEND_DEVICE: VideoDevice = {
  deviceId: 'backend',
  label: 'RPi Camera (backend)',
  kind: 'videoinput',
};

export function useCamera() {
  const [backendMode, setBackendMode]     = useState(false);
  const [backendStatus, setBackendStatus] = useState<BackendStatus | null>(null);
  const [snapshotUrl, setSnapshotUrl]     = useState<string | null>(null);

  const [state, setState] = useState<CameraState>({
    stream: null,
    devices: [],
    activeDeviceId: null,
    isLoading: false,
    error: null,
    isRecording: false,
  });

  const streamRef        = useRef<MediaStream | null>(null);
  const snapshotTimer    = useRef<ReturnType<typeof setInterval> | null>(null);
  const modeResolved     = useRef(false);

  // ── Snapshot polling ──────────────────────────────────────────────────────

  const startSnapshots = useCallback(() => {
    if (snapshotTimer.current) return;
    snapshotTimer.current = setInterval(
      () => setSnapshotUrl(backend.snapshotUrl()),
      100,
    );
  }, []);

  const stopSnapshots = useCallback(() => {
    if (snapshotTimer.current) {
      clearInterval(snapshotTimer.current);
      snapshotTimer.current = null;
    }
    setSnapshotUrl(null);
  }, []);

  // ── Backend status poll (prod only) ───────────────────────────────────────

  useEffect(() => {
    if (!backendMode) return;
    const poll = async () => {
      try {
        const s = await backend.status();
        setBackendStatus(s);
        setState(prev => ({ ...prev, isRecording: s.recording }));
      } catch { /* backend temporarily unreachable */ }
    };
    poll();
    const id = setInterval(poll, 3000);
    return () => clearInterval(id);
  }, [backendMode]);

  // ── PROD actions ──────────────────────────────────────────────────────────

  const startStreamProd = useCallback(async (_deviceId?: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      await backend.enableCamera();
      startSnapshots();
      setState(prev => ({ ...prev, isLoading: false, activeDeviceId: 'backend' }));
    } catch (err) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Backend error',
      }));
    }
  }, [startSnapshots]);

  const stopStreamProd = useCallback(async () => {
    stopSnapshots();
    try { await backend.disableCamera(); } catch { /* best-effort */ }
    setState(prev => ({ ...prev, activeDeviceId: null, isRecording: false }));
  }, [stopSnapshots]);

  const toggleRecordingProd = useCallback(async () => {
    try {
      if (state.isRecording) {
        await backend.stopRecording();
        setState(prev => ({ ...prev, isRecording: false }));
      } else {
        await backend.startRecording();
        setState(prev => ({ ...prev, isRecording: true }));
      }
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Recording error',
      }));
    }
  }, [state.isRecording]);

  const getDevicesProd = useCallback(async () => {
    setState(prev => ({ ...prev, devices: [BACKEND_DEVICE] }));
    return [BACKEND_DEVICE];
  }, []);

  // ── DEV actions (original useCamera logic, verbatim) ─────────────────────

  const getDevicesDev = useCallback(async () => {
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = all
        .filter(d => d.kind === 'videoinput')
        .map((d, i) => ({
          deviceId: d.deviceId,
          label: d.label || `Camera ${i + 1}`,
          kind: d.kind as MediaDeviceKind,
        }));
      setState(prev => ({ ...prev, devices: videoDevices }));
      return videoDevices;
    } catch {
      return [];
    }
  }, []);

  const startStreamDev = useCallback(async (deviceId?: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    try {
      const constraints: MediaStreamConstraints = {
        video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: 'environment' },
        audio: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      const settings = stream.getVideoTracks()[0].getSettings();
      setState(prev => ({
        ...prev,
        stream,
        activeDeviceId: settings.deviceId || deviceId || null,
        isLoading: false,
        error: null,
      }));
      await getDevicesDev();
      return stream;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to access camera';
      setState(prev => ({ ...prev, stream: null, isLoading: false, error: errorMessage }));
      return null;
    }
  }, [getDevicesDev]);

  const stopStreamDev = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setState(prev => ({ ...prev, stream: null, activeDeviceId: null, isRecording: false }));
  }, []);

  const toggleRecordingDev = useCallback(() => {
    setState(prev => ({ ...prev, isRecording: !prev.isRecording }));
  }, []);

  // ── Mount: detect mode ────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const isProd = await pingBackend();
      if (cancelled) return;

      modeResolved.current = true;
      setBackendMode(isProd);

      if (isProd) {
        setState(prev => ({ ...prev, devices: [BACKEND_DEVICE] }));
      } else {
        await getDevicesDev();
      }
    };

    init();

    return () => {
      cancelled = true;
      stopSnapshots();
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dev: listen for device hotplug
  useEffect(() => {
    if (backendMode || !modeResolved.current) return;
    const handler = () => getDevicesDev();
    navigator.mediaDevices.addEventListener('devicechange', handler);
    return () => navigator.mediaDevices.removeEventListener('devicechange', handler);
  }, [backendMode, getDevicesDev]);

  // ── Unified API ───────────────────────────────────────────────────────────

  const startStream     = backendMode ? startStreamProd     : startStreamDev;
  const stopStream      = backendMode ? stopStreamProd      : stopStreamDev;
  const toggleRecording = backendMode ? toggleRecordingProd : toggleRecordingDev;
  const getDevices      = backendMode ? getDevicesProd      : getDevicesDev;
  const switchDevice    = useCallback(
    (id: string) => startStream(id),
    [startStream],
  );

  return {
    ...state,
    snapshotUrl,
    backendMode,
    backendStatus,
    startStream,
    stopStream,
    switchDevice,
    toggleRecording,
    getDevices,
  };
}
