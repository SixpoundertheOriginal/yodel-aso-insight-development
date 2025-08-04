
import React from 'react';
import { Button } from '@/components/ui/button';
import { Wand2, Edit3, Users, FileText } from 'lucide-react';

export type WorkspaceMode = 'ai-generation' | 'manual-editor' | 'competitive-analysis' | 'long-description';

interface ModeToggleProps {
  mode: WorkspaceMode;
  onModeChange: (mode: WorkspaceMode) => void;
  disabled?: boolean;
}

export const ModeToggle: React.FC<ModeToggleProps> = ({
  mode,
  onModeChange,
  disabled = false
}) => {
  return (
    <div className="flex items-center space-x-1 bg-zinc-800 rounded-lg p-1">
      <Button
        variant={mode === 'ai-generation' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onModeChange('ai-generation')}
        disabled={disabled}
        className={`flex items-center space-x-2 ${
          mode === 'ai-generation' 
            ? 'bg-yodel-orange hover:bg-yodel-orange/90 text-foreground' 
            : 'text-zinc-400 hover:text-foreground hover:bg-zinc-700'
        }`}
      >
        <Wand2 className="w-4 h-4" />
        <span>AI Generation</span>
      </Button>
      
      <Button
        variant={mode === 'manual-editor' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onModeChange('manual-editor')}
        disabled={disabled}
        className={`flex items-center space-x-2 ${
          mode === 'manual-editor' 
            ? 'bg-yodel-orange hover:bg-yodel-orange/90 text-foreground' 
            : 'text-zinc-400 hover:text-foreground hover:bg-zinc-700'
        }`}
      >
        <Edit3 className="w-4 h-4" />
        <span>Manual Editor</span>
      </Button>

      <Button
        variant={mode === 'competitive-analysis' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onModeChange('competitive-analysis')}
        disabled={disabled}
        className={`flex items-center space-x-2 ${
          mode === 'competitive-analysis' 
            ? 'bg-yodel-orange hover:bg-yodel-orange/90 text-foreground' 
            : 'text-zinc-400 hover:text-foreground hover:bg-zinc-700'
        }`}
      >
        <Users className="w-4 h-4" />
        <span>Competitors</span>
      </Button>

      <Button
        variant={mode === 'long-description' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onModeChange('long-description')}
        disabled={disabled}
        className={`flex items-center space-x-2 ${
          mode === 'long-description' 
            ? 'bg-yodel-orange hover:bg-yodel-orange/90 text-foreground' 
            : 'text-zinc-400 hover:text-foreground hover:bg-zinc-700'
        }`}
      >
        <FileText className="w-4 h-4" />
        <span>Long Description</span>
      </Button>
    </div>
  );
};
