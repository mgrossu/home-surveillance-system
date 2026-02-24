import { Play, Pause, Circle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ControlBarProps {
  isStreaming: boolean;
  isRecording: boolean;
  isLoading: boolean;
  onStartStream: () => void;
  onStopStream: () => void;
  onToggleRecording: () => void;
  onRefresh: () => void;
  className?: string;
}

export function ControlBar({
  isStreaming,
  isRecording,
  isLoading,
  onStartStream,
  onStopStream,
  onToggleRecording,
  onRefresh,
  className,
}: ControlBarProps) {
  return (
    <div className={cn('glass-panel p-4', className)}>
      <div className="flex items-center gap-3">
        {/* Play/Stop */}
        <Button
          onClick={isStreaming ? onStopStream : onStartStream}
          disabled={isLoading}
          size="lg"
          className={cn(
            'min-w-[120px]',
            isStreaming
              ? 'bg-destructive/20 text-destructive hover:bg-destructive/30 border border-destructive/30'
              : 'bg-primary text-primary-foreground hover:bg-primary/90',
          )}
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin mr-2" />
              Loading...
            </>
          ) : isStreaming ? (
            <><Pause className="w-4 h-4 mr-2" />Stop</>
          ) : (
            <><Play className="w-4 h-4 mr-2" />Start</>
          )}
        </Button>

        {/* Record */}
        <Button
          onClick={onToggleRecording}
          disabled={!isStreaming}
          variant="outline"
          size="lg"
          className={cn(
            'min-w-[120px] border-border',
            isRecording
              ? 'bg-warning/20 text-warning border-warning/30 hover:bg-warning/30'
              : 'hover:bg-secondary',
          )}
        >
          <Circle className={cn('w-4 h-4 mr-2', isRecording && 'fill-warning animate-pulse-glow')} />
          {isRecording ? 'Recording' : 'Record'}
        </Button>

        {/* Refresh */}
        <Button
          onClick={onRefresh}
          variant="outline"
          size="icon"
          className="border-border hover:bg-secondary"
        >
          <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
        </Button>

        {/* Status pill */}
        <div className="ml-auto flex items-center gap-2">
          <div className={cn('status-indicator', isStreaming ? 'status-online' : 'status-offline')} />
          <span className="text-xs font-mono text-muted-foreground">
            {isStreaming ? 'STREAMING' : 'STANDBY'}
          </span>
        </div>
      </div>
    </div>
  );
}
