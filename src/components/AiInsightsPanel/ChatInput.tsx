import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2 } from 'lucide-react';
import { PremiumCard } from '@/components/ui/design-system/PremiumCard';
import { BodySmall } from '@/components/ui/design-system/Typography';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({ 
  onSendMessage, 
  disabled = false,
  placeholder = "Ask about your KPIs (Shift+Enter for a new line)..." 
}) => {
  const [input, setInput] = useState('');
  const [textareaHeight, setTextareaHeight] = useState('40px');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const maxLength = 1000;

  const handleSubmit = () => {
    const trimmedInput = input.trim();
    if (trimmedInput && !disabled) {
      onSendMessage(trimmedInput);
      setInput('');
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        setTextareaHeight('40px');
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 120);
      textareaRef.current.style.height = `${newHeight}px`;
      setTextareaHeight(`${newHeight}px`);
    }
  }, [input]);

  return (
    <PremiumCard 
      variant="glass" 
      intensity="medium"
      className="border-t border-orange-500/20 bg-zinc-900/60 backdrop-blur-xl m-0 rounded-none rounded-b-xl"
    >
      <div className="p-4">
        <div className="flex gap-3 items-end">
          <div className="relative flex-1">
            {/* Floating Label */}
            <div className={cn(
              "absolute left-3 transition-all duration-200 pointer-events-none",
              input.length > 0 || textareaRef.current === document.activeElement
                ? "top-1 text-xs text-orange-300"
                : "top-3 text-sm text-zinc-400"
            )}>
              Ask your marketing expert...
            </div>
            
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder=""
              disabled={disabled}
              maxLength={maxLength}
              className={cn(
                "flex-1 min-h-[48px] max-h-[120px] resize-none",
                "bg-zinc-800/50 border-orange-500/30 text-zinc-100 placeholder-zinc-400",
                "focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20",
                "rounded-lg transition-all duration-200",
                "pt-6 pb-3 pr-12 pl-3"
              )}
              style={{ height: textareaHeight }}
              rows={1}
            />
            
            {/* Character Counter */}
            <BodySmall className={cn(
              "absolute bottom-2 right-3 transition-colors duration-200",
              input.length > maxLength * 0.8 
                ? input.length >= maxLength 
                  ? "text-red-400" 
                  : "text-orange-400"
                : "text-zinc-500"
            )}>
              {input.length}/{maxLength}
            </BodySmall>
          </div>
          
          {/* Premium Send Button */}
          <Button
            onClick={handleSubmit}
            disabled={disabled || !input.trim()}
            size="lg"
            className={cn(
              "h-12 w-12 p-0 rounded-lg transition-all duration-300",
              "bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500",
              "shadow-lg hover:shadow-xl hover:shadow-orange-500/25",
              "border border-orange-400/30 hover:border-orange-300",
              "transform hover:scale-105 active:scale-95",
              "disabled:opacity-50 disabled:transform-none disabled:shadow-none"
            )}
          >
            {disabled ? (
              <Loader2 className="w-5 h-5 animate-spin text-white" />
            ) : (
              <Send className="w-5 h-5 text-white" />
            )}
          </Button>
        </div>
        
        {/* Input Helper Text */}
        <BodySmall className="text-zinc-400 mt-2 flex items-center gap-2">
          <kbd className="bg-zinc-700 text-zinc-300 px-1.5 py-0.5 rounded text-xs">Enter</kbd>
          to send •
          <kbd className="bg-zinc-700 text-zinc-300 px-1.5 py-0.5 rounded text-xs">Shift + Enter</kbd>
          for new line
        </BodySmall>
      </div>
    </PremiumCard>
  );
};

export default ChatInput;
