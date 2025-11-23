/**
 * KPI Detail Panel
 *
 * Phase 14: Detail drawer for viewing/editing individual KPIs
 *
 * Features:
 * - View KPI metadata (name, description, family, weight)
 * - Edit KPI properties (within safety constraints)
 * - View effective weights with overrides
 * - View related KPIs in same family
 * - Auto-save with debounce
 */

import React, { useState, useEffect } from 'react';
import { useKpiDetail, useKpiMetaMutations, useKpiWeightMutations } from '@/hooks/admin/useKpiRegistry';
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
import { Save, AlertCircle, Check, Info } from 'lucide-react';
import type { KpiId } from '@/engine/metadata/kpi/kpi.types';

interface KpiDetailPanelProps {
  kpiId: KpiId;
  isOpen: boolean;
  onClose: () => void;
  vertical?: string;
  market?: string;
  organizationId?: string;
}

export function KpiDetailPanel({
  kpiId,
  isOpen,
  onClose,
  vertical,
  market,
  organizationId,
}: KpiDetailPanelProps) {
  const { data: detail, isLoading } = useKpiDetail(kpiId, vertical, market, organizationId);
  const { updateMeta } = useKpiMetaMutations();
  const { updateWeight } = useKpiWeightMutations(vertical, market, organizationId);

  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [weightMultiplier, setWeightMultiplier] = useState(1.0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Initialize form when detail loads
  useEffect(() => {
    if (detail?.kpi) {
      setDescription(detail.kpi.description);
      setNotes(detail.kpi.admin?.notes || '');
      setWeightMultiplier(detail.kpi.overrideMultiplier || 1.0);
    }
  }, [detail]);

  const handleSaveDescription = async () => {
    if (!detail?.kpi) return;

    setIsSaving(true);
    setSaveStatus('saving');

    try {
      await updateMeta.mutateAsync({
        kpiId: detail.kpi.id,
        updates: {
          description,
          notes,
        },
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Error saving KPI metadata:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveWeight = async () => {
    if (!detail?.kpi || !vertical && !market && !organizationId) return;

    setIsSaving(true);
    setSaveStatus('saving');

    try {
      await updateWeight.mutateAsync({
        kpiId: detail.kpi.id,
        scope: organizationId ? 'client' : vertical && !market ? 'vertical' : 'market',
        vertical,
        market,
        organizationId,
        weight: weightMultiplier,
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Error saving KPI weight:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !detail?.kpi) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-2xl">
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">Loading KPI details...</div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  const { kpi, family, relatedKpis } = detail;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{kpi.label}</SheetTitle>
          <SheetDescription>
            <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">
              {kpi.id}
            </code>
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-8rem)] mt-6">
          <div className="space-y-6 pr-4">
            {/* Basic Info */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Basic Information</h3>
              <div className="space-y-3">
                <div>
                  <Label className="text-sm text-gray-500">Family</Label>
                  <div className="mt-1">
                    <Badge variant="outline">{family.label}</Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-gray-500">Metric Type</Label>
                  <div className="mt-1">
                    <Badge variant="secondary">{kpi.metricType}</Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-gray-500">Direction</Label>
                  <div className="mt-1">
                    <Badge variant="outline">{kpi.direction}</Badge>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Description */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">Description</h3>
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
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="mb-2"
                placeholder="KPI description..."
              />
              <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg text-sm mb-3">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-500 mt-0.5" />
                  <div className="text-blue-700 dark:text-blue-300">
                    Description changes are stored as database overrides. The original
                    code definition remains unchanged.
                  </div>
                </div>
              </div>
              <Button
                onClick={handleSaveDescription}
                disabled={isSaving || saveStatus === 'saving'}
                size="sm"
              >
                <Save className="w-4 h-4 mr-2" />
                {saveStatus === 'saving' ? 'Saving...' : 'Save Description'}
              </Button>
            </div>

            <Separator />

            {/* Weight Configuration */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Weight Configuration</h3>
              <div className="space-y-4">
                <div>
                  <Label>Base Weight</Label>
                  <div className="text-2xl font-mono font-bold mt-1">
                    {kpi.weight.toFixed(3)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Defined in code registry
                  </p>
                </div>

                {(vertical || market || organizationId) && (
                  <div>
                    <Label>Weight Multiplier: {weightMultiplier.toFixed(2)}x</Label>
                    <Slider
                      value={[weightMultiplier]}
                      onValueChange={(vals) => setWeightMultiplier(vals[0])}
                      min={0.5}
                      max={2.0}
                      step={0.1}
                      className="mt-2"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>0.5x (Lower priority)</span>
                      <span>1.0x (Normal)</span>
                      <span>2.0x (Higher priority)</span>
                    </div>
                    <Button
                      onClick={handleSaveWeight}
                      disabled={isSaving || saveStatus === 'saving' || weightMultiplier === (kpi.overrideMultiplier || 1.0)}
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
                    {(kpi.effectiveWeight || kpi.weight).toFixed(3)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Base weight × multiplier
                  </p>
                </div>
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

            {/* Related KPIs */}
            {relatedKpis.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">
                  Related KPIs in {family.label}
                </h3>
                <div className="space-y-2">
                  {relatedKpis.map((relatedKpi) => (
                    <div
                      key={relatedKpi.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <div>
                        <div className="font-medium">{relatedKpi.label}</div>
                        <code className="text-xs text-gray-500">{relatedKpi.id}</code>
                      </div>
                      <div className="text-sm font-mono">
                        {relatedKpi.weight.toFixed(3)}
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
