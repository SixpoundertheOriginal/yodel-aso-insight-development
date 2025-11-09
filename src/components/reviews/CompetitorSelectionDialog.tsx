import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Target, X, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMonitoredApps } from '@/hooks/useMonitoredApps';
import { useAllCompetitors } from '@/hooks/useAppCompetitors';
import type { MonitoredApp } from '@/hooks/useMonitoredApps';

interface CompetitorSelectionDialogProps {
  organizationId: string;
  onCancel: () => void;
  onConfirm: (config: any) => void;
}

export const CompetitorSelectionDialog: React.FC<CompetitorSelectionDialogProps> = ({
  organizationId,
  onCancel,
  onConfirm
}) => {
  const { data: monitoredApps } = useMonitoredApps(organizationId);
  const { data: allCompetitors } = useAllCompetitors(organizationId);

  const [selectedPrimary, setSelectedPrimary] = useState<MonitoredApp | null>(null);
  const [selectedCompetitors, setSelectedCompetitors] = useState<MonitoredApp[]>([]);
  const [selectedCountry, setSelectedCountry] = useState('us');

  // Filter apps by country
  const appsInCountry = monitoredApps?.filter(app => app.primary_country === selectedCountry) || [];

  // Get unique competitor app IDs from app_competitors table
  const competitorAppStoreIds = useMemo(() => {
    if (!allCompetitors) return [];
    return [...new Set(allCompetitors.map(c => c.competitor_app_store_id))];
  }, [allCompetitors]);

  // Filter monitored apps that are also competitors in the selected country
  const competitorsInCountry = useMemo(() => {
    return appsInCountry.filter(app =>
      competitorAppStoreIds.includes(app.app_store_id)
    );
  }, [appsInCountry, competitorAppStoreIds]);

  const handleToggleCompetitor = (app: MonitoredApp) => {
    if (selectedCompetitors.find(c => c.id === app.id)) {
      setSelectedCompetitors(selectedCompetitors.filter(c => c.id !== app.id));
    } else {
      setSelectedCompetitors([...selectedCompetitors, app]);
    }
  };

  const handleConfirm = () => {
    if (!selectedPrimary || selectedCompetitors.length === 0) {
      return;
    }

    const config = {
      primaryAppId: selectedPrimary.app_store_id,
      primaryAppName: selectedPrimary.app_name,
      primaryAppIcon: selectedPrimary.app_icon_url || '',
      primaryAppRating: selectedPrimary.snapshot_rating || 0,
      primaryAppReviewCount: selectedPrimary.snapshot_review_count || 0,

      competitorAppIds: selectedCompetitors.map(c => c.app_store_id),
      competitorAppNames: selectedCompetitors.map(c => c.app_name),
      competitorAppIcons: selectedCompetitors.map(c => c.app_icon_url || ''),
      competitorAppRatings: selectedCompetitors.map(c => c.snapshot_rating || 0),
      competitorAppReviewCounts: selectedCompetitors.map(c => c.snapshot_review_count || 0),

      country: selectedCountry
    };

    onConfirm(config);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-gradient-to-br from-orange-500 to-red-600">
            <Target className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Select Apps to Compare</h2>
            <p className="text-sm text-muted-foreground">
              Choose your primary app and competitors to analyze
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Country Selector */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Country</label>
            <Select value={selectedCountry} onValueChange={(value) => {
              setSelectedCountry(value);
              setSelectedPrimary(null);
              setSelectedCompetitors([]);
            }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="us">🇺🇸 United States</SelectItem>
                <SelectItem value="gb">🇬🇧 United Kingdom</SelectItem>
                <SelectItem value="ca">🇨🇦 Canada</SelectItem>
                <SelectItem value="au">🇦🇺 Australia</SelectItem>
                <SelectItem value="de">🇩🇪 Germany</SelectItem>
                <SelectItem value="fr">🇫🇷 France</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="text-sm text-muted-foreground">
            {appsInCountry.length} monitored apps in this country
          </div>
        </div>
      </Card>

      {appsInCountry.length === 0 ? (
        <Alert>
          <AlertDescription>
            No monitored apps found in {selectedCountry.toUpperCase()}. Monitor some apps first, then come back to compare.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          {/* Primary App Selection */}
          <div className="space-y-3">
            <div>
              <h3 className="text-lg font-semibold mb-1">Primary App</h3>
              <p className="text-sm text-muted-foreground">Select the main app to analyze</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {appsInCountry.map(app => (
                <Card
                  key={app.id}
                  className={cn(
                    "p-4 cursor-pointer transition-all",
                    selectedPrimary?.id === app.id
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/50"
                  )}
                  onClick={() => setSelectedPrimary(app)}
                >
                  <div className="flex items-start gap-3">
                    {app.app_icon_url && (
                      <img src={app.app_icon_url} alt={app.app_name} className="w-12 h-12 rounded-lg" />
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm truncate">{app.app_name}</h4>
                      <div className="text-xs text-muted-foreground">
                        {app.snapshot_rating?.toFixed(1)} ⭐ • {app.snapshot_review_count?.toLocaleString()} reviews
                      </div>
                      {app.tags && app.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {app.tags.slice(0, 2).map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    {selectedPrimary?.id === app.id && (
                      <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Competitor Selection */}
          <div className="space-y-3">
            <div>
              <h3 className="text-lg font-semibold mb-1">
                Competitors ({selectedCompetitors.length})
              </h3>
              <p className="text-sm text-muted-foreground">
                Select competitors to compare against (minimum 1)
              </p>
            </div>

            {competitorsInCountry.length === 0 ? (
              <Alert>
                <AlertDescription>
                  No competitors added in {selectedCountry.toUpperCase()}.
                  Add competitors to your monitored apps first to enable comparison.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {competitorsInCountry.map(app => {
                  const isSelected = selectedCompetitors.find(c => c.id === app.id);
                  const isPrimary = selectedPrimary?.id === app.id;
                  const isDisabled = false; // No limit on competitor selection

                  return (
                    <Card
                      key={app.id}
                      className={cn(
                        "p-4 cursor-pointer transition-all",
                        isPrimary && "opacity-50 cursor-not-allowed",
                        isDisabled && !isPrimary && "opacity-50 cursor-not-allowed",
                        isSelected && !isPrimary && "border-orange-500 bg-orange-500/5",
                        !isSelected && !isPrimary && !isDisabled && "hover:bg-muted/50"
                      )}
                      onClick={() => {
                        if (!isPrimary && !isDisabled) {
                          handleToggleCompetitor(app);
                        }
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={!!isSelected}
                          disabled={isPrimary || isDisabled}
                          className="mt-1"
                        />
                        {app.app_icon_url && (
                          <img src={app.app_icon_url} alt={app.app_name} className="w-12 h-12 rounded-lg" />
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm truncate">{app.app_name}</h4>
                          <div className="text-xs text-muted-foreground">
                            {app.snapshot_rating?.toFixed(1)} ⭐ • {app.snapshot_review_count?.toLocaleString()} reviews
                          </div>
                          {isPrimary && (
                            <Badge variant="outline" className="text-xs mt-1">Primary App</Badge>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={!selectedPrimary || selectedCompetitors.length === 0}
          className="gap-2"
        >
          <Target className="h-4 w-4" />
          Start Comparison
          {selectedPrimary && selectedCompetitors.length > 0 && (
            <Badge variant="secondary" className="ml-1">
              1 vs {selectedCompetitors.length}
            </Badge>
          )}
        </Button>
      </div>
    </div>
  );
};
