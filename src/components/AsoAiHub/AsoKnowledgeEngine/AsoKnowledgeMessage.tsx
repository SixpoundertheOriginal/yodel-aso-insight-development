
import React from 'react';
import { User, Bot, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  type?: 'quick-action' | 'contextual';
  context?: any;
}

interface AsoKnowledgeMessageProps {
  message: Message;
}

export const AsoKnowledgeMessage: React.FC<AsoKnowledgeMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6`}>
      <div className={`flex items-start space-x-3 max-w-4xl ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
          isUser 
            ? 'bg-purple-600 text-white' 
            : 'bg-gradient-to-br from-purple-500 to-blue-600 text-white'
        }`}>
          {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
        </div>
        
        <div className={`px-4 py-3 rounded-lg ${
          isUser 
            ? 'bg-purple-600 text-white rounded-br-sm' 
            : 'bg-zinc-800 text-zinc-100 rounded-bl-sm'
        }`}>
          {message.type === 'quick-action' && (
            <div className="flex items-center space-x-2 mb-2">
              <Zap className="w-3 h-3" />
              <Badge variant="secondary" className="text-xs bg-purple-500/20 text-purple-300">
                Quick Action
              </Badge>
            </div>
          )}
          
          <div className="prose prose-invert prose-sm max-w-none">
            {isUser ? (
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
            ) : (
              <ReactMarkdown
                components={{
                  h1: ({ children }) => <h1 className="text-lg font-bold text-white mb-3">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-base font-semibold text-white mb-2">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-sm font-medium text-white mb-2">{children}</h3>,
                  p: ({ children }) => <p className="text-sm leading-relaxed text-zinc-100 mb-2">{children}</p>,
                  ul: ({ children }) => <ul className="list-disc list-inside text-sm text-zinc-100 mb-2 space-y-1">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal list-inside text-sm text-zinc-100 mb-2 space-y-1">{children}</ol>,
                  li: ({ children }) => <li className="text-zinc-100">{children}</li>,
                  strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                  em: ({ children }) => <em className="italic text-zinc-200">{children}</em>,
                  code: ({ children }) => <code className="bg-zinc-700 px-1 py-0.5 rounded text-xs text-zinc-200">{children}</code>,
                  table: ({ children }) => (
                    <div className="overflow-x-auto mb-4">
                      <table className="min-w-full border border-zinc-600 rounded-lg">{children}</table>
                    </div>
                  ),
                  thead: ({ children }) => <thead className="bg-zinc-700">{children}</thead>,
                  tbody: ({ children }) => <tbody className="bg-zinc-800">{children}</tbody>,
                  tr: ({ children }) => <tr className="border-b border-zinc-600">{children}</tr>,
                  th: ({ children }) => <th className="px-3 py-2 text-left text-xs font-medium text-zinc-200 uppercase tracking-wider">{children}</th>,
                  td: ({ children }) => <td className="px-3 py-2 text-sm text-zinc-100">{children}</td>,
                }}
              >
                {message.content}
              </ReactMarkdown>
            )}
          </div>
          
          <div className={`text-xs mt-2 ${
            isUser ? 'text-purple-200' : 'text-zinc-500'
          }`}>
            {message.timestamp.toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
