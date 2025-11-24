/**
 * Add Competitor Dialog
 *
 * Modal for adding competitors to a monitored app.
 * Features:
 * - Search by App Store ID or app name
 * - Preview competitor info before adding
 * - Validation and error handling
 *
 * @module components/CompetitorAnalysis/AddCompetitorDialog
 */

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Loader2, AlertCircle, CheckCircle2, Star } from 'lucide-react';
import { searchApps, fetchCompetitorMetadata, storeCompetitorMetadata } from '@/services/competitor-metadata.service';
import { toast } from 'sonner';

interface AddCompetitorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetAppId: string;
  organizationId: string;
  onCompetitorAdded?: () => void;
}

interface SearchResult {
  appStoreId: string;
  name: string;
  iconUrl: string | null;
  developer: string | null;
  category: string | null;
  rating: number | null;
}

export const AddCompetitorDialog: React.FC<AddCompetitorDialogProps> = ({
  open,
  onOpenChange,
  targetAppId,
  organizationId,
  onCompetitorAdded,
}) => {
  const [searchMode, setSearchMode] = useState<'id' | 'name'>('name');
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedApp, setSelectedApp] = useState<SearchResult | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError('Please enter a search query');
      return;
    }

    setSearching(true);
    setError(null);
    setSearchResults([]);
    setSelectedApp(null);

    try {
      if (searchMode === 'id') {
        // Fetch by App Store ID
        const result = await fetchCompetitorMetadata({
          appStoreId: searchQuery.trim(),
          country: 'US',
        });

        if ('error' in result) {
          setError(result.error);
        } else {
          // Convert to SearchResult format
          setSearchResults([
            {
              appStoreId: result.appStoreId,
              name: result.name,
              iconUrl: result.iconUrl,
              developer: result.developerName,
              category: result.category,
              rating: result.rating,
            },
          ]);
        }
      } else {
        // Search by name
        const results = await searchApps(searchQuery.trim(), 'US', 10);
        setSearchResults(results);

        if (results.length === 0) {
          setError('No apps found. Try a different search term.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Search failed. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleSelectApp = (app: SearchResult) => {
    setSelectedApp(app);
    setError(null);
  };

  const handleAddCompetitor = async () => {
    if (!selectedApp) {
      setError('Please select an app to add');
      return;
    }

    setAdding(true);
    setError(null);

    try {
      // Fetch full metadata
      const metadataResult = await fetchCompetitorMetadata({
        appStoreId: selectedApp.appStoreId,
        country: 'US',
      });

      if ('error' in metadataResult) {
        setError(metadataResult.error);
        setAdding(false);
        return;
      }

      // Store competitor
      const storeResult = await storeCompetitorMetadata(targetAppId, metadataResult, organizationId);

      if ('error' in storeResult) {
        setError(storeResult.error);
        setAdding(false);
        return;
      }

      // Success
      toast.success(`Added ${selectedApp.name} as competitor`);
      onCompetitorAdded?.();
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add competitor');
    } finally {
      setAdding(false);
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedApp(null);
    setError(null);
    onOpenChange(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !searching) {
      handleSearch();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-zinc-100">Add Competitor</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Search for a competitor app by name or App Store ID
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Search Mode Toggle */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={searchMode === 'name' ? 'default' : 'outline'}
              onClick={() => setSearchMode('name')}
              className="text-xs"
            >
              Search by Name
            </Button>
            <Button
              size="sm"
              variant={searchMode === 'id' ? 'default' : 'outline'}
              onClick={() => setSearchMode('id')}
              className="text-xs"
            >
              Search by App Store ID
            </Button>
          </div>

          {/* Search Input */}
          <div className="space-y-2">
            <Label htmlFor="search" className="text-sm text-zinc-300">
              {searchMode === 'name' ? 'App Name' : 'App Store ID'}
            </Label>
            <div className="flex gap-2">
              <Input
                id="search"
                placeholder={
                  searchMode === 'name' ? 'e.g., Duolingo, Babbel, Rosetta Stone' : 'e.g., 1234567890'
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1 bg-zinc-800 border-zinc-700 text-zinc-100"
                disabled={searching || adding}
              />
              <Button onClick={handleSearch} disabled={searching || adding} className="min-w-[100px]">
                {searching ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Searching
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm text-zinc-300">
                Search Results ({searchResults.length})
              </Label>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {searchResults.map((app) => (
                  <div
                    key={app.appStoreId}
                    className={`
                      flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all
                      ${
                        selectedApp?.appStoreId === app.appStoreId
                          ? 'bg-violet-900/20 border-violet-500/50'
                          : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600'
                      }
                    `}
                    onClick={() => handleSelectApp(app)}
                  >
                    {/* App Icon */}
                    {app.iconUrl ? (
                      <img
                        src={app.iconUrl}
                        alt={app.name}
                        className="w-12 h-12 rounded-lg flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-zinc-700 flex items-center justify-center flex-shrink-0">
                        <span className="text-zinc-400 text-xs">No Icon</span>
                      </div>
                    )}

                    {/* App Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium text-zinc-100 truncate">{app.name}</h4>
                        {selectedApp?.appStoreId === app.appStoreId && (
                          <CheckCircle2 className="h-4 w-4 text-violet-400 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 truncate">{app.developer}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {app.category && (
                          <Badge variant="outline" className="text-xs border-zinc-600 text-zinc-400">
                            {app.category}
                          </Badge>
                        )}
                        {app.rating && (
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                            <span className="text-xs text-zinc-400">{app.rating.toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* App Store ID */}
                    <div className="text-xs text-zinc-500">ID: {app.appStoreId}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Selected App Preview */}
          {selectedApp && (
            <div className="p-4 bg-violet-900/10 border border-violet-500/30 rounded-lg">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-violet-400 font-medium mb-1">SELECTED APP</p>
                  <h4 className="text-sm font-semibold text-zinc-100">{selectedApp.name}</h4>
                  <p className="text-xs text-zinc-400 mt-0.5">{selectedApp.developer}</p>
                </div>
                {selectedApp.iconUrl && (
                  <img
                    src={selectedApp.iconUrl}
                    alt={selectedApp.name}
                    className="w-16 h-16 rounded-lg"
                  />
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-800">
            <Button variant="outline" onClick={handleClose} disabled={adding}>
              Cancel
            </Button>
            <Button
              onClick={handleAddCompetitor}
              disabled={!selectedApp || adding}
              className="min-w-[120px]"
            >
              {adding ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Competitor
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
