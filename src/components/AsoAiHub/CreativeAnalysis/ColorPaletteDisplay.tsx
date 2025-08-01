import React from 'react';
import { ColorPalette } from '@/services/creative-analysis.service';

interface ColorPaletteDisplayProps {
  colorPalette: ColorPalette;
}

export const ColorPaletteDisplay: React.FC<ColorPaletteDisplayProps> = ({
  colorPalette
}) => {
  const colors = [
    { name: 'Primary', value: colorPalette.primary },
    { name: 'Secondary', value: colorPalette.secondary },
    { name: 'Accent', value: colorPalette.accent },
    { name: 'Background', value: colorPalette.background },
    { name: 'Text', value: colorPalette.text },
  ];

  return (
    <div className="space-y-2">
      {colors.map((color) => (
        <div key={color.name} className="flex items-center gap-3">
          <div className="w-4 h-4 rounded border border-zinc-600 bg-zinc-700 flex-shrink-0">
            {/* Color representation would be visual here in a real implementation */}
          </div>
          <div className="flex-1">
            <span className="text-xs text-zinc-400">{color.name}:</span>
            <span className="text-sm text-zinc-300 ml-2">{color.value}</span>
          </div>
        </div>
      ))}
    </div>
  );
};