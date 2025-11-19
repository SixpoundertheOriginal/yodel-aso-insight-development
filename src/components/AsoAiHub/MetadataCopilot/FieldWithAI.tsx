import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { CharacterCounter } from './CharacterCounter';

interface FieldWithAIProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  limit: number;
  suggestions: string[];
  expanded: boolean;
  onToggleExpand: () => void;
  onRequestSuggestions: () => void;
  onCustomPrompt?: (prompt: string) => void;
  tooltip?: React.ReactNode;
  multiline?: boolean;
  isLoadingSuggestions?: boolean;
  placeholder?: string;
}

export const FieldWithAI: React.FC<FieldWithAIProps> = ({
  label,
  value,
  onChange,
  limit,
  suggestions,
  expanded,
  onToggleExpand,
  onRequestSuggestions,
  onCustomPrompt,
  tooltip,
  multiline = false,
  isLoadingSuggestions = false,
  placeholder = ''
}) => {
  const [customPrompt, setCustomPrompt] = useState('');

  const handleUseThisSuggestion = (suggestion: string) => {
    onChange(suggestion);
    // Optionally collapse after using
    // onToggleExpand();
  };

  const handleCustomPromptSubmit = () => {
    if (customPrompt.trim() && onCustomPrompt) {
      onCustomPrompt(customPrompt);
      setCustomPrompt('');
    }
  };

  return (
    <div className="space-y-2">
      {/* Label with Tooltip and AI Button */}
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 text-zinc-300">
          {label}
          {tooltip}
        </Label>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRequestSuggestions}
          disabled={isLoadingSuggestions}
          className="text-yodel-orange hover:bg-yodel-orange/10"
        >
          {isLoadingSuggestions ? (
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          ) : (
            <Sparkles className="w-3 h-3 mr-1" />
          )}
          {isLoadingSuggestions ? 'Generating...' : 'AI Help'}
        </Button>
      </div>

      {/* Input Field */}
      {multiline ? (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="bg-zinc-800 border-zinc-700 text-foreground placeholder-zinc-400 min-h-24"
        />
      ) : (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="bg-zinc-800 border-zinc-700 text-foreground placeholder-zinc-400"
        />
      )}

      {/* Character Counter */}
      <CharacterCounter current={value.length} limit={limit} label="" />

      {/* AI Suggestions Panel (Expandable) */}
      {suggestions.length > 0 && (
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleExpand}
            className="w-full flex items-center justify-between text-zinc-300 hover:text-foreground"
          >
            <span className="text-xs">
              {suggestions.length} AI suggestion{suggestions.length > 1 ? 's' : ''} available
            </span>
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>

          {expanded && (
            <Card className="bg-zinc-900/50 border-blue-700/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-blue-400 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  AI Suggestions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {suggestions.map((suggestion, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between bg-zinc-800/50 p-3 rounded border border-zinc-700 hover:border-zinc-600 transition-colors"
                  >
                    <div className="flex-1 mr-3">
                      <p className="text-sm text-foreground">{suggestion}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          suggestion.length === limit
                            ? 'border-green-700 text-green-400'
                            : suggestion.length > limit
                            ? 'border-red-700 text-red-400'
                            : 'border-zinc-600 text-zinc-400'
                        }`}
                      >
                        {suggestion.length}/{limit}
                      </Badge>
                      <Button
                        size="sm"
                        onClick={() => handleUseThisSuggestion(suggestion)}
                        className="text-xs bg-yodel-orange hover:bg-yodel-orange/90"
                      >
                        Use This
                      </Button>
                    </div>
                  </div>
                ))}

                {/* Custom Prompt */}
                {onCustomPrompt && (
                  <div className="pt-3 border-t border-zinc-700">
                    <Label className="text-xs text-zinc-400 mb-2 block">
                      Custom refinement:
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        placeholder="e.g., Make it more professional"
                        className="text-sm bg-zinc-800 border-zinc-700"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleCustomPromptSubmit();
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        onClick={handleCustomPromptSubmit}
                        disabled={!customPrompt.trim()}
                      >
                        Generate
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
