/**
 * Metadata Raw Elements Card
 *
 * Displays raw metadata fields at the top of Audit V2 view.
 * Shows exact Title, Subtitle, Developer, Category, Platform, and Source.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';
import type { ScrapedMetadata } from '@/types/aso';

interface MetadataRawElementsCardProps {
  metadata: ScrapedMetadata;
}

export const MetadataRawElementsCard: React.FC<MetadataRawElementsCardProps> = ({ metadata }) => {
  // Determine metadata source
  const metadataSource = metadata.subtitleSource
    ? `appstore-${metadata.subtitleSource}`
    : 'appstore-api';

  // Format platform + locale
  const platformLocale = `iOS • ${metadata.locale || 'en-US'}`;

  return (
    <Card className="bg-gradient-to-br from-zinc-900 to-zinc-800 border-zinc-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4 text-blue-400" />
          Raw Metadata
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-4">
          {/* Title */}
          <div>
            <div className="text-xs text-zinc-500 uppercase mb-1">Title</div>
            <div className="text-sm text-zinc-200 font-medium">
              {metadata.title || 'Not available'}
            </div>
          </div>

          {/* Subtitle */}
          <div>
            <div className="text-xs text-zinc-500 uppercase mb-1">Subtitle</div>
            <div className="text-sm text-zinc-200 font-medium">
              {metadata.subtitle || 'Not available'}
            </div>
          </div>

          {/* Developer */}
          <div>
            <div className="text-xs text-zinc-500 uppercase mb-1">Developer</div>
            <div className="text-sm text-zinc-200">
              {metadata.developer || 'Not available'}
            </div>
          </div>

          {/* Category */}
          <div>
            <div className="text-xs text-zinc-500 uppercase mb-1">Category</div>
            <div className="text-sm text-zinc-200">
              {metadata.applicationCategory || 'Not available'}
            </div>
          </div>

          {/* Platform + Locale */}
          <div>
            <div className="text-xs text-zinc-500 uppercase mb-1">Platform + Locale</div>
            <div className="text-sm text-zinc-200">
              {platformLocale}
            </div>
          </div>

          {/* Metadata Source */}
          <div>
            <div className="text-xs text-zinc-500 uppercase mb-1">Metadata Source</div>
            <div className="text-sm text-zinc-200 font-mono text-xs">
              {metadataSource}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
