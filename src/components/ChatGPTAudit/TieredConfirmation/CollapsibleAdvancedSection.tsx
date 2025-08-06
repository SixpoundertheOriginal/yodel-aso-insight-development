import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Edit3 } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface CollapsibleAdvancedSectionProps {
  autoPopulatedData: any;
  setAutoPopulatedData: (data: any) => void;
  editingField: string | null;
  setEditingField: (field: string | null) => void;
}

export const CollapsibleAdvancedSection: React.FC<CollapsibleAdvancedSectionProps> = ({
  autoPopulatedData,
  setAutoPopulatedData,
  editingField,
  setEditingField,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="bg-card border border-border rounded-lg mb-4">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full p-4 text-left flex items-center justify-between hover:bg-muted/50"
          >
            <div className="flex items-center">
              <span className="text-lg mr-2">⚙️</span>
              <h3 className="text-lg font-semibold">Advanced Options</h3>
              <span className="text-xs text-muted-foreground ml-2">(Optional - Fine-tune analysis)</span>
            </div>
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="p-4 border-t border-border space-y-4">
            {/* Query Strategy */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Query Strategy</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingField(editingField === 'queryStrategy' ? null : 'queryStrategy')}
                >
                  <Edit3 className="h-4 w-4" />
                </Button>
              </div>
              {editingField === 'queryStrategy' ? (
                <select
                  value={autoPopulatedData.queryStrategy || 'market_research'}
                  onChange={(e) => setAutoPopulatedData(prev => prev ? {...prev, queryStrategy: e.target.value as any} : null)}
                  onBlur={() => setEditingField(null)}
                  autoFocus
                  className="w-full p-2 bg-background border border-border rounded-lg text-sm"
                >
                  <option value="competitive_discovery">Product Discovery Focus</option>
                  <option value="market_research">Market Research Focus</option>
                  <option value="mixed">Balanced Analysis</option>
                </select>
              ) : (
                <div className="bg-background/50 border rounded-lg p-3">
                  <span className="text-sm capitalize">
                    {autoPopulatedData.queryStrategy?.replace('_', ' ') || 'market research'}
                  </span>
                  <p className="text-xs text-muted-foreground mt-1">
                    {autoPopulatedData.queryStrategy === 'competitive_discovery' && 'Focuses on competitive positioning queries'}
                    {autoPopulatedData.queryStrategy === 'market_research' && 'Focuses on market and industry analysis'}
                    {autoPopulatedData.queryStrategy === 'mixed' && 'Balanced mix of discovery and research queries'}
                  </p>
                </div>
              )}
            </div>

            {/* Intent Level */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Intent Level</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingField(editingField === 'intentLevel' ? null : 'intentLevel')}
                >
                  <Edit3 className="h-4 w-4" />
                </Button>
              </div>
              {editingField === 'intentLevel' ? (
                <select
                  value={autoPopulatedData.intentLevel || 'high'}
                  onChange={(e) => setAutoPopulatedData(prev => prev ? {...prev, intentLevel: e.target.value as any} : null)}
                  onBlur={() => setEditingField(null)}
                  autoFocus
                  className="w-full p-2 bg-background border border-border rounded-lg text-sm"
                >
                  <option value="high">High Intent</option>
                  <option value="medium">Medium Intent</option>
                  <option value="low">Low Intent</option>
                </select>
              ) : (
                <div className="bg-background/50 border rounded-lg p-3">
                  <span className="text-sm capitalize">{autoPopulatedData.intentLevel || 'high'} Intent</span>
                </div>
              )}
            </div>

            {/* Analysis Depth */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Analysis Depth</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingField(editingField === 'analysisDepth' ? null : 'analysisDepth')}
                >
                  <Edit3 className="h-4 w-4" />
                </Button>
              </div>
              {editingField === 'analysisDepth' ? (
                <select
                  value={autoPopulatedData.analysisDepth || 'standard'}
                  onChange={(e) => setAutoPopulatedData(prev => prev ? {...prev, analysisDepth: e.target.value as any} : null)}
                  onBlur={() => setEditingField(null)}
                  autoFocus
                  className="w-full p-2 bg-background border border-border rounded-lg text-sm"
                >
                  <option value="standard">Standard (20 queries)</option>
                  <option value="comprehensive">Comprehensive (50 queries)</option>
                  <option value="deep">Deep Analysis (100 queries)</option>
                </select>
              ) : (
                <div className="bg-background/50 border rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <span className="text-sm capitalize">{autoPopulatedData.analysisDepth || 'standard'}</span>
                    <p className="text-xs text-muted-foreground">
                      {autoPopulatedData.analysisDepth === 'standard' && '20 queries - Good for initial insights'}
                      {autoPopulatedData.analysisDepth === 'comprehensive' && '50 queries - Detailed competitive analysis'}
                      {autoPopulatedData.analysisDepth === 'deep' && '100 queries - Exhaustive market research'}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {autoPopulatedData.analysisDepth === 'comprehensive' ? 'Pro' : autoPopulatedData.analysisDepth === 'deep' ? 'Enterprise' : 'Free'}
                  </Badge>
                </div>
              )}
            </div>

            {/* Industry Sub-Vertical */}
            {autoPopulatedData.industrySubVertical && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Industry Sub-Vertical</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingField(editingField === 'subVertical' ? null : 'subVertical')}
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                </div>
                {editingField === 'subVertical' ? (
                  <Input
                    value={autoPopulatedData.industrySubVertical || ''}
                    onChange={(e) => setAutoPopulatedData(prev => prev ? {...prev, industrySubVertical: e.target.value} : null)}
                    onBlur={() => setEditingField(null)}
                    autoFocus
                    placeholder="e.g., App Store Optimization, Language Learning"
                    className="w-full"
                  />
                ) : (
                  <div className="bg-background/50 border rounded-lg p-3">
                    <span className="text-sm">{autoPopulatedData.industrySubVertical}</span>
                    <p className="text-xs text-muted-foreground mt-1">Precision targeting for better query relevance</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};