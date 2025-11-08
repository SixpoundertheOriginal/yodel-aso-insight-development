import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Star, Trash2, Bookmark, Clock, Edit, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useMonitoredApps,
  useRemoveMonitoredApp,
  useUpdateMonitoredApp,
  MonitoredApp
} from '@/hooks/useMonitoredApps';
import { format } from 'date-fns';

interface MonitoredAppsGridProps {
  organizationId: string;
  onSelectApp: (app: MonitoredApp) => void;
  className?: string;
}

const TAG_COLORS: Record<string, string> = {
  client: 'bg-blue-500/10 text-blue-500 border-blue-500/50',
  competitor: 'bg-red-500/10 text-red-500 border-red-500/50',
  benchmark: 'bg-purple-500/10 text-purple-500 border-purple-500/50',
  'industry-leader': 'bg-yellow-500/10 text-yellow-500 border-yellow-500/50',
  healthcare: 'bg-green-500/10 text-green-500 border-green-500/50',
  social: 'bg-pink-500/10 text-pink-500 border-pink-500/50',
  'uk-only': 'bg-indigo-500/10 text-indigo-500 border-indigo-500/50',
};

export const MonitoredAppsGrid: React.FC<MonitoredAppsGridProps> = ({
  organizationId,
  onSelectApp,
  className
}) => {
  const { data: monitoredApps, isLoading } = useMonitoredApps(organizationId);
  const removeMutation = useRemoveMonitoredApp();
  const updateMutation = useUpdateMonitoredApp();

  const [editingApp, setEditingApp] = useState<MonitoredApp | null>(null);
  const [editTags, setEditTags] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');

  const handleRemove = (e: React.MouseEvent, app: MonitoredApp) => {
    e.stopPropagation();
    if (confirm(`Stop monitoring "${app.app_name}"?`)) {
      removeMutation.mutate({ appId: app.id, organizationId });
    }
  };

  const handleEdit = (e: React.MouseEvent, app: MonitoredApp) => {
    e.stopPropagation();
    setEditingApp(app);
    setEditTags(app.tags?.join(', ') || '');
    setEditNotes(app.notes || '');
  };

  const handleSaveEdit = () => {
    if (!editingApp) return;

    const tags = editTags
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    updateMutation.mutate({
      appId: editingApp.id,
      organizationId,
      tags,
      notes: editNotes,
    });

    setEditingApp(null);
  };

  if (isLoading) {
    return (
      <Card className="p-4 bg-card/50 backdrop-blur-xl border-border/50">
        <div className="flex items-center gap-2">
          <Bookmark className="h-4 w-4 animate-pulse text-blue-500" />
          <span className="text-sm text-muted-foreground">Loading monitored apps...</span>
        </div>
      </Card>
    );
  }

  if (!monitoredApps || monitoredApps.length === 0) {
    return null;
  }

  return (
    <>
      <Card className={cn(
        "relative overflow-hidden transition-all duration-300",
        "bg-card/50 backdrop-blur-xl border-border/50",
        className
      )}>
        <div className="absolute top-0 right-0 w-48 h-48 opacity-10 blur-3xl bg-gradient-to-br from-blue-500 to-purple-600" />

        <div className="relative p-6 space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
              <Bookmark className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold uppercase tracking-wide">
                Monitored Apps
              </h3>
              <p className="text-xs text-muted-foreground/80">
                Track reviews & ratings for any App Store app
              </p>
            </div>
            <Badge variant="outline" className="ml-auto">
              {monitoredApps.length} {monitoredApps.length === 1 ? 'app' : 'apps'}
            </Badge>
          </div>

          {/* App Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {monitoredApps.map((app) => (
              <Card
                key={app.id}
                className={cn(
                  "relative overflow-hidden transition-all duration-200 cursor-pointer",
                  "hover:shadow-lg hover:border-primary/50",
                  "bg-card/30 backdrop-blur-sm border-border/30"
                )}
                onClick={() => onSelectApp(app)}
              >
                <div className="p-4 space-y-3">
                  {/* App Header */}
                  <div className="flex items-start gap-3">
                    {app.app_icon_url && (
                      <img
                        src={app.app_icon_url}
                        alt={app.app_name}
                        className="w-12 h-12 rounded-lg"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm truncate">
                        {app.app_name}
                      </h4>
                      {app.developer_name && (
                        <p className="text-xs text-muted-foreground truncate">
                          {app.developer_name}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-primary/20"
                        onClick={(e) => handleEdit(e, app)}
                      >
                        <Edit className="h-3 w-3 text-primary" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-destructive/20"
                        onClick={(e) => handleRemove(e, app)}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {app.snapshot_rating && (
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                        <span>{app.snapshot_rating.toFixed(1)}</span>
                      </div>
                    )}
                    {app.snapshot_review_count && (
                      <span>• {app.snapshot_review_count.toLocaleString()}</span>
                    )}
                    {app.primary_country && (
                      <div className="flex items-center gap-1 ml-auto">
                        <Globe className="h-3 w-3" />
                        <span className="uppercase">{app.primary_country}</span>
                      </div>
                    )}
                  </div>

                  {/* Tags */}
                  {app.tags && app.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {app.tags.slice(0, 3).map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className={cn(
                            "text-xs px-1.5 py-0.5",
                            TAG_COLORS[tag] || 'bg-zinc-500/10 text-zinc-500 border-zinc-500/50'
                          )}
                        >
                          {tag}
                        </Badge>
                      ))}
                      {app.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                          +{app.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Last Checked */}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground/60 pt-2 border-t border-border/50">
                    <Clock className="h-3 w-3" />
                    <span>
                      {app.last_checked_at
                        ? `Checked ${format(new Date(app.last_checked_at), 'MMM dd')}`
                        : `Added ${format(new Date(app.created_at), 'MMM dd, yyyy')}`}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingApp} onOpenChange={(open) => !open && setEditingApp(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Monitoring Settings</DialogTitle>
            <DialogDescription>
              Update tags and notes for {editingApp?.app_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tags (comma-separated)</label>
              <Input
                placeholder="client, competitor, benchmark"
                value={editTags}
                onChange={(e) => setEditTags(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Suggested: client, competitor, benchmark, industry-leader, healthcare, social
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                placeholder="Add notes about this app..."
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingApp(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
