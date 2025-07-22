
import React from 'react';
import { YodelButton } from '@/components/ui/design-system/YodelButton';
import { Wand2, Edit3 } from 'lucide-react';

export type WorkspaceMode = 'ai-generation' | 'manual-editor';

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
      <YodelButton
        variant={mode === 'ai-generation' ? 'primary' : 'ghost'}
        size="sm"
        onClick={() => onModeChange('ai-generation')}
        disabled={disabled}
        leftIcon={<Wand2 className="w-4 h-4" />}
        className={mode === 'ai-generation' ? 'shadow-glow-sm' : ''}
      >
        AI Generation
      </YodelButton>
      
      <YodelButton
        variant={mode === 'manual-editor' ? 'primary' : 'ghost'}
        size="sm"
        onClick={() => onModeChange('manual-editor')}
        disabled={disabled}
        leftIcon={<Edit3 className="w-4 h-4" />}
        className={mode === 'manual-editor' ? 'shadow-glow-sm' : ''}
      >
        Manual Editor
      </YodelButton>
    </div>
  );
};
