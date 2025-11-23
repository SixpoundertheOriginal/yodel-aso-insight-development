/**
 * Hook Pattern Override Editor
 *
 * Phase 13.3: Editor for hook pattern overrides
 *
 * Features:
 * - Manage hook patterns across 6 categories
 * - Edit keywords and weights for each pattern
 * - Add/edit/delete hook overrides
 */

import React, { useState } from 'react';
import { useHookOverrideMutations } from '@/hooks/admin/useRulesets';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Plus, Edit, Trash2 } from 'lucide-react';
import type { HookPatternOverride } from '@/services/admin/adminOverrideApi';

interface HookPatternEditorProps {
  vertical?: string;
  market?: string;
  organizationId?: string;
  hooks: HookPatternOverride[];
}

const HOOK_CATEGORIES = [
  'problem_solution',
  'social_proof',
  'urgency_scarcity',
  'benefit_feature',
  'curiosity_intrigue',
  'question_engagement',
] as const;

export function HookPatternEditor({
  vertical,
  market,
  organizationId,
  hooks,
}: HookPatternEditorProps) {
  const { upsert, remove } = useHookOverrideMutations(vertical, market, organizationId);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingHook, setEditingHook] = useState<HookPatternOverride | null>(null);

  // Form state
  const [formCategory, setFormCategory] = useState<string>('problem_solution');
  const [formKeywords, setFormKeywords] = useState('');
  const [formWeight, setFormWeight] = useState('1.0');

  const handleAdd = async () => {
    if (!formKeywords.trim()) {
      alert('Please enter keywords');
      return;
    }

    const keywordArray = formKeywords
      .split(',')
      .map((k) => k.trim().toLowerCase())
      .filter((k) => k.length > 0);

    if (keywordArray.length === 0) {
      alert('Please enter at least one keyword');
      return;
    }

    try {
      await upsert.mutateAsync({
        scope: getScope(),
        vertical,
        market,
        organization_id: organizationId,
        category: formCategory,
        keywords: keywordArray,
        weight: parseFloat(formWeight),
      });

      // Reset form
      setFormCategory('problem_solution');
      setFormKeywords('');
      setFormWeight('1.0');
      setIsAddDialogOpen(false);
    } catch (err) {
      console.error('Failed to add hook pattern:', err);
      alert('Failed to add hook pattern override');
    }
  };

  const handleEdit = async () => {
    if (!editingHook || !formKeywords.trim()) return;

    const keywordArray = formKeywords
      .split(',')
      .map((k) => k.trim().toLowerCase())
      .filter((k) => k.length > 0);

    try {
      await upsert.mutateAsync({
        scope: getScope(),
        vertical,
        market,
        organization_id: organizationId,
        category: formCategory,
        keywords: keywordArray,
        weight: parseFloat(formWeight),
      });

      // Reset form
      setFormCategory('problem_solution');
      setFormKeywords('');
      setFormWeight('1.0');
      setEditingHook(null);
      setIsEditDialogOpen(false);
    } catch (err) {
      console.error('Failed to edit hook pattern:', err);
      alert('Failed to update hook pattern override');
    }
  };

  const handleDelete = async (id: string, category: string) => {
    if (!confirm(`Are you sure you want to delete the hook pattern for "${category}"?`)) {
      return;
    }

    try {
      await remove.mutateAsync(id);
    } catch (err) {
      console.error('Failed to delete hook pattern:', err);
      alert('Failed to delete hook pattern override');
    }
  };

  const openEditDialog = (hook: HookPatternOverride) => {
    setEditingHook(hook);
    setFormCategory(hook.category);
    setFormKeywords(hook.keywords.join(', '));
    setFormWeight(hook.weight.toString());
    setIsEditDialogOpen(true);
  };

  const getScope = (): 'vertical' | 'market' | 'client' => {
    if (organizationId) return 'client';
    if (vertical && !market) return 'vertical';
    return 'market';
  };

  const getCategoryLabel = (category: string) => {
    return category
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Hook Pattern Overrides</h3>
          <p className="text-sm text-gray-500">
            Define hook patterns with keywords and weights for scoring
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Hook Pattern
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Hook Pattern Override</DialogTitle>
              <DialogDescription>
                Define a new hook pattern with keywords and weight.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HOOK_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {getCategoryLabel(cat)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="keywords">Keywords (comma-separated)</Label>
                <Textarea
                  id="keywords"
                  placeholder="e.g., solve, fix, problem, solution"
                  value={formKeywords}
                  onChange={(e) => setFormKeywords(e.target.value)}
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="weight">Weight</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  value={formWeight}
                  onChange={(e) => setFormWeight(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Typical range: 0.5 to 2.0 (1.0 = neutral)
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAdd} disabled={upsert.isPending}>
                {upsert.isPending ? 'Adding...' : 'Add Pattern'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {hooks.length === 0 ? (
        <div className="text-center py-12 text-gray-500 border border-dashed rounded-lg">
          No hook pattern overrides yet. Add your first pattern to get started.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead>Keywords</TableHead>
              <TableHead>Weight</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hooks.map((hook) => (
              <TableRow key={hook.id}>
                <TableCell>
                  <Badge variant="outline">{getCategoryLabel(hook.category)}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {hook.keywords.slice(0, 5).map((kw, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {kw}
                      </Badge>
                    ))}
                    {hook.keywords.length > 5 && (
                      <Badge variant="secondary" className="text-xs">
                        +{hook.keywords.length - 5} more
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-mono">{hook.weight.toFixed(1)}x</span>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{hook.scope}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(hook)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(hook.id, hook.category)}
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
            <DialogTitle>Edit Hook Pattern Override</DialogTitle>
            <DialogDescription>
              Update the hook pattern configuration.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-category">Category</Label>
              <Select value={formCategory} onValueChange={setFormCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HOOK_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {getCategoryLabel(cat)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-keywords">Keywords (comma-separated)</Label>
              <Textarea
                id="edit-keywords"
                value={formKeywords}
                onChange={(e) => setFormKeywords(e.target.value)}
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="edit-weight">Weight</Label>
              <Input
                id="edit-weight"
                type="number"
                step="0.1"
                min="0"
                max="5"
                value={formWeight}
                onChange={(e) => setFormWeight(e.target.value)}
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
