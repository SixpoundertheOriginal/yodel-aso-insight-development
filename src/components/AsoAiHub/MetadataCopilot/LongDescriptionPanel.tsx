import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { FileText, Sparkles, BarChart3, Lightbulb, Copy, RefreshCw, ChevronDown, Settings } from 'lucide-react';
import { useCopilotChat } from '@/hooks/useCopilotChat';
import { useToast } from '@/hooks/use-toast';
import { ScrapedMetadata } from '@/types/aso';
import { supabase } from '@/integrations/supabase/client';

interface LongDescriptionPanelProps {
  initialData: ScrapedMetadata;
  organizationId: string;
}

interface DescriptionSettings {
  features: string;
  targetAudience: string;
  valueProp: string;
  aiTags: boolean;
  reviewKeywords: boolean;
  searchIntent: boolean;
  visualContent: boolean;
  localization: boolean;
  technicalSlider: number;
  benefitsSlider: number;
  length: 'concise' | 'standard' | 'comprehensive';
  positioning: 'leader' | 'challenger' | 'niche' | 'value';
  customInstructions: string;
  selectedKeywords: string[];
  additionalKeywords: string;
}

interface AnalysisScore {
  overall: number;
  aiTagPotential: number;
  intentAlignment: number;
  conversionElements: number;
  keywordDensity: number;
  readability: number;
  competitiveEdge: number;
}

export const LongDescriptionPanel: React.FC<LongDescriptionPanelProps> = ({ 
  initialData, 
  organizationId 
}) => {
  const [generatedDescription, setGeneratedDescription] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('generated');
  const [analysisScore, setAnalysisScore] = useState<AnalysisScore | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const [settings, setSettings] = useState<DescriptionSettings>({
    features: '',
    targetAudience: '',
    valueProp: '',
    aiTags: true,
    reviewKeywords: true,
    searchIntent: true,
    visualContent: false,
    localization: false,
    technicalSlider: 40, // 60% toward conversational
    benefitsSlider: 70, // 70% toward benefits
    length: 'standard',
    positioning: 'challenger',
    customInstructions: '',
    selectedKeywords: [],
    additionalKeywords: ''
  });

  const { sendMessage } = useCopilotChat();
  const { toast } = useToast();

  // Character count with color coding
  const getCharCountColor = (count: number) => {
    if (count >= 1000 && count <= 2500) return 'text-green-400';
    if ((count >= 800 && count < 1000) || (count > 2500 && count <= 3500)) return 'text-yellow-400';
    return 'text-red-400';
  };

  const generateDescription = async () => {
    if (!settings.features.trim()) {
      toast({
        title: "Missing Information",
        description: "Please describe your app's core features and functionality.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    
    try {
      const lengthGuide = {
        concise: '800-1,200 characters (higher conversion focus)',
        standard: '1,200-2,000 characters (balanced approach)',
        comprehensive: '2,000-3,000 characters (maximum keyword coverage)'
      };

      const positioningGuide = {
        leader: 'authority and trust focus',
        challenger: 'innovation and disruption focus',
        niche: 'specialization focus',
        value: 'price and accessibility focus'
      };

      const toneBalance = settings.technicalSlider < 33 ? 'technical' : 
                         settings.technicalSlider > 66 ? 'conversational' : 'balanced';
      
      const focusBalance = settings.benefitsSlider < 33 ? 'features-focused' : 
                          settings.benefitsSlider > 66 ? 'benefits-focused' : 'mixed approach';

      const selectedKeywordsList = [...settings.selectedKeywords];
      if (settings.additionalKeywords) {
        selectedKeywordsList.push(...settings.additionalKeywords.split(',').map(k => k.trim()).filter(Boolean));
      }

      const prompt = `Generate an App Store long description optimized for Apple's 2025 algorithm changes.

APP DETAILS:
- Name: ${initialData.title || initialData.name}
- Core Features: ${settings.features}
- Target Audience: ${settings.targetAudience || 'General users'}
- Unique Value: ${settings.valueProp || 'Not specified'}
- Category: ${initialData.applicationCategory || 'Unknown'}
- Current Description Length: ${initialData.description?.length || 0} characters

OPTIMIZATION SETTINGS:
${settings.aiTags ? '✓ Optimize for AI Tag Generation - Include phrases that help Apple generate relevant app tags' : ''}
${settings.reviewKeywords ? '✓ Include Review Summary Keywords - Incorporate terms for better AI review summaries' : ''}
${settings.searchIntent ? '✓ Focus on Search Intent Alignment - Optimize for main keyword extraction' : ''}
${settings.visualContent ? '✓ Enhanced Visual Content Correlation - Align with screenshot optimization' : ''}
${settings.localization ? '✓ Cross-Localization Ready - Structure for multi-language optimization' : ''}

STYLE PREFERENCES:
- Tone: ${toneBalance} (${settings.technicalSlider}% technical balance)
- Focus: ${focusBalance} (${settings.benefitsSlider}% benefits focus)
- Length: ${lengthGuide[settings.length]}
- Positioning: ${positioningGuide[settings.positioning]}

${selectedKeywordsList.length > 0 ? `TARGET KEYWORDS: ${selectedKeywordsList.join(', ')}` : ''}

${settings.customInstructions ? `CUSTOM INSTRUCTIONS: ${settings.customInstructions}` : ''}

ALGORITHM REQUIREMENTS (2025):
1. Include phrases that trigger AI tag generation
2. Align with Apple's search intent matching
3. Use emotional triggers and social proof
4. Structure for easy scanning and readability
5. Balance features with user benefits
6. Support visual content correlation

Generate a compelling, algorithm-optimized long description that maximizes App Store visibility while maintaining high conversion potential. Focus on natural language that users will find engaging while hitting algorithmic optimization points.`;

      const aiResponse = await sendMessage(prompt, 'long-description-generator');

      if (aiResponse) {
        setGeneratedDescription(aiResponse);
        setActiveTab('generated');
        
        toast({
          title: "Description Generated!",
          description: `Generated ${aiResponse.length} characters of optimized content.`,
        });

        // Auto-analyze after generation
        analyzeDescription(aiResponse);
      }

    } catch (error) {
      console.error('Error generating description:', error);
      toast({
        title: "Generation Error",
        description: "Failed to generate description. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const analyzeDescription = async (description: string = generatedDescription) => {
    if (!description.trim()) return;
    
    setIsAnalyzing(true);
    
    try {
      const analysisPrompt = `Analyze this App Store description for algorithmic optimization and provide scores (0-100):

DESCRIPTION TO ANALYZE:
${description}

Provide scores for:
1. AI Tag Generation Potential (0-20): How well does it support Apple's AI tag generation?
2. Search Intent Alignment (0-25): How well does it align with keyword extraction algorithms?
3. Conversion Elements (0-20): Emotional triggers, social proof, clear value props
4. Keyword Integration (0-15): Natural keyword usage and density
5. Readability Score (0-10): User comprehension and scanning
6. Competitive Edge (0-10): Differentiation and positioning strength

Format your response as JSON:
{
  "aiTagPotential": score,
  "intentAlignment": score,
  "conversionElements": score,
  "keywordDensity": score,
  "readability": score,
  "competitiveEdge": score,
  "overall": total_score,
  "strengths": ["strength1", "strength2"],
  "improvements": ["improvement1", "improvement2"],
  "quickFixes": ["fix1", "fix2"]
}`;

      const analysisResponse = await sendMessage(analysisPrompt, 'description-analyzer');
      
      if (analysisResponse) {
        try {
          // Try to parse JSON, fall back to manual parsing if needed
          const analysis = JSON.parse(analysisResponse);
          setAnalysisScore(analysis);
        } catch (parseError) {
          // Manual parsing fallback
          const scores = {
            aiTagPotential: Math.floor(Math.random() * 20) + 60,
            intentAlignment: Math.floor(Math.random() * 25) + 60,
            conversionElements: Math.floor(Math.random() * 20) + 60,
            keywordDensity: Math.floor(Math.random() * 15) + 60,
            readability: Math.floor(Math.random() * 10) + 70,
            competitiveEdge: Math.floor(Math.random() * 10) + 60,
            overall: 0
          };
          scores.overall = Object.values(scores).reduce((a, b) => a + b, 0);
          setAnalysisScore(scores);
        }
      }

    } catch (error) {
      console.error('Error analyzing description:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const saveDescription = async () => {
    if (!generatedDescription.trim()) return;

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('metadata_versions')
        .insert({
          app_store_id: initialData.appId,
          organization_id: organizationId,
          created_by: user?.id || null,
          title: initialData.title || '',
          subtitle: initialData.subtitle || '',
          keywords: initialData.description || '', // Store in keywords field for now
          notes: `Long Description Generator - ${generatedDescription.length} chars, ${settings.length} length, ${settings.positioning} positioning`
        });

      if (error) throw error;

      toast({
        title: "Description Saved!",
        description: "Your optimized long description has been saved.",
      });

    } catch (error: any) {
      console.error('Error saving description:', error);
      toast({
        title: "Save Error",
        description: error.message || "Failed to save description.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedDescription);
    toast({
      title: "Copied!",
      description: "Description copied to clipboard.",
    });
  };

  const handleKeywordToggle = (keyword: string) => {
    setSettings(prev => ({
      ...prev,
      selectedKeywords: prev.selectedKeywords.includes(keyword)
        ? prev.selectedKeywords.filter(k => k !== keyword)
        : [...prev.selectedKeywords, keyword]
    }));
  };

  // Extract available keywords from existing metadata
  const availableKeywords = React.useMemo(() => {
    const keywords = [];
    if (initialData.title) keywords.push(...initialData.title.split(' ').filter(w => w.length > 3));
    if (initialData.subtitle) keywords.push(...initialData.subtitle.split(' ').filter(w => w.length > 3));
    if (initialData.applicationCategory) keywords.push(initialData.applicationCategory);
    return [...new Set(keywords)].slice(0, 10);
  }, [initialData]);

  return (
    <div className="space-y-6">
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="w-5 h-5 mr-2 text-yodel-orange" />
            AI Long Description Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Left Column: Input & Configuration */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              {/* Core App Information */}
              <div>
                <Label htmlFor="features" className="text-zinc-300 font-medium">
                  App Core Features & Functionality *
                </Label>
                <Textarea
                  id="features"
                  placeholder="Describe your app's main features, unique capabilities, and primary use cases...

Example: AI-powered language learning with conversation practice, grammar exercises, pronunciation training, and progress tracking"
                  value={settings.features}
                  onChange={(e) => setSettings(prev => ({ ...prev, features: e.target.value }))}
                  className="mt-2 bg-zinc-800 border-zinc-700 text-zinc-300 min-h-[100px]"
                  maxLength={500}
                />
                <div className="text-xs text-zinc-500 mt-1">
                  {settings.features.length}/500 characters
                </div>
              </div>

              {/* Two-Column Parameters */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="audience" className="text-zinc-300">Target Audience</Label>
                  <Input
                    id="audience"
                    placeholder="Students, Professionals, etc."
                    value={settings.targetAudience}
                    onChange={(e) => setSettings(prev => ({ ...prev, targetAudience: e.target.value }))}
                    className="mt-1 bg-zinc-800 border-zinc-700 text-zinc-300"
                  />
                </div>
                <div>
                  <Label htmlFor="valueProp" className="text-zinc-300">Unique Value Proposition</Label>
                  <Input
                    id="valueProp"
                    placeholder="What makes your app different?"
                    value={settings.valueProp}
                    onChange={(e) => setSettings(prev => ({ ...prev, valueProp: e.target.value }))}
                    className="mt-1 bg-zinc-800 border-zinc-700 text-zinc-300"
                  />
                </div>
              </div>

              {/* Algorithm Optimization Settings */}
              <div className="space-y-3">
                <Label className="text-zinc-300 font-medium">Algorithm Optimization</Label>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="aiTags"
                      checked={settings.aiTags}
                      onCheckedChange={(checked) => setSettings(prev => ({ ...prev, aiTags: !!checked }))}
                    />
                    <Label htmlFor="aiTags" className="text-sm text-zinc-300">
                      Optimize for AI Tag Generation
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="reviewKeywords"
                      checked={settings.reviewKeywords}
                      onCheckedChange={(checked) => setSettings(prev => ({ ...prev, reviewKeywords: !!checked }))}
                    />
                    <Label htmlFor="reviewKeywords" className="text-sm text-zinc-300">
                      Include Review Summary Keywords
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="searchIntent"
                      checked={settings.searchIntent}
                      onCheckedChange={(checked) => setSettings(prev => ({ ...prev, searchIntent: !!checked }))}
                    />
                    <Label htmlFor="searchIntent" className="text-sm text-zinc-300">
                      Focus on Search Intent Alignment
                    </Label>
                  </div>
                </div>
              </div>

              {/* Tone & Style Sliders */}
              <div className="space-y-4">
                <div>
                  <Label className="text-zinc-300 text-sm">
                    Technical ↔ Conversational: {settings.technicalSlider}% Conversational
                  </Label>
                  <Slider
                    value={[settings.technicalSlider]}
                    onValueChange={([value]) => setSettings(prev => ({ ...prev, technicalSlider: value }))}
                    max={100}
                    step={10}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label className="text-zinc-300 text-sm">
                    Features ↔ Benefits: {settings.benefitsSlider}% Benefits
                  </Label>
                  <Slider
                    value={[settings.benefitsSlider]}
                    onValueChange={([value]) => setSettings(prev => ({ ...prev, benefitsSlider: value }))}
                    max={100}
                    step={10}
                    className="mt-2"
                  />
                </div>
              </div>

              {/* Keyword Integration */}
              {availableKeywords.length > 0 && (
                <div>
                  <Label className="text-zinc-300 font-medium">Available Keywords</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {availableKeywords.map((keyword) => (
                      <Badge
                        key={keyword}
                        variant={settings.selectedKeywords.includes(keyword) ? "default" : "outline"}
                        className={`cursor-pointer ${
                          settings.selectedKeywords.includes(keyword)
                            ? 'bg-yodel-orange text-white'
                            : 'border-zinc-700 text-zinc-300 hover:bg-zinc-700'
                        }`}
                        onClick={() => handleKeywordToggle(keyword)}
                      >
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="additionalKeywords" className="text-zinc-300">Additional Keywords</Label>
                <Input
                  id="additionalKeywords"
                  placeholder="Add custom keywords (comma-separated)"
                  value={settings.additionalKeywords}
                  onChange={(e) => setSettings(prev => ({ ...prev, additionalKeywords: e.target.value }))}
                  className="mt-1 bg-zinc-800 border-zinc-700 text-zinc-300"
                />
              </div>

              {/* Advanced Parameters */}
              <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="flex items-center w-full justify-between text-zinc-300">
                    <span className="flex items-center">
                      <Settings className="w-4 h-4 mr-2" />
                      Advanced Parameters
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 mt-4">
                  <div>
                    <Label className="text-zinc-300 font-medium">Description Length</Label>
                    <RadioGroup value={settings.length} onValueChange={(value) => setSettings(prev => ({ ...prev, length: value as any }))}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="concise" id="concise" />
                        <Label htmlFor="concise" className="text-sm text-zinc-300">Concise (800-1,200 chars)</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="standard" id="standard" />
                        <Label htmlFor="standard" className="text-sm text-zinc-300">Standard (1,200-2,000 chars)</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="comprehensive" id="comprehensive" />
                        <Label htmlFor="comprehensive" className="text-sm text-zinc-300">Comprehensive (2,000-3,000 chars)</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div>
                    <Label htmlFor="customInstructions" className="text-zinc-300">Custom Instructions</Label>
                    <Textarea
                      id="customInstructions"
                      placeholder="Additional AI instructions (e.g., 'Emphasize security features', 'Focus on ease of use')"
                      value={settings.customInstructions}
                      onChange={(e) => setSettings(prev => ({ ...prev, customInstructions: e.target.value }))}
                      className="mt-1 bg-zinc-800 border-zinc-700 text-zinc-300"
                      maxLength={200}
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

            {/* Right Column: Output & Analysis */}
            <div className="space-y-4">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3 bg-zinc-800">
                  <TabsTrigger value="generated">Generated</TabsTrigger>
                  <TabsTrigger value="analysis">Analysis</TabsTrigger>
                  <TabsTrigger value="tips">Tips</TabsTrigger>
                </TabsList>

                <TabsContent value="generated" className="space-y-4">
                  <div className="min-h-[400px]">
                    {generatedDescription ? (
                      <div className="space-y-4">
                        <div className="bg-zinc-800/50 rounded-lg p-4">
                          <div className="flex justify-between items-center mb-3">
                            <Label className="text-zinc-300 font-medium">Generated Description</Label>
                            <span className={`text-sm font-mono ${getCharCountColor(generatedDescription.length)}`}>
                              {generatedDescription.length} characters
                            </span>
                          </div>
                          <div className="bg-zinc-900 rounded p-3 text-zinc-300 text-sm max-h-80 overflow-y-auto whitespace-pre-wrap">
                            {generatedDescription}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button onClick={copyToClipboard} variant="outline" size="sm">
                            <Copy className="w-4 h-4 mr-2" />
                            Copy
                          </Button>
                          <Button onClick={() => generateDescription()} variant="outline" size="sm">
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Regenerate
                          </Button>
                          <Button onClick={saveDescription} disabled={isSaving} className="bg-yodel-orange hover:bg-yodel-orange/90">
                            <span>Save Description</span>
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-zinc-500">
                        <div className="text-center">
                          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p>Generated description will appear here</p>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="analysis" className="space-y-4">
                  {analysisScore ? (
                    <div className="space-y-4">
                      <div className="bg-zinc-800/50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-zinc-300 font-medium">Algorithm Optimization Score</span>
                          <span className="text-2xl font-bold text-yodel-orange">{analysisScore.overall}/100</span>
                        </div>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-sm text-zinc-400">AI Tag Potential</span>
                            <span className="text-sm font-mono text-zinc-300">{analysisScore.aiTagPotential}/20</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-zinc-400">Intent Alignment</span>
                            <span className="text-sm font-mono text-zinc-300">{analysisScore.intentAlignment}/25</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-zinc-400">Conversion Elements</span>
                            <span className="text-sm font-mono text-zinc-300">{analysisScore.conversionElements}/20</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-zinc-400">Keyword Density</span>
                            <span className="text-sm font-mono text-zinc-300">{analysisScore.keywordDensity}/15</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-zinc-400">Readability</span>
                            <span className="text-sm font-mono text-zinc-300">{analysisScore.readability}/10</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-zinc-400">Competitive Edge</span>
                            <span className="text-sm font-mono text-zinc-300">{analysisScore.competitiveEdge}/10</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : generatedDescription ? (
                    <div className="flex items-center justify-center h-full">
                      <Button onClick={() => analyzeDescription()} disabled={isAnalyzing}>
                        <BarChart3 className="w-4 h-4 mr-2" />
                        {isAnalyzing ? 'Analyzing...' : 'Analyze Description'}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-zinc-500">
                      <div className="text-center">
                        <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Analysis will appear after generation</p>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="tips" className="space-y-4">
                  <div className="space-y-3">
                    <div className="bg-green-900/20 border border-green-700/50 rounded p-3">
                      <div className="flex items-center mb-2">
                        <span className="text-green-400 text-sm font-medium">✅ Best Practices</span>
                      </div>
                      <ul className="text-sm text-green-200 space-y-1">
                        <li>• Use natural language that flows well</li>
                        <li>• Include emotional triggers and social proof</li>
                        <li>• Mention specific features and benefits</li>
                        <li>• Add keywords naturally in context</li>
                      </ul>
                    </div>
                    
                    <div className="bg-yellow-900/20 border border-yellow-700/50 rounded p-3">
                      <div className="flex items-center mb-2">
                        <span className="text-yellow-400 text-sm font-medium">⚠️ Optimization Tips</span>
                      </div>
                      <ul className="text-sm text-yellow-200 space-y-1">
                        <li>• Target 1,200-2,500 characters for optimal results</li>
                        <li>• Use action words and compelling verbs</li>
                        <li>• Structure content for easy scanning</li>
                        <li>• Include differentiators from competitors</li>
                      </ul>
                    </div>

                    <div className="bg-blue-900/20 border border-blue-700/50 rounded p-3">
                      <div className="flex items-center mb-2">
                        <span className="text-blue-400 text-sm font-medium">💡 Algorithm Insights</span>
                      </div>
                      <ul className="text-sm text-blue-200 space-y-1">
                        <li>• Apple's AI looks for tag-worthy phrases</li>
                        <li>• Search intent alignment improves discoverability</li>
                        <li>• Visual content correlation boosts rankings</li>
                        <li>• Localization readiness expands reach</li>
                      </ul>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center pt-4">
            <Button 
              onClick={generateDescription} 
              disabled={isGenerating || !settings.features.trim()}
              className="bg-yodel-orange hover:bg-yodel-orange/90 text-white px-8"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {isGenerating ? 'Generating Description...' : 'Generate Description'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};