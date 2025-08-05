import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, Target, Zap, Users, AlertTriangle, Wand2, Shuffle } from 'lucide-react';
import { TitleAnalysis } from '@/services/app-element-analysis.service';
import { toast } from 'sonner';

interface TitleAnalysisCardProps {
  analysis: TitleAnalysis;
  title: string;
}

export const TitleAnalysisCard: React.FC<TitleAnalysisCardProps> = ({
  analysis,
  title
}) => {
  const [generatedVariants, setGeneratedVariants] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showVariants, setShowVariants] = useState(false);
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    if (score >= 60) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    return 'bg-red-500/20 text-red-400 border-red-500/30';
  };

  const getCharacterUsageColor = () => {
    const percentage = (analysis.characterUsage / analysis.maxCharacters) * 100;
    if (percentage > 100) return 'text-red-400';
    if (percentage > 90) return 'text-yellow-400';
    if (percentage > 70) return 'text-emerald-400';
    return 'text-blue-400';
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-foreground">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-green-400" />
            <span>App Title Analysis</span>
          </div>
          <Badge className={getScoreBadgeColor(analysis.score)}>
            {analysis.score}/100
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Title Display */}
        <div className="p-3 bg-zinc-800/50 rounded-lg">
          <div className="text-sm text-zinc-400 mb-1">Current Title</div>
          <div className="text-lg font-semibold text-foreground">{title}</div>
          <div className="text-xs text-zinc-500 mt-1">
            <span className={getCharacterUsageColor()}>
              {analysis.characterUsage}/{analysis.maxCharacters} characters
            </span>
            <span className="ml-2 text-zinc-600">
              ({Math.round((analysis.characterUsage / analysis.maxCharacters) * 100)}% used)
            </span>
          </div>
        </div>

        {/* ✅ Truncation Alert Bar */}
        {analysis.characterUsage > 30 && (
          <Alert className="bg-red-500/10 border-red-500/30 text-red-300">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              ⚠️ Title will be truncated in search results. Showing as: "{title.substring(0, 30)}..."
            </AlertDescription>
          </Alert>
        )}

        {/* ✅ System 1 Tag & Audit Summary TL;DR */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3 bg-zinc-800/30 rounded-lg border-l-2 border-purple-400">
            <div className="text-xs text-purple-400 font-medium mb-1">🧠 System 1 Assessment</div>
            <div className="text-sm text-zinc-300">
              {analysis.score >= 70 
                ? "✓ Aligned with fast-scroll decision making" 
                : "⚠ May not resonate with quick browsing patterns"}
            </div>
          </div>
          <div className="p-3 bg-zinc-800/30 rounded-lg border-l-2 border-orange-400">
            <div className="text-xs text-orange-400 font-medium mb-1">💡 TL;DR Summary</div>
            <div className="text-sm text-zinc-300">
              {analysis.score < 50 
                ? "Title overloaded with low-value terms"
                : analysis.score < 70 
                ? "Good foundation, needs keyword optimization"
                : "Strong title with effective keyword placement"}
            </div>
          </div>
        </div>

        {/* ✅ Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={async () => {
              setIsGenerating(true);
              try {
                // Mock API call - in real implementation, call GPT
                await new Promise(resolve => setTimeout(resolve, 1000));
                const optimizedTitle = title.length > 30 
                  ? title.substring(0, 27) + "..." 
                  : title + " App";
                setGeneratedVariants([optimizedTitle]);
                toast.success("Optimized title generated!");
              } catch (error) {
                toast.error("Failed to optimize title");
              } finally {
                setIsGenerating(false);
              }
            }}
            disabled={isGenerating}
            variant="outline"
            size="sm"
            className="text-green-400 border-green-400/30 hover:bg-green-400/10"
          >
            <Wand2 className="h-4 w-4 mr-2" />
            {isGenerating ? "Fixing..." : "🎯 Fix This Title"}
          </Button>
          
          <Button
            onClick={async () => {
              setIsGenerating(true);
              try {
                // Mock API call - in real implementation, call GPT
                await new Promise(resolve => setTimeout(resolve, 1500));
                const variants = [
                  title.replace(/\s+/g, ' ').trim() + " - Discovery Focus",
                  title.split(' ').slice(0, 3).join(' ') + " Pro",
                  title.split(' ').reverse().slice(0, 3).reverse().join(' ')
                ];
                setGeneratedVariants(variants);
                setShowVariants(true);
                toast.success("3 variants generated!");
              } catch (error) {
                toast.error("Failed to generate variants");
              } finally {
                setIsGenerating(false);
              }
            }}
            disabled={isGenerating}
            variant="outline"
            size="sm"
            className="text-blue-400 border-blue-400/30 hover:bg-blue-400/10"
          >
            <Shuffle className="h-4 w-4 mr-2" />
            {isGenerating ? "Generating..." : "🔀 Generate Variants"}
          </Button>
        </div>

        {/* Generated Variants Display */}
        {showVariants && generatedVariants.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-zinc-300">Generated Variants:</div>
            {generatedVariants.map((variant, index) => (
              <div key={index} className="p-3 bg-zinc-800/40 rounded-lg border border-zinc-700">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-foreground">{variant}</div>
                    <div className="text-xs text-zinc-500 mt-1">
                      {variant.length}/30 characters
                      <Badge className="ml-2 text-xs" variant={
                        index === 0 ? "default" : index === 1 ? "secondary" : "outline"
                      }>
                        {index === 0 ? "Discovery" : index === 1 ? "Conversion" : "Balanced"}
                      </Badge>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => {
                      navigator.clipboard.writeText(variant);
                      toast.success("Copied to clipboard!");
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Character Usage Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">Character Usage</span>
            <span className={`text-sm font-medium ${getCharacterUsageColor()}`}>
              {Math.round((analysis.characterUsage / analysis.maxCharacters) * 100)}%
            </span>
          </div>
          <Progress 
            value={(analysis.characterUsage / analysis.maxCharacters) * 100} 
            className="h-2"
          />
        </div>

        {/* Core Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Keyword Density</span>
              <span className={`text-sm font-medium ${getScoreColor(analysis.keywordDensity)}`}>
                {analysis.keywordDensity}%
              </span>
            </div>
            <Progress value={analysis.keywordDensity} className="h-2" />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Relevance</span>
              <span className={`text-sm font-medium ${getScoreColor(analysis.relevanceScore)}`}>
                {analysis.relevanceScore}%
              </span>
            </div>
            <Progress value={analysis.relevanceScore} className="h-2" />
          </div>
        </div>

        {/* Keywords */}
        {analysis.keywords.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-zinc-400" />
              <span className="text-sm text-zinc-400">Keywords Found</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {analysis.keywords.map((keyword, index) => (
                <Badge key={index} variant="outline" className="text-xs text-zinc-300 border-zinc-600">
                  {keyword}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* A/B Test Suggestions */}
        {analysis.abTestSuggestions.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-zinc-400" />
              <span className="text-sm text-zinc-400">A/B Test Ideas</span>
            </div>
            <div className="space-y-1">
              {analysis.abTestSuggestions.map((suggestion, index) => (
                <div key={index} className="text-sm text-zinc-300 flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full mt-2 flex-shrink-0" />
                  {suggestion}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Competitor Comparison */}
        {analysis.competitorComparison && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-zinc-400" />
              <span className="text-sm text-zinc-400">vs Competitors</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center p-2 bg-emerald-500/10 rounded">
                <div className="text-emerald-400 font-medium">
                  {analysis.competitorComparison.better}%
                </div>
                <div className="text-zinc-500">Better</div>
              </div>
              <div className="text-center p-2 bg-yellow-500/10 rounded">
                <div className="text-yellow-400 font-medium">
                  {analysis.competitorComparison.similar}%
                </div>
                <div className="text-zinc-500">Similar</div>
              </div>
              <div className="text-center p-2 bg-red-500/10 rounded">
                <div className="text-red-400 font-medium">
                  {analysis.competitorComparison.worse}%
                </div>
                <div className="text-zinc-500">Worse</div>
              </div>
            </div>
          </div>
        )}

        {/* Recommendations */}
        <div>
          <div className="text-sm font-medium text-zinc-300 mb-2">Recommendations</div>
          <div className="space-y-2">
            {analysis.recommendations.map((rec, index) => (
              <div key={index} className="text-sm text-zinc-400 p-2 bg-zinc-800/30 rounded border-l-2 border-green-400">
                {rec}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};