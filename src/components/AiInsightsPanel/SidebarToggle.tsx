import React from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, X } from 'lucide-react';

interface SidebarToggleProps {
  isOpen: boolean;
  onToggle: () => void;
  insightCount?: number;
}

export const SidebarToggle: React.FC<SidebarToggleProps> = ({
  isOpen,
  onToggle,
  insightCount = 0
}) => {
  return (
    <Button
      onClick={onToggle}
      variant="outline"
      size="sm"
      className="fixed top-4 right-4 z-50 md:hidden bg-white shadow-lg"
    >
      {isOpen ? (
        <X className="w-4 h-4" />
      ) : (
        <>
          <Sparkles className="w-4 h-4 mr-1" />
          <span className="text-xs">
            Insights {insightCount > 0 && `(${insightCount})`}
          </span>
        </>
      )}
    </Button>
  );
};
