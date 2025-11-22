/**
 * Color Palette Strip Component
 *
 * Displays extracted dominant colors as a visual palette strip.
 * Shows color swatches with hex codes and percentages.
 *
 * Phase 1B: Screenshot Analysis Integration
 */

import { ColorInfo } from '../utils/colorExtractor';

interface ColorPaletteStripProps {
  colors: ColorInfo[];
  className?: string;
}

export function ColorPaletteStrip({ colors, className = '' }: ColorPaletteStripProps) {
  if (colors.length === 0) {
    return (
      <div className={`text-xs text-muted-foreground ${className}`}>
        No colors detected
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Color swatches */}
      <div className="flex gap-1">
        {colors.map((color, idx) => (
          <div
            key={idx}
            className="group relative flex-1 h-12 rounded border border-border overflow-hidden hover:ring-2 hover:ring-primary transition-all cursor-pointer"
            style={{ backgroundColor: color.hex }}
            title={`${color.hex} (${color.percentage.toFixed(1)}%)`}
          >
            {/* Tooltip on hover */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <div className="text-white text-xs font-mono text-center">
                <div>{color.hex}</div>
                <div className="text-[10px] mt-0.5">
                  {color.percentage.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Color details */}
      <div className="flex flex-wrap gap-2 text-xs">
        {colors.map((color, idx) => (
          <div
            key={idx}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted border border-border"
          >
            <div
              className="w-3 h-3 rounded-sm border border-border"
              style={{ backgroundColor: color.hex }}
            />
            <span className="font-mono text-[10px]">{color.hex}</span>
            <span className="text-muted-foreground">
              {color.percentage.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
