/**
 * Rule Detail Panel
 *
 * Phase 15: Detail drawer for viewing/editing individual rule evaluators
 *
 * Features:
 * - View rule metadata (name, scope, family, description)
 * - View default vs effective configuration
 * - Edit weight multiplier (0.5-2.0x slider)
 * - Edit severity override
 * - Edit threshold overrides
 * - View linked KPIs and formulas
 * - Auto-save with status indicators
 */

import React, { useState, useEffect } from 'react';
import { useRuleDetail, useRuleWeightMutations, useRuleSeverityMutations, useRuleThresholdMutations } from '@/hooks/admin/useRuleRegistry';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Info, AlertTriangle, Save, CheckCircle, XCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface RuleDetailPanelProps {
  ruleId: string;
  isOpen: boolean;
  onClose: () => void;
  vertical?: string;
  market?: string;
  organizationId?: string;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function RuleDetailPanel({
  ruleId,
  isOpen,
  onClose,
  vertical,
  market,
  organizationId,
}: RuleDetailPanelProps) {
  const { data: detail, isLoading } = useRuleDetail(ruleId, vertical, market, organizationId);
  const { updateWeight } = useRuleWeightMutations(vertical, market, organizationId);
  const { updateSeverity } = useRuleSeverityMutations(vertical, market, organizationId);
  const { updateThreshold } = useRuleThresholdMutations(vertical, market, organizationId);

  const [weightMultiplier, setWeightMultiplier] = useState(1.0);
  const [severity, setSeverity] = useState<string>('');
  const [thresholdLow, setThresholdLow] = useState<string>('');
  const [thresholdHigh, setThresholdHigh] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  // Initialize state from rule data
  useEffect(() => {
    if (detail?.rule) {
      setWeightMultiplier(detail.rule.override_multiplier || 1.0);
      setSeverity(detail.rule.effective_severity || detail.rule.severity_default);
      setThresholdLow(
        detail.rule.effective_threshold_low?.toString() || detail.rule.threshold_low?.toString() || ''
      );
      setThresholdHigh(
        detail.rule.effective_threshold_high?.toString() || detail.rule.threshold_high?.toString() || ''
      );
    }
  }, [detail]);

  const handleSaveWeight = async () => {
    if (!detail?.rule) return;

    setSaveStatus('saving');
    try {
      await updateWeight.mutateAsync({
        ruleId,
        scope: 'vertical', // TODO: Make configurable
        vertical,
        market,
        organizationId,
        weightMultiplier,
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Error saving weight:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const handleSaveSeverity = async () => {
    if (!detail?.rule) return;

    setSaveStatus('saving');
    try {
      await updateSeverity.mutateAsync({
        ruleId,
        scope: 'vertical',
        vertical,
        market,
        organizationId,
        severity: severity as any,
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Error saving severity:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const handleSaveThresholds = async () => {
    if (!detail?.rule) return;

    setSaveStatus('saving');
    try {
      await updateThreshold.mutateAsync({
        ruleId,
        scope: 'vertical',
        vertical,
        market,
        organizationId,
        thresholdLow: thresholdLow ? parseFloat(thresholdLow) : undefined,
        thresholdHigh: thresholdHigh ? parseFloat(thresholdHigh) : undefined,
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Error saving thresholds:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const getSaveStatusBadge = () => {
    switch (saveStatus) {
      case 'saving':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-600">
            <Save className="w-3 h-3 mr-1 animate-pulse" />
            Saving...
          </Badge>
        );
      case 'saved':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-600">
            <CheckCircle className="w-3 h-3 mr-1" />
            Saved
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-600">
            <XCircle className="w-3 h-3 mr-1" />
            Error
          </Badge>
        );
      default:
        return null;
    }
  };

  const getScopeBadge = (scope: string) => {
    const colors: Record<string, string> = {
      title: 'bg-blue-500 text-white',
      subtitle: 'bg-green-500 text-white',
      description: 'bg-purple-500 text-white',
      coverage: 'bg-orange-500 text-white',
      intent: 'bg-pink-500 text-white',
      global: 'bg-gray-500 text-white',
    };

    return <Badge className={colors[scope] || ''}>{scope}</Badge>;
  };

  const getFamilyBadge = (family: string) => {
    const colors: Record<string, string> = {
      ranking: 'bg-indigo-500 text-white',
      conversion: 'bg-emerald-500 text-white',
      diagnostic: 'bg-amber-500 text-white',
      coverage: 'bg-cyan-500 text-white',
    };

    return <Badge className={colors[family] || ''}>{family}</Badge>;
  };

  if (isLoading || !detail?.rule) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-2xl">
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">Loading rule details...</div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  const { rule, canDeprecate, deprecationReason, affectedKpis } = detail;
  const effectiveWeight = rule.effective_weight || rule.weight_default;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{rule.name}</SheetTitle>
          <SheetDescription>
            <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">
              {rule.rule_id}
            </code>
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-8rem)] mt-6">
          <div className="space-y-6 pr-4">
            {/* Save Status Indicator */}
            {saveStatus !== 'idle' && (
              <div className="flex justify-end">{getSaveStatusBadge()}</div>
            )}

            {/* Basic Info */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Basic Information</h3>
              <div className="space-y-3">
                <div>
                  <Label className="text-sm text-gray-500">Scope</Label>
                  <div className="mt-1">{getScopeBadge(rule.scope)}</div>
                </div>
                <div>
                  <Label className="text-sm text-gray-500">Family</Label>
                  <div className="mt-1">{getFamilyBadge(rule.family)}</div>
                </div>
                <div>
                  <Label className="text-sm text-gray-500">Status</Label>
                  <div className="mt-1">
                    {rule.is_deprecated ? (
                      <Badge variant="outline" className="bg-red-500/10 text-red-600">
                        Deprecated
                      </Badge>
                    ) : rule.has_override ? (
                      <Badge className="bg-orange-500">Overridden</Badge>
                    ) : (
                      <Badge variant="outline">Default</Badge>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-gray-500">KPI Usage</Label>
                  <div className="mt-1">
                    <Badge variant="secondary">{rule.usage_count || 0} KPI(s)</Badge>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Description */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Description</h3>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {rule.description || 'No description available'}
              </p>
            </div>

            <Separator />

            {/* Weight Configuration */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Weight Configuration</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-gray-500">Base Weight</Label>
                    <div className="text-2xl font-mono font-bold">
                      {rule.weight_default.toFixed(3)}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">Effective Weight</Label>
                    <div
                      className={`text-2xl font-mono font-bold ${
                        rule.has_override ? 'text-orange-600' : 'text-green-600'
                      }`}
                    >
                      {effectiveWeight.toFixed(3)}
                    </div>
                  </div>
                </div>

                {/* Weight Multiplier Slider */}
                <div className="space-y-2">
                  <Label>
                    Weight Multiplier: <span className="font-mono">{weightMultiplier.toFixed(2)}x</span>
                  </Label>
                  <Slider
                    value={[weightMultiplier]}
                    onValueChange={(vals) => setWeightMultiplier(vals[0])}
                    min={0.5}
                    max={2.0}
                    step={0.1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>0.5x (Min)</span>
                    <span>1.0x (Default)</span>
                    <span>2.0x (Max)</span>
                  </div>
                  <Button
                    onClick={handleSaveWeight}
                    disabled={saveStatus === 'saving'}
                    size="sm"
                    className="w-full mt-2"
                  >
                    {saveStatus === 'saving' ? 'Saving...' : 'Save Weight Override'}
                  </Button>
                </div>
              </div>
            </div>

            <Separator />

            {/* Severity Configuration */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Severity Configuration</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-gray-500">Default Severity</Label>
                    <div className="mt-1">
                      <Badge className="capitalize">{rule.severity_default}</Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">Effective Severity</Label>
                    <div className="mt-1">
                      <Badge className={rule.has_override ? 'bg-orange-500' : ''}>
                        {rule.effective_severity || rule.severity_default}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Override Severity</Label>
                  <Select value={severity} onValueChange={setSeverity}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="strong">Strong</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="optional">Optional</SelectItem>
                      <SelectItem value="info">Info</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleSaveSeverity}
                    disabled={saveStatus === 'saving'}
                    size="sm"
                    className="w-full mt-2"
                  >
                    {saveStatus === 'saving' ? 'Saving...' : 'Save Severity Override'}
                  </Button>
                </div>
              </div>
            </div>

            <Separator />

            {/* Threshold Configuration */}
            {(rule.threshold_low !== undefined || rule.threshold_high !== undefined) && (
              <>
                <div>
                  <h3 className="text-lg font-semibold mb-3">Threshold Configuration</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-gray-500">Default Low</Label>
                        <div className="text-lg font-mono">
                          {rule.threshold_low ?? '—'}
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-500">Default High</Label>
                        <div className="text-lg font-mono">
                          {rule.threshold_high ?? '—'}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Override Low Threshold</Label>
                        <Input
                          type="number"
                          value={thresholdLow}
                          onChange={(e) => setThresholdLow(e.target.value)}
                          placeholder={rule.threshold_low?.toString() || '—'}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Override High Threshold</Label>
                        <Input
                          type="number"
                          value={thresholdHigh}
                          onChange={(e) => setThresholdHigh(e.target.value)}
                          placeholder={rule.threshold_high?.toString() || '—'}
                        />
                      </div>
                    </div>

                    <Button
                      onClick={handleSaveThresholds}
                      disabled={saveStatus === 'saving'}
                      size="sm"
                      className="w-full"
                    >
                      {saveStatus === 'saving' ? 'Saving...' : 'Save Threshold Overrides'}
                    </Button>
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Linked KPIs */}
            {rule.used_by_kpis && rule.used_by_kpis.length > 0 && (
              <>
                <div>
                  <h3 className="text-lg font-semibold mb-3">
                    Linked KPIs ({rule.used_by_kpis.length})
                  </h3>
                  <div className="space-y-2">
                    {rule.used_by_kpis.map((kpiId) => (
                      <div
                        key={kpiId}
                        className="p-3 border rounded-lg bg-gray-50 dark:bg-gray-800"
                      >
                        <code className="text-sm">{kpiId}</code>
                      </div>
                    ))}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Formula Reference */}
            {rule.formula_id && (
              <>
                <div>
                  <h3 className="text-lg font-semibold mb-3">Formula Reference</h3>
                  <div className="p-3 border rounded-lg bg-gray-50 dark:bg-gray-800">
                    <code className="text-sm">{rule.formula_id}</code>
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Help Text */}
            {rule.help_text && (
              <>
                <div>
                  <h3 className="text-lg font-semibold mb-3">Help</h3>
                  <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        {rule.help_text}
                      </p>
                    </div>
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Deprecation Warning */}
            {!canDeprecate && deprecationReason && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Deprecation Status</h3>
                <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                        Cannot deprecate this rule
                      </p>
                      <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                        {deprecationReason}
                      </p>
                      {affectedKpis && affectedKpis.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-yellow-600 dark:text-yellow-400">
                            Affected KPIs:
                          </p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {affectedKpis.map((kpiId) => (
                              <Badge key={kpiId} variant="outline" className="text-xs">
                                {kpiId}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tags */}
            {rule.tags && rule.tags.length > 0 && (
              <>
                <div>
                  <h3 className="text-lg font-semibold mb-3">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {rule.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
