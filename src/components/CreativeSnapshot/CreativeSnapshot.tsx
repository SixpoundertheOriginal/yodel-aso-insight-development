/**
 * Creative Snapshot Component
 *
 * Lightweight bridge component that displays app icon, primary screenshot,
 * and a CTA to navigate to the full Creative Intelligence Module.
 *
 * This component is a temporary migration bridge to gradually move
 * creative analysis out of ASO AI Hub and into the Creative Intelligence Module.
 *
 * Phase: Creative Migration Phase 1
 * Date: 2025-11-21
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { WandSparkles, ArrowRight } from 'lucide-react';

interface CreativeSnapshotProps {
  appId: string;
  name: string;
  iconUrl?: string;
  primaryScreenshotUrl?: string;
}

export function CreativeSnapshot({
  appId,
  name,
  iconUrl,
  primaryScreenshotUrl
}: CreativeSnapshotProps) {
  const navigate = useNavigate();

  const handleViewFullAnalysis = () => {
    navigate(`/creative-intelligence?appId=${appId}`);
  };

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <WandSparkles className="h-5 w-5 text-primary" />
          Creative Analysis Preview
        </CardTitle>
        <CardDescription>
          View full creative intelligence analysis with screenshot insights, theme classification, and more
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          {/* App Icon */}
          {iconUrl && (
            <div className="flex-shrink-0">
              <img
                src={iconUrl}
                alt={`${name} icon`}
                className="w-16 h-16 rounded-xl border border-border shadow-sm"
              />
            </div>
          )}

          {/* Primary Screenshot Thumbnail */}
          {primaryScreenshotUrl && (
            <div className="flex-shrink-0">
              <div className="w-24 aspect-[9/16] rounded-lg border border-border overflow-hidden shadow-sm bg-muted">
                <img
                  src={primaryScreenshotUrl}
                  alt={`${name} screenshot`}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}

          {/* CTA Section */}
          <div className="flex-1 flex flex-col justify-center gap-3">
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">
                Advanced creative analysis available
              </p>
              <p>
                Explore screenshots with AI-powered insights including color extraction,
                text analysis, theme classification, and layout scoring.
              </p>
            </div>

            <Button
              onClick={handleViewFullAnalysis}
              className="w-fit"
              size="sm"
            >
              View Full Creative Analysis
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
