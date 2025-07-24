import React from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Badge } from '@/components/ui/badge';
import { AuditMode } from '@/types/topic-audit.types';
import { Smartphone, Target } from 'lucide-react';

interface ModeSelectorProps {
  mode: AuditMode;
  onModeChange: (mode: AuditMode) => void;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({ mode, onModeChange }) => {
  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-muted-foreground">Analysis Mode</div>
      <ToggleGroup 
        type="single" 
        value={mode} 
        onValueChange={(value) => value && onModeChange(value as AuditMode)}
        className="bg-background/50 p-1 rounded-lg border border-border"
      >
        <ToggleGroupItem 
          value="app" 
          className="flex items-center gap-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
        >
          <Smartphone className="h-4 w-4" />
          App Analysis
          <Badge variant="secondary" className="text-xs">
            Current
          </Badge>
        </ToggleGroupItem>
        <ToggleGroupItem 
          value="topic" 
          className="flex items-center gap-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
        >
          <Target className="h-4 w-4" />
          Topic Analysis
          <Badge variant="outline" className="text-xs">
            New
          </Badge>
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
};