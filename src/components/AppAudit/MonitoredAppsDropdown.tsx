/**
 * MonitoredAppsDropdown
 *
 * Enhanced dropdown for selecting and managing monitored apps.
 * Features:
 * - Quick app selection
 * - Bulk delete with checkbox selection
 * - Link to full monitored apps page
 * - Validation state indicators
 */

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  BookmarkCheck,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Settings,
  Trash2,
  ExternalLink
} from 'lucide-react';
import { useAuditEnabledApps, useRemoveMonitoredApp } from '@/hooks/useMonitoredAppForAudit';
import { formatDistanceToNow } from 'date-fns';
import { getScoreColor } from '@/lib/numberFormat';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface MonitoredAppsDropdownProps {
  organizationId: string;
}

export const MonitoredAppsDropdown: React.FC<MonitoredAppsDropdownProps> = ({
  organizationId,
}) => {
  const navigate = useNavigate();
  const { data: apps, isLoading } = useAuditEnabledApps(organizationId);
  const { mutate: removeApp, isPending: isRemoving } = useRemoveMonitoredApp();

  const [isManageMode, setIsManageMode] = useState(false);
  const [selectedApps, setSelectedApps] = useState<Set<string>>(new Set());

  const handleAppSelect = (appId: string) => {
    navigate(`/aso-ai-hub/monitored/${appId}`);
  };

  const handleToggleSelect = (appId: string) => {
    const newSelected = new Set(selectedApps);
    if (newSelected.has(appId)) {
      newSelected.delete(appId);
    } else {
      newSelected.add(appId);
    }
    setSelectedApps(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedApps.size === apps?.length) {
      setSelectedApps(new Set());
    } else {
      setSelectedApps(new Set(apps?.map(app => app.id.toString()) || []));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedApps.size === 0) {
      toast.error('No apps selected');
      return;
    }

    const confirmMessage = `Remove ${selectedApps.size} app${selectedApps.size > 1 ? 's' : ''} from monitoring? This will delete all audit snapshots and cache data.`;

    if (!confirm(confirmMessage)) {
      return;
    }

    const appsToDelete = apps?.filter(app => selectedApps.has(app.id.toString())) || [];

    try {
      for (const app of appsToDelete) {
        await new Promise<void>((resolve, reject) => {
          removeApp(
            { app_id: app.app_id, platform: app.platform, organizationId },
            {
              onSuccess: () => resolve(),
              onError: (error) => reject(error),
            }
          );
        });
      }

      toast.success(`Successfully removed ${selectedApps.size} app${selectedApps.size > 1 ? 's' : ''}`);
      setSelectedApps(new Set());
      setIsManageMode(false);
    } catch (error) {
      toast.error('Failed to remove some apps');
      console.error('Bulk delete error:', error);
    }
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
    <div className="flex items-center gap-3">
      {/* App Selector */}
      <div className="flex items-center gap-2">
        <BookmarkCheck className="h-4 w-4 text-emerald-400 flex-shrink-0" />
        <Select onValueChange={handleAppSelect} disabled={isManageMode}>
          <SelectTrigger className="w-[280px] bg-zinc-900/50 border-zinc-700 hover:border-zinc-600 transition-colors">
            <SelectValue placeholder="Select a monitored app..." />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
            <SelectGroup>
              <SelectLabel className="text-zinc-400 flex items-center justify-between px-2">
                <span>Monitored Apps</span>
                <Badge variant="outline" className="ml-2 text-xs border-emerald-400/30 text-emerald-400">
                  {apps.length}
                </Badge>
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

      {/* Management Actions */}
      <div className="flex items-center gap-2">
        {/* Manage Apps Link */}
        <Link to="/aso-ai-hub/monitored">
          <Button
            variant="outline"
            size="sm"
            className="border-blue-400/30 text-blue-400 hover:bg-blue-900/20 hover:border-blue-400/50 transition-all"
          >
            <Settings className="h-4 w-4 mr-2" />
            Manage Apps
          </Button>
        </Link>

        {/* Bulk Delete Toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setIsManageMode(!isManageMode);
            setSelectedApps(new Set());
          }}
          className={cn(
            "border-purple-400/30 text-purple-400 hover:bg-purple-900/20 hover:border-purple-400/50 transition-all",
            isManageMode && "bg-purple-900/30 border-purple-400/50"
          )}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          {isManageMode ? 'Cancel' : 'Bulk Delete'}
        </Button>
      </div>

      {/* Bulk Delete Panel (appears when manage mode is active) */}
      {isManageMode && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center pt-24 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl p-6 max-w-2xl w-full mx-4 max-h-[70vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-red-400" />
                <h3 className="text-lg font-semibold text-zinc-100">Bulk Delete Monitored Apps</h3>
              </div>
              <Badge variant="outline" className="border-purple-400/30 text-purple-400">
                {selectedApps.size} selected
              </Badge>
            </div>

            {/* Select All */}
            <div className="flex items-center gap-3 mb-4 p-3 bg-zinc-800/30 rounded-lg border border-zinc-700/50">
              <Checkbox
                id="select-all"
                checked={selectedApps.size === apps.length}
                onCheckedChange={handleSelectAll}
                className="border-purple-400/50"
              />
              <label
                htmlFor="select-all"
                className="text-sm text-zinc-300 font-medium cursor-pointer flex-1"
              >
                Select All ({apps.length} apps)
              </label>
            </div>

            {/* Apps List */}
            <div className="space-y-2 mb-6 overflow-y-auto flex-1">
              {apps.map((app) => (
                <div
                  key={app.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer",
                    selectedApps.has(app.id.toString())
                      ? "bg-red-950/20 border-red-400/30"
                      : "bg-zinc-800/20 border-zinc-700/50 hover:border-zinc-600"
                  )}
                  onClick={() => handleToggleSelect(app.id.toString())}
                >
                  <Checkbox
                    checked={selectedApps.has(app.id.toString())}
                    onCheckedChange={() => handleToggleSelect(app.id.toString())}
                    className={cn(
                      selectedApps.has(app.id.toString())
                        ? "border-red-400/50"
                        : "border-zinc-600"
                    )}
                  />
                  {app.app_icon_url && (
                    <img
                      src={app.app_icon_url}
                      alt={app.app_name}
                      className="w-10 h-10 rounded-lg flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-zinc-100 truncate">
                        {app.app_name}
                      </span>
                      {renderValidationIcon(app.validated_state)}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <span>{app.platform.toUpperCase()}</span>
                      <span>•</span>
                      <span>{app.locale}</span>
                      {app.latest_audit_score !== null && (
                        <>
                          <span>•</span>
                          <span className={getScoreColor(app.latest_audit_score)}>
                            Score: {app.latest_audit_score}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
              <Button
                variant="outline"
                onClick={() => {
                  setIsManageMode(false);
                  setSelectedApps(new Set());
                }}
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleBulkDelete}
                disabled={selectedApps.size === 0 || isRemoving}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <Trash2 className={cn("h-4 w-4 mr-2", isRemoving && "animate-spin")} />
                Delete {selectedApps.size > 0 ? `${selectedApps.size} App${selectedApps.size > 1 ? 's' : ''}` : 'Selected'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
