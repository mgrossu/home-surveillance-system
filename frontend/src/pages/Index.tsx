import { useState } from 'react';
import { Camera, Shield, Wifi, Clock, AlertTriangle, Server } from 'lucide-react';
import { CameraFeed } from '@/components/surveillance/CameraFeed';
import { DeviceSelector } from '@/components/surveillance/DeviceSelector';
import { ControlBar } from '@/components/surveillance/ControlBar';
import { useCamera } from '@/hooks/useCamera';
import { cn } from '@/lib/utils';

const Index = () => {
  const {
    stream,
    snapshotUrl,
    backendMode,
    backendStatus,
    devices,
    activeDeviceId,
    isLoading,
    error,
    isRecording,
    startStream,
    stopStream,
    switchDevice,
    toggleRecording,
    getDevices,
  } = useCamera();

  const [isFullscreen, setIsFullscreen] = useState(false);

  // Prod: "streaming" = snapshot is flowing. Dev: streaming = MediaStream exists.
  const isStreaming = backendMode ? !!snapshotUrl : !!stream;

  const handleStartStream  = async () => { await startStream(); };
  const handleDeviceChange = async (id: string) => { await switchDevice(id); };
  const handleRefresh      = async () => {
    await getDevices();
    if (activeDeviceId) await startStream(activeDeviceId);
  };

  return (
    <div className="min-h-screen bg-background p-4 lg:p-6">

      {/* Header */}
      <header className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
              <Camera className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">
                Surveillance Hub
              </h1>
              <p className="text-sm text-muted-foreground">
                Home security monitoring system
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-6">
            {backendMode ? (
              <>
                <StatusBadge icon={<Server className="w-4 h-4" />}  label="Backend" status="Connected"                                          variant="success" />
                <StatusBadge icon={<Wifi className="w-4 h-4" />}    label="RTSP"    status={backendStatus?.stream_alive ? 'Live' : 'Connecting'} variant={backendStatus?.stream_alive ? 'success' : 'warning'} />
                <StatusBadge icon={<Shield className="w-4 h-4" />}  label="Camera"  status={backendStatus?.camera_enabled ? 'Active' : 'Off'}    variant={backendStatus?.camera_enabled ? 'success' : 'warning'} />
              </>
            ) : (
              <>
                <StatusBadge icon={<Shield className="w-4 h-4" />} label="Mode"    status="Browser" variant="warning" />
                <StatusBadge icon={<Wifi className="w-4 h-4" />}   label="Network" status="Local"   variant="default" />
                <StatusBadge icon={<Clock className="w-4 h-4" />}  label="Backend" status="Offline" variant="error" />
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-4">

          <ControlBar
            isStreaming={isStreaming}
            isRecording={isRecording}
            isLoading={isLoading}
            onStartStream={handleStartStream}
            onStopStream={stopStream}
            onToggleRecording={toggleRecording}
            onRefresh={handleRefresh}
          />

          {error && (
            <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
              <div>
                <p className="text-sm font-medium text-destructive">
                  {backendMode ? 'Backend Error' : 'Camera Access Error'}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{error}</p>
              </div>
            </div>
          )}

          <div className={cn('transition-all duration-300', isFullscreen && 'fixed inset-4 z-50')}>
            <CameraFeed
              stream={stream}
              snapshotUrl={snapshotUrl}
              label={devices.find(d => d.deviceId === activeDeviceId)?.label || 'Primary Camera'}
              isActive={isStreaming}
              isRecording={isRecording}
              onFullscreen={() => setIsFullscreen(!isFullscreen)}
              isFullscreen={isFullscreen}
              className={cn(isFullscreen ? 'w-full h-full' : 'aspect-video')}
            />
          </div>

          {/* Multi-camera grid (dev mode only) */}
          {!backendMode && devices.length > 1 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {devices.slice(0, 4).map(device => (
                <button
                  key={device.deviceId}
                  onClick={() => handleDeviceChange(device.deviceId)}
                  className={cn(
                    'aspect-video rounded-lg border-2 transition-all duration-200 overflow-hidden',
                    device.deviceId === activeDeviceId
                      ? 'border-primary ring-2 ring-primary/20'
                      : 'border-border hover:border-primary/50',
                  )}
                >
                  <div className="w-full h-full bg-card flex items-center justify-center">
                    <div className="text-center">
                      <Camera className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
                      <span className="text-xs text-muted-foreground font-mono line-clamp-1 px-2">
                        {device.label}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="glass-panel p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Camera Source</h3>
            <DeviceSelector
              devices={devices}
              activeDeviceId={activeDeviceId}
              onDeviceChange={handleDeviceChange}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground mt-3">
              {devices.length} camera{devices.length !== 1 ? 's' : ''} detected
            </p>
          </div>

          <div className="glass-panel p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Quick Stats</h3>
            <div className="space-y-3">
              <StatRow label="Active Streams"   value={isStreaming ? '1' : '0'} />
              <StatRow label="Devices Online"   value={devices.length.toString()} />
              <StatRow label="Recording Status" value={isRecording ? 'Active' : 'Idle'} highlight={isRecording} />
              <StatRow label="Mode"             value={backendMode ? 'RPi / RTSP' : 'Browser / Dev'} />
            </div>
          </div>

          {backendMode && backendStatus?.rtsp_url && (
            <div className="glass-panel p-4">
              <h3 className="text-sm font-semibold text-foreground mb-2">RTSP Stream</h3>
              <p className="text-xs font-mono text-muted-foreground break-all">
                {backendStatus.rtsp_url}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Add this URL to Home Assistant Generic Camera or HomeKit Bridge.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Helper components (unchanged from Lovable) ───────────────────────────────

interface StatusBadgeProps {
  icon: React.ReactNode;
  label: string;
  status: string;
  variant?: 'default' | 'success' | 'warning' | 'error';
}
function StatusBadge({ icon, label, status, variant = 'default' }: StatusBadgeProps) {
  const styles = { default: 'text-muted-foreground', success: 'text-green-400', warning: 'text-amber-400', error: 'text-red-400' };
  return (
    <div className="flex items-center gap-2">
      <span className={cn('opacity-60', styles[variant])}>{icon}</span>
      <div className="text-right">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn('text-sm font-medium', styles[variant])}>{status}</p>
      </div>
    </div>
  );
}

interface StatRowProps { label: string; value: string; highlight?: boolean; }
function StatRow({ label, value, highlight = false }: StatRowProps) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn('text-sm font-mono', highlight ? 'text-warning' : 'text-foreground')}>{value}</span>
    </div>
  );
}

export default Index;
