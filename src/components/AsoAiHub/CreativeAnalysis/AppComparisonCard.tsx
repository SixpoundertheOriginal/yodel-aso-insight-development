import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, User, Image as ImageIcon, Brain, Loader2 } from 'lucide-react';
import { type AppInfo } from '@/services/creative-analysis.service';
import { ScreenshotGallery } from './ScreenshotGallery';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface AppComparisonCardProps {
  app: AppInfo;
  rank: number;
  onAnalyzeWithAI?: (app: AppInfo) => void;
  isAnalyzing?: boolean;
  sessionId?: string;
  selectionMode?: boolean;
  isSelected?: boolean;
  onSelectionChange?: (app: AppInfo, selected: boolean) => void;
}

export const AppComparisonCard: React.FC<AppComparisonCardProps> = ({
  app,
  rank,
  onAnalyzeWithAI,
  isAnalyzing = false,
  sessionId,
  selectionMode = false,
  isSelected = false,
  onSelectionChange
}) => {
  return (
    <Card
      className={cn(
        'bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors',
        selectionMode && 'cursor-pointer',
        isSelected && 'border-blue-500'
      )}
    >
      <CardHeader className="pb-4">
        <div className="flex items-start gap-4">
          {selectionMode && (
            <div className="pt-1">
              <Checkbox
                checked={isSelected}
                onCheckedChange={(checked) => onSelectionChange?.(app, Boolean(checked))}
                aria-label={`Select ${app.title} for comparison`}
              />
            </div>
          )}
          {/* App Icon */}
          <div className="flex-shrink-0">
            {app.icon ? (
              <img
                src={app.icon}
                alt={`${app.title} icon`}
                className="w-16 h-16 rounded-xl border border-zinc-700"
              />
            ) : (
              <div className="w-16 h-16 rounded-xl border border-zinc-700 bg-zinc-800 flex items-center justify-center">
                <ImageIcon className="h-6 w-6 text-zinc-500" />
              </div>
            )}
          </div>

          {/* App Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="bg-gradient-to-r from-purple-500 to-pink-600 text-foreground text-xs">
                #{rank}
              </Badge>
              <CardTitle className="text-xl font-bold text-foreground truncate">
                {app.title}
              </CardTitle>
            </div>
            
            <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-400">
              {app.developer && (
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span className="truncate max-w-48">{app.developer}</span>
                </div>
              )}
              
              {app.rating && (
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  <span>{app.rating.toFixed(1)}</span>
                </div>
              )}
              
              <div className="flex items-center gap-1">
                <ImageIcon className="h-3 w-3" />
                <span>{app.screenshots.length} screenshot{app.screenshots.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {app.screenshots.length > 0 ? (
          <ScreenshotGallery
            screenshots={app.screenshots}
            appTitle={app.title}
            app={app}
            sessionId={sessionId}
          />
        ) : (
          <div className="py-8 text-center">
            <ImageIcon className="h-8 w-8 mx-auto mb-2 text-zinc-500" />
            <p className="text-zinc-400 text-sm">No screenshots available</p>
          </div>
        )}

        {/* AI Analysis Button */}
        {onAnalyzeWithAI && app.screenshots && app.screenshots.length > 0 && (
          <div className="mt-4 pt-4 border-t border-zinc-800">
            <Button
              onClick={() => onAnalyzeWithAI(app)}
              disabled={isAnalyzing}
              variant="outline"
              className="w-full bg-zinc-800 border-zinc-700 hover:bg-zinc-750 text-zinc-300"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing with AI...
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4 mr-2" />
                  Analyze with AI Vision
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};