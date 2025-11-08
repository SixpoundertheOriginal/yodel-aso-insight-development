import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Target, Plus, TrendingUp, X, Loader2, Clock } from 'lucide-react';
import { useAppCompetitors, useRemoveCompetitor } from '@/hooks/useAppCompetitors';
import { AddCompetitorDialog } from './AddCompetitorDialog';
import { cn } from '@/lib/utils';
import type { AppCompetitor } from '@/hooks/useMonitoredApps';

interface CompetitorManagementPanelProps {
  targetAppId: string;
  targetAppName: string;
  organizationId: string;
  country: string;
  onCompare: (competitorIds: string[]) => void;
}

export const CompetitorManagementPanel: React.FC<CompetitorManagementPanelProps> = ({
  targetAppId,
  targetAppName,
  organizationId,
  country,
  onCompare
}) => {
  const [showAddDialog, setShowAddDialog] = useState(false);

  const { data: competitors, isLoading } = useAppCompetitors(targetAppId);
  const removeCompetitor = useRemoveCompetitor();

  const handleQuickCompare = () => {
    if (competitors && competitors.length > 0) {
      const competitorAppStoreIds = competitors.map(c => c.competitor_app_store_id);
      onCompare(competitorAppStoreIds);
    }
  };

  const handleRemoveCompetitor = async (competitorId: string, competitorName: string) => {
    if (confirm(`Remove ${competitorName} as a competitor?`)) {
      await removeCompetitor.mutateAsync({
        competitorId,
        targetAppId,
      });
    }
  };

  return (
    <Card className="relative overflow-hidden">
      {/* Gradient background */}
      <div className="absolute top-0 right-0 w-96 h-96 opacity-5 blur-3xl bg-gradient-to-br from-orange-500 to-red-600" />

      <div className="relative p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-gradient-to-br from-orange-500 to-red-600">
              <Target className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Competitor Tracking</h3>
              <p className="text-sm text-muted-foreground">
                Manage competitors for <span className="font-medium text-foreground">{targetAppName}</span>
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            {competitors && competitors.length > 0 && (
              <Button
                size="sm"
                onClick={handleQuickCompare}
                className="gap-2 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
              >
                <TrendingUp className="h-4 w-4" />
                Compare All ({competitors.length})
              </Button>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAddDialog(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Competitor
            </Button>
          </div>
        </div>

        {/* Competitors Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Loading competitors...
          </div>
        ) : competitors && competitors.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {competitors.map((comp) => (
              <CompetitorCard
                key={comp.id}
                competitor={comp}
                onRemove={() => handleRemoveCompetitor(comp.id, comp.competitor_app_name)}
                isRemoving={removeCompetitor.isPending}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 px-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-4">
              <Target className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground mb-1">No competitors tracked yet</p>
            <p className="text-sm text-muted-foreground/80 mb-4">
              Add competitors to compare reviews and identify opportunities
            </p>
            <Button
              variant="outline"
              onClick={() => setShowAddDialog(true)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Your First Competitor
            </Button>
          </div>
        )}
      </div>

      {/* Add Competitor Dialog */}
      <AddCompetitorDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        targetAppId={targetAppId}
        targetAppName={targetAppName}
        organizationId={organizationId}
        country={country}
        existingCompetitorAppStoreIds={competitors?.map(c => c.competitor_app_store_id) || []}
      />
    </Card>
  );
};

// Competitor Card Component
interface CompetitorCardProps {
  competitor: AppCompetitor;
  onRemove: () => void;
  isRemoving: boolean;
}

const CompetitorCard: React.FC<CompetitorCardProps> = ({
  competitor,
  onRemove,
  isRemoving
}) => {
  // Format last compared date
  const lastCompared = competitor.last_compared_at
    ? new Date(competitor.last_compared_at).toLocaleDateString()
    : null;

  return (
    <Card className="p-4 hover:shadow-md transition-shadow group">
      <div className="flex items-start gap-3">
        {/* App Icon */}
        {competitor.competitor_app_icon && (
          <img
            src={competitor.competitor_app_icon}
            alt={competitor.competitor_app_name}
            className="w-12 h-12 rounded-lg flex-shrink-0"
          />
        )}

        {/* App Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className="font-semibold text-sm truncate">{competitor.competitor_app_name}</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
              disabled={isRemoving}
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
            {competitor.competitor_rating && (
              <div className="flex items-center gap-1">
                <span className="font-medium">{competitor.competitor_rating.toFixed(1)}</span>
                <span>⭐</span>
              </div>
            )}
            {competitor.competitor_review_count && (
              <div>
                {competitor.competitor_review_count.toLocaleString()} reviews
              </div>
            )}
          </div>

          {/* Priority Badge */}
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                "text-xs",
                competitor.priority === 1 && "border-orange-500 text-orange-600",
                competitor.priority === 2 && "border-blue-500 text-blue-600",
                competitor.priority >= 3 && "border-gray-500 text-gray-600"
              )}
            >
              {competitor.priority === 1 ? 'Primary' : competitor.priority === 2 ? 'Secondary' : `Priority ${competitor.priority}`}
            </Badge>

            {lastCompared && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {lastCompared}
              </div>
            )}
          </div>

          {/* Context (if provided) */}
          {competitor.comparison_context && (
            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
              {competitor.comparison_context}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
};
