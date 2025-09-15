import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Star, Target, BarChart3, TrendingUp } from 'lucide-react';
import { ScrapedMetadata } from '@/types/aso';
import { isDebugTarget } from '@/lib/debugTargets';
import { asoSearchService } from '@/services/aso-search.service';
import { directItunesService } from '@/services/direct-itunes.service';

interface AppSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidates: ScrapedMetadata[];
  onSelect: (app: ScrapedMetadata) => void;
  searchTerm: string;
  mode?: 'select' | 'analyze';
  onCompetitorAnalysis?: (
    searchTerm: string,
    analysisType: 'brand' | 'keyword' | 'category'
  ) => void;
  showCompetitorAnalysis?: boolean;
  selectMode?: 'single' | 'multi';
  onMultiSelect?: (apps: ScrapedMetadata[]) => void;
  maxSelections?: number;
  selectedApps?: ScrapedMetadata[];
  searchCountry?: string;
  requireConfirm?: boolean; // when true and selectMode multi: show explicit confirm button instead of applying on close
}

interface ButtonProps {
  text: string;
  onClick: () => void;
  variant: 'default' | 'outline';
  disabled?: boolean;
}

export const AppSelectionModal: React.FC<AppSelectionModalProps> = ({
  isOpen,
  onClose,
  candidates,
  onSelect,
  searchTerm,
  mode = 'select',
  onCompetitorAnalysis,
  showCompetitorAnalysis = true,
  selectMode = 'single',
  onMultiSelect,
  maxSelections = 5,
  selectedApps,
  searchCountry = 'US',
  requireConfirm = false,
}) => {
  const buttonText = mode === 'analyze' ? 'Analyze This App' : 'Select';
  const buttonIcon = mode === 'analyze' ? <Target className="w-4 h-4 mr-2" /> : null;

  const stableSelectedApps = useMemo(() => selectedApps || [], [selectedApps]);

  const [internalSelectedApps, setInternalSelectedApps] = useState<ScrapedMetadata[]>(() => {
    const uniqueApps = stableSelectedApps.filter(
      (app, index, arr) => arr.findIndex((a) => a.appId === app.appId) === index
    );
    return uniqueApps;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ScrapedMetadata[]>(candidates);
  const [searching, setSearching] = useState(false);
  const [urlInput, setUrlInput] = useState('');

  useEffect(() => {
    const uniqueApps = stableSelectedApps.filter(
      (app, index, arr) => arr.findIndex((a) => a.appId === app.appId) === index
    );
    // Avoid unnecessary state updates to prevent render loops
    const sameLength = uniqueApps.length === internalSelectedApps.length;
    const sameIds = sameLength && uniqueApps.every((u) => internalSelectedApps.some((i) => i.appId === u.appId));
    if (!sameIds) {
      setInternalSelectedApps(uniqueApps);
    }
  }, [stableSelectedApps]);

  useEffect(() => {
    if (selectMode === 'single') {
      setSearchResults(candidates);
    }
  }, [candidates, selectMode]);

  const handleAppToggle = (app: ScrapedMetadata) => {
    const isSelected = internalSelectedApps.some((a) => a.appId === app.appId);
    if (isSelected) {
      setInternalSelectedApps((prev) => prev.filter((a) => a.appId !== app.appId));
    } else if (internalSelectedApps.length < maxSelections) {
      setInternalSelectedApps((prev) => [...prev, app]);
    }
  };

  const handleClose = () => {
    // In confirm-required mode, cancel on close
    if (!(requireConfirm && selectMode === 'multi') && selectMode === 'multi' && onMultiSelect) {
      onMultiSelect(internalSelectedApps);
    }
    onClose();
  };

  const getButtonProps = (app: ScrapedMetadata): ButtonProps => {
    if (selectMode === 'single') {
      return {
        text: buttonText,
        onClick: () => onSelect(app),
        variant: 'default',
      };
    }
    const isSelected = internalSelectedApps.some((a) => a.appId === app.appId);
    const isAtLimit = internalSelectedApps.length >= maxSelections;
    return {
      text: isSelected ? 'Remove' : 'Add to Compare',
      onClick: () => handleAppToggle(app),
      variant: isSelected ? 'outline' : 'default',
      disabled: !isSelected && isAtLimit,
    };
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const results = await asoSearchService.searchApps(searchQuery.trim(), searchCountry);
      setSearchResults(results.slice(0, 10));
    } catch (e) {
      console.error('Search failed', e);
    } finally {
      setSearching(false);
    }
  };

  const handleUseUrl = async () => {
    const m = urlInput.match(/id(\d{5,})/);
    if (!m) {
      console.error('URL must include id<digits>');
      return;
    }
    setSearching(true);
    try {
      const app = await directItunesService.lookupById(m[1], { country: searchCountry.toLowerCase() });
      setSearchResults([app]);
    } catch (e) {
      console.error('Lookup failed', e);
    } finally {
      setSearching(false);
    }
  };

  const handleCompetitorAnalysis = (analysisType: 'brand' | 'keyword' | 'category') => {
    if (onCompetitorAnalysis) {
      onCompetitorAnalysis(searchTerm, analysisType);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {mode === 'analyze'
              ? `Choose an app to analyze for "${searchTerm}"`
              : `Multiple apps found for "${searchTerm}"`}
          </DialogTitle>
          <DialogDescription>
            {mode === 'analyze'
              ? `Found ${searchResults.length} apps matching your search. Select which one you want to analyze for CPP strategy:`
              : 'Select the app you want to analyze:'}
          </DialogDescription>
        </DialogHeader>

        {selectMode === 'multi' && (
          <div className="flex gap-2 mb-4">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search apps..."
              className="bg-zinc-800 border-zinc-700 text-foreground"
            />
            <Button onClick={handleSearch} disabled={searching || !searchQuery.trim()}>
              {searching ? 'Searching...' : 'Search'}
            </Button>
            <Input
              value={urlInput}
              onChange={(e)=>setUrlInput(e.target.value)}
              placeholder="Or paste App Store URL (…/id1234567890)"
              className="bg-zinc-800 border-zinc-700 text-foreground"
            />
            <Button variant="outline" onClick={handleUseUrl} disabled={searching || !urlInput.trim()}>
              Use URL
            </Button>
          </div>
        )}

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-3">
            {searchResults.map((app, index) => {
              const debug = isDebugTarget(app);
              const btnProps = getButtonProps(app);
              return (
                <div key={index} className="border border-zinc-800 rounded-lg p-4">
                  <div className="flex items-start space-x-4">
                    {app.icon && (
                      <img
                        src={app.icon}
                        alt={app.name}
                        className="w-16 h-16 rounded-xl"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate flex items-center gap-2">
                        {app.name}
                        {debug && (
                          <Badge
                            variant="outline"
                            className="text-[10px] border-yodel-orange text-yodel-orange"
                          >
                            Debug
                          </Badge>
                        )}
                      </h3>
                      <p className="text-sm text-zinc-400 mb-2">
                        by {app.developer || 'Unknown Developer'}
                      </p>

                      <div className="flex items-center gap-4 mb-2">
                        {app.rating && (
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm text-zinc-300">{app.rating}</span>
                          </div>
                        )}
                        {app.applicationCategory && (
                          <Badge
                            variant="outline"
                            className="text-zinc-400 border-zinc-600"
                          >
                            {app.applicationCategory}
                          </Badge>
                        )}
                      </div>

                      {app.description && (
                        <p className="text-sm text-zinc-400 line-clamp-2">
                          {app.description}
                        </p>
                      )}
                    </div>

                    <Button
                      onClick={btnProps.onClick}
                      variant={btnProps.variant}
                      disabled={btnProps.disabled}
                      className="bg-yodel-orange hover:bg-yodel-orange/90 text-foreground flex items-center"
                    >
                      {selectMode === 'single' && buttonIcon}
                      {btnProps.text}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {showCompetitorAnalysis && selectMode === 'single' && onCompetitorAnalysis && (
          <>
            <Separator className="bg-zinc-800" />
            <div className="space-y-3 pt-4">
              <div className="text-center">
                <h4 className="text-sm font-medium text-foreground mb-2">
                  Or analyze the competitive landscape
                </h4>
                <p className="text-xs text-zinc-400 mb-4">
                  Get insights on top competing apps for "{searchTerm}"
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2">
                <Button
                  onClick={() => handleCompetitorAnalysis('keyword')}
                  variant="outline"
                  className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 w-full justify-start"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Analyze Keyword Competition
                  <span className="ml-auto text-xs text-zinc-500">Top 10 apps</span>
                </Button>

                <Button
                  onClick={() => handleCompetitorAnalysis('category')}
                  variant="outline"
                  className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 w-full justify-start"
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Market Trend Analysis
                  <span className="ml-auto text-xs text-zinc-500">Category insights</span>
                </Button>
              </div>
            </div>
          </>
        )}
        {requireConfirm && selectMode === 'multi' && (
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => { onMultiSelect?.(internalSelectedApps); onClose(); }} disabled={internalSelectedApps.length === 0}>
              Confirm {internalSelectedApps.length || ''}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
