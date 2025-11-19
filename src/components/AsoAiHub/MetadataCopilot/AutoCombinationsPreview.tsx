import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AutoCombinationsPreviewProps {
  title: string;
  subtitle: string;
}

// Helper function to extract keywords from text
const extractKeywords = (text: string): string[] => {
  if (!text) return [];

  // Remove common words and split into individual words
  const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with'];

  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .split(/\s+/) // Split on whitespace
    .map(word => word.trim())
    .filter(word => word.length > 2 && !commonWords.includes(word));
};

// Generate combinations of title + subtitle keywords
const generateCombinations = (titleKeywords: string[], subtitleKeywords: string[]): string[] => {
  if (titleKeywords.length === 0 || subtitleKeywords.length === 0) {
    return [];
  }

  const combinations: string[] = [];

  // Title keyword + Subtitle keyword
  titleKeywords.forEach(tk => {
    subtitleKeywords.forEach(sk => {
      if (tk !== sk) {
        combinations.push(`${tk} ${sk}`);
      }
    });
  });

  // Subtitle keyword + Title keyword (different order)
  subtitleKeywords.forEach(sk => {
    titleKeywords.forEach(tk => {
      if (tk !== sk) {
        const combo = `${sk} ${tk}`;
        // Avoid exact duplicates (reverse order already added)
        if (!combinations.includes(combo) && !combinations.includes(`${tk} ${sk}`)) {
          combinations.push(combo);
        }
      }
    });
  });

  // Limit to 10 most meaningful combinations
  return combinations.slice(0, 10);
};

export const AutoCombinationsPreview: React.FC<AutoCombinationsPreviewProps> = ({
  title,
  subtitle
}) => {
  const titleKeywords = extractKeywords(title);
  const subtitleKeywords = extractKeywords(subtitle);
  const combinations = generateCombinations(titleKeywords, subtitleKeywords);

  if (combinations.length === 0) {
    return (
      <Alert className="bg-zinc-900/30 border-zinc-700">
        <Info className="h-4 w-4 text-zinc-400" />
        <AlertDescription className="text-zinc-400 text-xs">
          <strong>App Store Magic:</strong> Fill in your title and subtitle to see auto-generated keyword combinations!
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-purple-700/30">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2 text-base">
          <Sparkles className="w-5 h-5 text-purple-400" />
          App Store Auto-Generated Keywords
        </CardTitle>
        <CardDescription className="text-zinc-300 text-xs">
          The App Store automatically creates these long-tail keywords from your title + subtitle
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Keyword Source Breakdown */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-zinc-900/50 p-2 rounded border border-blue-700/30">
            <p className="text-blue-400 font-medium mb-1">From Title:</p>
            <div className="flex flex-wrap gap-1">
              {titleKeywords.map((kw, idx) => (
                <Badge key={idx} variant="outline" className="text-xs border-blue-700 text-blue-300">
                  {kw}
                </Badge>
              ))}
            </div>
          </div>
          <div className="bg-zinc-900/50 p-2 rounded border border-purple-700/30">
            <p className="text-purple-400 font-medium mb-1">From Subtitle:</p>
            <div className="flex flex-wrap gap-1">
              {subtitleKeywords.map((kw, idx) => (
                <Badge key={idx} variant="outline" className="text-xs border-purple-700 text-purple-300">
                  {kw}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Auto-Generated Combinations */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">
            ✨ Auto-generated combinations:
          </p>
          <div className="flex flex-wrap gap-2">
            {combinations.map((combo, idx) => (
              <Badge
                key={idx}
                variant="secondary"
                className="text-xs bg-purple-900/30 text-purple-200 border-purple-700"
              >
                {combo}
              </Badge>
            ))}
          </div>
        </div>

        {/* Educational Message */}
        <Alert className="bg-purple-900/20 border-purple-700/30">
          <Sparkles className="h-4 w-4 text-purple-400" />
          <AlertDescription className="text-purple-200 text-xs">
            <strong className="text-purple-300">These combinations are FREE!</strong>
            <br />
            App Store creates them automatically - you don't need to add them to your Keywords field.
            This is how you get indexed for "{combinations[0] || 'multi-word phrases'}" without using extra characters.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};
