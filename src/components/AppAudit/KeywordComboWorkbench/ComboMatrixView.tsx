/**
 * Combo Matrix View
 *
 * Visual matrix showing which keywords combine with which.
 * Helps identify keyword coverage gaps and opportunities.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Grid3x3, CheckCircle2, XCircle } from 'lucide-react';
import type { GeneratedCombo } from '@/engine/combos/comboGenerationEngine';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ComboMatrixViewProps {
  titleKeywords: string[];
  subtitleKeywords: string[];
  combos: GeneratedCombo[];
}

export const ComboMatrixView: React.FC<ComboMatrixViewProps> = ({
  titleKeywords,
  subtitleKeywords,
  combos,
}) => {
  // Create a map of which keyword pairs exist
  const comboMap = new Map<string, GeneratedCombo>();
  combos.forEach(combo => {
    if (combo.length === 2) {
      const key = combo.keywords.sort().join('|');
      comboMap.set(key, combo);
    }
  });

  // Helper to check if combo exists
  const getCombo = (kw1: string, kw2: string): GeneratedCombo | undefined => {
    const key = [kw1, kw2].sort().join('|');
    return comboMap.get(key);
  };

  // Calculate keyword participation stats
  const keywordStats = new Map<string, { total: number; existing: number }>();
  [...titleKeywords, ...subtitleKeywords].forEach(kw => {
    const total = combos.filter(c => c.keywords.includes(kw)).length;
    const existing = combos.filter(c => c.keywords.includes(kw) && c.exists).length;
    keywordStats.set(kw, { total, existing });
  });

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Grid3x3 className="h-4 w-4 text-violet-400" />
            <CardTitle className="text-sm font-medium">Keyword Combination Matrix</CardTitle>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500/40" />
              <span className="text-zinc-400">Exists</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-zinc-700/20 border border-zinc-700" />
              <span className="text-zinc-400">Missing</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Title x Subtitle Cross Matrix */}
        {titleKeywords.length > 0 && subtitleKeywords.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-zinc-400 mb-3">
              Title × Subtitle Combinations
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="p-2 text-left text-xs font-medium text-zinc-500 border-b border-zinc-800">
                      {/* Empty corner */}
                    </th>
                    {subtitleKeywords.map(kw => (
                      <th
                        key={kw}
                        className="p-2 text-center text-xs font-medium text-zinc-400 border-b border-zinc-800 min-w-[80px]"
                      >
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <div className="truncate max-w-[80px]">{kw}</div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-xs space-y-1">
                                <p className="font-medium">{kw}</p>
                                <p className="text-zinc-400">
                                  {keywordStats.get(kw)?.existing || 0} / {keywordStats.get(kw)?.total || 0} combos exist
                                </p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {titleKeywords.map(titleKw => (
                    <tr key={titleKw}>
                      <td className="p-2 text-xs font-medium text-zinc-400 border-r border-zinc-800">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <div className="truncate max-w-[100px]">{titleKw}</div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-xs space-y-1">
                                <p className="font-medium">{titleKw}</p>
                                <p className="text-zinc-400">
                                  {keywordStats.get(titleKw)?.existing || 0} / {keywordStats.get(titleKw)?.total || 0} combos exist
                                </p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </td>
                      {subtitleKeywords.map(subtitleKw => {
                        const combo = getCombo(titleKw, subtitleKw);
                        const exists = combo?.exists || false;
                        const strategicValue = combo?.strategicValue || 0;

                        return (
                          <td key={`${titleKw}-${subtitleKw}`} className="p-2 text-center">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <div
                                    className={`w-full h-8 rounded flex items-center justify-center text-xs font-medium transition-all ${
                                      exists
                                        ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30'
                                        : 'bg-zinc-800/30 border border-zinc-700 text-zinc-600 hover:bg-zinc-800/50'
                                    }`}
                                  >
                                    {exists ? (
                                      <CheckCircle2 className="h-3 w-3" />
                                    ) : (
                                      <XCircle className="h-3 w-3" />
                                    )}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="text-xs space-y-1">
                                    <p className="font-medium">{titleKw} {subtitleKw}</p>
                                    <p className={exists ? 'text-emerald-400' : 'text-zinc-400'}>
                                      {exists ? '✓ Exists' : '✗ Missing'}
                                    </p>
                                    {combo && (
                                      <>
                                        <p className="text-zinc-400">Strategic Value: {strategicValue}/100</p>
                                        <p className="text-zinc-500 text-[10px]">
                                          {combo.source === 'missing'
                                            ? 'Consider adding this combo'
                                            : `Found in ${combo.source}`}
                                        </p>
                                      </>
                                    )}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-zinc-800">
          <div className="space-y-1">
            <p className="text-xs text-zinc-500">Total Possible</p>
            <p className="text-lg font-bold text-zinc-300">{comboMap.size}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-zinc-500">Existing</p>
            <p className="text-lg font-bold text-emerald-400">
              {Array.from(comboMap.values()).filter(c => c.exists).length}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-zinc-500">Missing</p>
            <p className="text-lg font-bold text-amber-400">
              {Array.from(comboMap.values()).filter(c => !c.exists).length}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-zinc-500">Coverage</p>
            <p className="text-lg font-bold text-blue-400">
              {comboMap.size > 0
                ? Math.round((Array.from(comboMap.values()).filter(c => c.exists).length / comboMap.size) * 100)
                : 0}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
