/**
 * Rule Registry Page
 *
 * Phase 15: Admin UI for viewing and managing rule evaluators
 *
 * Features:
 * - Table of all rule evaluators with scope, family, severity, weight
 * - Filter by scope, family, severity
 * - Search by name or rule_id
 * - Click row to open detail panel
 * - Summary statistics
 * - Permission-gated (internal users only)
 */

import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';
import { useRuleRegistry } from '@/hooks/admin/useRuleRegistry';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
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
import { Search, Filter, Wrench } from 'lucide-react';
import { RuleDetailPanel } from '@/components/admin/aso-bible/rules/RuleDetailPanel';
import type { RuleWithAdminMeta } from '@/services/admin/adminRuleService';

export default function RuleRegistryPage() {
  const { isInternalYodel, isSuperAdmin } = usePermissions();

  const [searchTerm, setSearchTerm] = useState('');
  const [scopeFilter, setScopeFilter] = useState<string>('all');
  const [familyFilter, setFamilyFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [selectedRule, setSelectedRule] = useState<RuleWithAdminMeta | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Permission check
  if (!isInternalYodel && !isSuperAdmin) {
    return <Navigate to="/no-access" replace />;
  }

  // Fetch rule registry
  const { data: registry, isLoading, error } = useRuleRegistry();

  // Filter rules
  const filteredRules = (registry?.rules || []).filter((rule) => {
    const matchesSearch =
      rule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rule.rule_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rule.description && rule.description.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesScope = scopeFilter === 'all' || rule.scope === scopeFilter;
    const matchesFamily = familyFilter === 'all' || rule.family === familyFilter;
    const matchesSeverity =
      severityFilter === 'all' || rule.effective_severity === severityFilter;

    return matchesSearch && matchesScope && matchesFamily && matchesSeverity;
  });

  const handleRowClick = (rule: RuleWithAdminMeta) => {
    setSelectedRule(rule);
    setIsPanelOpen(true);
  };

  const getScopeBadge = (scope: string) => {
    const colors: Record<string, string> = {
      title: 'bg-blue-500/10 text-blue-600',
      subtitle: 'bg-green-500/10 text-green-600',
      description: 'bg-purple-500/10 text-purple-600',
      coverage: 'bg-orange-500/10 text-orange-600',
      intent: 'bg-pink-500/10 text-pink-600',
      global: 'bg-gray-500/10 text-gray-600',
    };

    return (
      <Badge variant="outline" className={colors[scope] || ''}>
        {scope}
      </Badge>
    );
  };

  const getFamilyBadge = (family: string) => {
    const colors: Record<string, string> = {
      ranking: 'bg-indigo-500/10 text-indigo-600',
      conversion: 'bg-emerald-500/10 text-emerald-600',
      diagnostic: 'bg-amber-500/10 text-amber-600',
      coverage: 'bg-cyan-500/10 text-cyan-600',
    };

    return (
      <Badge variant="outline" className={colors[family] || ''}>
        {family}
      </Badge>
    );
  };

  const getSeverityBadge = (severity: string) => {
    const colors: Record<string, string> = {
      critical: 'bg-red-500 text-white',
      strong: 'bg-orange-500 text-white',
      moderate: 'bg-yellow-500 text-white',
      optional: 'bg-blue-500 text-white',
      info: 'bg-gray-500 text-white',
    };

    return <Badge className={colors[severity] || ''}>{severity}</Badge>;
  };

  return (
    <AdminLayout currentPage="rule-registry">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Wrench className="w-8 h-8" />
              Rule Evaluator Registry
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              View and manage all metadata audit rule evaluators
            </p>
          </div>
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search rules by name, ID, or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Scope Filter */}
              <Select value={scopeFilter} onValueChange={setScopeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by scope" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Scopes</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                  <SelectItem value="subtitle">Subtitle</SelectItem>
                  <SelectItem value="description">Description</SelectItem>
                  <SelectItem value="coverage">Coverage</SelectItem>
                  <SelectItem value="intent">Intent</SelectItem>
                  <SelectItem value="global">Global</SelectItem>
                </SelectContent>
              </Select>

              {/* Family Filter */}
              <Select value={familyFilter} onValueChange={setFamilyFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by family" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Families</SelectItem>
                  <SelectItem value="ranking">Ranking</SelectItem>
                  <SelectItem value="conversion">Conversion</SelectItem>
                  <SelectItem value="diagnostic">Diagnostic</SelectItem>
                  <SelectItem value="coverage">Coverage</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Severity Filter (second row) */}
            <div className="mt-4">
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Filter by severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severity Levels</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="strong">Strong</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="optional">Optional</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Total Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {registry?.statistics.total || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Active</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {registry?.statistics.active || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">With Overrides</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {registry?.statistics.withOverrides || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Deprecated</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {registry?.statistics.deprecated || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Filtered Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredRules.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Rule Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              {filteredRules.length} Rule{filteredRules.length !== 1 ? 's' : ''}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12 text-gray-500">
                Loading rule evaluators...
              </div>
            ) : error ? (
              <div className="text-center py-12 text-red-500">
                Error loading rule registry. Please try again.
              </div>
            ) : filteredRules.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No rules found matching your filters.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rule ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead>Family</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Weight</TableHead>
                    <TableHead>Thresholds</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRules.map((rule) => (
                    <TableRow
                      key={rule.rule_id}
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                      onClick={() => handleRowClick(rule)}
                    >
                      <TableCell>
                        <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">
                          {rule.rule_id}
                        </code>
                      </TableCell>
                      <TableCell className="font-medium">{rule.name}</TableCell>
                      <TableCell>{getScopeBadge(rule.scope)}</TableCell>
                      <TableCell>{getFamilyBadge(rule.family)}</TableCell>
                      <TableCell>{getSeverityBadge(rule.effective_severity || rule.severity_default)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">
                            {(rule.effective_weight || rule.weight_default).toFixed(3)}
                          </span>
                          {rule.has_override && (
                            <Badge variant="outline" className="bg-orange-50 text-orange-600 text-xs">
                              {rule.override_multiplier?.toFixed(2)}x
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {rule.threshold_low !== undefined || rule.threshold_high !== undefined ? (
                          <span className="text-sm text-gray-600">
                            {rule.effective_threshold_low ?? rule.threshold_low} - {rule.effective_threshold_high ?? rule.threshold_high}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {rule.is_deprecated ? (
                          <Badge variant="outline" className="bg-red-500/10 text-red-600">
                            Deprecated
                          </Badge>
                        ) : rule.has_override ? (
                          <Badge className="bg-orange-500">Overridden</Badge>
                        ) : (
                          <Badge variant="outline">Default</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Scope Distribution */}
        {registry?.statistics && (
          <Card>
            <CardHeader>
              <CardTitle>Rule Distribution by Scope</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                {Object.entries(registry.statistics.byScope).map(([scope, count]) => (
                  <div
                    key={scope}
                    className="flex flex-col items-center justify-center p-3 border rounded-lg"
                  >
                    {getScopeBadge(scope)}
                    <div className="text-2xl font-bold mt-2">{count}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Family Distribution */}
        {registry?.statistics && (
          <Card>
            <CardHeader>
              <CardTitle>Rule Distribution by Family</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(registry.statistics.byFamily).map(([family, count]) => (
                  <div
                    key={family}
                    className="flex flex-col items-center justify-center p-3 border rounded-lg"
                  >
                    {getFamilyBadge(family)}
                    <div className="text-2xl font-bold mt-2">{count}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Rule Detail Panel */}
      {selectedRule && (
        <RuleDetailPanel
          ruleId={selectedRule.rule_id}
          isOpen={isPanelOpen}
          onClose={() => {
            setIsPanelOpen(false);
            setSelectedRule(null);
          }}
        />
      )}
    </AdminLayout>
  );
}
