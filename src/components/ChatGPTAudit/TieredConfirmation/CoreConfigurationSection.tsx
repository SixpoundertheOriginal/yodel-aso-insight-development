import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Edit3, Brain } from 'lucide-react';

interface CoreConfigurationSectionProps {
  autoPopulatedData: any;
  setAutoPopulatedData: (data: any) => void;
  editingField: string | null;
  setEditingField: (field: string | null) => void;
}

export const CoreConfigurationSection: React.FC<CoreConfigurationSectionProps> = ({
  autoPopulatedData,
  setAutoPopulatedData,
  editingField,
  setEditingField,
}) => {
  return (
    <div className="bg-card border border-border rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-foreground text-lg font-semibold flex items-center">
          🎯 Core Configuration
          <span className="text-xs text-muted-foreground ml-2">(Required)</span>
        </h3>
        <Badge variant="outline" className="text-green-600 border-green-200">
          <Brain className="h-3 w-3 mr-1" />
          AI Suggested
        </Badge>
      </div>
      
      {/* Topic Field */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Business Type</Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditingField(editingField === 'topic' ? null : 'topic')}
          >
            <Edit3 className="h-4 w-4" />
          </Button>
        </div>
        {editingField === 'topic' ? (
          <Input
            value={autoPopulatedData.topic}
            onChange={(e) => setAutoPopulatedData(prev => prev ? {...prev, topic: e.target.value} : null)}
            onBlur={() => setEditingField(null)}
            autoFocus
            className="w-full"
            placeholder="e.g. App Store Optimization (ASO) providers"
          />
        ) : (
          <div className="bg-background/50 border rounded-lg p-3">
            <p className="text-sm">{autoPopulatedData.topic}</p>
          </div>
        )}
      </div>

      {/* Industry Field */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Primary Industry</Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditingField(editingField === 'industry' ? null : 'industry')}
          >
            <Edit3 className="h-4 w-4" />
          </Button>
        </div>
        {editingField === 'industry' ? (
          <Input
            value={autoPopulatedData.industry}
            onChange={(e) => setAutoPopulatedData(prev => prev ? {...prev, industry: e.target.value} : null)}
            onBlur={() => setEditingField(null)}
            autoFocus
            className="w-full"
          />
        ) : (
          <div className="bg-background/50 border rounded-lg p-3">
            <p className="text-sm">{autoPopulatedData.industry}</p>
          </div>
        )}
      </div>

      {/* Target Audience Field */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Target Audience</Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditingField(editingField === 'target_audience' ? null : 'target_audience')}
          >
            <Edit3 className="h-4 w-4" />
          </Button>
        </div>
        {editingField === 'target_audience' ? (
          <Input
            value={autoPopulatedData.target_audience}
            onChange={(e) => setAutoPopulatedData(prev => prev ? {...prev, target_audience: e.target.value} : null)}
            onBlur={() => setEditingField(null)}
            autoFocus
            className="w-full"
          />
        ) : (
          <div className="bg-background/50 border rounded-lg p-3">
            <p className="text-sm">{autoPopulatedData.target_audience}</p>
          </div>
        )}
      </div>
    </div>
  );
};