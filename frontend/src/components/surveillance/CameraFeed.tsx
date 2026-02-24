import { useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2, Video, VideoOff, Circle, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CameraFeedProps {
  stream: MediaStream | null;
  snapshotUrl?: string | null;   // prod mode: polling JPEG from /api/snapshot
  label: string;
  isActive?: boolean;
  isRecording?: boolean;
  onFullscreen?: () => void;
  isFullscreen?: boolean;
  className?: string;
}

export function CameraFeed({
  stream,
  snapshotUrl,
  label,
  isActive = false,
  isRecording = false,
  onFullscreen,
  isFullscreen = false,
  className,
}: CameraFeedProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Dev mode: attach MediaStream to <video>
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
    } else if (videoRef.current) {
      videoRef.current.srcObject = null;
      setIsPlaying(false);
    }
  }, [stream]);

  const hasSignal = !!stream || !!snapshotUrl;

  return (
    <div
      className={cn(
        'camera-feed group relative aspect-video transition-all duration-300',
        hasSignal && 'camera-feed-active',
        className,
      )}
    >
      {/* Prod mode: snapshot <img> */}
      {snapshotUrl && !stream && (
        <img
          src={snapshotUrl}
          alt="Camera feed"
          className="w-full h-full object-cover rounded-lg"
        />
      )}

      {/* Dev mode: live <video> */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={cn(
          'w-full h-full object-cover rounded-lg',
          snapshotUrl && !stream ? 'hidden' : 'block',
        )}
      />

      {/* No signal overlay */}
      {!hasSignal && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-card rounded-lg">
          <VideoOff className="w-12 h-12 text-muted-foreground mb-3" />
          <p className="text-muted-foreground text-sm">No signal</p>
        </div>
      )}

      {/* Scan line (active) */}
      {hasSignal && isActive && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-lg">
          <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent animate-scan" />
        </div>
      )}

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 p-3 flex items-center justify-between bg-gradient-to-b from-background/80 to-transparent rounded-t-lg">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'status-indicator',
              hasSignal
                ? isRecording ? 'status-recording' : 'status-online'
                : 'status-offline',
            )}
          />
          <span className="text-xs font-mono font-medium text-foreground/90">{label}</span>
        </div>

        {isRecording && (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-destructive/20 rounded-full">
            <Circle className="w-2 h-2 fill-destructive text-destructive" />
            <span className="text-xs font-mono text-destructive">REC</span>
          </div>
        )}
      </div>

      {/* Bottom controls (hover) */}
      <div className="absolute bottom-0 left-0 right-0 p-3 flex items-center justify-between bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-b-lg">
        <div className="flex items-center gap-2">
          {hasSignal
            ? <Video className="w-4 h-4 text-primary" />
            : <VideoOff className="w-4 h-4 text-muted-foreground" />}
          <span className="text-xs text-muted-foreground font-mono">
            {hasSignal ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button className="control-button">
            <Settings className="w-4 h-4" />
          </button>
          {onFullscreen && (
            <button onClick={onFullscreen} className="control-button">
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Timestamp */}
      {hasSignal && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
          <LiveTimestamp />
        </div>
      )}
    </div>
  );
}

function LiveTimestamp() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="text-xs font-mono text-foreground/70 bg-background/60 px-2 py-0.5 rounded">
      {time.toLocaleTimeString()}
    </span>
  );
}
