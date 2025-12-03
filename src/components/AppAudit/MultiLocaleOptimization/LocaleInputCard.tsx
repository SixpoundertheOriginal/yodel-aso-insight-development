/**
 * Individual Locale Input Card
 * Shows Title/Subtitle/Keywords inputs for one locale
 * Includes individual "Fetch" button
 */

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Download, AlertCircle, CheckCircle } from 'lucide-react';
import type { USMarketLocale, LocaleMetadata } from '@/types/multiLocaleMetadata';
import { LOCALE_NAMES } from '@/types/multiLocaleMetadata';

interface LocaleInputCardProps {
  locale: LocaleMetadata;
  isPrimary: boolean; // Is this EN_US?
  onUpdate: (locale: USMarketLocale, field: 'title' | 'subtitle' | 'keywords', value: string) => void;
  onFetch: (locale: USMarketLocale) => void;
  isFetching: boolean;
}

export const LocaleInputCard: React.FC<LocaleInputCardProps> = ({
  locale,
  isPrimary,
  onUpdate,
  onFetch,
  isFetching,
}) => {
  const {
    locale: localeCode,
    title = '',
    subtitle = '',
    keywords = '',
    fetchStatus,
    fetchError,
    isAvailable
  } = locale;

  // Status badge
  const renderStatusBadge = () => {
    if (fetchStatus === 'fetching' || isFetching) {
      return (
        <Badge variant="outline" className="border-blue-400 text-blue-400">
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          Fetching...
        </Badge>
      );
    }

    if (fetchStatus === 'fetched') {
      return (
        <Badge variant="outline" className="border-emerald-400 text-emerald-400">
          <CheckCircle className="h-3 w-3 mr-1" />
          Auto-fetched
        </Badge>
      );
    }

    if (fetchStatus === 'not_available') {
      return (
        <Badge variant="outline" className="border-amber-400 text-amber-400">
          <AlertCircle className="h-3 w-3 mr-1" />
          Not Available
        </Badge>
      );
    }

    if (fetchStatus === 'error') {
      return (
        <Badge variant="outline" className="border-red-400 text-red-400">
          <AlertCircle className="h-3 w-3 mr-1" />
          Fetch Error
        </Badge>
      );
    }

    return null;
  };

  return (
    <Card className={`${isPrimary ? 'border-emerald-500 bg-emerald-900/10' : 'border-zinc-700'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-zinc-200">
              {LOCALE_NAMES[localeCode]}
            </span>
            {isPrimary && (
              <Badge variant="outline" className="text-[10px] border-emerald-500 text-emerald-400">
                PRIMARY
              </Badge>
            )}
          </div>
          {renderStatusBadge()}
        </div>

        {/* Error message */}
        {fetchError && (
          <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400">
            {fetchError}
          </div>
        )}

        {/* Not available message */}
        {fetchStatus === 'not_available' && (
          <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded text-xs text-amber-400">
            App not available in this locale. You can still enter metadata manually for ASO testing.
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Title Input */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Title
            </label>
            <Badge
              variant="outline"
              className={`text-[10px] ${
                title.length > 30 ? 'border-red-400 text-red-400' : 'border-zinc-600 text-zinc-400'
              }`}
            >
              {title.length}/30
            </Badge>
          </div>
          <Input
            value={title}
            onChange={(e) => onUpdate(localeCode, 'title', e.target.value)}
            placeholder="Enter title (30 chars max)..."
            maxLength={30}
            disabled={isFetching}
            className="text-sm"
          />
        </div>

        {/* Subtitle Input */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Subtitle
            </label>
            <Badge
              variant="outline"
              className={`text-[10px] ${
                subtitle.length > 30 ? 'border-red-400 text-red-400' : 'border-zinc-600 text-zinc-400'
              }`}
            >
              {subtitle.length}/30
            </Badge>
          </div>
          <Input
            value={subtitle}
            onChange={(e) => onUpdate(localeCode, 'subtitle', e.target.value)}
            placeholder="Enter subtitle (30 chars max)..."
            maxLength={30}
            disabled={isFetching}
            className="text-sm"
          />
        </div>

        {/* Keywords Input (ALWAYS manual) */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Keywords
            </label>
            <Badge
              variant="outline"
              className={`text-[10px] ${
                keywords.length > 100 ? 'border-red-400 text-red-400' : 'border-zinc-600 text-zinc-400'
              }`}
            >
              {keywords.length}/100
            </Badge>
          </div>
          <Textarea
            value={keywords}
            onChange={(e) => onUpdate(localeCode, 'keywords', e.target.value)}
            placeholder="keyword1,keyword2,keyword3..."
            maxLength={100}
            rows={2}
            className="text-sm font-mono resize-none"
          />
          <p className="text-[10px] text-zinc-500">
            ⚠️ Keywords field not available via API - manual entry only
          </p>
        </div>

        {/* Fetch Button */}
        <Button
          onClick={() => onFetch(localeCode)}
          disabled={isFetching}
          variant="outline"
          size="sm"
          className="w-full text-xs border-zinc-700 text-zinc-400 hover:text-zinc-300 hover:border-zinc-600"
        >
          {isFetching ? (
            <>
              <Loader2 className="h-3 w-3 mr-2 animate-spin" />
              Fetching Title & Subtitle...
            </>
          ) : (
            <>
              <Download className="h-3 w-3 mr-2" />
              Fetch Title & Subtitle
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
