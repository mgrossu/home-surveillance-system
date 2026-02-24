import { useState } from 'react';
import { Home, Link2, Unlink, ExternalLink, Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface HomeAssistantPanelProps {
  className?: string;
}

export function HomeAssistantPanel({ className }: HomeAssistantPanelProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [haUrl, setHaUrl] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleConnect = async () => {
    if (!haUrl || !accessToken) return;
    
    setIsConnecting(true);
    // Simulate connection attempt
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsConnected(true);
    setIsConnecting(false);
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setHaUrl('');
    setAccessToken('');
  };

  const copyStreamUrl = () => {
    navigator.clipboard.writeText(window.location.origin + '/api/stream');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn('glass-panel p-5', className)}>
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 rounded-lg bg-primary/10">
          <Home className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Home Assistant</h3>
          <p className="text-xs text-muted-foreground">Integration Status</p>
        </div>
        <div className="ml-auto">
          <div
            className={cn(
              'status-indicator',
              isConnected ? 'status-online' : 'status-offline'
            )}
          />
        </div>
      </div>

      {!isConnected ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ha-url" className="text-xs text-muted-foreground">
              Home Assistant URL
            </Label>
            <Input
              id="ha-url"
              type="url"
              placeholder="http://homeassistant.local:8123"
              value={haUrl}
              onChange={(e) => setHaUrl(e.target.value)}
              className="bg-secondary/50 border-border font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="access-token" className="text-xs text-muted-foreground">
              Long-Lived Access Token
            </Label>
            <Input
              id="access-token"
              type="password"
              placeholder="Enter your access token..."
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              className="bg-secondary/50 border-border font-mono text-sm"
            />
          </div>

          <Button
            onClick={handleConnect}
            disabled={!haUrl || !accessToken || isConnecting}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isConnecting ? (
              <>
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                Connecting...
              </>
            ) : (
              <>
                <Link2 className="w-4 h-4 mr-2" />
                Connect
              </>
            )}
          </Button>

          <div className="pt-3 border-t border-border">
            <a
              href="https://www.home-assistant.io/docs/authentication/#your-account-profile"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              How to get an access token
            </a>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-3 bg-success/10 rounded-lg border border-success/20">
            <div className="flex items-center gap-2 text-success">
              <Check className="w-4 h-4" />
              <span className="text-sm font-medium">Connected</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-mono truncate">
              {haUrl}
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Stream URL for Home Assistant
            </Label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={window.location.origin + '/api/stream'}
                className="bg-secondary/50 border-border font-mono text-xs"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={copyStreamUrl}
                className="shrink-0 border-border hover:bg-secondary"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-success" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">
              Add this URL to your Home Assistant configuration.yaml as a generic camera source.
            </p>
          </div>

          <Button
            variant="outline"
            onClick={handleDisconnect}
            className="w-full border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50"
          >
            <Unlink className="w-4 h-4 mr-2" />
            Disconnect
          </Button>
        </div>
      )}
    </div>
  );
}
