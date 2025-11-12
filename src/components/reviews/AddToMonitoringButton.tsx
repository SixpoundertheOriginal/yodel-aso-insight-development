import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Bookmark, BookmarkCheck, Plus } from 'lucide-react';
import { useAddMonitoredApp } from '@/hooks/useMonitoredApps';
import { cn } from '@/lib/utils';

interface AddToMonitoringButtonProps {
  organizationId: string;
  appStoreId: string;
  appName: string;
  bundleId?: string;
  appIconUrl?: string;
  developerName?: string;
  category?: string;
  country: string;
  rating?: number;
  reviewCount?: number;
  isMonitored?: boolean;
  className?: string;
  platform?: 'ios' | 'android'; // Platform for the app
}

export const AddToMonitoringButton: React.FC<AddToMonitoringButtonProps> = ({
  organizationId,
  appStoreId,
  appName,
  bundleId,
  appIconUrl,
  developerName,
  category,
  country,
  rating,
  reviewCount,
  isMonitored = false,
  className,
  platform = 'ios' // Default to iOS for backward compatibility
}) => {
  const addMutation = useAddMonitoredApp();
  const [showDialog, setShowDialog] = useState(false);
  const [tags, setTags] = useState('');

  const handleAdd = () => {
    const tagArray = tags
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    addMutation.mutate(
      {
        organizationId,
        appStoreId,
        appName,
        bundleId,
        appIconUrl,
        developerName,
        category,
        primaryCountry: country,
        monitorType: 'reviews',
        tags: tagArray,
        snapshotRating: rating,
        snapshotReviewCount: reviewCount,
        platform, // Pass platform to mutation
      },
      {
        onSuccess: () => {
          setShowDialog(false);
          setTags('');
        },
      }
    );
  };

  if (isMonitored) {
    return (
      <Badge variant="outline" className={cn("gap-1", className)}>
        <BookmarkCheck className="h-3 w-3 text-green-500" />
        Monitoring
      </Badge>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowDialog(true)}
        className={cn(
          "gap-2 hover:bg-primary/10 hover:text-primary hover:border-primary/50",
          className
        )}
      >
        <Plus className="h-4 w-4" />
        Monitor App
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to Monitoring</DialogTitle>
            <DialogDescription>
              Start monitoring reviews for {appName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tags (optional)</label>
              <Input
                placeholder="e.g., client, competitor, benchmark"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Organize apps with tags: client, competitor, benchmark, healthcare, social, etc.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={addMutation.isPending}>
              {addMutation.isPending ? 'Adding...' : 'Start Monitoring'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
