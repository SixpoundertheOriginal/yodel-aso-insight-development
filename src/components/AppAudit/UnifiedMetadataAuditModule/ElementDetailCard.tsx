/**
 * Element Detail Card
 *
 * Expandable card showing detailed analysis for a single metadata element.
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronDown, ChevronUp, CheckCircle2, AlertCircle, Check, Sparkles, X, CheckCircle, TrendingUp, Edit2 } from 'lucide-react';
import { useWorkbenchSelection } from '@/contexts/WorkbenchSelectionContext';
import { RuleResultsTable } from './RuleResultsTable';
import type { ElementScoringResult, UnifiedMetadataAuditResult, ClassifiedCombo } from './types';
import type { ScrapedMetadata } from '@/types/aso';
// V2.1 imports
import { extractRankingTokens, calculateRankingSlotEfficiency } from '@/engine/metadata/utils/rankingTokenExtractor';
import { analyzeSubtitleValue } from '@/engine/metadata/utils/subtitleValueAnalyzer';
import { isV2_1FeatureEnabled } from '@/config/metadataFeatureFlags';
import { useKeywordComboStore } from '@/stores/useKeywordComboStore';
import { toast } from 'sonner';
// Enhanced text display
import { EnhancedTextDisplay } from './EnhancedTextDisplay';
import { useBrandOverride } from '@/hooks/useBrandOverride';

// Helper function: Extract meaningful keywords
function extractMeaningfulKeywords(text: string): Set<string> {
  const stopwords = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
    'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
    'to', 'was', 'will', 'with', '&',
  ]);

  const normalized = text.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
  const words = normalized.split(/\s+/).filter(Boolean);

  return new Set(
    words.filter((word) => !stopwords.has(word) && word.length >= 2)
  );
}

// Helper function: Generate combos from keywords
function generateSimpleCombos(keywords: string[]): Set<string> {
  const combos = new Set<string>();

  // 2-word combos
  for (let i = 0; i < keywords.length - 1; i++) {
    for (let j = i + 1; j < keywords.length; j++) {
      combos.add(`${keywords[i]} ${keywords[j]}`);
      combos.add(`${keywords[j]} ${keywords[i]}`);
    }
  }

  // 3-word combos
  for (let i = 0; i < keywords.length - 2; i++) {
    for (let j = i + 1; j < keywords.length - 1; j++) {
      for (let k = j + 1; k < keywords.length; k++) {
        combos.add(`${keywords[i]} ${keywords[j]} ${keywords[k]}`);
      }
    }
  }

  return combos;
}

interface ElementDetailCardProps {
  elementResult: ElementScoringResult;
  elementDisplayName: string;
  metadata: ScrapedMetadata;
  /** Phase 17: Bible-driven intent coverage (optional) */
  auditResult?: UnifiedMetadataAuditResult;
  /** Comparison mode: baseline audit to compare against */
  baselineAudit?: UnifiedMetadataAuditResult | null;
  /** Comparison mode: is this a competitor? */
  isCompetitor?: boolean;
  /** v2.1: Organization ID for brand keyword database storage */
  organizationId?: string;
  /** v2.1: Monitored app ID for brand keyword database storage */
  monitoredAppId?: string;
}

export const ElementDetailCard: React.FC<ElementDetailCardProps> = ({
  elementResult,
  elementDisplayName,
  metadata: rawMetadata,
  auditResult,
  baselineAudit = null,
  isCompetitor = false,
  organizationId,
  monitoredAppId,
}) => {
  // Title and Subtitle always start expanded, Description starts collapsed
  const initiallyExpanded = elementResult.element === 'title' || elementResult.element === 'subtitle';
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded);
  const [showAdvancedKeywords, setShowAdvancedKeywords] = useState(false);
  const [showAllCombos, setShowAllCombos] = useState(false);
  const [showAllNewCombos, setShowAllNewCombos] = useState(false);
  const { score, ruleResults, recommendations, insights, metadata: elementMetadata, element } = elementResult;

  // Workbench integration - add combos directly
  const { addCombo, combos } = useKeywordComboStore();

  // Brand override management (shared across title and subtitle)
  // v2.1: Pass organizationId and monitoredAppId for database storage
  const [brandOverride, setBrandOverride, clearBrandOverride] = useBrandOverride(
    rawMetadata.appId,
    organizationId,
    monitoredAppId
  );
  const [isEditingBrand, setIsEditingBrand] = useState(false);
  const [brandEditValue, setBrandEditValue] = useState('');

  // Editable title management (session-only for now)
  const [editedTitle, setEditedTitle] = useState<string | null>(null);

  // Editable subtitle management (session-only for now)
  const [editedSubtitle, setEditedSubtitle] = useState<string | null>(null);

  // Helper function to create a ClassifiedCombo from keyword
  const createComboFromKeyword = (keyword: string, source: 'title' | 'subtitle'): ClassifiedCombo => {
    return {
      text: keyword,
      type: 'generic',
      source: source,
      relevanceScore: 50,
      length: keyword.split(' ').length,
    } as ClassifiedCombo;
  };

  // Check if combo/keyword is already in the table
  const isInTable = (text: string) => {
    return combos.some(c => c.text === text);
  };

  // Handle adding keyword to workbench
  const handleAddKeyword = (keyword: string, source: 'title' | 'subtitle') => {
    if (isInTable(keyword)) return;
    const combo = createComboFromKeyword(keyword, source);
    addCombo(combo);
    toast.success(`Added "${keyword}" to workbench`);
  };

  // Handle adding combo to workbench
  const handleAddCombo = (comboText: string, comboData: any, source: 'title' | 'subtitle') => {
    if (isInTable(comboText)) return;
    const combo: ClassifiedCombo = {
      text: comboText,
      type: comboData.type || 'generic',
      source: source,
      relevanceScore: comboData.relevanceScore || 50,
      length: comboText.split(' ').length,
      ...(comboData.priorityScore && { priorityScore: comboData.priorityScore }),
      ...(comboData.noiseConfidence && { noiseConfidence: comboData.noiseConfidence }),
      ...(comboData.strategicValue && { strategicValue: comboData.strategicValue }),
    } as ClassifiedCombo;
    addCombo(combo);
    toast.success(`Added "${comboText}" to workbench`);
  };

  // Check if this is the description element (conversion only)
  const isConversionElement = element === 'description';

  // Get combo details with V2.1 data from auditResult
  const combosWithDetails = useMemo(() => {
    if (!elementMetadata.combos || !auditResult) return [];

    // Get classified combos from audit result based on element
    const classifiedCombos = element === 'title'
      ? auditResult.comboCoverage?.titleCombosClassified || []
      : element === 'subtitle'
      ? auditResult.comboCoverage?.subtitleNewCombosClassified || []
      : [];

    // Create a map for quick lookup
    const comboMap = new Map(classifiedCombos.map(c => [c.text, c]));

    // Enrich element combos with classified data
    return elementMetadata.combos.map(comboText => {
      const classified = comboMap.get(comboText);
      if (classified) {
        return classified;
      }
      // Fallback: create basic combo object
      return {
        text: comboText,
        type: 'generic' as const,
        relevanceScore: 0,
      };
    });
  }, [elementMetadata.combos, auditResult, element]);

  // Helper: Get combo color class based on V2.1 data
  const getComboColorClass = (combo: any) => {
    const priorityScore = combo.priorityScore || 0;
    const noiseConfidence = combo.noiseConfidence || 0;

    if (combo.type === 'high_value' || priorityScore > 70) {
      return 'border-emerald-400/40 text-emerald-400 hover:bg-emerald-500/10';
    }
    if (combo.type === 'brand') {
      return 'border-blue-400/40 text-blue-400 hover:bg-blue-500/10';
    }
    if (combo.type === 'low_value' || noiseConfidence > 50) {
      return 'border-orange-400/40 text-orange-400 hover:bg-orange-500/10';
    }
    return 'border-violet-400/30 text-violet-400 hover:bg-violet-500/10';
  };

  // Calculate delta for comparison mode
  const getDelta = (competitorValue: number | undefined, baselineValue: number | undefined) => {
    if (!isCompetitor || !baselineAudit || competitorValue === undefined || baselineValue === undefined) {
      return null;
    }
    const delta = competitorValue - baselineValue;
    return {
      value: delta,
      label: delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1),
      isPositive: delta > 0,
      isNeutral: Math.abs(delta) < 0.5
    };
  };

  // Get baseline element score based on element type
  const baselineScore = baselineAudit?.elements?.[element]?.score;
  const scoreDelta = getDelta(score, baselineScore);

  // Get the actual text content for this element
  const elementText = element === 'title'
    ? rawMetadata.title
    : element === 'subtitle'
    ? rawMetadata.subtitle
    : rawMetadata.description;

  // Compute display title (original or edited)
  const displayTitle = element === 'title' && editedTitle !== null ? editedTitle : elementText;

  // Compute display subtitle (original or edited)
  const displaySubtitle = element === 'subtitle' && editedSubtitle !== null ? editedSubtitle : elementText;

  // Format platform + locale
  const platformLocale = `iOS • ${rawMetadata.locale || 'en-US'}`;

  // Character usage percentage
  const charUsagePercent = Math.round(
    (elementMetadata.characterUsage / elementMetadata.maxCharacters) * 100
  );

  // Score color
  const scoreColor =
    score >= 80
      ? 'border-emerald-400/30 text-emerald-400'
      : score >= 60
      ? 'border-yellow-400/30 text-yellow-400'
      : 'border-red-400/30 text-red-400';

  // V2.1: Ranking token analysis (title only)
  const rankingAnalysis = React.useMemo(() => {
    if (element === 'title' && isV2_1FeatureEnabled('RANKING_BLOCK')) {
      const tokenSet = extractRankingTokens(elementText || '', rawMetadata.subtitle || '');
      const efficiency = calculateRankingSlotEfficiency(elementText || '', rawMetadata.subtitle || '');
      return { tokenSet, efficiency };
    }
    return null;
  }, [element, elementText, rawMetadata.subtitle]);

  // V2.1: Subtitle value analysis (subtitle only)
  const subtitleValue = React.useMemo(() => {
    if (element === 'subtitle' && isV2_1FeatureEnabled('SUBTITLE_PANEL')) {
      console.log('[ElementDetailCard] Subtitle value analysis input:', {
        title: rawMetadata.title,
        subtitle: elementText,
        titleCombosClassified: auditResult?.comboCoverage?.titleCombosClassified?.length || 0,
        subtitleNewCombosClassified: auditResult?.comboCoverage?.subtitleNewCombosClassified?.length || 0,
        totalCombos: auditResult?.comboCoverage?.totalCombos || 0
      });

      const result = analyzeSubtitleValue(
        rawMetadata.title || '',
        elementText || '',
        auditResult?.comboCoverage?.titleCombosClassified
      );

      console.log('[ElementDetailCard] Subtitle value analysis result:', {
        newComboCount: result.newComboCount,
        newCombosLength: result.newCombos.length
      });

      return result;
    }
    return null;
  }, [element, rawMetadata.title, elementText, auditResult]);

  // Calculate coverage contribution for title
  const titleCoverageContribution = React.useMemo(() => {
    if (element === 'title' && elementText) {
      const keywords = Array.from(extractMeaningfulKeywords(elementText));
      const combos = generateSimpleCombos(keywords);
      return {
        keywordCount: keywords.length,
        comboCount: combos.size
      };
    }
    return null;
  }, [element, elementText]);

  return (
    <Card 
      className="group relative bg-black/60 backdrop-blur-lg border-zinc-700/70 border-2 border-dashed transition-all duration-300 hover:border-orange-500/40 hover:shadow-[0_0_30px_rgba(249,115,22,0.15)]"
      style={{
        clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))',
      }}
    >
      {/* L-bracket corners */}
      <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-orange-500/60 opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300" />
      <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-orange-500/60 opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300" />
      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-orange-500/60 opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300" />
      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-orange-500/60 opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300" />
      
      <CardHeader
        className="cursor-pointer hover:bg-zinc-800/30 transition-all duration-300"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-base font-normal tracking-wide uppercase text-zinc-300">{elementDisplayName}</CardTitle>
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-zinc-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-zinc-400" />
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">
              {elementMetadata.characterUsage}/{elementMetadata.maxCharacters} CHARS • {charUsagePercent}%
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={`text-xl font-mono font-normal px-4 py-1 ${scoreColor}`}
                style={{
                  clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
                }}
              >
                {score}
              </Badge>
              {scoreDelta && (
                <Badge
                  variant="outline"
                  className={`text-xs font-mono px-2 py-0.5 ${
                    scoreDelta.isNeutral
                      ? 'border-zinc-500/40 text-zinc-400'
                      : scoreDelta.isPositive
                      ? 'border-green-500/40 text-green-400'
                      : 'border-red-500/40 text-red-400'
                  }`}
                >
                  {scoreDelta.isPositive ? '↑' : '↓'} {scoreDelta.label}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Character usage progress bar */}
        <Progress value={charUsagePercent} className="h-2 mt-2" />
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-6 pt-6">
          {/* Raw Metadata Details */}
          <div className="pb-4 border-b border-zinc-800">
            <div className="space-y-3">
              {/* Element Text */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-[0.25em] font-medium">
                    {element === 'description' ? 'Description Preview' : `Full ${elementDisplayName}`}
                  </div>
                  {element === 'title' && !isEditingBrand && (
                    <button
                      onClick={() => {
                        setIsEditingBrand(true);
                        setBrandEditValue(brandOverride || '');
                      }}
                      className="flex items-center gap-1.5 text-[10px] text-zinc-400 hover:text-orange-400 transition-colors"
                    >
                      <Edit2 className="h-3 w-3" />
                      Edit Brand
                    </button>
                  )}
                </div>

                {/* Brand Edit UI (Title) */}
                {element === 'title' && isEditingBrand && (
                  <div className="mb-3 p-3 bg-zinc-800/50 rounded border border-orange-500/30">
                    <div className="text-xs text-zinc-400 mb-2">
                      Enter the brand portion of your app title (e.g., "Inspire" from "Inspire - Self Care & Wellness")
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={brandEditValue}
                        onChange={(e) => setBrandEditValue(e.target.value)}
                        placeholder="Brand name..."
                        className="flex-1 px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-sm text-zinc-200 focus:outline-none focus:border-orange-500/50"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        onClick={() => {
                          if (brandEditValue.trim()) {
                            setBrandOverride(brandEditValue.trim());
                            toast.success(`Brand set to "${brandEditValue.trim()}"`);
                          }
                          setIsEditingBrand(false);
                        }}
                        className="bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 border border-orange-500/40"
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsEditingBrand(false)}
                        className="border-zinc-700 text-zinc-400"
                      >
                        Cancel
                      </Button>
                      {brandOverride && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            clearBrandOverride();
                            setIsEditingBrand(false);
                            toast.success('Brand override cleared');
                          }}
                          className="border-red-500/40 text-red-400 hover:bg-red-500/10"
                        >
                          Clear
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Enhanced Badge Display for Title, Plain Text for Others */}
                {element === 'title' && !isEditingBrand ? (
                  <>
                    <EnhancedTextDisplay
                      text={displayTitle || ''}
                      type="title"
                      brandOverride={brandOverride}
                    />

                    {/* Editable Title Input */}
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editedTitle !== null ? editedTitle : elementText || ''}
                          onChange={(e) => setEditedTitle(e.target.value)}
                          placeholder="Edit title text..."
                          className="flex-1 px-3 py-2 bg-zinc-900/50 border border-zinc-700/50 rounded text-sm text-zinc-200 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 font-light"
                        />
                        {editedTitle !== null && editedTitle !== elementText && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditedTitle(null);
                              toast.success('Title reset to original');
                            }}
                            className="border-zinc-700 text-zinc-400 hover:text-zinc-300"
                          >
                            Reset
                          </Button>
                        )}
                      </div>

                      {editedTitle !== null && editedTitle !== elementText && (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => {
                              toast.info('Re-run Audit feature coming soon!');
                              // TODO: Implement audit re-run with new title
                            }}
                            className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40"
                          >
                            Re-run Audit with New Title
                          </Button>
                          <span className="text-xs text-zinc-500">
                            Optional: Recalculate all metrics with edited title
                          </span>
                        </div>
                      )}
                    </div>
                  </>
                ) : element === 'subtitle' ? (
                  <>
                    <EnhancedTextDisplay
                      text={displaySubtitle || ''}
                      type="subtitle"
                      brandOverride={brandOverride}
                      disableAutoDetect={true}
                    />

                    {/* Editable Subtitle Input */}
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editedSubtitle !== null ? editedSubtitle : elementText || ''}
                          onChange={(e) => setEditedSubtitle(e.target.value)}
                          placeholder="Edit subtitle text..."
                          className="flex-1 px-3 py-2 bg-zinc-900/50 border border-zinc-700/50 rounded text-sm text-zinc-200 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 font-light"
                        />
                        {editedSubtitle !== null && editedSubtitle !== elementText && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditedSubtitle(null);
                              toast.success('Subtitle reset to original');
                            }}
                            className="border-zinc-700 text-zinc-400 hover:text-zinc-300"
                          >
                            Reset
                          </Button>
                        )}
                      </div>

                      {editedSubtitle !== null && editedSubtitle !== elementText && (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => {
                              toast.info('Re-run Audit feature coming soon!');
                              // TODO: Implement audit re-run with new subtitle
                            }}
                            className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40"
                          >
                            Re-run Audit with New Subtitle
                          </Button>
                          <span className="text-xs text-zinc-500">
                            Optional: Recalculate all metrics with edited subtitle
                          </span>
                        </div>
                      )}
                    </div>
                  </>
                ) : element === 'description' ? (
                  <div className="text-sm text-zinc-200 font-light leading-relaxed">
                    {elementText && elementText.length > 200
                      ? `${elementText.slice(0, 200)}...`
                      : elementText || 'Not available'}
                  </div>
                ) : null}
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-1 gap-3 pt-2">
                <div className="p-3 bg-zinc-800/30 rounded border border-zinc-700/50">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Characters</div>
                  <div className="text-sm text-zinc-300 font-mono">
                    {elementMetadata.characterUsage} / {elementMetadata.maxCharacters}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Coverage Contribution (Title) */}
          {element === 'title' && titleCoverageContribution && (
            <div className="pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-blue-400" />
                <span className="text-sm font-medium text-zinc-300">
                  Coverage Contribution
                </span>
              </div>
              <div className="text-sm text-zinc-400">
                Contributes{' '}
                <span className="font-medium text-blue-400">{titleCoverageContribution.keywordCount} keywords</span>
                {' '}+{' '}
                <span className="font-medium text-violet-400">{titleCoverageContribution.comboCount} combinations</span>
                {' '}={' '}
                <span className="font-medium text-zinc-200">{titleCoverageContribution.keywordCount + titleCoverageContribution.comboCount} total search terms</span>
              </div>
            </div>
          )}

          {/* Coverage Contribution (Subtitle) */}
          {element === 'subtitle' && subtitleValue && (
            <div className="pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                <span className="text-sm font-medium text-zinc-300">
                  Coverage Contribution
                </span>
              </div>
              <div className="text-sm text-zinc-400">
                Adds{' '}
                <span className="font-medium text-blue-400">{subtitleValue.newKeywordCount} new keywords</span>
                {' '}+{' '}
                <span className="font-medium text-violet-400">{subtitleValue.newComboCount} cross-element combinations</span>
                {' '}={' '}
                <span className="font-medium text-zinc-200">{subtitleValue.newKeywordCount + subtitleValue.newComboCount} new search terms</span>
              </div>
            </div>
          )}

          {/* V2.1 Ranking Token Analysis (Title Only) */}
          {element === 'title' && rankingAnalysis && (
            <div className="pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-medium text-zinc-300">
                  [V2.1] Ranking Token Analysis
                </span>
                <Badge variant="outline" className="text-xs border-emerald-400/30 text-emerald-400">
                  NEW
                </Badge>
              </div>
              <div className="space-y-3">
                {/* Token breakdown */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 bg-zinc-800/30 rounded border border-zinc-700/50">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Title Keywords</div>
                    <div className="text-lg font-bold text-blue-400">
                      {rankingAnalysis.tokenSet.titleTokens.filter(t => !t.isStopword).length}
                    </div>
                  </div>
                  <div className="p-3 bg-zinc-800/30 rounded border border-zinc-700/50">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Stopwords</div>
                    <div className="text-lg font-bold text-orange-400">
                      {rankingAnalysis.tokenSet.titleTokens.filter(t => t.isStopword).length}
                    </div>
                  </div>
                  <div className="p-3 bg-zinc-800/30 rounded border border-zinc-700/50">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Efficiency</div>
                    <div className="text-lg font-bold text-emerald-400">
                      {rankingAnalysis.efficiency.efficiency}%
                    </div>
                  </div>
                  <div className="p-3 bg-zinc-800/30 rounded border border-zinc-700/50">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Utilization</div>
                    <div className="text-lg font-bold text-zinc-300">
                      {elementMetadata.characterUsage}/30
                    </div>
                  </div>
                </div>

                {/* Token badges */}
                <div>
                  <div className="text-xs text-zinc-500 uppercase mb-2">Ranking Tokens</div>
                  <div className="flex flex-wrap gap-2">
                    {rankingAnalysis.tokenSet.titleTokens.map((token, idx) => (
                      <Badge
                        key={idx}
                        variant="outline"
                        className={`text-xs ${
                          token.isStopword
                            ? 'border-zinc-600/30 text-zinc-500 line-through'
                            : 'border-blue-400/30 text-blue-400'
                        }`}
                      >
                        {token.text}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* V2.1 Incremental Value Analysis (Subtitle Only) */}
          {element === 'subtitle' && subtitleValue && (
            <div className="pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-medium text-zinc-300">
                  [V2.1] Incremental Value Analysis
                </span>
                <Badge variant="outline" className="text-xs border-emerald-400/30 text-emerald-400">
                  NEW
                </Badge>
                <Badge
                  variant="outline"
                  className={`text-sm font-bold ${
                    subtitleValue.synergyScore >= 80
                      ? 'border-emerald-400/40 text-emerald-400'
                      : subtitleValue.synergyScore >= 60
                      ? 'border-blue-400/40 text-blue-400'
                      : 'border-orange-400/40 text-orange-400'
                  }`}
                >
                  Synergy: {subtitleValue.synergyScore}% ⭐
                </Badge>
              </div>
              <div className="space-y-3">
                {/* Metrics grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="p-3 bg-zinc-800/30 rounded border border-zinc-700/50">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">New Keywords</div>
                    <div className="text-lg font-bold text-purple-400">
                      {subtitleValue.newKeywordCount}
                    </div>
                  </div>
                  <div className="p-3 bg-zinc-800/30 rounded border border-zinc-700/50">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Cross-Element Combos</div>
                    <div className="text-lg font-bold text-violet-400">
                      {subtitleValue.newComboCount}
                    </div>
                  </div>
                  <div className="p-3 bg-zinc-800/30 rounded border border-zinc-700/50">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Complementarity</div>
                    <div className="text-lg font-bold text-emerald-400">
                      {subtitleValue.titleAlignmentScore}%
                    </div>
                  </div>
                </div>

                {/* New keywords */}
                {subtitleValue.newKeywords.length > 0 && (
                  <div>
                    <div className="text-xs text-zinc-500 uppercase mb-2">
                      New Keywords ({subtitleValue.newKeywords.length})
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {subtitleValue.newKeywords.map((keyword, idx) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          className="text-xs border-purple-400/30 text-purple-400"
                        >
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cross-Element Combos - Full List with Selection */}
                {subtitleValue.newCombos && subtitleValue.newCombos.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-zinc-500 uppercase">
                        Cross-Element Combos (Title × Subtitle) ({subtitleValue.newComboCount})
                      </div>
                      <span className="text-xs text-zinc-500">Click to add to workbench</span>
                    </div>

                    {/* Combo Badges */}
                    <div className="flex flex-wrap gap-2">
                      {(showAllNewCombos ? subtitleValue.newCombos : subtitleValue.newCombos.slice(0, 10)).map((combo, idx) => {
                        const isAdded = isInTable(combo.text);
                        const isHighValue = combo.priorityScore && combo.priorityScore > 70;
                        const hasNoise = combo.noiseConfidence && combo.noiseConfidence > 50;

                        return (
                          <div key={idx} className="relative group">
                            <Badge
                              variant="outline"
                              className={`text-xs cursor-pointer transition-all ${
                                isAdded
                                  ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300 cursor-not-allowed'
                                  : getComboColorClass(combo) + ' hover:scale-105'
                              }`}
                              onClick={() => !isAdded && handleAddCombo(combo.text, combo, 'subtitle')}
                            >
                              {isAdded && <CheckCircle className="h-3 w-3 mr-1" />}
                              {combo.text}

                              {/* Priority Score */}
                              {combo.priorityScore !== undefined && (
                                <span className="ml-1 text-[10px] opacity-70 font-mono">
                                  {combo.priorityScore}
                                </span>
                              )}

                              {/* Type Indicators */}
                              {isHighValue && <Sparkles className="h-3 w-3 ml-1 text-emerald-400" />}
                              {hasNoise && <AlertCircle className="h-3 w-3 ml-1 text-orange-400" />}
                            </Badge>
                          </div>
                        );
                      })}

                      {/* Show All / Show Less */}
                      {subtitleValue.newCombos.length > 10 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowAllNewCombos(!showAllNewCombos)}
                          className="text-xs text-zinc-400 hover:text-zinc-300 h-7"
                        >
                          {showAllNewCombos ? (
                            <>Show Less ↑</>
                          ) : (
                            <>Show All ({subtitleValue.newCombos.length - 10} more) ↓</>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {subtitleValue.recommendations.length > 0 && (
                  <div className="p-3 bg-cyan-500/10 border border-cyan-400/30 rounded">
                    <div className="text-xs text-cyan-400 font-medium mb-2">💡 Optimization Tips</div>
                    <ul className="text-xs text-zinc-300 space-y-1 list-disc list-inside">
                      {subtitleValue.recommendations.slice(0, 3).map((rec, idx) => (
                        <li key={idx}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Conversion Intelligence Metrics (Description Only) */}
          {isConversionElement && (
            <div>
              <div className="mb-3">
                <p className="text-sm text-zinc-400">
                  Description does not directly impact keyword ranking. Evaluated for conversion quality only.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Hook Strength */}
                {(() => {
                  const hookRule = ruleResults.find(r => r.ruleId === 'description_hook_strength');
                  return hookRule ? (
                    <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
                      <div className="text-xs text-zinc-500 uppercase mb-2">Hook Strength</div>
                      <div className="text-2xl font-bold text-zinc-200 mb-1">{hookRule.score}/100</div>
                      <p className="text-xs text-zinc-400">{hookRule.message}</p>
                    </div>
                  ) : null;
                })()}

                {/* Readability */}
                {(() => {
                  const readabilityRule = ruleResults.find(r => r.ruleId === 'description_readability');
                  return readabilityRule ? (
                    <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
                      <div className="text-xs text-zinc-500 uppercase mb-2">Readability</div>
                      <div className="text-2xl font-bold text-zinc-200 mb-1">{readabilityRule.score}/100</div>
                      <p className="text-xs text-zinc-400">{readabilityRule.message}</p>
                    </div>
                  ) : null;
                })()}

                {/* Feature Depth */}
                {(() => {
                  const featureRule = ruleResults.find(r => r.ruleId === 'description_feature_mentions');
                  return featureRule ? (
                    <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
                      <div className="text-xs text-zinc-500 uppercase mb-2">Feature Depth</div>
                      <div className="text-2xl font-bold text-zinc-200 mb-1">{featureRule.score}/100</div>
                      <p className="text-xs text-zinc-400">{featureRule.message}</p>
                    </div>
                  ) : null;
                })()}
              </div>
            </div>
          )}

          {/* Benchmark Comparison */}
          {elementMetadata.benchmarkComparison && (
            <div className="p-4 bg-zinc-800/30 rounded-lg border border-zinc-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-zinc-300">
                  Category Benchmark
                </span>
                <Badge variant="outline" className="text-xs border-zinc-600 text-zinc-400">
                  {elementMetadata.benchmarkComparison.tier}
                </Badge>
              </div>
              <p className="text-sm text-zinc-400">
                {elementMetadata.benchmarkComparison.message}
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                {elementMetadata.benchmarkComparison.insight}
              </p>
            </div>
          )}

          {/* Keywords */}
          {elementMetadata.keywords && elementMetadata.keywords.length > 0 && element !== 'subtitle' && (
            <div>
              {isConversionElement ? (
                // For description: collapsible advanced view
                <div>
                  <button
                    onClick={() => setShowAdvancedKeywords(!showAdvancedKeywords)}
                    className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-300 transition-colors"
                  >
                    {showAdvancedKeywords ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    <span>View extracted tokens (advanced)</span>
                  </button>
                  {showAdvancedKeywords && (
                    <div className="mt-3 p-4 bg-zinc-800/30 rounded-lg border border-zinc-700">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-zinc-300">
                          Keywords ({elementMetadata.keywords.length})
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                {elementMetadata.keywords.map((keyword, idx) => (
                  <Badge
                    key={idx}
                    variant="outline"
                    className="text-[11px] font-mono tracking-wide uppercase bg-blue-400/10 border border-blue-400/40 backdrop-blur-sm px-3 py-1.5"
                    style={{
                      clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
                    }}
                  >
                    {keyword}
                  </Badge>
                ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                // For title only: multi-select view (subtitle excluded to avoid duplication with "New Keywords")
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-zinc-300">
                      Keywords ({elementMetadata.keywords.length})
                    </span>
                    <span className="text-xs text-zinc-500">Click to add to workbench</span>
                  </div>

                  {/* Keyword Badges - Clickable for multi-select */}
                  <div className="flex flex-wrap gap-2">
                    {elementMetadata.keywords.map((keyword, idx) => {
                      const isAdded = isInTable(keyword);
                      return (
                        <Badge
                          key={idx}
                          variant="outline"
                          className={`text-xs cursor-pointer transition-all ${
                            isAdded
                              ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300 cursor-not-allowed'
                              : 'border-blue-400/30 text-blue-400 hover:border-blue-500/50 hover:bg-blue-500/10 hover:scale-105'
                          }`}
                          onClick={() => !isAdded && handleAddKeyword(keyword, element as 'title' | 'subtitle')}
                        >
                          {isAdded ? <CheckCircle className="h-3 w-3 mr-1" /> : null}
                          {keyword}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Combos */}
          {elementMetadata.combos && elementMetadata.combos.length > 0 && element !== 'subtitle' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-300">
                  Combos ({elementMetadata.combos.length})
                </span>
                <span className="text-xs text-zinc-500">Click to add to workbench</span>
              </div>

              {/* Combo Badges - Enhanced with V2.1 data */}
              <div className="flex flex-wrap gap-2">
                {(showAllCombos ? combosWithDetails : combosWithDetails.slice(0, 10)).map((combo, idx) => {
                  const isAdded = isInTable(combo.text);
                  const isHighValue = combo.priorityScore && combo.priorityScore > 70;
                  const isLowValue = combo.type === 'low_value';
                  const hasNoise = combo.noiseConfidence && combo.noiseConfidence > 50;

                  return (
                    <div key={idx} className="relative group">
                      <Badge
                        variant="outline"
                        className={`text-xs cursor-pointer transition-all ${
                          isAdded
                            ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300 cursor-not-allowed'
                            : getComboColorClass(combo) + ' hover:scale-105'
                        }`}
                        onClick={() => !isAdded && handleAddCombo(combo.text, combo, element as 'title' | 'subtitle')}
                      >
                        {isAdded && <CheckCircle className="h-3 w-3 mr-1" />}
                        {combo.text}

                        {/* Priority Score Indicator */}
                        {combo.priorityScore !== undefined && (
                          <span className="ml-1 text-[10px] opacity-70 font-mono">
                            {combo.priorityScore}
                          </span>
                        )}

                        {/* Type Indicators */}
                        {isHighValue && <Sparkles className="h-3 w-3 ml-1 text-emerald-400" />}
                        {hasNoise && <AlertCircle className="h-3 w-3 ml-1 text-orange-400" />}
                      </Badge>
                    </div>
                  );
                })}

                {/* Show All / Show Less Toggle */}
                {combosWithDetails.length > 10 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAllCombos(!showAllCombos)}
                    className="text-xs text-zinc-400 hover:text-zinc-300 h-7"
                  >
                    {showAllCombos ? (
                      <>Show Less ↑</>
                    ) : (
                      <>Show All ({combosWithDetails.length - 10} more) ↓</>
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Insights (Passed Rules) */}
          {(() => {
            // Filter out repetitive insights that duplicate information already shown in the card
            let filteredInsights = insights;

            if (element === 'title') {
              // Remove keyword and combo count insights for title (already shown in Keywords/Combos sections)
              filteredInsights = filteredInsights.filter(insight =>
                !insight.match(/\d+\s+(unique\s+)?keyword/i) &&
                !insight.match(/\d+\s+combination/i)
              );
            } else if (element === 'subtitle') {
              // Remove new keyword and combo insights for subtitle (already shown in V2.1 section)
              filteredInsights = filteredInsights.filter(insight =>
                !insight.match(/\d+\s+new\s+keyword/i) &&
                !insight.match(/\d+\s+new\s+combination/i)
              );
            }

            return filteredInsights.length > 0 ? (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm font-medium text-emerald-400">
                    Insights ({filteredInsights.length})
                  </span>
                </div>
                <div className="space-y-2">
                  {filteredInsights.map((insight, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 p-2 bg-emerald-900/10 rounded border border-emerald-400/20"
                    >
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-zinc-300">{insight}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null;
          })()}

          {/* Recommendations (Failed Rules) */}
          {recommendations.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="h-4 w-4 text-orange-400" />
                <span className="text-sm font-medium text-orange-400">
                  Recommendations ({recommendations.length})
                </span>
              </div>
              <div className="space-y-2">
                {recommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 p-2 bg-orange-900/10 rounded border border-orange-400/20"
                  >
                    <AlertCircle className="h-4 w-4 text-orange-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-zinc-300">{rec}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rule Results Table */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-medium text-zinc-300">
                Rule Evaluation ({ruleResults.length} rules)
              </span>
            </div>
            <RuleResultsTable rules={ruleResults} />
          </div>
        </CardContent>
      )}
    </Card>
  );
};
