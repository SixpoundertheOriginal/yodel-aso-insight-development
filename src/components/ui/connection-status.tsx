import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { connectionHealthService, ConnectionHealthStatus } from '@/services/connection-health.service';
import { toast } from 'sonner';

interface ConnectionStatusProps {
  showDetails?: boolean;
  className?: string;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ 
  showDetails = false, 
  className = '' 
}) => {
  const [status, setStatus] = useState<ConnectionHealthStatus | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkConnection = async () => {
    setIsChecking(true);
    try {
      const healthStatus = await connectionHealthService.checkEdgeFunctionHealth();
      setStatus(healthStatus);
      
      if (!healthStatus.isHealthy) {
        toast.error(`Connection issue: ${healthStatus.error}`);
      }
    } catch (error: any) {
      toast.error(`Health check failed: ${error.message}`);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    // Get last known status on mount
    const lastStatus = connectionHealthService.getLastKnownStatus();
    if (lastStatus) {
      setStatus(lastStatus);
    } else {
      // Perform initial health check
      checkConnection();
    }
  }, []);

  const getStatusIcon = () => {
    if (isChecking) {
      return <RefreshCw className="w-4 h-4 animate-spin" />;
    }
    
    if (!status) {
      return <AlertTriangle className="w-4 h-4" />;
    }
    
    return status.isHealthy ? 
      <Wifi className="w-4 h-4" /> : 
      <WifiOff className="w-4 h-4" />;
  };

  const getStatusColor = () => {
    if (!status || !status.isHealthy) return 'destructive';
    
    const quality = connectionHealthService.getConnectionQuality(status.responseTime);
    switch (quality) {
      case 'excellent': return 'default';
      case 'good': return 'secondary';
      case 'fair': return 'outline';
      case 'poor': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusText = () => {
    if (isChecking) return 'Checking...';
    if (!status) return 'Unknown';
    if (!status.isHealthy) return 'Offline';
    
    const quality = connectionHealthService.getConnectionQuality(status.responseTime);
    return `Online (${quality})`;
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Badge variant={getStatusColor()} className="flex items-center gap-1">
        {getStatusIcon()}
        {getStatusText()}
      </Badge>
      
      {showDetails && status && (
        <span className="text-xs text-muted-foreground">
          {status.responseTime}ms
        </span>
      )}
      
      <Button
        variant="ghost"
        size="sm"
        onClick={checkConnection}
        disabled={isChecking}
        className="h-6 px-2"
      >
        <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
      </Button>
    </div>
  );
};