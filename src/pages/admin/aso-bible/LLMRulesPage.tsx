/**
 * LLM Visibility Rules Management Page
 *
 * Provides admin interface for managing LLM visibility rule overrides.
 *
 * Features:
 * - List all rule overrides (vertical, market, client)
 * - Create/edit/delete overrides
 * - Preview merged rules
 * - Version history
 * - Permission-gated (internal users only)
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Edit, Eye, Trash2, Plus, Search, History, Code, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AdminLLMRulesApi, type LLMRuleOverrideListItem } from '@/services/admin/adminLLMRulesApi';
import type { LLMVisibilityRules } from '@/engine/llmVisibility/llmVisibility.types';

export default function LLMRulesPage() {
  const { isInternalYodel, isSuperAdmin } = usePermissions();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [scopeFilter, setScopeFilter] = useState<'vertical' | 'market' | 'client' | 'all'>('all');
  const [ruleOverrides, setRuleOverrides] = useState<LLMRuleOverrideListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit/Create Dialog State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingOverride, setEditingOverride] = useState<LLMRuleOverrideListItem | null>(null);
  const [editorScope, setEditorScope] = useState<'vertical' | 'market' | 'client'>('vertical');
  const [editorIdentifier, setEditorIdentifier] = useState('');
  const [editorRulesJson, setEditorRulesJson] = useState('');
  const [editorNotes, setEditorNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Preview Dialog State
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<LLMVisibilityRules | null>(null);

  // Delete Confirmation Dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Permission check
  if (!isInternalYodel && !isSuperAdmin) {
    return <Navigate to="/no-access" replace />;
  }

  // Load rule overrides
  useEffect(() => {
    loadRuleOverrides();
  }, [scopeFilter]);

  const loadRuleOverrides = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await AdminLLMRulesApi.getRuleOverrideList(
        scopeFilter === 'all' ? undefined : scopeFilter
      );
      setRuleOverrides(data);
    } catch (err) {
      console.error('Error loading rule overrides:', err);
      setError('Failed to load rule overrides');
      toast({
        title: 'Error',
        description: 'Failed to load rule overrides. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Filter by search term
  const filteredOverrides = ruleOverrides.filter((override) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      override.vertical?.toLowerCase().includes(searchLower) ||
      override.market?.toLowerCase().includes(searchLower) ||
      override.scope.toLowerCase().includes(searchLower) ||
      override.notes?.toLowerCase().includes(searchLower)
    );
  });

  // Open create dialog
  const handleCreate = () => {
    setEditingOverride(null);
    setEditorScope('vertical');
    setEditorIdentifier('');
    setEditorRulesJson(JSON.stringify({ weights: {} }, null, 2));
    setEditorNotes('');
    setIsEditorOpen(true);
  };

  // Open edit dialog
  const handleEdit = async (override: LLMRuleOverrideListItem) => {
    try {
      const detail = await AdminLLMRulesApi.getRuleOverride(override.id);
      if (!detail) {
        toast({
          title: 'Error',
          description: 'Failed to load rule override details',
          variant: 'destructive',
        });
        return;
      }

      setEditingOverride(override);
      setEditorScope(detail.scope);
      setEditorIdentifier(detail.vertical || detail.market || detail.organization_id || '');
      setEditorRulesJson(JSON.stringify(detail.rules_override, null, 2));
      setEditorNotes(detail.notes || '');
      setIsEditorOpen(true);
    } catch (err) {
      console.error('Error loading override details:', err);
      toast({
        title: 'Error',
        description: 'Failed to load rule override details',
        variant: 'destructive',
      });
    }
  };

  // Preview merged rules
  const handlePreview = async (override: LLMRuleOverrideListItem) => {
    try {
      const detail = await AdminLLMRulesApi.getRuleOverride(override.id);
      if (!detail?.mergedPreview) {
        toast({
          title: 'Error',
          description: 'Failed to generate preview',
          variant: 'destructive',
        });
        return;
      }

      setPreviewData(detail.mergedPreview);
      setIsPreviewOpen(true);
    } catch (err) {
      console.error('Error generating preview:', err);
      toast({
        title: 'Error',
        description: 'Failed to generate preview',
        variant: 'destructive',
      });
    }
  };

  // Save (create or update) override
  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Parse JSON
      let rulesOverride: Partial<LLMVisibilityRules>;
      try {
        rulesOverride = JSON.parse(editorRulesJson);
      } catch (err) {
        toast({
          title: 'Invalid JSON',
          description: 'Please check your JSON syntax',
          variant: 'destructive',
        });
        return;
      }

      // Prepare request
      const request = {
        scope: editorScope,
        vertical: editorScope === 'vertical' ? editorIdentifier : undefined,
        market: editorScope === 'market' ? editorIdentifier : undefined,
        organizationId: editorScope === 'client' ? editorIdentifier : undefined,
        rulesOverride,
        notes: editorNotes || undefined,
      };

      // Publish
      const result = await AdminLLMRulesApi.publishRuleOverride(request);

      if (result.success) {
        toast({
          title: 'Success',
          description: 'Rule override saved successfully',
        });
        setIsEditorOpen(false);
        loadRuleOverrides();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to save rule override',
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('Error saving override:', err);
      toast({
        title: 'Error',
        description: 'Failed to save rule override',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Delete override
  const handleDelete = async (id: string) => {
    try {
      const success = await AdminLLMRulesApi.deleteRuleOverride(id);
      if (success) {
        toast({
          title: 'Success',
          description: 'Rule override deleted successfully',
        });
        loadRuleOverrides();
      } else {
        toast({
          title: 'Error',
          description: 'Failed to delete rule override',
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('Error deleting override:', err);
      toast({
        title: 'Error',
        description: 'Failed to delete rule override',
        variant: 'destructive',
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setDeleteTargetId(null);
    }
  };

  return (
    <AdminLayout currentPage="aso-bible-llm-rules">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              LLM Visibility Rules
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Manage LLM discoverability rule overrides for verticals, markets, and clients
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Create New Override
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search overrides..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select
                value={scopeFilter}
                onValueChange={(value: any) => setScopeFilter(value)}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by scope" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Scopes</SelectItem>
                  <SelectItem value="vertical">Vertical Only</SelectItem>
                  <SelectItem value="market">Market Only</SelectItem>
                  <SelectItem value="client">Client Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Overrides Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              {filteredOverrides.length} Rule Override{filteredOverrides.length !== 1 ? 's' : ''}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12 text-gray-500">Loading rule overrides...</div>
            ) : error ? (
              <div className="text-center py-12 text-red-500">{error}</div>
            ) : filteredOverrides.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No rule overrides found. Create your first override to get started.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Scope</TableHead>
                    <TableHead>Identifier</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOverrides.map((override) => (
                    <TableRow key={override.id}>
                      <TableCell>
                        <Badge variant="outline">{override.scope}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {override.vertical || override.market || override.organization_id || '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">v{override.version}</Badge>
                      </TableCell>
                      <TableCell>
                        {override.is_active ? (
                          <Badge className="bg-green-500">Active</Badge>
                        ) : (
                          <Badge variant="outline">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {new Date(override.updated_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePreview(override)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(override)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setDeleteTargetId(override.id);
                              setIsDeleteDialogOpen(true);
                            }}
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
          </CardContent>
        </Card>

        {/* Editor Dialog */}
        <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingOverride ? 'Edit Rule Override' : 'Create Rule Override'}
              </DialogTitle>
              <DialogDescription>
                Define custom LLM visibility rules for a specific vertical, market, or client
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Scope Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Scope</Label>
                  <Select value={editorScope} onValueChange={(value: any) => setEditorScope(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vertical">Vertical</SelectItem>
                      <SelectItem value="market">Market</SelectItem>
                      <SelectItem value="client">Client</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>
                    {editorScope === 'vertical' ? 'Vertical ID' :
                     editorScope === 'market' ? 'Market ID' :
                     'Organization ID'}
                  </Label>
                  <Input
                    placeholder={
                      editorScope === 'vertical' ? 'e.g., language_learning' :
                      editorScope === 'market' ? 'e.g., us' :
                      'Organization UUID'
                    }
                    value={editorIdentifier}
                    onChange={(e) => setEditorIdentifier(e.target.value)}
                  />
                </div>
              </div>

              {/* Rules JSON Editor */}
              <div className="space-y-2">
                <Label>Rules Override (JSON)</Label>
                <Textarea
                  className="font-mono text-sm h-96"
                  value={editorRulesJson}
                  onChange={(e) => setEditorRulesJson(e.target.value)}
                  placeholder='{"weights": {"factual_grounding": 0.3}}'
                />
                <p className="text-xs text-gray-500">
                  Partial LLMVisibilityRules object. Only include fields you want to override.
                </p>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>Notes (Optional)</Label>
                <Textarea
                  placeholder="Describe why this override is needed..."
                  value={editorNotes}
                  onChange={(e) => setEditorNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditorOpen(false)} disabled={isSaving}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Override'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Preview Dialog */}
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Merged Rules Preview</DialogTitle>
              <DialogDescription>
                Preview of final merged rules after applying this override
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <Tabs defaultValue="weights">
                <TabsList>
                  <TabsTrigger value="weights">Weights</TabsTrigger>
                  <TabsTrigger value="structure">Structure</TabsTrigger>
                  <TabsTrigger value="clusters">Clusters</TabsTrigger>
                  <TabsTrigger value="json">Full JSON</TabsTrigger>
                </TabsList>

                <TabsContent value="weights" className="space-y-2">
                  {previewData && (
                    <div className="space-y-2">
                      {Object.entries(previewData.weights).map(([key, value]) => (
                        <div key={key} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                          <span className="font-medium">{key}</span>
                          <Badge>{(value * 100).toFixed(0)}%</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="structure">
                  {previewData && (
                    <pre className="p-4 bg-gray-50 dark:bg-gray-800 rounded text-sm overflow-auto">
                      {JSON.stringify(previewData.structure_rules, null, 2)}
                    </pre>
                  )}
                </TabsContent>

                <TabsContent value="clusters">
                  {previewData && (
                    <pre className="p-4 bg-gray-50 dark:bg-gray-800 rounded text-sm overflow-auto">
                      {JSON.stringify(previewData.clusters, null, 2)}
                    </pre>
                  )}
                </TabsContent>

                <TabsContent value="json">
                  {previewData && (
                    <pre className="p-4 bg-gray-50 dark:bg-gray-800 rounded text-sm overflow-auto">
                      {JSON.stringify(previewData, null, 2)}
                    </pre>
                  )}
                </TabsContent>
              </Tabs>
            </div>

            <DialogFooter>
              <Button onClick={() => setIsPreviewOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Rule Override?</DialogTitle>
              <DialogDescription>
                This action cannot be undone. The rule override will be permanently deleted.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsDeleteDialogOpen(false);
                  setDeleteTargetId(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteTargetId && handleDelete(deleteTargetId)}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
