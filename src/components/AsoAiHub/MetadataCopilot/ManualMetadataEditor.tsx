
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Save, Wand2, HelpCircle } from 'lucide-react';
import { CharacterCounter } from './CharacterCounter';
import { MetadataPreview } from './MetadataPreview';
import { metadataEngine } from '@/engines';
import { MetadataField, MetadataScore } from '@/types/aso';
import { useToast } from '@/hooks/use-toast';

interface ManualMetadataEditorProps {
  initialData?: Partial<MetadataField>;
  onSave: (metadata: MetadataField, score: MetadataScore) => Promise<void>;
  onRequestAiSuggestion: (field: keyof MetadataField, currentValue: string) => void;
  appName: string;
  isSaving?: boolean;
}

export const ManualMetadataEditor: React.FC<ManualMetadataEditorProps> = ({
  initialData = {},
  onSave,
  onRequestAiSuggestion,
  appName,
  isSaving = false
}) => {
  const [metadata, setMetadata] = useState<MetadataField>({
    title: initialData.title || '',
    subtitle: initialData.subtitle || '',
    keywords: initialData.keywords || ''
  });
  
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [score, setScore] = useState<MetadataScore | null>(null);
  const { toast } = useToast();

  // Update score when metadata changes
  useEffect(() => {
    if (metadata.title || metadata.subtitle || metadata.keywords) {
      const newScore = metadataEngine.calculateMetadataScore(metadata, []);
      setScore(newScore);
      
      const validation = metadataEngine.validateMetadata(metadata);
      setValidationErrors(validation.issues);
    }
  }, [metadata]);

  const handleFieldChange = (field: keyof MetadataField, value: string) => {
    setMetadata(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!score || validationErrors.length > 0) {
      toast({
        title: "Validation Issues",
        description: "Please fix validation errors before saving.",
        variant: "destructive"
      });
      return;
    }

    try {
      await onSave(metadata, score);
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Could not save metadata. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getFieldErrors = (field: keyof MetadataField): string[] => {
    return validationErrors.filter(error => 
      error.toLowerCase().includes(field.toLowerCase())
    );
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center space-x-2">
              <span>Manual Metadata Editor</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Title Field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="title" className="text-zinc-300 flex items-center gap-2">
                  App Store Title
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
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onRequestAiSuggestion('title', metadata.title)}
                  className="text-yodel-orange hover:bg-yodel-orange/10"
                >
                  <Wand2 className="w-3 h-3 mr-1" />
                  AI Suggest
                </Button>
              </div>
            <Input
              id="title"
              value={metadata.title}
              onChange={(e) => handleFieldChange('title', e.target.value)}
              placeholder="Enter your app title..."
              className="bg-zinc-800 border-zinc-700 text-foreground placeholder-zinc-400"
            />
            <CharacterCounter
              current={metadata.title.length}
              limit={30}
              label="Title Characters"
            />
            {getFieldErrors('title').map((error, idx) => (
              <p key={idx} className="text-red-400 text-xs">{error}</p>
            ))}
          </div>

          {/* Subtitle Field */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="subtitle" className="text-zinc-300 flex items-center gap-2">
                Subtitle
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
                          The App Store automatically combines title + subtitle keywords to create long-tail search terms!
                        </p>
                      </div>
                      <div className="bg-green-900/20 border border-green-700 rounded p-2">
                        <p className="text-xs font-semibold text-green-400">
                          Target: 29-30 characters
                        </p>
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onRequestAiSuggestion('subtitle', metadata.subtitle)}
                className="text-yodel-orange hover:bg-yodel-orange/10"
              >
                <Wand2 className="w-3 h-3 mr-1" />
                AI Suggest
              </Button>
            </div>
            <Input
              id="subtitle"
              value={metadata.subtitle}
              onChange={(e) => handleFieldChange('subtitle', e.target.value)}
              placeholder="Enter your subtitle..."
              className="bg-zinc-800 border-zinc-700 text-foreground placeholder-zinc-400"
            />
            <CharacterCounter
              current={metadata.subtitle.length}
              limit={30}
              label="Subtitle Characters"
            />
            {getFieldErrors('subtitle').map((error, idx) => (
              <p key={idx} className="text-red-400 text-xs">{error}</p>
            ))}
          </div>

          {/* Keywords Field */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="keywords" className="text-zinc-300 flex items-center gap-2">
                Keywords
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
                      <p className="text-xs text-zinc-400">
                        Format: keyword1,keyword2,keyword3
                      </p>
                      <div className="bg-yellow-900/20 border border-yellow-700 rounded p-2 mt-2">
                        <p className="text-xs font-semibold text-yellow-400">
                          ⚠️ Avoid Duplicates
                        </p>
                        <p className="text-xs text-zinc-300 mt-1">
                          Don't repeat keywords from title or subtitle - this wastes valuable character space!
                        </p>
                      </div>
                      <div className="bg-green-900/20 border border-green-700 rounded p-2">
                        <p className="text-xs font-semibold text-green-400">
                          Target: Exactly 100 characters
                        </p>
                        <p className="text-xs text-zinc-300 mt-1">
                          Every character counts for App Store indexing
                        </p>
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onRequestAiSuggestion('keywords', metadata.keywords)}
                className="text-yodel-orange hover:bg-yodel-orange/10"
              >
                <Wand2 className="w-3 h-3 mr-1" />
                AI Suggest
              </Button>
            </div>
            <Textarea
              id="keywords"
              value={metadata.keywords}
              onChange={(e) => handleFieldChange('keywords', e.target.value)}
              placeholder="keyword1,keyword2,keyword3..."
              className="bg-zinc-800 border-zinc-700 text-foreground placeholder-zinc-400 min-h-20"
            />
            <CharacterCounter
              current={metadata.keywords.length}
              limit={100}
              label="Keywords Characters"
            />
            {getFieldErrors('keywords').map((error, idx) => (
              <p key={idx} className="text-red-400 text-xs">{error}</p>
            ))}
          </div>

          <Button
            onClick={handleSave}
            disabled={isSaving || validationErrors.length > 0}
            className="w-full bg-green-600 hover:bg-green-700 text-foreground"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Metadata'}
          </Button>
        </CardContent>
      </Card>

        {/* Live Preview */}
        {score && (metadata.title || metadata.subtitle || metadata.keywords) && (
          <MetadataPreview
            metadata={metadata}
            score={score}
            appName={appName}
          />
        )}
      </div>
    </TooltipProvider>
  );
};
