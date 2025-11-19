import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, Sparkles, AlertTriangle, CheckCircle } from 'lucide-react';

export const MetadataOptimizationHints: React.FC = () => {
  return (
    <Card className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border-blue-700/30">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2 text-lg">
          <Lightbulb className="w-5 h-5 text-yellow-400" />
          App Store Optimization Rules
        </CardTitle>
        <CardDescription className="text-zinc-300">
          Follow these rules to maximize your app's visibility in search results
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Rule 1: Character Targets */}
        <Alert className="bg-zinc-900/50 border-green-700/30">
          <CheckCircle className="h-4 w-4 text-green-400" />
          <AlertTitle className="text-green-400 text-sm">Character Targets</AlertTitle>
          <AlertDescription className="text-zinc-300 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span>App Title:</span>
              <Badge variant="outline" className="text-green-400 border-green-700">Exactly 30 chars</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Subtitle:</span>
              <Badge variant="outline" className="text-green-400 border-green-700">29-30 chars</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Keywords:</span>
              <Badge variant="outline" className="text-green-400 border-green-700">Exactly 100 chars</Badge>
            </div>
            <p className="text-zinc-400 mt-2">
              💡 Every character is indexed - maximize all fields!
            </p>
          </AlertDescription>
        </Alert>

        {/* Rule 2: App Name Formula */}
        <Alert className="bg-zinc-900/50 border-blue-700/30">
          <Sparkles className="h-4 w-4 text-blue-400" />
          <AlertTitle className="text-blue-400 text-sm">App Name Formula</AlertTitle>
          <AlertDescription className="text-zinc-300 text-xs space-y-2">
            <p className="font-mono text-zinc-200">
              Brand + Keyword + Keyword
            </p>
            <div className="bg-zinc-800/50 p-2 rounded border border-zinc-700">
              <p className="text-zinc-400 mb-1">Example:</p>
              <p className="text-foreground">"Duolingo: Language Learning"</p>
              <div className="flex gap-2 mt-2 flex-wrap">
                <Badge variant="secondary" className="text-xs">Brand: Duolingo</Badge>
                <Badge variant="secondary" className="text-xs">KW1: Language</Badge>
                <Badge variant="secondary" className="text-xs">KW2: Learning</Badge>
              </div>
            </div>
          </AlertDescription>
        </Alert>

        {/* Rule 3: Keyword Combinations */}
        <Alert className="bg-zinc-900/50 border-purple-700/30">
          <Sparkles className="h-4 w-4 text-purple-400" />
          <AlertTitle className="text-purple-400 text-sm">App Store Magic: Auto-Generated Keywords</AlertTitle>
          <AlertDescription className="text-zinc-300 text-xs space-y-2">
            <p className="text-zinc-200">
              The App Store <strong>automatically creates long-tail keywords</strong> by combining your title + subtitle!
            </p>
            <div className="bg-zinc-800/50 p-2 rounded border border-zinc-700">
              <p className="text-zinc-400 text-xs mb-1">If you have:</p>
              <p className="text-xs">
                <span className="text-blue-400">Title:</span> "Duolingo: Language Learning"
              </p>
              <p className="text-xs">
                <span className="text-purple-400">Subtitle:</span> "Spanish French German"
              </p>
              <p className="text-zinc-400 text-xs mt-2 mb-1">App Store auto-generates:</p>
              <div className="flex gap-1 flex-wrap">
                <Badge variant="outline" className="text-xs">language learning spanish</Badge>
                <Badge variant="outline" className="text-xs">duolingo french</Badge>
                <Badge variant="outline" className="text-xs">german language learning</Badge>
              </div>
            </div>
            <p className="text-purple-300 font-medium">
              ✨ These combinations are FREE - you get them automatically!
            </p>
          </AlertDescription>
        </Alert>

        {/* Rule 4: No Duplicates */}
        <Alert className="bg-zinc-900/50 border-yellow-700/30">
          <AlertTriangle className="h-4 w-4 text-yellow-400" />
          <AlertTitle className="text-yellow-400 text-sm">Avoid Keyword Duplication</AlertTitle>
          <AlertDescription className="text-zinc-300 text-xs space-y-1">
            <p>Don't repeat the same keyword across title, subtitle, and keywords field.</p>
            <div className="bg-zinc-800/50 p-2 rounded border border-zinc-700 mt-2">
              <p className="text-red-400 text-xs mb-1">❌ Bad:</p>
              <p className="text-xs">Title: "App: Learning"</p>
              <p className="text-xs">Subtitle: "Learning Made Easy"</p>
              <p className="text-xs mb-2">Keywords: "learning,education"</p>
              <p className="text-green-400 text-xs mb-1">✅ Good:</p>
              <p className="text-xs">Title: "App: Learning"</p>
              <p className="text-xs">Subtitle: "Education Made Easy"</p>
              <p className="text-xs">Keywords: "study,tutorial,course"</p>
            </div>
            <p className="text-zinc-400 mt-2">
              💡 Use unique keywords in each field to maximize coverage
            </p>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};
