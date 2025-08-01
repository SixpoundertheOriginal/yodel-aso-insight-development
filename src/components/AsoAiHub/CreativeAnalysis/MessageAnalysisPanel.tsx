import React from 'react';
import { Badge } from '@/components/ui/badge';
import { MessageAnalysis } from '@/services/creative-analysis.service';

interface MessageAnalysisPanelProps {
  messageAnalysis: MessageAnalysis;
}

const getMessageTypeColor = (type: string) => {
  switch (type) {
    case 'feature': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    case 'benefit': return 'bg-green-500/20 text-green-300 border-green-500/30';
    case 'social_proof': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
    case 'emotional': return 'bg-pink-500/20 text-pink-300 border-pink-500/30';
    case 'functional': return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
    default: return 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30';
  }
};

export const MessageAnalysisPanel: React.FC<MessageAnalysisPanelProps> = ({
  messageAnalysis
}) => {
  return (
    <div className="space-y-3">
      {/* Primary Message */}
      <div>
        <p className="text-sm text-zinc-400 mb-1">Primary Message:</p>
        <p className="text-sm text-zinc-300 bg-zinc-800 p-2 rounded">
          "{messageAnalysis.primaryMessage}"
        </p>
      </div>

      {/* Message Type */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-zinc-400">Type:</span>
        <Badge 
          variant="outline" 
          className={`text-xs ${getMessageTypeColor(messageAnalysis.messageType)}`}
        >
          {messageAnalysis.messageType.replace('_', ' ')}
        </Badge>
        <span className="text-xs text-zinc-500">
          ({Math.round(messageAnalysis.confidence * 100)}% confidence)
        </span>
      </div>

      {/* Keywords */}
      {messageAnalysis.keywords.length > 0 && (
        <div>
          <p className="text-sm text-zinc-400 mb-2">Key Terms:</p>
          <div className="flex flex-wrap gap-1">
            {messageAnalysis.keywords.map((keyword, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {keyword}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};