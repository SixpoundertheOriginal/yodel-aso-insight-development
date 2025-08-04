import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Palette, Search, Image, Loader2, AlertCircle, Brain } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CreativeAnalysisService, type AppInfo, type CreativeAnalysisResult, type CreativeAnalysisWithAI } from '@/services/creative-analysis.service';
import { ScreenshotGallery } from './ScreenshotGallery';
import { AppComparisonCard } from './AppComparisonCard';
import { CreativeAnalysisResults } from './CreativeAnalysisResults';

export const CreativeAnalysisHub: React.FC = () => {
  const [keyword, setKeyword] = useState('fitness');
  const [results, setResults] = useState<CreativeAnalysisResult | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<CreativeAnalysisWithAI | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [searchType, setSearchType] = useState<'keyword' | 'appid'>('keyword');
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!keyword.trim()) return;

    setLoading(true);
    setAiAnalysis(null);
    setCurrentSessionId(null);
    
    try {
      const result = searchType === 'keyword' 
        ? await CreativeAnalysisService.analyzeCreativesByKeyword(keyword)
        : await CreativeAnalysisService.analyzeCreativesByAppId(keyword);
      
      setResults(result);
      
      // Create a new session if search was successful
      if (result.success && result.apps.length > 0) {
        try {
          const sessionId = await CreativeAnalysisService.createAnalysisSession(
            keyword.trim(),
            searchType,
            result.apps.length
          );
          setCurrentSessionId(sessionId);
        } catch (sessionError) {
          console.error('Failed to create session:', sessionError);
          // Don't fail the search if session creation fails
        }
      }
    } catch (error) {
      console.error('Search error:', error);
      setResults({
        success: false,
        apps: [],
        totalResults: 0,
        keyword: keyword.trim(),
        error: 'Failed to analyze creatives'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleAnalyzeWithAI = async (app?: AppInfo) => {
    if (!results?.apps) return;
    
    setAiLoading(true);
    setAiAnalysis(null);
    setAiError(null);
    
    try {
      const appsToAnalyze = app ? [app] : results.apps;
      const analysis = await CreativeAnalysisService.analyzeCreativesWithAI(
        appsToAnalyze, 
        keyword, 
        currentSessionId || undefined
      );
      setAiAnalysis(analysis);
    } catch (error) {
      console.error('AI analysis failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to analyze screenshots with AI';
      setAiError(errorMessage);
    } finally {
      setAiLoading(false);
    }
  };

  const handleRetryAnalysis = () => {
    if (results?.apps) {
      handleAnalyzeWithAI();
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-foreground">
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 shadow-lg">
              <Palette className="h-6 w-6 text-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Creative Analysis</h1>
              <p className="text-zinc-400">Analyze app store creatives and visual strategies</p>
            </div>
          </div>
        </div>

        {/* Search Interface */}
        <Card className="bg-zinc-900 border-zinc-800 mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Search className="h-5 w-5" />
              Creative Search
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2 mb-4">
              <Button
                variant={searchType === 'keyword' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSearchType('keyword')}
                className="text-xs"
              >
                Keyword Search
              </Button>
              <Button
                variant={searchType === 'appid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSearchType('appid')}
                className="text-xs"
              >
                App ID Lookup
              </Button>
            </div>
            
            <div className="flex gap-3">
              <Input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1 bg-zinc-800 border-zinc-700 text-foreground placeholder-zinc-400"
                placeholder={searchType === 'keyword' ? 'Enter keyword (e.g., fitness, gaming)' : 'Enter App Store ID'}
              />
              <Button
                onClick={handleSearch}
                disabled={loading || !keyword.trim()}
                className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-foreground border-0"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Analyze
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Error Display */}
        {results?.error && (
          <Alert className="mb-8 bg-red-950 border-red-800">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-200">
              {results.error}
            </AlertDescription>
          </Alert>
        )}

        {/* Results Display */}
        {results?.success && (
          <div className="space-y-8">
            {/* Results Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-bold text-foreground">Analysis Results</h2>
                <Badge variant="secondary" className="bg-zinc-800 text-zinc-200">
                  {results.totalResults} {results.totalResults === 1 ? 'app' : 'apps'} found
                </Badge>
              </div>
              <div className="text-sm text-zinc-400">
                Search: "{results.keyword}"
              </div>
            </div>

            {/* App Results */}
            {results.apps.length > 0 ? (
              <div className="space-y-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-zinc-100">
              Analysis Results
            </h3>
            {results.apps.some(app => app.screenshots.length > 0) && (
              <Button
                onClick={() => handleAnalyzeWithAI()}
                disabled={aiLoading}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {aiLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing All...
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4 mr-2" />
                    Analyze All with AI
                  </>
                )}
              </Button>
            )}
          </div>

          {results.apps.map((app, index) => (
            <AppComparisonCard 
              key={app.appId} 
              app={app} 
              rank={index + 1}
              onAnalyzeWithAI={handleAnalyzeWithAI}
              isAnalyzing={aiLoading}
            />
          ))}

          {/* AI Analysis Error */}
          {aiError && (
            <Card className="border-red-800 bg-red-900/20 mt-8">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-red-400 mb-2">AI Analysis Failed</h3>
                    <p className="text-red-300">{aiError}</p>
                  </div>
                  <Button 
                    onClick={handleRetryAnalysis}
                    variant="outline"
                    className="border-red-600 text-red-400 hover:bg-red-900/30"
                  >
                    Retry Analysis
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* AI Analysis Results */}
          {aiAnalysis && (
            <div className="mt-8">
              <CreativeAnalysisResults 
                analysis={aiAnalysis} 
                keyword={keyword}
              />
            </div>
          )}
              </div>
            ) : (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="py-12 text-center">
                  <Image className="h-12 w-12 mx-auto mb-4 text-zinc-500" />
                  <p className="text-zinc-400">No apps found for the search term.</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Empty State */}
        {!results && !loading && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="py-12 text-center">
              <Palette className="h-16 w-16 mx-auto mb-6 text-zinc-500" />
              <h3 className="text-xl font-semibold text-foreground mb-2">Ready to Analyze Creatives</h3>
              <p className="text-zinc-400 mb-6">
                Enter a keyword or App Store ID to start analyzing app store creatives and visual strategies.
              </p>
              <div className="max-w-md mx-auto space-y-2 text-sm text-zinc-500">
                <p>• Analyze top-ranking apps' visual designs</p>
                <p>• Compare screenshot strategies</p>
                <p>• Identify creative trends and patterns</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};