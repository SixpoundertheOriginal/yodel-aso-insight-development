import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, X } from 'lucide-react';
import { MetadataField } from '@/types/aso';

interface DuplicationWarningsProps {
  metadata: MetadataField;
  onRemoveDuplicate?: (field: keyof MetadataField, keyword: string) => void;
}

// Helper function to extract keywords from text
const extractKeywords = (text: string): string[] => {
  if (!text) return [];

  // Remove common words and split into individual words
  const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for'];

  return text
    .toLowerCase()
    .replace(/[^\w\s,]/g, ' ') // Remove punctuation except commas
    .split(/[\s,]+/) // Split on whitespace and commas
    .map(word => word.trim())
    .filter(word => word.length > 2 && !commonWords.includes(word));
};

const findDuplicates = (metadata: MetadataField) => {
  const titleKeywords = new Set(extractKeywords(metadata.title));
  const subtitleKeywords = extractKeywords(metadata.subtitle);
  const keywordsList = metadata.keywords
    .split(',')
    .map(k => k.trim().toLowerCase())
    .filter(Boolean);

  // Find duplicates
  const duplicatesInSubtitle = subtitleKeywords.filter(k => titleKeywords.has(k));
  const duplicatesInKeywordsFromTitle = keywordsList.filter(k =>
    Array.from(titleKeywords).some(tk => tk.includes(k) || k.includes(tk))
  );
  const duplicatesInKeywordsFromSubtitle = keywordsList.filter(k =>
    subtitleKeywords.some(sk => sk.includes(k) || k.includes(sk))
  );

  return {
    titleToSubtitle: [...new Set(duplicatesInSubtitle)],
    titleToKeywords: [...new Set(duplicatesInKeywordsFromTitle)],
    subtitleToKeywords: [...new Set(duplicatesInKeywordsFromSubtitle)]
  };
};

export const DuplicationWarnings: React.FC<DuplicationWarningsProps> = ({
  metadata,
  onRemoveDuplicate
}) => {
  const duplicates = findDuplicates(metadata);
  const hasDuplicates =
    duplicates.titleToSubtitle.length > 0 ||
    duplicates.titleToKeywords.length > 0 ||
    duplicates.subtitleToKeywords.length > 0;

  if (!hasDuplicates) {
    return (
      <Alert className="bg-green-900/20 border-green-700/30">
        <CheckCircle className="h-4 w-4 text-green-400" />
        <AlertTitle className="text-green-400 text-sm">No Duplicate Keywords</AlertTitle>
        <AlertDescription className="text-zinc-300 text-xs">
          Great! You're maximizing your keyword coverage without wasting character space.
        </AlertDescription>
      </Alert>
    );
  }

  const handleRemove = (field: keyof MetadataField, keyword: string) => {
    if (onRemoveDuplicate) {
      onRemoveDuplicate(field, keyword);
    }
  };

  return (
    <Alert className="bg-yellow-900/20 border-yellow-700/30">
      <AlertTriangle className="h-4 w-4 text-yellow-400" />
      <AlertTitle className="text-yellow-400 text-sm">Duplicate Keywords Detected</AlertTitle>
      <AlertDescription className="text-zinc-300 text-xs space-y-3">
        <p>
          You're using the same keywords in multiple fields. This wastes valuable character space!
        </p>

        {/* Title → Subtitle Duplicates */}
        {duplicates.titleToSubtitle.length > 0 && (
          <div className="space-y-1">
            <p className="text-zinc-400 text-xs font-medium">
              Title → Subtitle duplicates:
            </p>
            <div className="flex flex-wrap gap-1">
              {duplicates.titleToSubtitle.map((keyword, idx) => (
                <Badge
                  key={idx}
                  variant="outline"
                  className="text-yellow-400 border-yellow-700 flex items-center gap-1"
                >
                  {keyword}
                  {onRemoveDuplicate && (
                    <button
                      onClick={() => handleRemove('subtitle', keyword)}
                      className="ml-1 hover:text-red-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Title → Keywords Duplicates */}
        {duplicates.titleToKeywords.length > 0 && (
          <div className="space-y-1">
            <p className="text-zinc-400 text-xs font-medium">
              Title → Keywords field duplicates:
            </p>
            <div className="flex flex-wrap gap-1">
              {duplicates.titleToKeywords.map((keyword, idx) => (
                <Badge
                  key={idx}
                  variant="outline"
                  className="text-yellow-400 border-yellow-700 flex items-center gap-1"
                >
                  {keyword}
                  {onRemoveDuplicate && (
                    <button
                      onClick={() => handleRemove('keywords', keyword)}
                      className="ml-1 hover:text-red-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Subtitle → Keywords Duplicates */}
        {duplicates.subtitleToKeywords.length > 0 && (
          <div className="space-y-1">
            <p className="text-zinc-400 text-xs font-medium">
              Subtitle → Keywords field duplicates:
            </p>
            <div className="flex flex-wrap gap-1">
              {duplicates.subtitleToKeywords.map((keyword, idx) => (
                <Badge
                  key={idx}
                  variant="outline"
                  className="text-yellow-400 border-yellow-700 flex items-center gap-1"
                >
                  {keyword}
                  {onRemoveDuplicate && (
                    <button
                      onClick={() => handleRemove('keywords', keyword)}
                      className="ml-1 hover:text-red-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <p className="text-zinc-400 text-xs mt-3 pt-2 border-t border-yellow-700/30">
          💡 <strong>Tip:</strong> Remove duplicates to free up space for more unique keywords and better search coverage.
        </p>
      </AlertDescription>
    </Alert>
  );
};
