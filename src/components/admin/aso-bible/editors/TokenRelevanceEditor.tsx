/**
 * Token Relevance Override Editor
 *
 * Phase 13.3: Editor for token relevance overrides (0-3 scoring)
 *
 * Features:
 * - View all token overrides for current scope
 * - Add new token overrides
 * - Edit existing overrides
 * - Delete overrides
 * - Real-time cache invalidation
 */

import React, { useState } from 'react';
import { useTokenOverrideMutations } from '@/hooks/admin/useRulesets';
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
import { Plus, Edit, Trash2 } from 'lucide-react';
import type { TokenRelevanceOverride } from '@/services/admin/adminOverrideApi';

interface TokenRelevanceEditorProps {
  vertical?: string;
  market?: string;
  organizationId?: string;
  tokens: TokenRelevanceOverride[];
}

export function TokenRelevanceEditor({
  vertical,
  market,
  organizationId,
  tokens,
}: TokenRelevanceEditorProps) {
  const { upsert, remove } = useTokenOverrideMutations(vertical, market, organizationId);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingToken, setEditingToken] = useState<TokenRelevanceOverride | null>(null);

  // Form state
  const [formToken, setFormToken] = useState('');
  const [formRelevance, setFormRelevance] = useState<0 | 1 | 2 | 3>(3);

  const handleAdd = async () => {
    if (!formToken.trim()) {
      alert('Please enter a token');
      return;
    }

    try {
      await upsert.mutateAsync({
        scope: getScope(),
        vertical,
        market,
        organization_id: organizationId,
        token: formToken.toLowerCase().trim(),
        relevance: formRelevance,
      });

      // Reset form
      setFormToken('');
      setFormRelevance(3);
      setIsAddDialogOpen(false);
    } catch (err) {
      console.error('Failed to add token:', err);
      alert('Failed to add token override');
    }
  };

  const handleEdit = async () => {
    if (!editingToken || !formToken.trim()) return;

    try {
      await upsert.mutateAsync({
        scope: getScope(),
        vertical,
        market,
        organization_id: organizationId,
        token: formToken.toLowerCase().trim(),
        relevance: formRelevance,
      });

      // Reset form
      setFormToken('');
      setFormRelevance(3);
      setEditingToken(null);
      setIsEditDialogOpen(false);
    } catch (err) {
      console.error('Failed to edit token:', err);
      alert('Failed to update token override');
    }
  };

  const handleDelete = async (id: string, token: string) => {
    if (!confirm(`Are you sure you want to delete the token "${token}"?`)) {
      return;
    }

    try {
      await remove.mutateAsync(id);
    } catch (err) {
      console.error('Failed to delete token:', err);
      alert('Failed to delete token override');
    }
  };

  const openEditDialog = (token: TokenRelevanceOverride) => {
    setEditingToken(token);
    setFormToken(token.token);
    setFormRelevance(token.relevance);
    setIsEditDialogOpen(true);
  };

  const getScope = (): 'vertical' | 'market' | 'client' => {
    if (organizationId) return 'client';
    if (vertical && !market) return 'vertical';
    return 'market';
  };

  const getRelevanceBadge = (relevance: number) => {
    switch (relevance) {
      case 0:
        return <Badge variant="outline" className="bg-red-500/10 text-red-500">Irrelevant</Badge>;
      case 1:
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500">Low</Badge>;
      case 2:
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-500">Medium</Badge>;
      case 3:
        return <Badge variant="outline" className="bg-green-500/10 text-green-500">High</Badge>;
      default:
        return <Badge variant="outline">{relevance}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Token Relevance Overrides</h3>
          <p className="text-sm text-gray-500">
            Override token relevance scores (0 = irrelevant, 3 = highly relevant)
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Token
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Token Override</DialogTitle>
              <DialogDescription>
                Add a new token relevance override for this ruleset.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="token">Token</Label>
                <Input
                  id="token"
                  placeholder="e.g., learn, study, language"
                  value={formToken}
                  onChange={(e) => setFormToken(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="relevance">Relevance Score</Label>
                <Select
                  value={formRelevance.toString()}
                  onValueChange={(val) => setFormRelevance(parseInt(val) as 0 | 1 | 2 | 3)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0 - Irrelevant (block)</SelectItem>
                    <SelectItem value="1">1 - Low relevance</SelectItem>
                    <SelectItem value="2">2 - Medium relevance</SelectItem>
                    <SelectItem value="3">3 - High relevance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAdd} disabled={upsert.isPending}>
                {upsert.isPending ? 'Adding...' : 'Add Token'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {tokens.length === 0 ? (
        <div className="text-center py-12 text-gray-500 border border-dashed rounded-lg">
          No token overrides yet. Add your first token to get started.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Token</TableHead>
              <TableHead>Relevance</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead>Version</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tokens.map((token) => (
              <TableRow key={token.id}>
                <TableCell className="font-mono">{token.token}</TableCell>
                <TableCell>{getRelevanceBadge(token.relevance)}</TableCell>
                <TableCell>
                  <Badge variant="outline">{token.scope}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">v{token.version}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(token)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(token.id, token.token)}
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
            <DialogTitle>Edit Token Override</DialogTitle>
            <DialogDescription>
              Update the relevance score for this token.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-token">Token</Label>
              <Input
                id="edit-token"
                value={formToken}
                onChange={(e) => setFormToken(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit-relevance">Relevance Score</Label>
              <Select
                value={formRelevance.toString()}
                onValueChange={(val) => setFormRelevance(parseInt(val) as 0 | 1 | 2 | 3)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0 - Irrelevant (block)</SelectItem>
                  <SelectItem value="1">1 - Low relevance</SelectItem>
                  <SelectItem value="2">2 - Medium relevance</SelectItem>
                  <SelectItem value="3">3 - High relevance</SelectItem>
                </SelectContent>
              </Select>
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
