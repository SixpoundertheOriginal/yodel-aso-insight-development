/**
 * Formula Override Editor
 *
 * Phase 13.3: Editor for formula component overrides
 *
 * Features:
 * - View all formula overrides
 * - Add/edit formula component multipliers
 * - Manage component weights
 * - Delete overrides
 */

import React, { useState } from 'react';
import { useFormulaOverrideMutations } from '@/hooks/admin/useRulesets';
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
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Plus, Edit, Trash2 } from 'lucide-react';
import type { FormulaOverride } from '@/services/admin/adminOverrideApi';

interface FormulaOverrideEditorProps {
  vertical?: string;
  market?: string;
  organizationId?: string;
  formulas: FormulaOverride[];
}

export function FormulaOverrideEditor({
  vertical,
  market,
  organizationId,
  formulas,
}: FormulaOverrideEditorProps) {
  const { upsert, remove } = useFormulaOverrideMutations(vertical, market, organizationId);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingFormula, setEditingFormula] = useState<FormulaOverride | null>(null);

  // Form state
  const [formComponent, setFormComponent] = useState('');
  const [formMultiplier, setFormMultiplier] = useState(1.0);
  const [formComponentWeight, setFormComponentWeight] = useState(1.0);

  const handleAdd = async () => {
    if (!formComponent.trim()) {
      alert('Please enter a component name');
      return;
    }

    try {
      await upsert.mutateAsync({
        scope: getScope(),
        vertical,
        market,
        organization_id: organizationId,
        component: formComponent.toLowerCase().trim(),
        multiplier: formMultiplier,
        component_weight: formComponentWeight,
      });

      // Reset form
      setFormComponent('');
      setFormMultiplier(1.0);
      setFormComponentWeight(1.0);
      setIsAddDialogOpen(false);
    } catch (err) {
      console.error('Failed to add formula override:', err);
      alert('Failed to add formula override');
    }
  };

  const handleEdit = async () => {
    if (!editingFormula || !formComponent.trim()) return;

    try {
      await upsert.mutateAsync({
        scope: getScope(),
        vertical,
        market,
        organization_id: organizationId,
        component: formComponent.toLowerCase().trim(),
        multiplier: formMultiplier,
        component_weight: formComponentWeight,
      });

      // Reset form
      setFormComponent('');
      setFormMultiplier(1.0);
      setFormComponentWeight(1.0);
      setEditingFormula(null);
      setIsEditDialogOpen(false);
    } catch (err) {
      console.error('Failed to edit formula override:', err);
      alert('Failed to update formula override');
    }
  };

  const handleDelete = async (id: string, component: string) => {
    if (!confirm(`Are you sure you want to delete the formula override for "${component}"?`)) {
      return;
    }

    try {
      await remove.mutateAsync(id);
    } catch (err) {
      console.error('Failed to delete formula override:', err);
      alert('Failed to delete formula override');
    }
  };

  const openEditDialog = (formula: FormulaOverride) => {
    setEditingFormula(formula);
    setFormComponent(formula.component);
    setFormMultiplier(formula.multiplier);
    setFormComponentWeight(formula.component_weight || 1.0);
    setIsEditDialogOpen(true);
  };

  const getScope = (): 'vertical' | 'market' | 'client' => {
    if (organizationId) return 'client';
    if (vertical && !market) return 'vertical';
    return 'market';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Formula Overrides</h3>
          <p className="text-sm text-gray-500">
            Override scoring formula components with custom multipliers and weights
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Formula Override
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Formula Override</DialogTitle>
              <DialogDescription>
                Override a formula component with custom multiplier and weight.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="component">Component Name</Label>
                <Input
                  id="component"
                  placeholder="e.g., title_score, description_score"
                  value={formComponent}
                  onChange={(e) => setFormComponent(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="multiplier">Multiplier: {formMultiplier.toFixed(2)}x</Label>
                <Slider
                  id="multiplier"
                  min={0.5}
                  max={2.0}
                  step={0.1}
                  value={[formMultiplier]}
                  onValueChange={(vals) => setFormMultiplier(vals[0])}
                  className="mt-2"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0.5x</span>
                  <span>1.0x</span>
                  <span>2.0x</span>
                </div>
              </div>
              <div>
                <Label htmlFor="component-weight">Component Weight: {formComponentWeight.toFixed(2)}</Label>
                <Slider
                  id="component-weight"
                  min={0.5}
                  max={2.0}
                  step={0.1}
                  value={[formComponentWeight]}
                  onValueChange={(vals) => setFormComponentWeight(vals[0])}
                  className="mt-2"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0.5</span>
                  <span>1.0</span>
                  <span>2.0</span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAdd} disabled={upsert.isPending}>
                {upsert.isPending ? 'Adding...' : 'Add Override'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {formulas.length === 0 ? (
        <div className="text-center py-12 text-gray-500 border border-dashed rounded-lg">
          No formula overrides yet. Add your first override to get started.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Component</TableHead>
              <TableHead>Multiplier</TableHead>
              <TableHead>Weight</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead>Version</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {formulas.map((formula) => (
              <TableRow key={formula.id}>
                <TableCell className="font-mono">{formula.component}</TableCell>
                <TableCell className="font-mono">{formula.multiplier.toFixed(2)}x</TableCell>
                <TableCell className="font-mono">
                  {(formula.component_weight || 1.0).toFixed(2)}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{formula.scope}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">v{formula.version}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(formula)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(formula.id, formula.component)}
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
            <DialogTitle>Edit Formula Override</DialogTitle>
            <DialogDescription>
              Update the formula component configuration.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-component">Component Name</Label>
              <Input
                id="edit-component"
                value={formComponent}
                onChange={(e) => setFormComponent(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit-multiplier">Multiplier: {formMultiplier.toFixed(2)}x</Label>
              <Slider
                id="edit-multiplier"
                min={0.5}
                max={2.0}
                step={0.1}
                value={[formMultiplier]}
                onValueChange={(vals) => setFormMultiplier(vals[0])}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="edit-component-weight">Component Weight: {formComponentWeight.toFixed(2)}</Label>
              <Slider
                id="edit-component-weight"
                min={0.5}
                max={2.0}
                step={0.1}
                value={[formComponentWeight]}
                onValueChange={(vals) => setFormComponentWeight(vals[0])}
                className="mt-2"
              />
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
