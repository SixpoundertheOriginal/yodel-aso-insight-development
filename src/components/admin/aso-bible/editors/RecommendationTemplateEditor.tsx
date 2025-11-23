/**
 * Recommendation Template Editor
 *
 * Phase 13.3: Editor for recommendation message templates
 *
 * Features:
 * - View all recommendation templates
 * - Add/edit template messages for different recommendation types
 * - Delete templates
 * - Preview formatted messages
 */

import React, { useState } from 'react';
import { useRecommendationOverrideMutations } from '@/hooks/admin/useRulesets';
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
import { Plus, Edit, Trash2, Eye } from 'lucide-react';
import type { RecommendationTemplateOverride } from '@/services/admin/adminOverrideApi';

interface RecommendationTemplateEditorProps {
  vertical?: string;
  market?: string;
  organizationId?: string;
  recommendations: RecommendationTemplateOverride[];
}

const RECOMMENDATION_TYPES = [
  { value: 'missing_hook', label: 'Missing Hook' },
  { value: 'weak_title', label: 'Weak Title' },
  { value: 'improve_description', label: 'Improve Description' },
  { value: 'add_screenshots', label: 'Add Screenshots' },
  { value: 'update_keywords', label: 'Update Keywords' },
  { value: 'competitor_insight', label: 'Competitor Insight' },
] as const;

export function RecommendationTemplateEditor({
  vertical,
  market,
  organizationId,
  recommendations,
}: RecommendationTemplateEditorProps) {
  const { upsert, remove } = useRecommendationOverrideMutations(vertical, market, organizationId);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingRec, setEditingRec] = useState<RecommendationTemplateOverride | null>(null);

  // Form state
  const [formType, setFormType] = useState('missing_hook');
  const [formMessage, setFormMessage] = useState('');

  const handleAdd = async () => {
    if (!formMessage.trim()) {
      alert('Please enter a message template');
      return;
    }

    try {
      await upsert.mutateAsync({
        scope: getScope(),
        vertical,
        market,
        organization_id: organizationId,
        recommendation_type: formType,
        message_template: formMessage.trim(),
      });

      // Reset form
      setFormType('missing_hook');
      setFormMessage('');
      setIsAddDialogOpen(false);
    } catch (err) {
      console.error('Failed to add recommendation template:', err);
      alert('Failed to add recommendation template');
    }
  };

  const handleEdit = async () => {
    if (!editingRec || !formMessage.trim()) return;

    try {
      await upsert.mutateAsync({
        scope: getScope(),
        vertical,
        market,
        organization_id: organizationId,
        recommendation_type: formType,
        message_template: formMessage.trim(),
      });

      // Reset form
      setFormType('missing_hook');
      setFormMessage('');
      setEditingRec(null);
      setIsEditDialogOpen(false);
    } catch (err) {
      console.error('Failed to edit recommendation template:', err);
      alert('Failed to update recommendation template');
    }
  };

  const handleDelete = async (id: string, type: string) => {
    if (!confirm(`Are you sure you want to delete the template for "${type}"?`)) {
      return;
    }

    try {
      await remove.mutateAsync(id);
    } catch (err) {
      console.error('Failed to delete recommendation template:', err);
      alert('Failed to delete recommendation template');
    }
  };

  const openEditDialog = (rec: RecommendationTemplateOverride) => {
    setEditingRec(rec);
    setFormType(rec.recommendation_type);
    setFormMessage(rec.message_template);
    setIsEditDialogOpen(true);
  };

  const getScope = (): 'vertical' | 'market' | 'client' => {
    if (organizationId) return 'client';
    if (vertical && !market) return 'vertical';
    return 'market';
  };

  const getTypeLabel = (type: string) => {
    return RECOMMENDATION_TYPES.find((t) => t.value === type)?.label || type;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Recommendation Templates</h3>
          <p className="text-sm text-gray-500">
            Customize recommendation messages shown to users based on audit findings
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Recommendation Template</DialogTitle>
              <DialogDescription>
                Create a custom message template for a specific recommendation type.
                Use {'{variable}'} syntax for dynamic values.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="type">Recommendation Type</Label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RECOMMENDATION_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="message">Message Template</Label>
                <Textarea
                  id="message"
                  placeholder="e.g., Your title could be improved by adding {suggestion}. This will help with {benefit}."
                  value={formMessage}
                  onChange={(e) => setFormMessage(e.target.value)}
                  rows={5}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Available variables: {'{app_name}'}, {'{vertical}'}, {'{market}'}, {'{suggestion}'}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAdd} disabled={upsert.isPending}>
                {upsert.isPending ? 'Adding...' : 'Add Template'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {recommendations.length === 0 ? (
        <div className="text-center py-12 text-gray-500 border border-dashed rounded-lg">
          No recommendation templates yet. Add your first template to get started.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Message Preview</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead>Version</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recommendations.map((rec) => (
              <TableRow key={rec.id}>
                <TableCell>
                  <Badge variant="outline">{getTypeLabel(rec.recommendation_type)}</Badge>
                </TableCell>
                <TableCell className="max-w-md">
                  <div className="truncate text-sm">
                    {rec.message_template.length > 80
                      ? rec.message_template.substring(0, 80) + '...'
                      : rec.message_template}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{rec.scope}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">v{rec.version}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => alert(rec.message_template)}
                      title="View full template"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(rec)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(rec.id, rec.recommendation_type)}
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Recommendation Template</DialogTitle>
            <DialogDescription>
              Update the message template for this recommendation type.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-type">Recommendation Type</Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RECOMMENDATION_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-message">Message Template</Label>
              <Textarea
                id="edit-message"
                value={formMessage}
                onChange={(e) => setFormMessage(e.target.value)}
                rows={5}
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
