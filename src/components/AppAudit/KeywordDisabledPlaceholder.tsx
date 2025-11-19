import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface KeywordDisabledPlaceholderProps {
  featureName: string;
  description?: string;
}

/**
 * Placeholder component shown when keyword features are disabled
 *
 * Used in tabs that require keyword intelligence when AUDIT_KEYWORDS_ENABLED = false
 */
export const KeywordDisabledPlaceholder: React.FC<KeywordDisabledPlaceholderProps> = ({
  featureName,
  description = 'This feature requires keyword intelligence data which is currently disabled.'
}) => {
  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-foreground flex items-center space-x-2">
            <Target className="h-5 w-5 text-zinc-500" />
            <span>{featureName}</span>
          </CardTitle>
          <Badge variant="outline" className="text-zinc-500 border-zinc-700">
            Disabled
          </Badge>
        </div>
        <CardDescription>
          Keyword intelligence feature not available in metadata-only mode
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="bg-zinc-800/50 rounded-full p-6 mb-6">
            <AlertCircle className="h-12 w-12 text-zinc-600" />
          </div>

          <h3 className="text-lg font-medium text-zinc-400 mb-2">
            Keyword Intelligence Disabled
          </h3>

          <p className="text-sm text-zinc-500 max-w-md mb-6">
            {description}
          </p>

          <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-4 max-w-lg">
            <p className="text-xs text-zinc-500">
              <strong className="text-zinc-400">Why is this disabled?</strong><br />
              This audit is running in metadata-only mode to ensure stability while keyword
              intelligence features are being refactored. Enable keyword features in
              <code className="mx-1 px-1 py-0.5 bg-zinc-700 rounded text-zinc-300">
                src/config/auditFeatureFlags.ts
              </code>
              to access this feature.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Inline placeholder for smaller sections within tabs
 */
export const InlineKeywordPlaceholder: React.FC<{ message?: string }> = ({
  message = 'Keyword data unavailable'
}) => {
  return (
    <div className="flex items-center justify-center p-6 bg-zinc-800/30 rounded-lg border border-zinc-700/50">
      <AlertCircle className="h-4 w-4 text-zinc-600 mr-2" />
      <span className="text-sm text-zinc-500">{message}</span>
    </div>
  );
};
