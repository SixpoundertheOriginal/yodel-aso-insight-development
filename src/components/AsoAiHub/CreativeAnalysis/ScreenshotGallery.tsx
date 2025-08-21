import React, { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ZoomIn, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isMFP, CA_DEBUG } from '@/lib/caDebug';

interface ScreenshotGalleryProps {
  screenshots: string[];
  appTitle: string;
  app?: { bundleId?: string; trackId?: number; trackName?: string };
  sessionId?: string;
}

export const ScreenshotGallery: React.FC<ScreenshotGalleryProps> = ({ screenshots, appTitle, app, sessionId }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleScreenshotClick = (index: number) => {
    setSelectedIndex(index);
    setIsDialogOpen(true);
  };

  const handlePrevious = () => {
    setSelectedIndex((prev) => (prev > 0 ? prev - 1 : screenshots.length - 1));
  };

  const handleNext = () => {
    setSelectedIndex((prev) => (prev < screenshots.length - 1 ? prev + 1 : 0));
  };

  if (screenshots.length === 0) return null;

  return (
    <>
      {/* Gallery Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-zinc-300">Screenshots</h3>
          <Badge variant="outline" className="text-xs bg-zinc-800 border-zinc-700 text-zinc-300">
            {screenshots.length} images
          </Badge>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {screenshots.map((url, index) => {
            const handleLoad = CA_DEBUG && app && isMFP(app) ? () => console.info('[CA][MFP][IMG] load ok', { sessionId, src: url }) : undefined;
            const handleError = CA_DEBUG && app && isMFP(app)
              ? (e: React.SyntheticEvent<HTMLImageElement>) => console.warn('[CA][MFP][IMG] load err', {
                  sessionId,
                  src: url,
                  w: (e.currentTarget as HTMLImageElement).naturalWidth,
                  h: (e.currentTarget as HTMLImageElement).naturalHeight
                })
              : undefined;
            return (
              <div
                key={index}
                className="group relative aspect-[9/19.5] cursor-pointer rounded-lg overflow-hidden border border-zinc-700 hover:border-zinc-600 transition-all duration-200"
                onClick={() => handleScreenshotClick(index)}
              >
                <img
                  src={url}
                  alt={`${appTitle} screenshot ${index + 1}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  loading="lazy"
                  onLoad={handleLoad}
                  onError={handleError}
                />
              
              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors duration-200 flex items-center justify-center">
                <ZoomIn className="h-6 w-6 text-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              </div>
              
              {/* Screenshot Number */}
              <div className="absolute top-2 left-2">
                <Badge variant="secondary" className="text-xs bg-black/70 text-foreground border-0">
                  {index + 1}
                </Badge>
              </div>
            </div>
            );
          })}
        </div>
      </div>

      {/* Full Size Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl bg-zinc-900 border-zinc-700 p-0">
          <DialogTitle className="sr-only">
            {appTitle} - Screenshot {selectedIndex + 1}
          </DialogTitle>
          
          <div className="relative">
            {/* Header */}
            <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-black/70 text-foreground border-0">
                  {selectedIndex + 1} of {screenshots.length}
                </Badge>
                <span className="text-sm text-foreground bg-black/70 px-2 py-1 rounded">
                  {appTitle}
                </span>
              </div>
            </div>

            {/* Navigation Buttons */}
            {screenshots.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-foreground"
                  onClick={handlePrevious}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-foreground"
                  onClick={handleNext}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}

            {/* Main Image */}
            <div className="flex items-center justify-center p-8 min-h-[600px]">
              <img
                src={screenshots[selectedIndex]}
                alt={`${appTitle} screenshot ${selectedIndex + 1}`}
                className="max-w-full max-h-[80vh] object-contain rounded-lg border border-zinc-700"
              />
            </div>

            {/* Thumbnail Strip */}
            {screenshots.length > 1 && (
              <div className="p-4 border-t border-zinc-700 bg-zinc-800/50">
                <div className="flex gap-2 overflow-x-auto">
                  {screenshots.map((url, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedIndex(index)}
                      className={`relative flex-shrink-0 w-12 h-20 rounded border-2 transition-all ${
                        index === selectedIndex
                          ? 'border-purple-500 ring-2 ring-purple-500/50'
                          : 'border-zinc-600 hover:border-zinc-500'
                      }`}
                    >
                      <img
                        src={url}
                        alt={`Thumbnail ${index + 1}`}
                        className="w-full h-full object-cover rounded"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};