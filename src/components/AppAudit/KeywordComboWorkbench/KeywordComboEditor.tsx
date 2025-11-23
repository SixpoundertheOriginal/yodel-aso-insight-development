/**
 * Keyword Combo Editor
 *
 * Inline editor for modifying combo text.
 * Shows character count and validates input.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';

interface KeywordComboEditorProps {
  initialValue: string;
  onSave: (newValue: string) => void;
  onCancel: () => void;
}

export const KeywordComboEditor: React.FC<KeywordComboEditorProps> = ({
  initialValue,
  onSave,
  onCancel,
}) => {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus input on mount
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSave = () => {
    const trimmed = value.trim();
    if (trimmed && trimmed !== initialValue) {
      onSave(trimmed);
    } else {
      onCancel();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div className="flex items-center gap-2 w-full">
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        className="font-mono text-sm bg-zinc-800 border-orange-500/40 text-zinc-100"
        placeholder="Enter combo text..."
      />
      <div className="text-[10px] text-zinc-500 whitespace-nowrap">
        {value.length} chars
      </div>
      <Button
        size="sm"
        variant="ghost"
        onClick={handleSave}
        className="h-8 w-8 p-0 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/20"
      >
        <Check className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={onCancel}
        className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-900/20"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};
