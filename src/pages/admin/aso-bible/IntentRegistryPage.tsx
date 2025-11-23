/**
 * Intent Pattern Registry Page
 *
 * Phase 16: Admin UI for viewing and managing intent pattern registry
 *
 * Features:
 * - Table of all intent patterns with type, weight, scope, examples
 * - Filter by intent type, scope, search by pattern/tags
 * - Click row to open detail panel
 * - View effective weights (base + overrides)
 * - Permission-gated (internal users only)
 */

import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';
import { useIntentRegistry } from '@/hooks/admin/useIntentRegistry';
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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Filter, Brain, Plus } from 'lucide-react';
import { IntentDetailPanel } from '@/components/admin/aso-bible/intent/IntentDetailPanel';
import type { IntentPatternWithAdminMeta, IntentType, IntentScope } from '@/services/admin/adminIntentService';

export default function IntentRegistryPage() {
  const { isInternalYodel, isSuperAdmin } = usePermissions();

  const [searchTerm, setSearchTerm] = useState('');
  const [intentTypeFilter, setIntentTypeFilter] = useState<string>('all');
  const [scopeFilter, setScopeFilter] = useState<string>('all');
  const [selectedPattern, setSelectedPattern] = useState<IntentPatternWithAdminMeta | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Permission check
  if (!isInternalYodel && !isSuperAdmin) {
    return <Navigate to="/no-access" replace />;
  }

  // Fetch intent pattern registry
  const { data: registry, isLoading, error } = useIntentRegistry();

  // Filter patterns
  const filteredPatterns = (registry?.patterns || []).filter((pattern) => {
    const matchesSearch =
      pattern.pattern.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pattern.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pattern.example?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pattern.admin_tags?.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesIntentType = intentTypeFilter === 'all' || pattern.intent_type === intentTypeFilter;
    const matchesScope = scopeFilter === 'all' || pattern.scope === scopeFilter;

    return matchesSearch && matchesIntentType && matchesScope;
  });

  const handleRowClick = (pattern: IntentPatternWithAdminMeta) => {
    setSelectedPattern(pattern);
    setIsPanelOpen(true);
  };

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

  const getScopeBadge = (scope: IntentScope) => {
    const colors = {
      base: 'bg-gray-500/10 text-gray-600',
      vertical: 'bg-blue-500/10 text-blue-600',
      market: 'bg-green-500/10 text-green-600',
      client: 'bg-purple-500/10 text-purple-600',
      app: 'bg-orange-500/10 text-orange-600',
    };
    return (
      <Badge variant="outline" className={colors[scope]}>
        {scope.charAt(0).toUpperCase() + scope.slice(1)}
      </Badge>
    );
  };

  const getWeightBadge = (weight: number) => {
    if (weight < 1.0) {
      return <Badge variant="outline" className="bg-gray-500/10">Low</Badge>;
    } else if (weight < 1.5) {
      return <Badge variant="outline" className="bg-blue-500/10 text-blue-600">Medium</Badge>;
    } else {
      return <Badge variant="outline" className="bg-green-500/10 text-green-600">High</Badge>;
    }
  };

  return (
    <AdminLayout currentPage="intent-registry">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center gap-3">
              <Brain className="w-8 h-8 text-purple-600" />
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Intent Pattern Registry
              </h1>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              View and manage search intent classification patterns
            </p>
          </div>
          <Button variant="outline" size="sm" disabled>
            <Plus className="w-4 h-4 mr-2" />
            Add Pattern
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search patterns, examples, tags..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select
                value={intentTypeFilter}
                onValueChange={setIntentTypeFilter}
              >
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Filter by intent type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Intent Types</SelectItem>
                  <SelectItem value="informational">Informational</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                  <SelectItem value="navigational">Navigational</SelectItem>
                  <SelectItem value="transactional">Transactional</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={scopeFilter}
                onValueChange={setScopeFilter}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by scope" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Scopes</SelectItem>
                  <SelectItem value="base">Base</SelectItem>
                  <SelectItem value="vertical">Vertical</SelectItem>
                  <SelectItem value="market">Market</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="app">App</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Total Patterns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {registry?.statistics.total || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Informational</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {registry?.statistics.byIntentType.informational || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Commercial</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {registry?.statistics.byIntentType.commercial || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Transactional</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {registry?.statistics.byIntentType.transactional || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">With Overrides</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {registry?.statistics.withOverrides || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pattern Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              {filteredPatterns.length} Pattern{filteredPatterns.length !== 1 ? 's' : ''}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12 text-gray-500">Loading intent patterns...</div>
            ) : error ? (
              <div className="text-center py-12 text-red-500">
                Error loading intent patterns. Please try again.
              </div>
            ) : filteredPatterns.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No patterns found matching your filters.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pattern</TableHead>
                    <TableHead>Intent Type</TableHead>
                    <TableHead>Weight</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead>Example</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPatterns.map((pattern) => (
                    <TableRow
                      key={pattern.id}
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                      onClick={() => handleRowClick(pattern)}
                    >
                      <TableCell className="font-medium">
                        <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                          {pattern.pattern}
                        </code>
                        {pattern.is_regex && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            regex
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {getIntentTypeBadge(pattern.intent_type)}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {pattern.weight.toFixed(1)}
                        {pattern.has_override && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            {pattern.effective_weight?.toFixed(1)}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="font-mono text-xs">
                          {pattern.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {getScopeBadge(pattern.scope)}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">
                        {pattern.example || '—'}
                      </TableCell>
                      <TableCell>
                        {pattern.admin_tags && pattern.admin_tags.length > 0 ? (
                          <div className="flex gap-1 flex-wrap">
                            {pattern.admin_tags.slice(0, 2).map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {pattern.admin_tags.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{pattern.admin_tags.length - 2}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {pattern.is_active ? (
                          <Badge className="bg-green-500">Active</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-500/10">Inactive</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Intent Detail Panel */}
      {selectedPattern && (
        <IntentDetailPanel
          patternId={selectedPattern.id}
          isOpen={isPanelOpen}
          onClose={() => {
            setIsPanelOpen(false);
            setSelectedPattern(null);
          }}
        />
      )}
    </AdminLayout>
  );
}
