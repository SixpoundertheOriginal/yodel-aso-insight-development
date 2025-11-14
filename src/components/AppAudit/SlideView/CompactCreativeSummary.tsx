import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Image, ImageIcon, Video } from 'lucide-react';
import type { ScrapedMetadata } from '@/types/aso';

interface CompactCreativeSummaryProps {
  metadata: ScrapedMetadata;
  creativeScore?: number;
}

export const CompactCreativeSummary: React.FC<CompactCreativeSummaryProps> = ({
  metadata,
  creativeScore = 75
}) => {
  const scoreColor =
    creativeScore >= 70 ? 'text-green-400' :
    creativeScore >= 50 ? 'text-blue-400' :
    creativeScore >= 30 ? 'text-yellow-400' : 'text-red-400';

  const screenshotCount = metadata.screenshots?.length || 0;
  const hasIcon = !!metadata.icon;
  const appPreviewCount = metadata.appPreviews?.length || 0;

  return (
    <div className="space-y-4">
      {/* Overall Score */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Image className="h-5 w-5 text-pink-400" />
              <span className="text-sm text-zinc-400">Overall Creative Score</span>
            </div>
            <span className={`text-3xl font-bold ${scoreColor}`}>{creativeScore}/100</span>
          </div>
        </CardContent>
      </Card>

      {/* Asset Counts */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-3">
            <div className="flex items-center space-x-2 mb-1">
              <ImageIcon className="h-4 w-4 text-blue-400" />
              <p className="text-xs text-zinc-400">Icon</p>
            </div>
            <p className={`text-lg font-bold ${hasIcon ? 'text-green-400' : 'text-red-400'}`}>
              {hasIcon ? '✓ Present' : '✗ Missing'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-3">
            <div className="flex items-center space-x-2 mb-1">
              <Image className="h-4 w-4 text-purple-400" />
              <p className="text-xs text-zinc-400">Screenshots</p>
            </div>
            <p className="text-lg font-bold text-foreground">{screenshotCount}</p>
            <p className="text-xs text-zinc-500">
              {screenshotCount >= 8 ? 'Optimized' : screenshotCount >= 5 ? 'Good' : 'Add more'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-3">
            <div className="flex items-center space-x-2 mb-1">
              <Video className="h-4 w-4 text-green-400" />
              <p className="text-xs text-zinc-400">App Previews</p>
            </div>
            <p className="text-lg font-bold text-foreground">{appPreviewCount}</p>
            <p className="text-xs text-zinc-500">
              {appPreviewCount >= 3 ? 'Excellent' : appPreviewCount > 0 ? 'Good' : 'Consider adding'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Visual Preview */}
      {hasIcon && metadata.icon && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-start space-x-4">
              <img
                src={metadata.icon}
                alt="App Icon"
                className="w-16 h-16 rounded-xl border-2 border-zinc-700"
              />
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground mb-1">App Icon</p>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {hasIcon ? 'Icon is present and follows App Store guidelines.' : 'No icon available for analysis.'}
                  {screenshotCount >= 8 ? ' Screenshot gallery is comprehensive.' : screenshotCount >= 5 ? ' Consider adding more screenshots for better conversion.' : ' Expand screenshot gallery to showcase more features.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Insights */}
      <Card className="bg-gradient-to-r from-pink-500/5 to-transparent border-l-4 border-pink-500">
        <CardContent className="p-4">
          <p className="text-xs text-pink-400 font-semibold uppercase tracking-wide mb-2">
            Creative Insights
          </p>
          <ul className="space-y-1 text-xs text-zinc-300">
            <li>• {screenshotCount >= 8 ? 'Screenshot coverage is excellent' : 'Increase screenshot count to 8-10 for optimal conversion'}</li>
            <li>• {appPreviewCount > 0 ? `${appPreviewCount} app preview${appPreviewCount > 1 ? 's' : ''} help${appPreviewCount === 1 ? 's' : ''} showcase functionality` : 'Add app previews to demonstrate key features'}</li>
            <li>• {hasIcon ? 'Icon design is crucial for first impressions' : 'Add a high-quality icon immediately'}</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};
