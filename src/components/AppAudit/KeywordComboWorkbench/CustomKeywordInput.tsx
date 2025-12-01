/**
 * Custom Keyword Input Component
 *
 * Allows users to manually add keywords to analyze in the Keyword Combo Workbench.
 * Supports both single and comma-separated multiple keyword input.
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle, Loader2 } from 'lucide-react';
import { useKeywordComboStore } from '@/stores/useKeywordComboStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CustomKeywordInputProps {
  appId: string;
  platform?: string;
}

export const CustomKeywordInput: React.FC<CustomKeywordInputProps> = ({
  appId,
  platform = 'ios',
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { addCustomKeywords, setCustomKeywords, customKeywords } = useKeywordComboStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputValue.trim()) return;

    // Parse comma-separated keywords
    const keywords = inputValue
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    if (keywords.length === 0) {
      toast.error('Please enter at least one keyword');
      return;
    }

    if (keywords.length > 50) {
      toast.error('Maximum 50 keywords allowed per batch');
      return;
    }

    // Validate keyword lengths
    const tooLong = keywords.filter((k) => k.length > 100);
    if (tooLong.length > 0) {
      toast.error(`Keywords too long (max 100 chars): ${tooLong.join(', ')}`);
      return;
    }

    setIsSubmitting(true);

    try {
      // Add to local store first (optimistic update)
      const result = addCustomKeywords(keywords);

      if (result.duplicates.length > 0) {
        toast.warning(
          `${result.duplicates.length} duplicate(s) skipped: ${result.duplicates.slice(0, 3).join(', ')}${
            result.duplicates.length > 3 ? '...' : ''
          }`
        );
      }

      if (result.added === 0) {
        setIsSubmitting(false);
        return;
      }

      // Save to database
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required');
      }

      const keywordsToInsert = keywords
        .filter((k) => !result.duplicates.includes(k))
        .map((keyword) => ({
          app_id: appId,
          platform,
          keyword,
          added_by: session.user.id,
        }));

      const { error } = await supabase
        .from('custom_keywords')
        .insert(keywordsToInsert);

      if (error) {
        console.error('[CustomKeywordInput] Failed to save to database:', error);
        toast.error(`Failed to save: ${error.message}`);
        return;
      }

      toast.success(
        `${result.added} keyword${result.added !== 1 ? 's' : ''} added successfully`
      );

      setInputValue('');
    } catch (error: any) {
      console.error('[CustomKeywordInput] Error:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <Input
        type="text"
        placeholder="Add custom keywords (comma-separated)..."
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        disabled={isSubmitting}
        className="flex-1 bg-zinc-900 border-zinc-700 text-zinc-300 placeholder:text-zinc-500 focus:border-orange-500/40 focus:ring-orange-500/20"
      />
      <Button
        type="submit"
        disabled={isSubmitting || !inputValue.trim()}
        className="bg-orange-600 hover:bg-orange-700 text-white"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Adding...
          </>
        ) : (
          <>
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Keywords
          </>
        )}
      </Button>
    </form>
  );
};
