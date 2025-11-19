# Reviews App Monitoring Feature - Corrected Implementation Plan

**Date:** 2025-01-06
**Purpose:** Enable monitoring ANY App Store app's reviews (like AppTweak), independent of BigQuery
**Status:** 📋 DESIGN COMPLETE - Ready for Implementation

---

## Executive Summary - Corrected Understanding

### Key Clarifications ✅

**What This IS:**
- ✅ **Universal App Monitoring** (like AppTweak)
- ✅ Monitor **ANY** app on the App Store
- ✅ **Independent from BigQuery** (no analytics data needed)
- ✅ Track reviews, ratings, sentiment for **any** app
- ✅ Not limited to "clients" - can monitor **competitors**, **industry apps**, **benchmarks**

**What This IS NOT:**
- ❌ NOT tied to BigQuery apps
- ❌ NOT limited to client apps
- ❌ NOT using `organization_apps` table (that's for BigQuery)
- ❌ NOT related to analytics data

### Business Need (Corrected)
Users want to:
1. **Monitor ANY app** on the App Store (own apps, competitors, industry leaders)
2. **Save apps** to avoid re-searching
3. **Track reviews over time** (like AppTweak does)
4. **Compare multiple apps** (your app vs competitor)
5. **Get insights** without needing BigQuery data

---

## Part 1: Correct System Architecture

### Reviews System (Independent)

```
┌─────────────────────────────────────────────────┐
│           REVIEWS MONITORING SYSTEM             │
│         (Like AppTweak - Universal)             │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌───────────────────────────────────────┐    │
│  │  1. Search iTunes App Store           │    │
│  │     (via asoSearchService)             │    │
│  └───────────────┬───────────────────────┘    │
│                  │                              │
│  ┌───────────────▼───────────────────────┐    │
│  │  2. Select App                         │    │
│  │     - ANY app on App Store             │    │
│  │     - Competitors                       │    │
│  │     - Industry apps                     │    │
│  │     - Benchmarks                        │    │
│  └───────────────┬───────────────────────┘    │
│                  │                              │
│  ┌───────────────▼───────────────────────┐    │
│  │  3. Fetch Reviews                      │    │
│  │     (via iTunes RSS + Edge Function)   │    │
│  └───────────────┬───────────────────────┘    │
│                  │                              │
│  ┌───────────────▼───────────────────────┐    │
│  │  4. AI Analysis                        │    │
│  │     - Sentiment                         │    │
│  │     - Themes                            │    │
│  │     - Issues                            │    │
│  └───────────────────────────────────────┘    │
│                                                 │
│  ❌ NO BigQuery Dependency                     │
│  ❌ NO Analytics Data Required                 │
│  ✅ Works with ANY App Store App               │
└─────────────────────────────────────────────────┘
```

### BigQuery System (Separate)

```
┌─────────────────────────────────────────────────┐
│          BIGQUERY ANALYTICS SYSTEM              │
│         (Dashboard V2 - Client Apps)            │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌───────────────────────────────────────┐    │
│  │  1. Apps with ASC/BigQuery Data       │    │
│  │     (organization_apps table)          │    │
│  └───────────────┬───────────────────────┘    │
│                  │                              │
│  ┌───────────────▼───────────────────────┐    │
│  │  2. Performance Analytics              │    │
│  │     - Impressions                       │    │
│  │     - Downloads                         │    │
│  │     - Conversion Rate                   │    │
│  └───────────────────────────────────────┘    │
│                                                 │
│  ✅ Requires BigQuery Connection                │
│  ✅ Only for Client Apps                        │
│  ✅ Uses organization_apps table                │
└─────────────────────────────────────────────────┘
```

**KEY DISTINCTION:**
- **Reviews Monitoring:** ANY app, no BigQuery needed
- **Analytics Dashboard:** Client apps only, BigQuery required
- **Separate tables, separate purposes**

---

## Part 2: Correct Database Design

### NEW TABLE: `monitored_apps`

**Purpose:** Store apps that users want to monitor for reviews (ANY App Store app)

**Why NOT `organization_apps`:**
- `organization_apps` is for BigQuery/ASC connected apps
- `monitored_apps` is for universal App Store monitoring
- Different use cases, different lifecycles
- Keeps concerns separated

**Schema:**
```sql
CREATE TABLE public.monitored_apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- App Store Identity
  app_store_id TEXT NOT NULL,              -- iTunes app ID (e.g., "1239779099")
  app_name TEXT NOT NULL,                  -- App name (e.g., "Locate A Locum")
  bundle_id TEXT,                          -- Bundle ID (optional)
  app_icon_url TEXT,                       -- App icon URL

  -- App Metadata
  developer_name TEXT,                     -- Developer name
  category TEXT,                           -- App category
  primary_country TEXT NOT NULL,           -- Country where saved (e.g., 'gb', 'us')

  -- Monitoring Metadata
  monitor_type TEXT NOT NULL DEFAULT 'reviews',  -- 'reviews', 'ratings', 'both'
  tags TEXT[],                             -- User-defined tags: ['competitor', 'client', 'benchmark']
  notes TEXT,                              -- User notes about this app

  -- Snapshot at time of saving
  snapshot_rating DECIMAL(3,2),            -- Rating when saved (e.g., 2.48)
  snapshot_review_count INTEGER,           -- Review count when saved
  snapshot_taken_at TIMESTAMPTZ,           -- When snapshot was taken

  -- Tracking
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  last_checked_at TIMESTAMPTZ,             -- Last time reviews were fetched

  -- Prevent duplicates per org
  UNIQUE(organization_id, app_store_id, primary_country)
);

-- Indexes for performance
CREATE INDEX idx_monitored_apps_org_id
  ON monitored_apps (organization_id);

CREATE INDEX idx_monitored_apps_country
  ON monitored_apps (organization_id, primary_country);

CREATE INDEX idx_monitored_apps_created_at
  ON monitored_apps (created_at DESC);

CREATE INDEX idx_monitored_apps_last_checked
  ON monitored_apps (last_checked_at DESC NULLS LAST);

COMMENT ON TABLE monitored_apps IS
  'Apps monitored for reviews/ratings - independent from BigQuery analytics apps';

COMMENT ON COLUMN monitored_apps.tags IS
  'User-defined tags for categorization: competitor, client, benchmark, industry, etc.';

COMMENT ON COLUMN monitored_apps.monitor_type IS
  'What to monitor: reviews, ratings, or both';
```

### Row Level Security

```sql
ALTER TABLE monitored_apps ENABLE ROW LEVEL SECURITY;

-- Users see their organization's monitored apps
CREATE POLICY "Users see their org monitored apps"
ON monitored_apps
FOR SELECT
USING (
  organization_id IN (
    SELECT ur.organization_id
    FROM user_roles ur
    WHERE ur.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'SUPER_ADMIN'
      AND ur.organization_id IS NULL
  )
);

-- Org admins and members can add apps to monitor
CREATE POLICY "Users can add monitored apps"
ON monitored_apps
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.organization_id = monitored_apps.organization_id
      AND ur.role IN ('ORG_ADMIN', 'ASO_MANAGER', 'ANALYST')
  )
  OR EXISTS (
    SELECT 1
    FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'SUPER_ADMIN'
  )
);

-- Users can update monitored apps (notes, tags, etc.)
CREATE POLICY "Users can update monitored apps"
ON monitored_apps
FOR UPDATE
USING (
  organization_id IN (
    SELECT ur.organization_id
    FROM user_roles ur
    WHERE ur.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'SUPER_ADMIN'
  )
);

-- Users can remove monitored apps
CREATE POLICY "Users can remove monitored apps"
ON monitored_apps
FOR DELETE
USING (
  organization_id IN (
    SELECT ur.organization_id
    FROM user_roles ur
    WHERE ur.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'SUPER_ADMIN'
  )
);
```

### Updated At Trigger

```sql
CREATE OR REPLACE FUNCTION update_monitored_apps_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER monitored_apps_updated_at
  BEFORE UPDATE ON monitored_apps
  FOR EACH ROW
  EXECUTE FUNCTION update_monitored_apps_updated_at();
```

---

## Part 3: Example Data

### Use Case Examples

#### Example 1: Monitor Competitor
```sql
INSERT INTO monitored_apps (
  organization_id,
  app_store_id,
  app_name,
  app_icon_url,
  developer_name,
  category,
  primary_country,
  monitor_type,
  tags,
  notes,
  snapshot_rating,
  snapshot_review_count,
  snapshot_taken_at,
  created_by
) VALUES (
  '7cccba3f-0a8f-446f-9dba-86e9cb68c92b',  -- Yodel Mobile
  '389801252',                              -- Instagram
  'Instagram',
  'https://is1-ssl.mzstatic.com/image/...',
  'Instagram, Inc.',
  'Photo & Video',
  'us',
  'reviews',
  ARRAY['competitor', 'social', 'benchmark'],
  'Main competitor in social space - track negative reviews about features',
  4.7,
  15432890,
  NOW(),
  '8920ac57-63da-4f8e-9970-719be1e2569c'
);
```

#### Example 2: Monitor Client App (UK)
```sql
INSERT INTO monitored_apps (
  organization_id,
  app_store_id,
  app_name,
  app_icon_url,
  developer_name,
  category,
  primary_country,
  monitor_type,
  tags,
  notes,
  snapshot_rating,
  snapshot_review_count,
  snapshot_taken_at,
  created_by
) VALUES (
  '7cccba3f-0a8f-446f-9dba-86e9cb68c92b',
  '1239779099',
  'Locate A Locum',
  'https://is1-ssl.mzstatic.com/image/...',
  'Locum Match',
  'Medical',
  'gb',                                     -- UK market
  'both',
  ARRAY['client', 'healthcare', 'uk-only'],
  'Client app - UK healthcare market. Low rating needs attention.',
  2.48,
  477,
  NOW(),
  '8920ac57-63da-4f8e-9970-719be1e2569c'
);
```

#### Example 3: Monitor Industry Leader
```sql
INSERT INTO monitored_apps (
  organization_id,
  app_store_id,
  app_name,
  app_icon_url,
  developer_name,
  category,
  primary_country,
  monitor_type,
  tags,
  notes
) VALUES (
  '7cccba3f-0a8f-446f-9dba-86e9cb68c92b',
  '544007664',                              -- YouTube
  'YouTube',
  'https://is1-ssl.mzstatic.com/image/...',
  'Google LLC',
  'Photo & Video',
  'us',
  'reviews',
  ARRAY['benchmark', 'industry-leader'],
  'Study their review response strategy and feature requests'
);
```

---

## Part 4: Implementation Plan (Corrected)

### Phase 1: Database Migration ⏱️ 10 minutes

**File:** `supabase/migrations/20250106000000_create_monitored_apps.sql`

```sql
-- Migration: Create monitored_apps table for Reviews page
-- Date: 2025-01-06
-- Purpose: Enable monitoring ANY App Store app (independent from BigQuery)

-- Table creation (see schema above)
CREATE TABLE public.monitored_apps ( ... );

-- Indexes (see above)
CREATE INDEX ...

-- RLS Policies (see above)
ALTER TABLE monitored_apps ENABLE ROW LEVEL SECURITY;
CREATE POLICY ...

-- Triggers (see above)
CREATE OR REPLACE FUNCTION update_monitored_apps_updated_at() ...
```

### Phase 2: Backend Hook - `useMonitoredApps` ⏱️ 20 minutes

**File:** `src/hooks/useMonitoredApps.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MonitoredApp {
  id: string;
  app_store_id: string;
  app_name: string;
  app_icon_url: string | null;
  developer_name: string | null;
  category: string | null;
  primary_country: string;
  monitor_type: 'reviews' | 'ratings' | 'both';
  tags: string[] | null;
  notes: string | null;
  snapshot_rating: number | null;
  snapshot_review_count: number | null;
  snapshot_taken_at: string | null;
  created_at: string;
  last_checked_at: string | null;
  created_by: string | null;
}

/**
 * Fetch monitored apps for an organization
 */
export const useMonitoredApps = (organizationId?: string) => {
  return useQuery({
    queryKey: ['monitored-apps', organizationId],
    queryFn: async (): Promise<MonitoredApp[]> => {
      if (!organizationId) {
        throw new Error('Organization ID is required');
      }

      const { data, error } = await supabase
        .from('monitored_apps')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching monitored apps:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Add an app to monitoring
 */
export const useAddMonitoredApp = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      appStoreId,
      appName,
      appIconUrl,
      developerName,
      category,
      primaryCountry,
      monitorType = 'reviews',
      tags = [],
      notes,
      snapshotRating,
      snapshotReviewCount,
    }: {
      organizationId: string;
      appStoreId: string;
      appName: string;
      appIconUrl?: string;
      developerName?: string;
      category?: string;
      primaryCountry: string;
      monitorType?: 'reviews' | 'ratings' | 'both';
      tags?: string[];
      notes?: string;
      snapshotRating?: number;
      snapshotReviewCount?: number;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      const { data, error } = await supabase
        .from('monitored_apps')
        .insert({
          organization_id: organizationId,
          app_store_id: appStoreId,
          app_name: appName,
          app_icon_url: appIconUrl || null,
          developer_name: developerName || null,
          category: category || null,
          primary_country: primaryCountry,
          monitor_type: monitorType,
          tags: tags.length > 0 ? tags : null,
          notes: notes || null,
          snapshot_rating: snapshotRating || null,
          snapshot_review_count: snapshotReviewCount || null,
          snapshot_taken_at: snapshotRating ? new Date().toISOString() : null,
          created_by: userId,
        })
        .select()
        .single();

      if (error) {
        // Handle duplicate key error
        if (error.code === '23505') {
          throw new Error(`This app is already being monitored in ${primaryCountry.toUpperCase()}`);
        }
        throw error;
      }

      return data;
    },
    onSuccess: (data, variables) => {
      toast.success(`Now monitoring ${variables.appName}!`);
      queryClient.invalidateQueries({ queryKey: ['monitored-apps', variables.organizationId] });
    },
    onError: (error: any) => {
      console.error('Error adding monitored app:', error);
      toast.error(error.message || 'Failed to add app to monitoring');
    },
  });
};

/**
 * Update monitored app (tags, notes, etc.)
 */
export const useUpdateMonitoredApp = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      appId,
      organizationId,
      tags,
      notes,
      monitorType,
    }: {
      appId: string;
      organizationId: string;
      tags?: string[];
      notes?: string;
      monitorType?: 'reviews' | 'ratings' | 'both';
    }) => {
      const updateData: any = {};
      if (tags !== undefined) updateData.tags = tags.length > 0 ? tags : null;
      if (notes !== undefined) updateData.notes = notes || null;
      if (monitorType) updateData.monitor_type = monitorType;

      const { error } = await supabase
        .from('monitored_apps')
        .update(updateData)
        .eq('id', appId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast.success('Monitoring settings updated');
      queryClient.invalidateQueries({ queryKey: ['monitored-apps', variables.organizationId] });
    },
    onError: (error: any) => {
      console.error('Error updating monitored app:', error);
      toast.error('Failed to update monitoring settings');
    },
  });
};

/**
 * Remove monitored app
 */
export const useRemoveMonitoredApp = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      appId,
      organizationId,
    }: {
      appId: string;
      organizationId: string;
    }) => {
      const { error } = await supabase
        .from('monitored_apps')
        .delete()
        .eq('id', appId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast.success('App removed from monitoring');
      queryClient.invalidateQueries({ queryKey: ['monitored-apps', variables.organizationId] });
    },
    onError: (error: any) => {
      console.error('Error removing monitored app:', error);
      toast.error('Failed to remove app');
    },
  });
};

/**
 * Update last checked timestamp
 */
export const useUpdateLastChecked = () => {
  return useMutation({
    mutationFn: async (appId: string) => {
      const { error } = await supabase
        .from('monitored_apps')
        .update({ last_checked_at: new Date().toISOString() })
        .eq('id', appId);

      if (error) throw error;
    },
  });
};
```

### Phase 3: UI Component - `MonitoredAppsGrid` ⏱️ 35 minutes

**File:** `src/components/reviews/MonitoredAppsGrid.tsx`

```typescript
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Star, Trash2, Bookmark, Clock, Tag, Edit, Globe } from 'lucide-react';
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
              {monitoredApps.length} apps
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
                            TAG_COLORS[tag] || 'bg-zinc-500/10 text-zinc-500'
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
                Suggested: client, competitor, benchmark, industry-leader
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
```

### Phase 4: UI Component - `AddToMonitoringButton` ⏱️ 20 minutes

**File:** `src/components/reviews/AddToMonitoringButton.tsx`

```typescript
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
  appIconUrl?: string;
  developerName?: string;
  category?: string;
  country: string;
  rating?: number;
  reviewCount?: number;
  isMonitored?: boolean;
  className?: string;
}

export const AddToMonitoringButton: React.FC<AddToMonitoringButtonProps> = ({
  organizationId,
  appStoreId,
  appName,
  appIconUrl,
  developerName,
  category,
  country,
  rating,
  reviewCount,
  isMonitored = false,
  className
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
        appIconUrl,
        developerName,
        category,
        primaryCountry: country,
        monitorType: 'reviews',
        tags: tagArray,
        snapshotRating: rating,
        snapshotReviewCount: reviewCount,
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
                Organize apps with tags: client, competitor, benchmark, etc.
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
```

### Phase 5: Reviews Page Integration ⏱️ 20 minutes

**Changes to** `src/pages/growth-accelerators/reviews.tsx`:

```typescript
// 1. Add imports
import { MonitoredAppsGrid } from '@/components/reviews/MonitoredAppsGrid';
import { AddToMonitoringButton } from '@/components/reviews/AddToMonitoringButton';
import { useMonitoredApps, useUpdateLastChecked } from '@/hooks/useMonitoredApps';

// 2. Add hooks (after line 108)
const { data: monitoredApps } = useMonitoredApps(organizationId);
const updateLastChecked = useUpdateLastChecked();

const isAppMonitored = monitoredApps?.some(
  app => app.app_store_id === selectedApp?.appId && app.primary_country === selectedCountry
);

// 3. Add MonitoredAppsGrid before search card
{monitoredApps && monitoredApps.length > 0 && !selectedApp && (
  <MonitoredAppsGrid
    organizationId={organizationId!}
    onSelectApp={(app) => {
      // Load app into reviews page
      setSelectedApp({
        name: app.app_name,
        appId: app.app_store_id,
        developer: app.developer_name || 'Unknown',
        rating: app.snapshot_rating || 0,
        reviews: app.snapshot_review_count || 0,
        icon: app.app_icon_url || '',
        applicationCategory: app.category || 'Unknown'
      });
      setSelectedCountry(app.primary_country);

      // Update last checked timestamp
      updateLastChecked.mutate(app.id);
    }}
  />
)}

// 4. Add button in app header (after app info)
<div className="flex items-center gap-2">
  <AddToMonitoringButton
    organizationId={organizationId!}
    appStoreId={selectedApp.appId}
    appName={selectedApp.name}
    appIconUrl={selectedApp.icon}
    developerName={selectedApp.developer}
    category={selectedApp.applicationCategory}
    country={selectedCountry}
    rating={selectedApp.rating}
    reviewCount={selectedApp.reviews}
    isMonitored={isAppMonitored}
  />
  <Button variant="outline" size="sm" onClick={() => setSelectedApp(null)}>
    Search Another
  </Button>
</div>
```

---

## Part 5: Key Differences from Original Plan

### What Changed

| Aspect | Original Plan (Wrong) | Corrected Plan (Right) |
|--------|----------------------|------------------------|
| **Table** | `organization_apps` | **`monitored_apps`** (new table) |
| **Purpose** | Client apps with BigQuery | **ANY App Store app** |
| **Data Source** | `'reviews_manual'` | Not needed (separate table) |
| **Tied to BigQuery** | ✅ Yes (wrong) | ❌ **No - completely independent** |
| **Scope** | Limited to clients | **Universal monitoring (like AppTweak)** |
| **Use Cases** | Client apps only | **Clients, competitors, benchmarks, any app** |

### Why Separate Tables

**`organization_apps`:**
- Apps with analytics data (BigQuery/ASC)
- Client apps with performance metrics
- Approval workflow (pending → confirmed)
- Tied to business data

**`monitored_apps` (NEW):**
- ANY App Store app
- Reviews & ratings monitoring only
- Instant save (no approval)
- Independent research tool

---

## Part 6: Testing Checklist

### Test Scenarios

#### 1. Monitor Competitor App
- [ ] Search for "Instagram"
- [ ] Add to monitoring with tag "competitor"
- [ ] Verify appears in Monitored Apps grid
- [ ] Click to load - verify reviews fetch

#### 2. Monitor Client App (Different Country)
- [ ] Search "locate a locum" in GB
- [ ] Add to monitoring with tags "client, healthcare"
- [ ] Search same app in US
- [ ] Add to monitoring (should work - different country)
- [ ] Verify both appear in grid with country badges

#### 3. Organization Isolation
- [ ] Login as Yodel Mobile user
- [ ] Add Instagram to monitoring
- [ ] Logout, login as different org user
- [ ] Verify Instagram does NOT appear

#### 4. Edit Tags & Notes
- [ ] Click edit button on monitored app
- [ ] Update tags: "competitor, social, benchmark"
- [ ] Add notes
- [ ] Save and verify changes persist

#### 5. Remove Monitored App
- [ ] Click trash icon
- [ ] Confirm deletion
- [ ] Verify app removed from grid

---

## Part 7: Implementation Timeline

### Estimated Time: ~2 hours

- **Phase 1:** Database Migration (10 min)
- **Phase 2:** Backend Hooks (20 min)
- **Phase 3:** MonitoredAppsGrid Component (35 min)
- **Phase 4:** AddToMonitoringButton Component (20 min)
- **Phase 5:** Reviews Page Integration (20 min)
- **Testing:** (15 min)

---

## Conclusion

This corrected plan creates a **universal app monitoring system** (like AppTweak) that is:

✅ **Independent from BigQuery** - No analytics data required
✅ **Universal** - Monitor ANY App Store app
✅ **Flexible** - Track clients, competitors, benchmarks
✅ **Organized** - Tags, notes, country-specific
✅ **Enterprise-ready** - Multi-tenant, RLS-secured
✅ **Scalable** - Separate from analytics apps

**Key Insight:** Reviews monitoring is a **standalone research tool**, not tied to your client apps or analytics data. This opens up powerful competitive intelligence and market research capabilities.

Ready to implement? 🚀
