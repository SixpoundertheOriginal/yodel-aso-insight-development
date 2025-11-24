/**
 * Missing Combos View
 *
 * Shows all missing keyword combinations with:
 * - Strategic value scores
 * - Recommendations for which to add
 * - ASO Bible insights
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingUp, Copy, CheckCircle2 } from 'lucide-react';
import type { GeneratedCombo } from '@/engine/combos/comboGenerationEngine';
import { toast } from 'sonner';

interface MissingCombosViewProps {
  missingCombos: GeneratedCombo[];
  recommendedCombos: GeneratedCombo[];
}

export const MissingCombosView: React.FC<MissingCombosViewProps> = ({
  missingCombos,
  recommendedCombos,
}) => {
  const [copiedCombo, setCopiedCombo] = useState<string | null>(null);

  const handleCopyCombo = (combo: string) => {
    navigator.clipboard.writeText(combo);
    setCopiedCombo(combo);
    toast.success(`Copied "${combo}" to clipboard`);
    setTimeout(() => setCopiedCombo(null), 2000);
  };

  const handleCopyAll = (combos: GeneratedCombo[]) => {
    const text = combos.map(c => c.text).join('\n');
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${combos.length} combos to clipboard`);
  };

  // Group by strategic value tiers
  const highValueCombos = missingCombos.filter(c => (c.strategicValue || 0) >= 70);
  const mediumValueCombos = missingCombos.filter(c => (c.strategicValue || 0) >= 50 && (c.strategicValue || 0) < 70);
  const lowValueCombos = missingCombos.filter(c => (c.strategicValue || 0) < 50);

  const ComboCard = ({ combo }: { combo: GeneratedCombo }) => {
    const isCopied = copiedCombo === combo.text;
    const valueColor =
      (combo.strategicValue || 0) >= 70
        ? 'text-emerald-400 border-emerald-400/30'
        : (combo.strategicValue || 0) >= 50
        ? 'text-blue-400 border-blue-400/30'
        : 'text-zinc-400 border-zinc-700';

    return (
      <div className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-lg border border-zinc-800 hover:border-violet-500/30 transition-all group">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-zinc-200">{combo.text}</span>
            <Badge variant="outline" className="text-xs border-zinc-700 text-zinc-500">
              {combo.length}-word
            </Badge>
          </div>
          {combo.recommendation && (
            <p className="text-xs text-zinc-500">{combo.recommendation}</p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="outline" className={`text-xs ${valueColor}`}>
            {combo.strategicValue || 0}/100
          </Badge>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleCopyCombo(combo.text)}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            {isCopied ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            ) : (
              <Copy className="h-4 w-4 text-zinc-400" />
            )}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Recommendations */}
      {recommendedCombos.length > 0 && (
        <Card className="bg-gradient-to-br from-violet-900/20 to-purple-900/10 border-violet-500/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-violet-400" />
                <CardTitle className="text-sm font-medium text-violet-300">
                  Top Recommendations
                </CardTitle>
                <Badge variant="outline" className="border-violet-400/30 text-violet-400">
                  {recommendedCombos.length}
                </Badge>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCopyAll(recommendedCombos)}
                className="border-violet-400/30 text-violet-400 hover:bg-violet-900/20"
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs text-zinc-400 mb-4">
              These are the highest-value missing combinations based on strategic analysis.
              Consider adding them to improve ASO coverage.
            </p>
            {recommendedCombos.map((combo) => (
              <ComboCard key={combo.text} combo={combo} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* High Value Missing Combos */}
      {highValueCombos.length > 0 && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-emerald-400" />
                <CardTitle className="text-sm font-medium">High Value (70+)</CardTitle>
                <Badge variant="outline" className="border-emerald-400/30 text-emerald-400">
                  {highValueCombos.length}
                </Badge>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCopyAll(highValueCombos)}
                className="border-emerald-400/30 text-emerald-400 hover:bg-emerald-900/20 text-xs"
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {highValueCombos.map((combo) => (
              <ComboCard key={combo.text} combo={combo} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Medium Value Missing Combos */}
      {mediumValueCombos.length > 0 && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-400" />
                <CardTitle className="text-sm font-medium">Medium Value (50-69)</CardTitle>
                <Badge variant="outline" className="border-blue-400/30 text-blue-400">
                  {mediumValueCombos.length}
                </Badge>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCopyAll(mediumValueCombos)}
                className="border-blue-400/30 text-blue-400 hover:bg-blue-900/20 text-xs"
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {mediumValueCombos.slice(0, 10).map((combo) => (
              <ComboCard key={combo.text} combo={combo} />
            ))}
            {mediumValueCombos.length > 10 && (
              <p className="text-xs text-zinc-500 text-center pt-2">
                + {mediumValueCombos.length - 10} more medium-value combos
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-4 p-4 bg-zinc-900/30 rounded-lg border border-zinc-800">
        <div className="text-center space-y-1">
          <p className="text-xs text-zinc-500">High Value</p>
          <p className="text-2xl font-bold text-emerald-400">{highValueCombos.length}</p>
        </div>
        <div className="text-center space-y-1">
          <p className="text-xs text-zinc-500">Medium Value</p>
          <p className="text-2xl font-bold text-blue-400">{mediumValueCombos.length}</p>
        </div>
        <div className="text-center space-y-1">
          <p className="text-xs text-zinc-500">Low Value</p>
          <p className="text-2xl font-bold text-zinc-500">{lowValueCombos.length}</p>
        </div>
      </div>

      {/* Contextual Help Text */}
      {highValueCombos.length > 0 && (
        <div className="p-4 bg-emerald-900/10 rounded-lg border border-emerald-500/20">
          <p className="text-xs text-zinc-400">
            💡 <span className="font-medium text-emerald-400">High Priority:</span> You have{' '}
            {highValueCombos.length} high-value missing combos (70+). These have the strongest potential
            impact on App Store rankings. Prioritize adding 2-3 of these to your title or subtitle.
          </p>
        </div>
      )}
      {highValueCombos.length === 0 && mediumValueCombos.length > 0 && (
        <div className="p-4 bg-blue-900/10 rounded-lg border border-blue-500/20">
          <p className="text-xs text-zinc-400">
            💡 <span className="font-medium text-blue-400">Medium Opportunity:</span> You have{' '}
            {mediumValueCombos.length} medium-value missing combos (50-69). While not as impactful as
            high-value combos, these can still improve your ASO coverage and rankings.
          </p>
        </div>
      )}
      {highValueCombos.length === 0 && mediumValueCombos.length === 0 && lowValueCombos.length > 0 && (
        <div className="p-4 bg-zinc-900/30 rounded-lg border border-zinc-700">
          <p className="text-xs text-zinc-400">
            💡 <span className="font-medium">Good Coverage:</span> No high or medium value missing combos!
            Your metadata already covers the most strategic keyword combinations. Focus on optimizing
            existing combos for better placement and visibility.
          </p>
        </div>
      )}
    </div>
  );
};
