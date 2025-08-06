import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Edit3 } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface CollapsibleContextSectionProps {
  autoPopulatedData: any;
  setAutoPopulatedData: (data: any) => void;
  editingField: string | null;
  setEditingField: (field: string | null) => void;
}

export const CollapsibleContextSection: React.FC<CollapsibleContextSectionProps> = ({
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
              <span className="text-lg mr-2">📝</span>
              <h3 className="text-lg font-semibold">Business Context</h3>
              <span className="text-xs text-muted-foreground ml-2">(Optional - Click to review)</span>
            </div>
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="p-4 border-t border-border space-y-4">
            {/* Competitors Field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Known Competitors</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingField(editingField === 'competitors' ? null : 'competitors')}
                >
                  <Edit3 className="h-4 w-4" />
                </Button>
              </div>
              {editingField === 'competitors' ? (
                <Textarea
                  value={autoPopulatedData.known_players.join(', ')}
                  onChange={(e) => setAutoPopulatedData(prev => prev ? {...prev, known_players: e.target.value.split(',').map(s => s.trim()).filter(Boolean)} : null)}
                  onBlur={() => setEditingField(null)}
                  autoFocus
                  placeholder="Enter competitors separated by commas"
                  className="w-full min-h-[80px]"
                />
              ) : (
                <div className="bg-background/50 border rounded-lg p-3">
                  <div className="flex flex-wrap gap-1">
                    {autoPopulatedData.known_players.map((competitor: string, idx: number) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {competitor}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Context Description */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Context Description</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingField(editingField === 'context' ? null : 'context')}
                >
                  <Edit3 className="h-4 w-4" />
                </Button>
              </div>
              {editingField === 'context' ? (
                <Textarea
                  value={autoPopulatedData.context_description || ''}
                  onChange={(e) => setAutoPopulatedData(prev => prev ? {...prev, context_description: e.target.value} : null)}
                  onBlur={() => setEditingField(null)}
                  autoFocus
                  placeholder="Brief description of the analysis context"
                  className="w-full min-h-[80px]"
                />
              ) : (
                <div className="bg-background/50 border rounded-lg p-3">
                  <p className="text-sm">{autoPopulatedData.context_description}</p>
                </div>
              )}
            </div>

            {/* Solutions Offered */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Solutions Offered</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingField(editingField === 'solutions' ? null : 'solutions')}
                >
                  <Edit3 className="h-4 w-4" />
                </Button>
              </div>
              {editingField === 'solutions' ? (
                <Textarea
                  value={autoPopulatedData.solutionsOffered?.join(', ') || ''}
                  onChange={(e) => setAutoPopulatedData(prev => prev ? {...prev, solutionsOffered: e.target.value.split(',').map(s => s.trim()).filter(Boolean)} : null)}
                  onBlur={() => setEditingField(null)}
                  autoFocus
                  placeholder="Enter solutions separated by commas"
                  className="w-full min-h-[80px]"
                />
              ) : (
                <div className="bg-background/50 border rounded-lg p-3">
                  <div className="flex flex-wrap gap-1">
                    {autoPopulatedData.solutionsOffered?.map((solution: string, idx: number) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {solution}
                      </Badge>
                    )) || <span className="text-muted-foreground text-sm">No solutions specified</span>}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};