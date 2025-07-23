
import React from 'react';
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
import { Star, Download, Target, BarChart3, TrendingUp } from 'lucide-react';
import { ScrapedMetadata } from '@/types/aso';

interface AppSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidates: ScrapedMetadata[];
  onSelect: (app: ScrapedMetadata) => void;
  searchTerm: string;
  mode?: 'select' | 'analyze';
  onCompetitorAnalysis?: (searchTerm: string, analysisType: 'brand' | 'keyword' | 'category') => void;
  showCompetitorAnalysis?: boolean;
}

export const AppSelectionModal: React.FC<AppSelectionModalProps> = ({
  isOpen,
  onClose,
  candidates,
  onSelect,
  searchTerm,
  mode = 'select',
  onCompetitorAnalysis,
  showCompetitorAnalysis = true
}) => {
  const buttonText = mode === 'analyze' ? 'Analyze This App' : 'Select';
  const buttonIcon = mode === 'analyze' ? <Target className="w-4 h-4 mr-2" /> : null;

  const handleCompetitorAnalysis = (analysisType: 'brand' | 'keyword' | 'category') => {
    if (onCompetitorAnalysis) {
      onCompetitorAnalysis(searchTerm, analysisType);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-white">
            {mode === 'analyze' 
              ? `Choose an app to analyze for "${searchTerm}"`
              : `Multiple apps found for "${searchTerm}"`
            }
          </DialogTitle>
          <DialogDescription>
            {mode === 'analyze'
              ? `Found ${candidates.length} apps matching your search. Select which one you want to analyze for CPP strategy:`
              : 'Select the app you want to analyze:'
            }
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-3">
            {candidates.map((app, index) => (
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
                    <h3 className="font-semibold text-white truncate">
                      {app.name}
                    </h3>
                    <p className="text-sm text-zinc-400 mb-2">
                      by {app.developer || 'Unknown Developer'}
                    </p>
                    
                    <div className="flex items-center gap-4 mb-2">
                      {app.rating && (
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm text-zinc-300">
                            {app.rating}
                          </span>
                        </div>
                      )}
                      {app.applicationCategory && (
                        <Badge variant="outline" className="text-zinc-400 border-zinc-600">
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
                    onClick={() => onSelect(app)}
                    className="bg-yodel-orange hover:bg-yodel-orange/90 text-white flex items-center"
                  >
                    {buttonIcon}
                    {buttonText}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        
        {/* Competitor Analysis Section */}
        {showCompetitorAnalysis && onCompetitorAnalysis && (
          <>
            <Separator className="bg-zinc-800" />
            <div className="space-y-3 pt-4">
              <div className="text-center">
                <h4 className="text-sm font-medium text-white mb-2">
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
      </DialogContent>
    </Dialog>
  );
};
