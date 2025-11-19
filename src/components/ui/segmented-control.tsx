import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Segmented Control Component
 *
 * A group of mutually exclusive buttons for mode switching.
 * Accessible, keyboard-navigable, and mobile-friendly.
 *
 * Example:
 * ```tsx
 * <SegmentedControl
 *   value="single"
 *   onValueChange={(value) => setMode(value)}
 *   options={[
 *     { value: 'single', label: 'Single App' },
 *     { value: 'compare', label: 'Compare Apps' }
 *   ]}
 * />
 * ```
 */

export interface SegmentedControlOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SegmentedControlProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SegmentedControlOption[];
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function SegmentedControl({
  value,
  onValueChange,
  options,
  className,
  size = 'sm'
}: SegmentedControlProps) {
  const handleKeyDown = (e: React.KeyboardEvent, optionValue: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onValueChange(optionValue);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      const currentIndex = options.findIndex(opt => opt.value === value);
      const direction = e.key === 'ArrowLeft' ? -1 : 1;
      const nextIndex = (currentIndex + direction + options.length) % options.length;
      const nextOption = options[nextIndex];
      if (!nextOption.disabled) {
        onValueChange(nextOption.value);
      }
    }
  };

  const sizeClasses = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-10 px-4 text-sm',
    lg: 'h-12 px-5 text-base'
  };

  return (
    <div
      role="tablist"
      className={cn(
        'inline-flex items-center gap-1 rounded-md bg-zinc-900 p-1',
        className
      )}
    >
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <button
            key={option.value}
            role="tab"
            aria-selected={isSelected}
            aria-controls={`panel-${option.value}`}
            tabIndex={isSelected ? 0 : -1}
            disabled={option.disabled}
            onClick={() => !option.disabled && onValueChange(option.value)}
            onKeyDown={(e) => handleKeyDown(e, option.value)}
            className={cn(
              'inline-flex items-center justify-center rounded-sm font-medium transition-all',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yodel-orange focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950',
              'disabled:pointer-events-none disabled:opacity-50',
              sizeClasses[size],
              isSelected
                ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
