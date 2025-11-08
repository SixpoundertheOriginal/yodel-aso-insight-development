import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Search, Plus, Loader2 } from 'lucide-react';
import { useAddCompetitor } from '@/hooks/useAppCompetitors';
import { asoSearchService } from '@/services/aso-search.service';
import { cn } from '@/lib/utils';
import type { ScrapedMetadata } from '@/types/aso';

interface AddCompetitorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetAppId: string;
  targetAppName: string;
  organizationId: string;
  country: string;
  existingCompetitorAppStoreIds: string[];
}

export const AddCompetitorDialog: React.FC<AddCompetitorDialogProps> = ({
  open,
  onOpenChange,
  targetAppId,
  targetAppName,
  organizationId,
  country,
  existingCompetitorAppStoreIds
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<ScrapedMetadata[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const addCompetitor = useAddCompetitor();

  // Search App Store when search term changes (with debounce)
  useEffect(() => {
    if (!searchTerm.trim() || !open) {
      setSearchResults([]);
      setSearchError(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      setSearchError(null);

      try {
        const results = await asoSearchService.searchApps(searchTerm, country);
        // Filter out already added competitors
        const filteredResults = results.filter(
          app => !existingCompetitorAppStoreIds.includes(app.appId)
        );
        setSearchResults(filteredResults);
      } catch (error: any) {
        console.error('App Store search failed:', error);
        setSearchError(error.message || 'Failed to search App Store');
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchTerm, country, open, existingCompetitorAppStoreIds]);

  const handleAddCompetitor = async (app: ScrapedMetadata) => {
    try {
      await addCompetitor.mutateAsync({
        organizationId,
        targetAppId,
        competitorAppStoreId: app.appId,
        competitorAppName: app.name || app.title,
        competitorAppIcon: app.icon,
        competitorBundleId: (app as any).bundleId, // Optional field
        competitorDeveloper: app.developer,
        competitorCategory: app.applicationCategory,
        competitorRating: app.rating,
        competitorReviewCount: app.reviews,
        country,
        priority: existingCompetitorAppStoreIds.length + 1,
      });

      // Close dialog on success
      onOpenChange(false);
      setSearchTerm('');
      setSearchResults([]);
    } catch (error) {
      // Error handling is done in the hook
      console.error('Failed to add competitor:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Competitor to {targetAppName}</DialogTitle>
          <DialogDescription>
            Search the App Store to find competitors for {targetAppName} in {country.toUpperCase()}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 flex-1 overflow-hidden">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search App Store by app name, keyword, or developer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>

          {/* Search Results */}
          <div className="flex-1 overflow-y-auto">
            {!searchTerm.trim() ? (
              <div className="text-center py-12 px-4">
                <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground mb-2">
                  Start typing to search the App Store
                </p>
                <p className="text-sm text-muted-foreground/80">
                  Search by app name, keywords, or developer name
                </p>
              </div>
            ) : isSearching ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Searching App Store...
              </div>
            ) : searchError ? (
              <div className="text-center py-12 px-4">
                <p className="text-destructive mb-2">{searchError}</p>
                <p className="text-sm text-muted-foreground/80">
                  Try different keywords or check your connection
                </p>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="text-center py-12 px-4">
                <p className="text-muted-foreground mb-2">
                  No apps found for &ldquo;{searchTerm}&rdquo;
                </p>
                <p className="text-sm text-muted-foreground/80">
                  Try different keywords or check the spelling
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {searchResults.map(app => (
                  <CompetitorOption
                    key={app.appId}
                    app={app}
                    onAdd={() => handleAddCompetitor(app)}
                    isAdding={addCompetitor.isPending}
                    country={country}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer Info */}
          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground">
              💡 <strong>Tip:</strong> You can add any app from the App Store as a competitor.
              We&apos;ll fetch their reviews on-demand when comparing.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Competitor Option Component
interface CompetitorOptionProps {
  app: ScrapedMetadata;
  onAdd: () => void;
  isAdding: boolean;
  country: string;
}

const CompetitorOption: React.FC<CompetitorOptionProps> = ({
  app,
  onAdd,
  isAdding,
  country
}) => {
  return (
    <Card className="p-4 hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-4">
        {/* App Icon */}
        {app.icon && (
          <img
            src={app.icon}
            alt={app.name || app.title}
            className="w-16 h-16 rounded-lg flex-shrink-0"
          />
        )}

        {/* App Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold truncate">{app.name || app.title}</h4>
            <Badge variant="outline" className="text-xs">
              {country.toUpperCase()}
            </Badge>
          </div>

          {app.developer && (
            <p className="text-sm text-muted-foreground mb-2 truncate">
              {app.developer}
            </p>
          )}

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {app.rating && (
              <div className="flex items-center gap-1">
                <span className="font-medium">{app.rating.toFixed(1)}</span>
                <span>⭐</span>
              </div>
            )}
            {app.reviews && (
              <div>
                {app.reviews.toLocaleString()} reviews
              </div>
            )}
            {app.applicationCategory && (
              <div className="text-xs">
                {app.applicationCategory}
              </div>
            )}
          </div>

          {/* App Store ID */}
          <div className="text-xs text-muted-foreground/70 mt-1">
            ID: {app.appId}
          </div>
        </div>

        {/* Add Button */}
        <Button
          onClick={onAdd}
          disabled={isAdding}
          size="sm"
          className="gap-2"
        >
          {isAdding ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Add
        </Button>
      </div>
    </Card>
  );
};
