import React from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Apple, Smartphone } from 'lucide-react';

interface PlatformToggleProps {
  selected: 'ios' | 'android';
  onChange: (platform: 'ios' | 'android') => void;
  disabled?: boolean;
  className?: string;
}

export const PlatformToggle: React.FC<PlatformToggleProps> = ({
  selected,
  onChange,
  disabled = false,
  className = ''
}) => {
  return (
    <ToggleGroup
      type="single"
      value={selected}
      onValueChange={(val) => val && onChange(val as 'ios' | 'android')}
      className={className}
    >
      <ToggleGroupItem value="ios" disabled={disabled} className="gap-2">
        <Apple className="h-4 w-4" />
        iOS
      </ToggleGroupItem>
      <ToggleGroupItem value="android" disabled={disabled} className="gap-2">
        <Smartphone className="h-4 w-4" />
        Android
      </ToggleGroupItem>
    </ToggleGroup>
  );
};
