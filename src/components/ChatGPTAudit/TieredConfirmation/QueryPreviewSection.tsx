import React, { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Search, Clock } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface QueryPreviewSectionProps {
  autoPopulatedData: any;
}

export const QueryPreviewSection: React.FC<QueryPreviewSectionProps> = ({
  autoPopulatedData,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const mockQueries = useMemo(() => {
    if (!autoPopulatedData?.topic) return [];
    
    const baseQueries = [
      `best ${autoPopulatedData.topic} companies`,
      `top ${autoPopulatedData.industry} providers`,
      `${autoPopulatedData.target_audience} recommendations for ${autoPopulatedData.topic}`,
    ];
    
    return baseQueries.slice(0, autoPopulatedData.analysisDepth === 'deep' ? 3 : autoPopulatedData.analysisDepth === 'comprehensive' ? 2 : 1);
  }, [autoPopulatedData]);

  const estimatedQueries = useMemo(() => {
    switch (autoPopulatedData?.analysisDepth) {
      case 'comprehensive': return 50;
      case 'deep': return 100;
      default: return 20;
    }
  }, [autoPopulatedData?.analysisDepth]);

  const estimatedTime = useMemo(() => {
    return Math.ceil(estimatedQueries / 4); // Roughly 4 queries per minute
  }, [estimatedQueries]);

  const estimatedCredits = useMemo(() => {
    return estimatedQueries * 2; // 2 credits per query
  }, [estimatedQueries]);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="bg-card border border-border rounded-lg p-4 mb-6">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full flex items-center justify-between text-foreground hover:text-primary"
          >
            <div className="flex items-center">
              <span className="text-lg mr-2">🔍</span>
              <h3 className="text-lg font-semibold">Query Preview</h3>
              <span className="text-xs text-muted-foreground ml-2">
                ({estimatedQueries} queries will be generated)
              </span>
            </div>
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="mt-4 text-sm text-muted-foreground">
            <p className="mb-2">Based on your configuration, we'll ask ChatGPT questions like:</p>
            <ul className="list-disc pl-4 space-y-1 mb-4">
              {mockQueries.map((query, index) => (
                <li key={index} className="text-muted-foreground">
                  "{query}"
                </li>
              ))}
              {estimatedQueries > mockQueries.length && (
                <li className="text-muted-foreground">
                  ... and {estimatedQueries - mockQueries.length} more targeted queries
                </li>
              )}
            </ul>
            
            <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg border">
              <div className="flex items-center text-xs text-muted-foreground space-x-4">
                <div className="flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  <span>~{estimatedTime} min</span>
                </div>
                <div className="flex items-center">
                  <Search className="h-3 w-3 mr-1" />
                  <span>{estimatedCredits} credits</span>
                </div>
              </div>
              
              <Badge 
                variant={autoPopulatedData?.analysisDepth === 'deep' ? 'default' : 'secondary'}
                className="text-xs"
              >
                {autoPopulatedData?.analysisDepth === 'comprehensive' ? 'Pro' : 
                 autoPopulatedData?.analysisDepth === 'deep' ? 'Enterprise' : 'Free'}
              </Badge>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};