/**
 * Insight Tooltip
 *
 * Reusable tooltip component for chart visualizations.
 * Provides consistent styling across all charts.
 */

import React from 'react';

interface InsightTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  formatter?: (value: any, name: string) => [string, string];
}

export const InsightTooltip: React.FC<InsightTooltipProps> = ({
  active,
  payload,
  label,
  formatter,
}) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div className="bg-black/90 border border-zinc-700/60 rounded-md p-2 shadow-lg backdrop-blur-sm">
      {label && (
        <p className="text-xs font-mono font-semibold text-zinc-200 mb-1 border-b border-zinc-700/40 pb-1">
          {label}
        </p>
      )}
      <div className="space-y-0.5">
        {payload.map((entry, index) => {
          const [displayValue, displayName] = formatter
            ? formatter(entry.value, entry.name)
            : [entry.value, entry.name];

          return (
            <div key={`item-${index}`} className="flex items-center justify-between gap-3 text-xs font-mono">
              <div className="flex items-center gap-1.5">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: entry.color || entry.fill }}
                />
                <span className="text-zinc-400">{displayName}:</span>
              </div>
              <span className="text-zinc-300 font-medium">{displayValue}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Get standard tooltip config for Recharts
 */
export const getTooltipConfig = () => ({
  contentStyle: {
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    border: '1px solid rgba(63, 63, 70, 0.6)',
    borderRadius: '6px',
    fontSize: '11px',
    fontFamily: 'monospace',
    padding: '8px',
  },
  labelStyle: {
    color: '#e4e4e7',
    fontWeight: 'bold',
    fontSize: '11px',
  },
  itemStyle: {
    color: '#a1a1aa',
    fontSize: '11px',
  },
});
