/**
 * Formula Detail Panel
 *
 * Phase 14: Detail drawer for viewing/editing individual formulas
 *
 * Features:
 * - View formula metadata (name, type, description)
 * - View components with weights (for weighted_sum/composite)
 * - View thresholds (for threshold_based)
 * - View KPIs using this formula
 * - Edit parameters (within safety constraints)
 */

import React from 'react';
import { useFormulaDetail } from '@/hooks/admin/useFormulaRegistry';
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
import { Info, AlertTriangle } from 'lucide-react';

interface FormulaDetailPanelProps {
  formulaId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function FormulaDetailPanel({
  formulaId,
  isOpen,
  onClose,
}: FormulaDetailPanelProps) {
  const { data: detail, isLoading } = useFormulaDetail(formulaId);

  if (isLoading || !detail?.formula) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-2xl">
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">Loading formula details...</div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  const { formula, canDeprecate, deprecationReason, affectedKpis } = detail;

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      weighted_sum: 'bg-blue-500 text-white',
      ratio: 'bg-green-500 text-white',
      composite: 'bg-purple-500 text-white',
      threshold_based: 'bg-orange-500 text-white',
      custom: 'bg-gray-500 text-white',
    };

    return (
      <Badge className={colors[type] || ''}>
        {type.replace('_', ' ')}
      </Badge>
    );
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{formula.label}</SheetTitle>
          <SheetDescription>
            <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">
              {formula.id}
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
                  <Label className="text-sm text-gray-500">Type</Label>
                  <div className="mt-1">{getTypeBadge(formula.type)}</div>
                </div>
                <div>
                  <Label className="text-sm text-gray-500">Status</Label>
                  <div className="mt-1">
                    {formula.deprecated ? (
                      <Badge variant="outline" className="bg-red-500/10 text-red-600">
                        Deprecated
                      </Badge>
                    ) : formula.admin?.editable ? (
                      <Badge className="bg-green-500">Editable</Badge>
                    ) : (
                      <Badge variant="outline">Read-Only</Badge>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-gray-500">KPI Usage</Label>
                  <div className="mt-1">
                    <Badge variant="secondary">{formula.usageCount} KPI(s)</Badge>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Description */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Description</h3>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {formula.description}
              </p>
            </div>

            <Separator />

            {/* Components (for weighted_sum, composite) */}
            {formula.components && formula.components.length > 0 && (
              <>
                <div>
                  <h3 className="text-lg font-semibold mb-3">
                    Components ({formula.components.length})
                  </h3>
                  <div className="space-y-2">
                    {formula.components.map((component, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="font-medium">{component.id}</div>
                          {component.source && (
                            <div className="text-xs text-gray-500">
                              Source: {component.source}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-sm font-mono">
                            {(component.weight * 100).toFixed(0)}%
                          </div>
                          <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-400 to-blue-600"
                              style={{ width: `${component.weight * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 text-xs text-gray-500">
                    Total weight: {formula.components.reduce((sum, c) => sum + c.weight, 0).toFixed(2)}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Thresholds (for threshold_based) */}
            {formula.thresholds && formula.thresholds.length > 0 && (
              <>
                <div>
                  <h3 className="text-lg font-semibold mb-3">
                    Thresholds ({formula.thresholds.length})
                  </h3>
                  <div className="space-y-2">
                    {formula.thresholds.map((threshold, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="font-medium">{threshold.label}</div>
                          <div className="text-xs text-gray-500">
                            Condition: {threshold.condition}
                          </div>
                        </div>
                        <div className="text-lg font-mono font-bold">
                          {threshold.score}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* KPIs Using This Formula */}
            {formula.usedByKpis.length > 0 && (
              <>
                <div>
                  <h3 className="text-lg font-semibold mb-3">
                    KPIs Using This Formula ({formula.usedByKpis.length})
                  </h3>
                  <div className="space-y-2">
                    {formula.usedByKpis.map((kpiId) => (
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

            {/* Admin Notes */}
            {formula.admin?.notes && (
              <>
                <div>
                  <h3 className="text-lg font-semibold mb-3">Internal Notes</h3>
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {formula.admin.notes}
                    </p>
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Help Text */}
            {formula.admin?.helpText && (
              <>
                <div>
                  <h3 className="text-lg font-semibold mb-3">Help</h3>
                  <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 text-blue-500 mt-0.5" />
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        {formula.admin.helpText}
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
                    <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                        Cannot deprecate this formula
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
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
