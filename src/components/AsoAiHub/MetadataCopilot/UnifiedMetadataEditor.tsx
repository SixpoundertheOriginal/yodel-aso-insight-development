import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Save, Sparkles, HelpCircle, Loader2 } from 'lucide-react';
import { FieldWithAI } from './FieldWithAI';
import { DuplicationWarnings } from './DuplicationWarnings';
import { AutoCombinationsPreview } from './AutoCombinationsPreview';
import { MetadataPreview } from './MetadataPreview';
import { useCopilotChat } from '@/hooks/useCopilotChat';
import { metadataEngine } from '@/engines';
import { MetadataField, MetadataScore, ScrapedMetadata } from '@/types/aso';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UnifiedMetadataEditorProps {
  initialData: ScrapedMetadata;
  organizationId: string;
}

export const UnifiedMetadataEditor: React.FC<UnifiedMetadataEditorProps> = ({
  initialData,
  organizationId
}) => {
  const [metadata, setMetadata] = useState<MetadataField>({
    title: initialData.title || '',
    subtitle: initialData.subtitle || '',
    keywords: initialData.keywords || ''
  });

  const [aiSuggestions, setAiSuggestions] = useState<{
    title: string[];
    subtitle: string[];
    keywords: string[];
  }>({ title: [], subtitle: [], keywords: [] });

  const [expandedField, setExpandedField] = useState<keyof MetadataField | null>(null);
  const [isLoadingField, setIsLoadingField] = useState<keyof MetadataField | null>(null);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [score, setScore] = useState<MetadataScore | null>(null);

  const { sendMessage } = useCopilotChat();
  const { toast } = useToast();

  // Update score when metadata changes
  useEffect(() => {
    if (metadata.title || metadata.subtitle || metadata.keywords) {
      const newScore = metadataEngine.calculateMetadataScore(metadata, []);
      setScore(newScore);
    }
  }, [metadata]);

  // Extract keywords already used
  const getUsedKeywords = (): string[] => {
    const extract = (text: string) => {
      if (!text) return [];
      return text
        .toLowerCase()
        .replace(/[^\w\s,]/g, ' ')
        .split(/[\s,]+/)
        .filter(w => w.length > 2);
    };

    return [
      ...extract(metadata.title),
      ...extract(metadata.subtitle),
      ...metadata.keywords.split(',').map(k => k.trim().toLowerCase()).filter(Boolean)
    ];
  };

  // Generate ALL fields with AI
  const handleGenerateAll = async () => {
    setIsGeneratingAll(true);
    setAiSuggestions({ title: [], subtitle: [], keywords: [] });

    const prompt = `Generate optimized App Store metadata following these STRICT rules:

App Name: ${initialData.name}
Description: ${initialData.description?.substring(0, 300)}...
Category: ${initialData.applicationCategory}
Locale: ${initialData.locale}

CRITICAL RULES:
1. TITLE: Exactly 30 characters, format "Brand: Keyword Keyword"
2. SUBTITLE: 29-30 characters, focus on readability + 2 keywords max
3. KEYWORDS: Exactly 100 characters, comma-separated, NO duplicates from title/subtitle

IMPORTANT: App Store auto-combines title + subtitle keywords. Don't waste space!

Example output format:
TITLE: Duolingo: Language Learning
SUBTITLE: Spanish French German Tutor
KEYWORDS: practice,fluent,vocabulary,grammar,pronunciation,lessons,education,study,beginner,advanced

Generate metadata now:`;

    try {
      const response = await sendMessage(prompt, 'unified-metadata-generation');
      if (response) {
        const parsed = parseFullResponse(response);
        if (parsed) {
          setMetadata(parsed);
          toast({
            title: "Metadata Generated!",
            description: "AI has created optimized metadata. Review and edit as needed.",
          });
        }
      }
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Could not generate metadata. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingAll(false);
    }
  };

  // Generate suggestions for a specific field
  const handleGenerateFieldSuggestions = async (field: keyof MetadataField) => {
    setIsLoadingField(field);

    const usedKeywords = getUsedKeywords();
    const otherFields = {
      title: metadata.title,
      subtitle: metadata.subtitle,
      keywords: metadata.keywords
    };

    const prompts = {
      title: `Generate 3 optimized App Store titles following these rules:

App: ${initialData.name}
Category: ${initialData.applicationCategory}

RULES:
- EXACTLY 30 characters each
- Format: "Brand: Keyword Keyword"
- Search-friendly keywords
- Example: "Duolingo: Language Learning" (30 chars)

${metadata.subtitle ? `Current subtitle keywords (don't duplicate): ${metadata.subtitle}` : ''}

Generate 3 alternatives, one per line:`,

      subtitle: `Generate 3 optimized App Store subtitles following these rules:

App: ${initialData.name}
Current title: "${metadata.title}"

RULES:
- 29-30 characters
- Maximum 2 keywords for readability
- Don't duplicate keywords from title

App Store combines title + subtitle for search, so these keywords will create:
${metadata.title ? `"${metadata.title.toLowerCase()}" + your subtitle keywords` : 'combinations'}

Generate 3 alternatives, one per line:`,

      keywords: `Generate 3 optimized keyword sets following these rules:

App: ${initialData.name}
Title: "${metadata.title}"
Subtitle: "${metadata.subtitle}"

RULES:
- EXACTLY 100 characters
- Comma-separated
- NO duplicates from title/subtitle: ${usedKeywords.slice(0, 10).join(', ')}
- App Store auto-combines title+subtitle, so don't add those combinations

Generate 3 alternative keyword sets, one per line:`
    };

    try {
      const response = await sendMessage(prompts[field], `unified-field-${field}`);
      if (response) {
        const suggestions = response
          .split('\n')
          .map(line => line.trim())
          .filter(line => line && !line.toLowerCase().startsWith('here') && !line.includes(':'))
          .slice(0, 3);

        setAiSuggestions(prev => ({
          ...prev,
          [field]: suggestions
        }));

        setExpandedField(field);

        toast({
          title: "Suggestions Ready",
          description: `Generated ${suggestions.length} alternatives for ${field}.`,
        });
      }
    } catch (error) {
      toast({
        title: "Suggestion Failed",
        description: `Could not generate ${field} suggestions.`,
        variant: "destructive"
      });
    } finally {
      setIsLoadingField(null);
    }
  };

  // Handle custom prompt for a field
  const handleCustomPrompt = async (field: keyof MetadataField, prompt: string) => {
    setIsLoadingField(field);

    const fullPrompt = `${prompt}

Current ${field}: "${metadata[field]}"
App: ${initialData.name}

${field === 'title' ? 'Must be EXACTLY 30 characters.' : ''}
${field === 'subtitle' ? 'Should be 29-30 characters.' : ''}
${field === 'keywords' ? 'Should be exactly 100 characters, comma-separated.' : ''}

Generate 2 alternatives based on the request:`;

    try {
      const response = await sendMessage(fullPrompt, `unified-custom-${field}`);
      if (response) {
        const suggestions = response
          .split('\n')
          .map(line => line.trim())
          .filter(line => line && !line.includes(':'))
          .slice(0, 2);

        setAiSuggestions(prev => ({
          ...prev,
          [field]: [...prev[field], ...suggestions].slice(0, 5) // Keep max 5
        }));
      }
    } catch (error) {
      toast({
        title: "Custom Generation Failed",
        variant: "destructive"
      });
    } finally {
      setIsLoadingField(null);
    }
  };

  // Parse AI response for full generation
  const parseFullResponse = (response: string): MetadataField | null => {
    try {
      const titleMatch = response.match(/TITLE:\s*(.+)/i);
      const subtitleMatch = response.match(/SUBTITLE:\s*(.+)/i);
      const keywordsMatch = response.match(/KEYWORDS:\s*(.+)/i);

      if (titleMatch && subtitleMatch && keywordsMatch) {
        return {
          title: titleMatch[1].trim(),
          subtitle: subtitleMatch[1].trim(),
          keywords: keywordsMatch[1].trim()
        };
      }
    } catch (error) {
      console.error('Parse error:', error);
    }
    return null;
  };

  // Handle saving metadata
  const handleSave = async () => {
    const validation = metadataEngine.validateMetadata(metadata);
    if (!validation.isValid) {
      toast({
        title: "Validation Issues",
        description: validation.issues.join(', '),
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('metadata_versions')
        .insert({
          app_id: initialData.appId,
          organization_id: organizationId,
          title: metadata.title,
          subtitle: metadata.subtitle,
          keywords: metadata.keywords,
          platform: 'ios',
          version_number: 1
        });

      if (error) throw error;

      toast({
        title: "Metadata Saved!",
        description: "Your metadata has been saved successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Save Failed",
        description: error.message || "Could not save metadata.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle removing duplicates
  const handleRemoveDuplicate = (field: keyof MetadataField, keyword: string) => {
    if (field === 'keywords') {
      const keywordsList = metadata.keywords.split(',').map(k => k.trim());
      const filtered = keywordsList.filter(k => !k.toLowerCase().includes(keyword.toLowerCase()));
      setMetadata(prev => ({ ...prev, keywords: filtered.join(',') }));
    } else {
      // For title/subtitle, just remove the word
      const words = metadata[field].split(' ');
      const filtered = words.filter(w => w.toLowerCase() !== keyword.toLowerCase());
      setMetadata(prev => ({ ...prev, [field]: filtered.join(' ') }));
    }

    toast({
      title: "Duplicate Removed",
      description: `Removed "${keyword}" from ${field}.`,
    });
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Generate All Button */}
        <Card className="bg-gradient-to-r from-yodel-orange/10 to-purple-900/10 border-yodel-orange/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-yodel-orange" />
                  AI-Powered Generation
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Generate all metadata fields at once with App Store optimization rules built-in
                </p>
              </div>
              <Button
                onClick={handleGenerateAll}
                disabled={isGeneratingAll}
                className="bg-yodel-orange hover:bg-yodel-orange/90"
              >
                {isGeneratingAll ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-2" /> Generate All with AI</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Field Editors */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-foreground">Metadata Editor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Title Field */}
            <FieldWithAI
              label="App Store Title"
              value={metadata.title}
              onChange={(v) => setMetadata(prev => ({ ...prev, title: v }))}
              limit={30}
              suggestions={aiSuggestions.title}
              expanded={expandedField === 'title'}
              onToggleExpand={() => setExpandedField(expandedField === 'title' ? null : 'title')}
              onRequestSuggestions={() => handleGenerateFieldSuggestions('title')}
              onCustomPrompt={(prompt) => handleCustomPrompt('title', prompt)}
              isLoadingSuggestions={isLoadingField === 'title'}
              placeholder="Enter your app title..."
              tooltip={
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-4 h-4 text-zinc-400 hover:text-zinc-300 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs bg-zinc-800 border-zinc-700 p-4">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm text-foreground">App Name Formula</h4>
                      <p className="text-xs text-zinc-300">
                        <strong>Brand</strong> + <strong>Keyword</strong> + <strong>Keyword</strong>
                      </p>
                      <p className="text-xs text-zinc-400">
                        Example: "Duolingo: Language Learning"
                      </p>
                      <div className="bg-green-900/20 border border-green-700 rounded p-2 mt-2">
                        <p className="text-xs font-semibold text-green-400">
                          Target: Exactly 30 characters
                        </p>
                        <p className="text-xs text-zinc-300 mt-1">
                          All characters are indexed by the App Store for search
                        </p>
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              }
            />

            {/* Subtitle Field */}
            <FieldWithAI
              label="Subtitle"
              value={metadata.subtitle}
              onChange={(v) => setMetadata(prev => ({ ...prev, subtitle: v }))}
              limit={30}
              suggestions={aiSuggestions.subtitle}
              expanded={expandedField === 'subtitle'}
              onToggleExpand={() => setExpandedField(expandedField === 'subtitle' ? null : 'subtitle')}
              onRequestSuggestions={() => handleGenerateFieldSuggestions('subtitle')}
              onCustomPrompt={(prompt) => handleCustomPrompt('subtitle', prompt)}
              isLoadingSuggestions={isLoadingField === 'subtitle'}
              placeholder="Enter your subtitle..."
              tooltip={
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-4 h-4 text-zinc-400 hover:text-zinc-300 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs bg-zinc-800 border-zinc-700 p-4">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm text-foreground">Subtitle Strategy</h4>
                      <p className="text-xs text-zinc-300">
                        Focus on <strong>readability</strong> + <strong>2 keywords max</strong>
                      </p>
                      <p className="text-xs text-zinc-400">
                        Example: "Spanish French German Tutor"
                      </p>
                      <div className="bg-blue-900/20 border border-blue-700 rounded p-2 mt-2">
                        <p className="text-xs font-semibold text-blue-400">
                          ✨ App Store Magic
                        </p>
                        <p className="text-xs text-zinc-300 mt-1">
                          The App Store automatically combines title + subtitle keywords!
                        </p>
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              }
            />

            {/* Keywords Field */}
            <FieldWithAI
              label="Keywords"
              value={metadata.keywords}
              onChange={(v) => setMetadata(prev => ({ ...prev, keywords: v }))}
              limit={100}
              suggestions={aiSuggestions.keywords}
              expanded={expandedField === 'keywords'}
              onToggleExpand={() => setExpandedField(expandedField === 'keywords' ? null : 'keywords')}
              onRequestSuggestions={() => handleGenerateFieldSuggestions('keywords')}
              onCustomPrompt={(prompt) => handleCustomPrompt('keywords', prompt)}
              isLoadingSuggestions={isLoadingField === 'keywords'}
              multiline
              placeholder="keyword1,keyword2,keyword3..."
              tooltip={
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-4 h-4 text-zinc-400 hover:text-zinc-300 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs bg-zinc-800 border-zinc-700 p-4">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm text-foreground">Keywords Field Strategy</h4>
                      <p className="text-xs text-zinc-300">
                        Use for <strong>all remaining keywords</strong> not in title or subtitle
                      </p>
                      <div className="bg-yellow-900/20 border border-yellow-700 rounded p-2 mt-2">
                        <p className="text-xs font-semibold text-yellow-400">
                          ⚠️ Avoid Duplicates
                        </p>
                        <p className="text-xs text-zinc-300 mt-1">
                          Don't repeat keywords from title or subtitle!
                        </p>
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              }
            />

            {/* Save Button */}
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {isSaving ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
              ) : (
                <><Save className="w-4 h-4 mr-2" /> Save Metadata</>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Duplication Warnings */}
        <DuplicationWarnings
          metadata={metadata}
          onRemoveDuplicate={handleRemoveDuplicate}
        />

        {/* Auto-Generated Combinations Preview */}
        <AutoCombinationsPreview
          title={metadata.title}
          subtitle={metadata.subtitle}
        />

        {/* Live Preview */}
        {score && (metadata.title || metadata.subtitle || metadata.keywords) && (
          <MetadataPreview
            metadata={metadata}
            score={score}
            appName={initialData.name}
          />
        )}
      </div>
    </TooltipProvider>
  );
};
