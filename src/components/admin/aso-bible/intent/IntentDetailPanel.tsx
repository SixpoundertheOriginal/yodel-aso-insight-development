/**
 * Intent Pattern Detail Panel
 *
 * Phase 16: Detail drawer for viewing/editing individual intent patterns
 *
 * Features:
 * - View pattern metadata (pattern, intent type, weight, priority, scope)
 * - Edit pattern properties (within safety constraints)
 * - View effective weights with overrides
 * - View related patterns of same intent type
 * - Auto-save with debounce
 */

import React, { useState, useEffect } from 'react';
import { useIntentDetail, useUpdateIntentPattern, useIntentOverrideMutations } from '@/hooks/admin/useIntentRegistry';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Save, AlertCircle, Check, Info, Brain } from 'lucide-react';
import type { IntentType } from '@/services/admin/adminIntentService';

interface IntentDetailPanelProps {
  patternId: string;
  isOpen: boolean;
  onClose: () => void;
  vertical?: string;
  market?: string;
  organizationId?: string;
  appId?: string;
}

export function IntentDetailPanel({
  patternId,
  isOpen,
  onClose,
  vertical,
  market,
  organizationId,
  appId,
}: IntentDetailPanelProps) {
  const { data: detail, isLoading } = useIntentDetail(patternId, {
    vertical,
    market,
    organizationId,
    appId,
  });
  const updatePattern = useUpdateIntentPattern();
  const { createOrUpdateOverride } = useIntentOverrideMutations(vertical, market, organizationId, appId);

  const [example, setExample] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [weight, setWeight] = useState(1.0);
  const [priority, setPriority] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [isRegex, setIsRegex] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wordBoundary, setWordBoundary] = useState(true);
  const [tags, setTags] = useState<string[]>([]);
  const [weightMultiplier, setWeightMultiplier] = useState(1.0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Initialize form when detail loads
  useEffect(() => {
    if (detail?.pattern) {
      const pattern = detail.pattern;
      setExample(pattern.example || '');
      setDescription(pattern.description || '');
      setNotes(pattern.notes || '');
      setWeight(pattern.weight);
      setPriority(pattern.priority);
      setIsActive(pattern.is_active);
      setIsRegex(pattern.is_regex);
      setCaseSensitive(pattern.case_sensitive);
      setWordBoundary(pattern.word_boundary);
      setTags(pattern.admin_tags || []);
      setWeightMultiplier(pattern.effective_weight ? pattern.effective_weight / pattern.weight : 1.0);
    }
  }, [detail]);

  const handleSaveMetadata = async () => {
    if (!detail?.pattern) return;

    setIsSaving(true);
    setSaveStatus('saving');

    try {
      await updatePattern.mutateAsync({
        patternId: detail.pattern.id,
        example,
        description,
        notes,
        weight,
        priority,
        is_active: isActive,
        is_regex: isRegex,
        case_sensitive: caseSensitive,
        word_boundary: wordBoundary,
        admin_tags: tags,
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Error saving pattern metadata:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveOverride = async () => {
    if (!detail?.pattern || !vertical && !market && !organizationId && !appId) return;

    setIsSaving(true);
    setSaveStatus('saving');

    try {
      // Determine scope based on context
      let scope: 'vertical' | 'market' | 'client' | 'app' = 'vertical';
      if (appId) scope = 'app';
      else if (organizationId) scope = 'client';
      else if (market && vertical) scope = 'market';
      else if (vertical) scope = 'vertical';

      await createOrUpdateOverride.mutateAsync({
        basePatternId: detail.pattern.id,
        scope,
        vertical,
        market,
        organizationId,
        appId,
        weightMultiplier,
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Error saving pattern override:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !detail?.pattern) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-2xl">
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">Loading pattern details...</div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  const { pattern, relatedPatterns } = detail;

  const getIntentTypeBadge = (intentType: IntentType) => {
    const colors = {
      informational: 'bg-blue-500/10 text-blue-600',
      commercial: 'bg-green-500/10 text-green-600',
      navigational: 'bg-purple-500/10 text-purple-600',
      transactional: 'bg-orange-500/10 text-orange-600',
    };
    return (
      <Badge variant="outline" className={colors[intentType]}>
        {intentType.charAt(0).toUpperCase() + intentType.slice(1)}
      </Badge>
    );
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            {pattern.pattern}
          </SheetTitle>
          <SheetDescription>
            <div className="flex items-center gap-2">
              {getIntentTypeBadge(pattern.intent_type)}
              <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">
                {pattern.scope}
              </code>
            </div>
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-8rem)] mt-6">
          <div className="space-y-6 pr-4">
            {/* Basic Info */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">Basic Information</h3>
                {saveStatus === 'saved' && (
                  <Badge className="bg-green-500">
                    <Check className="w-3 h-3 mr-1" />
                    Saved
                  </Badge>
                )}
                {saveStatus === 'error' && (
                  <Badge variant="destructive">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Error
                  </Badge>
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <Label className="text-sm text-gray-500">Pattern String</Label>
                  <div className="mt-1">
                    <code className="text-sm bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded block">
                      {pattern.pattern}
                    </code>
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-gray-500">Intent Type</Label>
                  <div className="mt-1">
                    {getIntentTypeBadge(pattern.intent_type)}
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-gray-500">Scope</Label>
                  <div className="mt-1">
                    <Badge variant="outline">{pattern.scope}</Badge>
                    {pattern.vertical && (
                      <Badge variant="outline" className="ml-2">
                        Vertical: {pattern.vertical}
                      </Badge>
                    )}
                    {pattern.market && (
                      <Badge variant="outline" className="ml-2">
                        Market: {pattern.market}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Example */}
            <div>
              <Label>Example Usage</Label>
              <Input
                value={example}
                onChange={(e) => setExample(e.target.value)}
                placeholder="e.g., 'learn spanish'"
                className="mt-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                Example keyword showing this pattern in use
              </p>
            </div>

            {/* Description */}
            <div>
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="mt-2"
                placeholder="Describe what this pattern matches..."
              />
            </div>

            <Separator />

            {/* Weight & Priority Configuration */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Scoring Configuration</h3>
              <div className="space-y-4">
                <div>
                  <Label>Base Weight: {weight.toFixed(1)}</Label>
                  <Slider
                    value={[weight]}
                    onValueChange={(vals) => setWeight(vals[0])}
                    min={0.1}
                    max={3.0}
                    step={0.1}
                    className="mt-2"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0.1 (Minimal)</span>
                    <span>1.0 (Normal)</span>
                    <span>3.0 (Critical)</span>
                  </div>
                </div>

                <div>
                  <Label>Priority</Label>
                  <Input
                    type="number"
                    value={priority}
                    onChange={(e) => setPriority(parseInt(e.target.value) || 0)}
                    min={0}
                    max={200}
                    className="mt-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Higher priority patterns are evaluated first (0-200)
                  </p>
                </div>

                {(vertical || market || organizationId || appId) && pattern.scope === 'base' && (
                  <div>
                    <Label>Weight Multiplier (Override): {weightMultiplier.toFixed(2)}x</Label>
                    <Slider
                      value={[weightMultiplier]}
                      onValueChange={(vals) => setWeightMultiplier(vals[0])}
                      min={0.1}
                      max={3.0}
                      step={0.1}
                      className="mt-2"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>0.1x (Much lower)</span>
                      <span>1.0x (Normal)</span>
                      <span>3.0x (Much higher)</span>
                    </div>
                    <Button
                      onClick={handleSaveOverride}
                      disabled={isSaving || saveStatus === 'saving'}
                      size="sm"
                      className="mt-3"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {saveStatus === 'saving' ? 'Saving...' : 'Save Weight Override'}
                    </Button>
                  </div>
                )}

                <div>
                  <Label>Effective Weight</Label>
                  <div className="text-2xl font-mono font-bold mt-1 text-green-600 dark:text-green-400">
                    {pattern.effective_weight?.toFixed(1) || weight.toFixed(1)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {pattern.has_override
                      ? `Base (${weight.toFixed(1)}) × Override (${weightMultiplier.toFixed(2)})`
                      : 'No overrides applied'}
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Pattern Matching Options */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Pattern Matching</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Regular Expression</Label>
                    <p className="text-xs text-gray-500">
                      Treat pattern as regex
                    </p>
                  </div>
                  <Switch
                    checked={isRegex}
                    onCheckedChange={setIsRegex}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Case Sensitive</Label>
                    <p className="text-xs text-gray-500">
                      Match exact case
                    </p>
                  </div>
                  <Switch
                    checked={caseSensitive}
                    onCheckedChange={setCaseSensitive}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Word Boundary</Label>
                    <p className="text-xs text-gray-500">
                      Match whole words only
                    </p>
                  </div>
                  <Switch
                    checked={wordBoundary}
                    onCheckedChange={setWordBoundary}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Status */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Status</h3>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Active Pattern</Label>
                  <p className="text-xs text-gray-500">
                    Include in intent classification
                  </p>
                </div>
                <Switch
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </div>
            </div>

            <Separator />

            {/* Internal Notes */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Internal Notes</h3>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Internal notes for Yodel team..."
              />
              <p className="text-xs text-gray-500 mt-1">
                These notes are only visible to internal users
              </p>
            </div>

            <Separator />

            {/* Tags */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Tags help organize and filter patterns
              </p>
            </div>

            {/* Save Button */}
            <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg text-sm mb-3">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-500 mt-0.5" />
                <div className="text-blue-700 dark:text-blue-300">
                  Pattern changes are stored in the database. Changes take effect immediately
                  for all new intent classifications.
                </div>
              </div>
            </div>
            <Button
              onClick={handleSaveMetadata}
              disabled={isSaving || saveStatus === 'saving'}
              className="w-full"
            >
              <Save className="w-4 h-4 mr-2" />
              {saveStatus === 'saving' ? 'Saving...' : 'Save All Changes'}
            </Button>

            <Separator />

            {/* Related Patterns */}
            {relatedPatterns && relatedPatterns.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">
                  Related {pattern.intent_type.charAt(0).toUpperCase() + pattern.intent_type.slice(1)} Patterns
                </h3>
                <div className="space-y-2">
                  {relatedPatterns.map((relatedPattern) => (
                    <div
                      key={relatedPattern.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <div className="flex-1">
                        <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                          {relatedPattern.pattern}
                        </code>
                        {relatedPattern.example && (
                          <p className="text-xs text-gray-500 mt-1">
                            e.g., {relatedPattern.example}
                          </p>
                        )}
                      </div>
                      <div className="text-sm font-mono ml-4">
                        {relatedPattern.weight.toFixed(1)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
