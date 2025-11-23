/**
 * KPI Weight Override Editor
 *
 * Phase 13.3: Editor for KPI weight multiplier overrides
 *
 * Features:
 * - View all KPI weight overrides
 * - Add/edit KPI weights with multipliers (0.5x - 2.0x)
 * - Delete overrides
 * - Visual weight indicator
 */

import React, { useState } from 'react';
import { useKpiOverrideMutations } from '@/hooks/admin/useRulesets';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Plus, Edit, Trash2, Info } from 'lucide-react';
import type { KpiWeightOverride } from '@/services/admin/adminOverrideApi';

interface KpiWeightEditorProps {
  vertical?: string;
  market?: string;
  organizationId?: string;
  kpis: KpiWeightOverride[];
}

const KPI_TYPES = [
  { value: 'downloads', label: 'Downloads' },
  { value: 'ratings', label: 'Ratings' },
  { value: 'rating_count', label: 'Rating Count' },
  { value: 'reviews', label: 'Reviews' },
  { value: 'revenue', label: 'Revenue' },
  { value: 'retention', label: 'Retention' },
  { value: 'engagement', label: 'Engagement' },
  { value: 'conversion', label: 'Conversion' },
] as const;

export function KpiWeightEditor({
  vertical,
  market,
  organizationId,
  kpis,
}: KpiWeightEditorProps) {
  const { upsert, remove } = useKpiOverrideMutations(vertical, market, organizationId);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingKpi, setEditingKpi] = useState<KpiWeightOverride | null>(null);

  // Form state
  const [formKpiName, setFormKpiName] = useState('downloads');
  const [formWeight, setFormWeight] = useState(1.0);

  const handleAdd = async () => {
    try {
      await upsert.mutateAsync({
        scope: getScope(),
        vertical,
        market,
        organization_id: organizationId,
        kpi_name: formKpiName,
        weight: formWeight,
      });

      // Reset form
      setFormKpiName('downloads');
      setFormWeight(1.0);
      setIsAddDialogOpen(false);
    } catch (err) {
      console.error('Failed to add KPI weight:', err);
      alert('Failed to add KPI weight override');
    }
  };

  const handleEdit = async () => {
    if (!editingKpi) return;

    try {
      await upsert.mutateAsync({
        scope: getScope(),
        vertical,
        market,
        organization_id: organizationId,
        kpi_name: formKpiName,
        weight: formWeight,
      });

      // Reset form
      setFormKpiName('downloads');
      setFormWeight(1.0);
      setEditingKpi(null);
      setIsEditDialogOpen(false);
    } catch (err) {
      console.error('Failed to edit KPI weight:', err);
      alert('Failed to update KPI weight override');
    }
  };

  const handleDelete = async (id: string, kpiName: string) => {
    if (!confirm(`Are you sure you want to delete the KPI weight for "${kpiName}"?`)) {
      return;
    }

    try {
      await remove.mutateAsync(id);
    } catch (err) {
      console.error('Failed to delete KPI weight:', err);
      alert('Failed to delete KPI weight override');
    }
  };

  const openEditDialog = (kpi: KpiWeightOverride) => {
    setEditingKpi(kpi);
    setFormKpiName(kpi.kpi_name);
    setFormWeight(kpi.weight);
    setIsEditDialogOpen(true);
  };

  const getScope = (): 'vertical' | 'market' | 'client' => {
    if (organizationId) return 'client';
    if (vertical && !market) return 'vertical';
    return 'market';
  };

  const getWeightBadge = (weight: number) => {
    if (weight < 0.8) {
      return <Badge variant="outline" className="bg-red-500/10 text-red-500">Low Priority</Badge>;
    } else if (weight < 1.2) {
      return <Badge variant="outline" className="bg-blue-500/10 text-blue-500">Normal</Badge>;
    } else {
      return <Badge variant="outline" className="bg-green-500/10 text-green-500">High Priority</Badge>;
    }
  };

  const getWeightBarWidth = (weight: number) => {
    // Map 0.5-2.0 to 0-100%
    const min = 0.5;
    const max = 2.0;
    const normalized = ((weight - min) / (max - min)) * 100;
    return Math.max(0, Math.min(100, normalized));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">KPI Weight Overrides</h3>
          <p className="text-sm text-gray-500">
            Adjust relative importance of different KPIs (0.5x = lower priority, 2.0x = higher priority)
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add KPI Weight
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add KPI Weight Override</DialogTitle>
              <DialogDescription>
                Set a custom weight multiplier for a KPI metric.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="kpi">KPI Metric</Label>
                <Select value={formKpiName} onValueChange={setFormKpiName}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KPI_TYPES.map((kpi) => (
                      <SelectItem key={kpi.value} value={kpi.value}>
                        {kpi.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="weight">Weight Multiplier: {formWeight.toFixed(2)}x</Label>
                <Slider
                  id="weight"
                  min={0.5}
                  max={2.0}
                  step={0.1}
                  value={[formWeight]}
                  onValueChange={(vals) => setFormWeight(vals[0])}
                  className="mt-2"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0.5x (Low)</span>
                  <span>1.0x (Normal)</span>
                  <span>2.0x (High)</span>
                </div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg text-sm">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-500 mt-0.5" />
                  <div className="text-blue-700 dark:text-blue-300">
                    Weights affect how much each KPI contributes to the overall score.
                    Higher weights = more important.
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAdd} disabled={upsert.isPending}>
                {upsert.isPending ? 'Adding...' : 'Add Weight'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {kpis.length === 0 ? (
        <div className="text-center py-12 text-gray-500 border border-dashed rounded-lg">
          No KPI weight overrides yet. Add your first weight to get started.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>KPI Metric</TableHead>
              <TableHead>Weight</TableHead>
              <TableHead>Visual</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {kpis.map((kpi) => (
              <TableRow key={kpi.id}>
                <TableCell className="font-medium">
                  {KPI_TYPES.find((k) => k.value === kpi.kpi_name)?.label || kpi.kpi_name}
                </TableCell>
                <TableCell className="font-mono">{kpi.weight.toFixed(2)}x</TableCell>
                <TableCell>
                  <div className="w-32 h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-orange-400 to-orange-600"
                      style={{ width: `${getWeightBarWidth(kpi.weight)}%` }}
                    />
                  </div>
                </TableCell>
                <TableCell>{getWeightBadge(kpi.weight)}</TableCell>
                <TableCell>
                  <Badge variant="outline">{kpi.scope}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(kpi)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(kpi.id, kpi.kpi_name)}
                      disabled={remove.isPending}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit KPI Weight Override</DialogTitle>
            <DialogDescription>
              Update the weight multiplier for this KPI metric.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-kpi">KPI Metric</Label>
              <Select value={formKpiName} onValueChange={setFormKpiName}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KPI_TYPES.map((kpi) => (
                    <SelectItem key={kpi.value} value={kpi.value}>
                      {kpi.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-weight">Weight Multiplier: {formWeight.toFixed(2)}x</Label>
              <Slider
                id="edit-weight"
                min={0.5}
                max={2.0}
                step={0.1}
                value={[formWeight]}
                onValueChange={(vals) => setFormWeight(vals[0])}
                className="mt-2"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0.5x (Low)</span>
                <span>1.0x (Normal)</span>
                <span>2.0x (High)</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={upsert.isPending}>
              {upsert.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
