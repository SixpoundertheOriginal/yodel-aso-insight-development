/**
 * Competitor Search Modal
 *
 * Allows users to search and select up to 10 competitors for analysis.
 *
 * Features:
 * - Search by app name (uses iTunes Search API)
 * - Auto-suggest based on Strategic Keyword Frequency (coming soon)
 * - Selected competitors list with remove button
 * - Max 10 competitors validation
 * - "Start Analysis" button
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Loader2, X, Plus, AlertCircle, Sparkles } from 'lucide-react';
import { searchApps } from '@/services/competitor-metadata.service';
import type { CompetitorSearchResult, SelectedCompetitor } from '@/types/competitiveIntelligence';
import type { KeywordFrequencyResult } from '@/types/aso';

interface CompetitorSearchModalProps {
  open: boolean;
  onClose: () => void;
  onStartAnalysis: (competitors: SelectedCompetitor[]) => void;
  initialSelected?: SelectedCompetitor[];
  targetAppName?: string; // For context in suggestions
  keywordFrequency?: KeywordFrequencyResult[]; // From MetadataAuditEngine
  maxSuggestions?: number; // Configurable limit (default: 5)
}

export const CompetitorSearchModal: React.FC<CompetitorSearchModalProps> = ({
  open,
  onClose,
  onStartAnalysis,
  initialSelected = [],
  targetAppName,
  keywordFrequency = [],
  maxSuggestions = 5,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<CompetitorSearchResult[]>([]);
  const [selectedCompetitors, setSelectedCompetitors] = useState<SelectedCompetitor[]>(initialSelected);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [suggestedCompetitors, setSuggestedCompetitors] = useState<CompetitorSearchResult[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  const MAX_COMPETITORS = 10;

  // Reset when modal opens
  useEffect(() => {
    console.log('[CompetitorSearchModal] open changed:', open);
    if (open) {
      setSelectedCompetitors(initialSelected);
      setSearchQuery('');
      setSearchResults([]);
      setSearchError(null);

      // Load auto-suggestions
      if (keywordFrequency.length > 0) {
        loadAutoSuggestions();
      }
    }
  }, [open, initialSelected]);

  // Auto-suggest competitors based on keyword frequency
  const loadAutoSuggestions = async () => {
    if (!keywordFrequency || keywordFrequency.length === 0) {
      return;
    }

    setIsLoadingSuggestions(true);

    try {
      // Take top N keywords (configurable, default 5)
      const topKeywords = keywordFrequency.slice(0, maxSuggestions).map(kf => kf.keyword);

      console.log('[CompetitorSearchModal] Auto-suggesting based on keywords:', topKeywords);

      // Search for each keyword and collect unique apps
      const allResults: CompetitorSearchResult[] = [];
      const seenAppIds = new Set<string>();

      for (const keyword of topKeywords) {
        try {
          const results = await searchApps(keyword, 'US', 5);

          // Filter out duplicates and already selected competitors
          const uniqueResults = results.filter(app => {
            if (seenAppIds.has(app.appStoreId)) return false;
            if (selectedCompetitors.some(c => c.appStoreId === app.appStoreId)) return false;

            seenAppIds.add(app.appStoreId);
            return true;
          });

          allResults.push(...uniqueResults);
        } catch (error) {
          console.error(`[CompetitorSearchModal] Failed to search for keyword "${keyword}":`, error);
        }
      }

      // Rank by keyword frequency similarity (how many top keywords they match)
      // For now, just take the first maxSuggestions unique results
      const suggestions = allResults.slice(0, maxSuggestions);

      console.log(`[CompetitorSearchModal] Auto-suggested ${suggestions.length} competitors`);
      setSuggestedCompetitors(suggestions);
    } catch (error: any) {
      console.error('[CompetitorSearchModal] Auto-suggest error:', error);
      // Don't show error to user - suggestions are optional
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  // Debounced search
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([]);
      setSearchError(null);
      return;
    }

    const timer = setTimeout(async () => {
      await performSearch(searchQuery);
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const performSearch = async (query: string) => {
    setIsSearching(true);
    setSearchError(null);

    try {
      const results = await searchApps(query, 'US', 10);

      // Convert to CompetitorSearchResult format
      const formattedResults: CompetitorSearchResult[] = results.map((app) => ({
        appStoreId: app.appStoreId,
        name: app.name,
        iconUrl: app.iconUrl,
        developer: app.developer,
        category: app.category,
        rating: app.rating,
      }));

      setSearchResults(formattedResults);
    } catch (error: any) {
      console.error('[CompetitorSearch] Search error:', error);
      setSearchError('Failed to search apps. Please try again.');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddCompetitor = (result: CompetitorSearchResult) => {
    // Check if already selected
    if (selectedCompetitors.some((c) => c.appStoreId === result.appStoreId)) {
      return;
    }

    // Check max limit
    if (selectedCompetitors.length >= MAX_COMPETITORS) {
      setSearchError(`Maximum ${MAX_COMPETITORS} competitors allowed`);
      return;
    }

    setSelectedCompetitors([
      ...selectedCompetitors,
      {
        appStoreId: result.appStoreId,
        name: result.name,
        iconUrl: result.iconUrl,
      },
    ]);

    setSearchError(null);
  };

  const handleRemoveCompetitor = (appStoreId: string) => {
    setSelectedCompetitors(selectedCompetitors.filter((c) => c.appStoreId !== appStoreId));
    setSearchError(null);
  };

  const handleStartAnalysis = () => {
    if (selectedCompetitors.length === 0) {
      setSearchError('Please select at least one competitor');
      return;
    }

    onStartAnalysis(selectedCompetitors);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-3xl bg-zinc-900 border-zinc-800 max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-zinc-200 flex items-center gap-2">
            <Search className="h-5 w-5 text-purple-400" />
            Select Competitors
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Search for up to {MAX_COMPETITORS} competitor apps to analyze. We'll compare their title and subtitle
            with yours to find keyword opportunities.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <Input
              placeholder="Search by app name (e.g., Duolingo, Headspace, Calm)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-500"
              autoFocus
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-400 animate-spin" />
            )}
          </div>

          {/* Error Message */}
          {searchError && (
            <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-400">{searchError}</p>
            </div>
          )}

          {/* Suggested Competitors (Auto-Suggest) */}
          {!searchQuery && suggestedCompetitors.length > 0 && (
            <div className="p-4 bg-gradient-to-br from-purple-900/10 to-blue-900/10 border border-purple-500/20 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-purple-400" />
                <h3 className="text-sm font-semibold text-zinc-300">
                  Suggested Competitors
                </h3>
                <Badge variant="outline" className="text-xs border-purple-500/30 text-purple-400 bg-purple-900/20">
                  Based on your keywords
                </Badge>
              </div>
              <div className="space-y-2">
                {suggestedCompetitors.map((result) => {
                  const isSelected = selectedCompetitors.some((c) => c.appStoreId === result.appStoreId);
                  return (
                    <div
                      key={result.appStoreId}
                      className="flex items-center justify-between p-3 bg-zinc-800/40 hover:bg-zinc-800/60 border border-zinc-700/50 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {result.iconUrl && (
                          <img
                            src={result.iconUrl}
                            alt={result.name}
                            className="w-10 h-10 rounded-lg flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-200 truncate">{result.name}</p>
                          <p className="text-xs text-zinc-500 truncate">{result.developer}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAddCompetitor(result)}
                        disabled={isSelected || selectedCompetitors.length >= MAX_COMPETITORS}
                        className={`flex-shrink-0 ${
                          isSelected
                            ? 'text-purple-400 cursor-default'
                            : 'text-purple-400 hover:text-purple-300 hover:bg-purple-500/10'
                        }`}
                      >
                        {isSelected ? (
                          <>
                            <X className="h-4 w-4 mr-1" />
                            Added
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-1" />
                            Add
                          </>
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Loading Suggestions */}
          {isLoadingSuggestions && !searchQuery && (
            <div className="p-4 bg-zinc-800/40 border border-zinc-700 rounded-lg">
              <div className="flex items-center gap-2 text-zinc-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                <p className="text-sm">Finding similar apps based on your keywords...</p>
              </div>
            </div>
          )}

          {/* Selected Competitors */}
          {selectedCompetitors.length > 0 && (
            <div className="p-4 bg-zinc-800/40 border border-zinc-700 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-zinc-300">
                  Selected Competitors ({selectedCompetitors.length}/{MAX_COMPETITORS})
                </h3>
                {selectedCompetitors.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedCompetitors([])}
                    className="text-xs text-zinc-500 hover:text-zinc-300"
                  >
                    Clear All
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedCompetitors.map((competitor) => (
                  <Badge
                    key={competitor.appStoreId}
                    variant="outline"
                    className="flex items-center gap-2 px-3 py-2 bg-purple-500/10 border-purple-500/30 text-purple-200"
                  >
                    {competitor.iconUrl && (
                      <img
                        src={competitor.iconUrl}
                        alt={competitor.name}
                        className="w-5 h-5 rounded"
                      />
                    )}
                    <span className="text-sm">{competitor.name}</span>
                    <button
                      onClick={() => handleRemoveCompetitor(competitor.appStoreId)}
                      className="ml-1 hover:bg-purple-500/20 rounded p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Search Results */}
          <ScrollArea className="flex-1 -mx-6 px-6">
            {searchResults.length > 0 ? (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-zinc-400 mb-3">
                  Search Results ({searchResults.length})
                </h3>
                {searchResults.map((result) => {
                  const isSelected = selectedCompetitors.some(
                    (c) => c.appStoreId === result.appStoreId
                  );
                  const isMaxReached = selectedCompetitors.length >= MAX_COMPETITORS;

                  return (
                    <div
                      key={result.appStoreId}
                      className={`flex items-center gap-4 p-3 rounded-lg border transition-all ${
                        isSelected
                          ? 'bg-purple-500/10 border-purple-500/30'
                          : 'bg-zinc-800/40 border-zinc-700 hover:border-zinc-600'
                      }`}
                    >
                      {result.iconUrl && (
                        <img
                          src={result.iconUrl}
                          alt={result.name}
                          className="w-12 h-12 rounded-lg"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-zinc-200 truncate">
                          {result.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          {result.developer && (
                            <p className="text-xs text-zinc-500 truncate">{result.developer}</p>
                          )}
                          {result.rating && (
                            <Badge variant="outline" className="text-xs border-zinc-700 text-zinc-400">
                              ⭐ {result.rating.toFixed(1)}
                            </Badge>
                          )}
                        </div>
                        {result.category && (
                          <p className="text-xs text-zinc-600 mt-1">{result.category}</p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant={isSelected ? 'outline' : 'default'}
                        onClick={() => handleAddCompetitor(result)}
                        disabled={isSelected || isMaxReached}
                        className={
                          isSelected
                            ? 'border-purple-500/30 text-purple-400'
                            : 'bg-purple-600 hover:bg-purple-700'
                        }
                      >
                        {isSelected ? (
                          <>
                            <X className="h-4 w-4 mr-1" />
                            Selected
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-1" />
                            Add
                          </>
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : searchQuery.length >= 2 && !isSearching ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Search className="h-12 w-12 text-zinc-700 mb-4" />
                <p className="text-zinc-500">No apps found for "{searchQuery}"</p>
                <p className="text-xs text-zinc-600 mt-2">Try a different search term</p>
              </div>
            ) : searchQuery.length < 2 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-4 bg-purple-500/10 rounded-full border border-purple-500/30 mb-4">
                  <Sparkles className="h-8 w-8 text-purple-400" />
                </div>
                <p className="text-zinc-400 font-medium mb-2">
                  Search for competitors by app name
                </p>
                <p className="text-xs text-zinc-600 max-w-md">
                  Start typing to find apps in the App Store. We'll analyze their title and subtitle
                  to identify keyword opportunities.
                </p>
              </div>
            ) : null}
          </ScrollArea>
        </div>

        <DialogFooter className="border-t border-zinc-800 pt-4 mt-4">
          <div className="flex items-center justify-between w-full">
            <p className="text-xs text-zinc-500">
              {selectedCompetitors.length > 0
                ? `${selectedCompetitors.length} competitor${selectedCompetitors.length > 1 ? 's' : ''} selected`
                : 'No competitors selected'}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} className="border-zinc-700">
                Cancel
              </Button>
              <Button
                onClick={handleStartAnalysis}
                disabled={selectedCompetitors.length === 0}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Search className="h-4 w-4 mr-2" />
                Start Analysis ({selectedCompetitors.length})
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
