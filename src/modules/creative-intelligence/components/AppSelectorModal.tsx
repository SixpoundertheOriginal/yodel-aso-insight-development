import { useState, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { asoSearchService } from '@/services/aso-search.service';
import { ScrapedMetadata } from '@/types/aso';

interface AppSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (app: ScrapedMetadata) => void;
}

/**
 * App Selection Modal for Creative Intelligence
 *
 * Phase 1A: Independent app selector using existing search infrastructure
 * - Uses AsoSearchService.searchApps() for bulletproof search
 * - Displays candidate apps with icon, name, developer
 * - Handles loading states and errors gracefully
 */
export function AppSelectorModal({ isOpen, onClose, onSelect }: AppSelectorModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [candidates, setCandidates] = useState<ScrapedMetadata[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search apps using existing bulletproof search
  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setCandidates([]);
      setError(null);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      console.log('[AppSelectorModal] Searching for:', query);

      // Use existing bulletproof search service
      const results = await asoSearchService.searchApps(query, 'us');

      console.log('[AppSelectorModal] Search results:', {
        query,
        count: results.length,
        apps: results.map(r => ({ name: r.name, appId: r.appId }))
      });

      setCandidates(results);

      if (results.length === 0) {
        setError('No apps found. Try different keywords or check spelling.');
      }
    } catch (err: any) {
      console.error('[AppSelectorModal] Search failed:', err);
      setError(err.message || 'Search failed. Please try again.');
      setCandidates([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search on query change
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        handleSearch(searchQuery);
      } else {
        setCandidates([]);
        setError(null);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle app selection
  const handleSelectApp = (app: ScrapedMetadata) => {
    console.log('[AppSelectorModal] App selected:', {
      name: app.name,
      appId: app.appId
    });
    onSelect(app);
    setSearchQuery('');
    setCandidates([]);
    setError(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Select App for Creative Analysis</DialogTitle>
          <DialogDescription>
            Search for an app to analyze its screenshots and creative strategy
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by app name, developer, or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              autoFocus
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3">
              {error}
            </div>
          )}

          {/* Results List */}
          {candidates.length > 0 && (
            <ScrollArea className="h-[400px] border rounded-md">
              <div className="p-2 space-y-1">
                {candidates.map((app) => (
                  <button
                    key={app.appId}
                    onClick={() => handleSelectApp(app)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors text-left"
                  >
                    {/* App Icon */}
                    {app.icon ? (
                      <img
                        src={app.icon}
                        alt={app.name}
                        className="w-12 h-12 rounded-lg border border-border"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg border border-border bg-muted flex items-center justify-center text-xs text-muted-foreground">
                        No Icon
                      </div>
                    )}

                    {/* App Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {app.name}
                      </div>
                      {app.developer && (
                        <div className="text-xs text-muted-foreground truncate">
                          {app.developer}
                        </div>
                      )}
                      {app.applicationCategory && (
                        <div className="text-xs text-muted-foreground/60">
                          {app.applicationCategory}
                        </div>
                      )}
                    </div>

                    {/* App ID Badge */}
                    <div className="text-xs text-muted-foreground font-mono">
                      {app.appId}
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Empty State */}
          {!searchQuery && !error && candidates.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">Start typing to search for apps</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
