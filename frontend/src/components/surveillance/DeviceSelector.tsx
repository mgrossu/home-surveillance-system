import { Camera } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { VideoDevice } from '@/hooks/useCamera';

interface DeviceSelectorProps {
  devices: VideoDevice[];
  activeDeviceId: string | null;
  onDeviceChange: (deviceId: string) => void;
  disabled?: boolean;
}

export function DeviceSelector({
  devices,
  activeDeviceId,
  onDeviceChange,
  disabled = false,
}: DeviceSelectorProps) {
  return (
    <Select
      value={activeDeviceId || undefined}
      onValueChange={onDeviceChange}
      disabled={disabled}
    >
      <SelectTrigger className="w-full bg-secondary/50 border-border hover:bg-secondary transition-colors">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-primary" />
          <SelectValue placeholder="Select camera..." />
        </div>
      </SelectTrigger>
      <SelectContent className="bg-card border-border">
        {devices.length === 0 ? (
          <div className="px-3 py-2 text-sm text-muted-foreground">No cameras found</div>
        ) : (
          devices
            .filter(d => d.deviceId && d.deviceId.length > 0)
            .map((device, index) => (
              <SelectItem
                key={device.deviceId || `device-${index}`}
                value={device.deviceId}
                className="cursor-pointer hover:bg-secondary/50"
              >
                <span className="font-mono text-sm">{device.label}</span>
              </SelectItem>
            ))
        )}
      </SelectContent>
    </Select>
  );
}
