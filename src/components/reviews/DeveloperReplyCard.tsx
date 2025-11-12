import React from 'react';
import { Card } from '@/components/ui/card';
import { MessageCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface DeveloperReplyCardProps {
  reply: string;
  replyDate: string;
  className?: string;
}

export const DeveloperReplyCard: React.FC<DeveloperReplyCardProps> = ({
  reply,
  replyDate,
  className = ''
}) => {
  return (
    <Card className={`mt-3 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 ${className}`}>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <MessageCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
            Developer Response
          </span>
          <span className="text-xs text-blue-600 dark:text-blue-400 ml-auto">
            {formatDistanceToNow(new Date(replyDate), { addSuffix: true })}
          </span>
        </div>
        <p className="text-sm text-blue-900 dark:text-blue-100 leading-relaxed whitespace-pre-wrap">
          {reply}
        </p>
      </div>
    </Card>
  );
};
