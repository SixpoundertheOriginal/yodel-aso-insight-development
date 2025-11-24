/**
 * MonitoredAppsDropdown
 *
 * Compact dropdown for selecting monitored apps.
 * Displays in the header when no app is currently loaded.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { BookmarkCheck, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useAuditEnabledApps } from '@/hooks/useMonitoredAppForAudit';
import { formatDistanceToNow } from 'date-fns';
import { getScoreColor } from '@/lib/numberFormat';

interface MonitoredAppsDropdownProps {
  organizationId: string;
}

export const MonitoredAppsDropdown: React.FC<MonitoredAppsDropdownProps> = ({
  organizationId,
}) => {
  const navigate = useNavigate();
  const { data: apps, isLoading } = useAuditEnabledApps(organizationId);

  const handleAppSelect = (appId: string) => {
    navigate(`/aso-ai-hub/monitored/${appId}`);
  };

  // Render validation state icon
  const renderValidationIcon = (state: string | null) => {
    switch (state) {
      case 'valid':
        return <CheckCircle className="h-3 w-3 text-emerald-400" />;
      case 'invalid':
        return <XCircle className="h-3 w-3 text-red-400" />;
      case 'needs_rebuild':
      case 'stale':
        return <AlertTriangle className="h-3 w-3 text-amber-400" />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2 text-sm text-zinc-400">
        <BookmarkCheck className="h-4 w-4 text-emerald-400 animate-pulse" />
        <span>Loading monitored apps...</span>
      </div>
    );
  }

  if (!apps || apps.length === 0) {
    return null; // Don't show dropdown if no monitored apps
  }

  return (
    <div className="flex items-center space-x-2">
      <BookmarkCheck className="h-4 w-4 text-emerald-400 flex-shrink-0" />
      <Select onValueChange={handleAppSelect}>
        <SelectTrigger className="w-[280px] bg-zinc-900/50 border-zinc-700 hover:border-zinc-600">
          <SelectValue placeholder="Select a monitored app..." />
        </SelectTrigger>
        <SelectContent className="bg-zinc-900 border-zinc-700">
          <SelectGroup>
            <SelectLabel className="text-zinc-400 flex items-center justify-between px-2">
              <span>Monitored Apps</span>
              <Badge variant="outline" className="ml-2 text-xs">{apps.length}</Badge>
            </SelectLabel>
            {apps.map((app) => {
              const lastChecked = app.latest_audit_at
                ? formatDistanceToNow(new Date(app.latest_audit_at), { addSuffix: true })
                : 'Never';
              const auditScore = app.latest_audit_score;
              const scoreColorClass = auditScore ? getScoreColor(auditScore) : 'text-zinc-400';

              return (
                <SelectItem
                  key={app.id}
                  value={app.id.toString()}
                  className="cursor-pointer hover:bg-zinc-800 focus:bg-zinc-800"
                >
                  <div className="flex items-center space-x-3 py-1 w-full">
                    {/* App Icon */}
                    {app.app_icon_url && (
                      <img
                        src={app.app_icon_url}
                        alt={app.app_name}
                        className="w-8 h-8 rounded-md flex-shrink-0"
                      />
                    )}

                    {/* App Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-sm truncate">{app.app_name}</span>
                        {renderValidationIcon(app.validated_state)}
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-zinc-500">
                        <span>{app.platform.toUpperCase()}</span>
                        <span>•</span>
                        <span>{app.locale}</span>
                        {auditScore !== null && (
                          <>
                            <span>•</span>
                            <span className={scoreColorClass}>
                              Score: {auditScore}/100
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </SelectItem>
              );
            })}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
};
