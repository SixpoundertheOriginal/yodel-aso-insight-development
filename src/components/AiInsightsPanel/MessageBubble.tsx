import React from 'react';
import { cn } from '@/lib/utils';
import { PremiumCard } from '@/components/ui/design-system/PremiumCard';
import { Body, BodySmall, Caption } from '@/components/ui/design-system/Typography';
import { User, Sparkles, Copy, Bookmark, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  className?: string;
  onCopy?: () => void;
  onBookmark?: () => void;
  onShare?: () => void;
}

// Enhanced markdown components with premium styling
const markdownComponents = {
  p: ({ children }: { children: React.ReactNode }) => (
    <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>
  ),
  table: ({ children }: { children: React.ReactNode }) => (
    <div className="overflow-x-auto my-4 rounded-lg border border-orange-500/20">
      <table className="min-w-full bg-zinc-900/60 backdrop-blur-sm">{children}</table>
    </div>
  ),
  thead: ({ children }: { children: React.ReactNode }) => (
    <thead className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">{children}</thead>
  ),
  th: ({ children }: { children: React.ReactNode }) => (
    <th className="px-4 py-3 text-left text-sm font-semibold border-r border-orange-400/50 last:border-r-0">
      {children}
    </th>
  ),
  tbody: ({ children }: { children: React.ReactNode }) => (
    <tbody className="divide-y divide-orange-500/10">{children}</tbody>
  ),
  tr: ({ children }: { children: React.ReactNode }) => (
    <tr className="hover:bg-orange-500/5 transition-colors duration-200">{children}</tr>
  ),
  td: ({ children }: { children: React.ReactNode }) => (
    <td className="px-4 py-3 text-sm border-r border-orange-500/10 last:border-r-0">
      {children}
    </td>
  ),
  strong: ({ children }: { children: React.ReactNode }) => (
    <span className="font-semibold text-orange-200 bg-orange-500/20 px-1.5 py-0.5 rounded-md">
      {children}
    </span>
  ),
  em: ({ children }: { children: React.ReactNode }) => (
    <span className="italic text-orange-300">{children}</span>
  ),
  code: ({
    children,
    className
  }: {
    children: React.ReactNode;
    className?: string;
  }) => {
    const isBlock = className?.includes('language-');
    return isBlock ? (
      <div className="my-4 rounded-lg overflow-hidden border border-orange-500/20">
        <div className="bg-zinc-800 px-4 py-2 border-b border-orange-500/20">
          <Caption className="text-orange-300">Code</Caption>
        </div>
        <pre className="bg-zinc-900 text-emerald-400 p-4 overflow-x-auto text-sm font-mono">
          <code>{children}</code>
        </pre>
      </div>
    ) : (
      <code className="bg-orange-500/20 text-orange-200 px-2 py-1 rounded text-sm font-mono">
        {children}
      </code>
    );
  },
  ul: ({ children }: { children: React.ReactNode }) => (
    <ul className="space-y-2 my-3 ml-4">{children}</ul>
  ),
  li: ({ children }: { children: React.ReactNode }) => (
    <li className="relative">
      <span className="absolute -left-4 text-orange-400">•</span>
      {children}
    </li>
  ),
  ol: ({ children }: { children: React.ReactNode }) => (
    <ol className="space-y-2 my-3 ml-4 list-decimal list-inside">{children}</ol>
  ),
};

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  role,
  content,
  timestamp,
  className,
  onCopy,
  onBookmark,
  onShare
}) => {
  const isUser = role === 'user';
  const [showActions, setShowActions] = React.useState(false);

  return (
    <div
      className={cn(
        "group mb-4 flex gap-3 animate-in slide-in-from-bottom-2 duration-300",
        isUser ? "justify-end" : "justify-start",
        className
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar */}
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
      )}

      {/* Message Content */}
      <div className={cn("flex flex-col max-w-[85%]", isUser ? "items-end" : "items-start")}>
        <PremiumCard
          variant={isUser ? "gradient" : "glass"}
          intensity="medium"
          glowColor={isUser ? "none" : "orange"}
          className={cn(
            "relative transition-all duration-300",
            isUser 
              ? "bg-gradient-to-br from-orange-500 to-orange-600 text-white border-orange-400/30" 
              : "bg-zinc-900/80 text-zinc-100 border-orange-500/20 hover:border-orange-500/30"
          )}
        >
          <div className="p-4">
            {isUser ? (
              <Body className="text-white leading-relaxed">{content}</Body>
            ) : (
              <div className="text-zinc-100 leading-relaxed">
                <ReactMarkdown components={markdownComponents}>
                  {content}
                </ReactMarkdown>
              </div>
            )}
          </div>

          {/* Message Actions */}
          {showActions && (
            <div className={cn(
              "absolute top-2 flex gap-1 transition-all duration-200",
              isUser ? "left-2" : "right-2"
            )}>
              {onCopy && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onCopy}
                  className="h-6 w-6 p-0 hover:bg-white/10 hover:text-orange-300"
                  title="Copy message"
                >
                  <Copy className="w-3 h-3" />
                </Button>
              )}
              {onBookmark && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onBookmark}
                  className="h-6 w-6 p-0 hover:bg-white/10 hover:text-orange-300"
                  title="Bookmark message"
                >
                  <Bookmark className="w-3 h-3" />
                </Button>
              )}
              {onShare && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onShare}
                  className="h-6 w-6 p-0 hover:bg-white/10 hover:text-orange-300"
                  title="Share message"
                >
                  <Share className="w-3 h-3" />
                </Button>
              )}
            </div>
          )}
        </PremiumCard>

        {/* Timestamp */}
        <BodySmall 
          className={cn(
            "mt-1 text-zinc-400 transition-opacity duration-200",
            showActions ? "opacity-100" : "opacity-60"
          )}
        >
          {new Date(timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </BodySmall>
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-zinc-600 to-zinc-700 flex items-center justify-center shadow-lg">
          <User className="w-4 h-4 text-white" />
        </div>
      )}
    </div>
  );
};

export default MessageBubble;