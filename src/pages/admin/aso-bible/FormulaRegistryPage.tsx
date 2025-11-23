/**
 * Formula Registry Page
 *
 * Phase 14: Admin UI for viewing and managing formula registry
 *
 * Features:
 * - Table of all formulas with type, KPI usage count
 * - Filter by type, search by name
 * - Click row to open detail panel
 * - View formula components and parameters
 * - Permission-gated (internal users only)
 */

import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';
import { useFormulaRegistry } from '@/hooks/admin/useFormulaRegistry';
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
import { Search, Filter, Target } from 'lucide-react';
import { FormulaDetailPanel } from '@/components/admin/aso-bible/formula/FormulaDetailPanel';
import type { FormulaWithUsage } from '@/services/admin/adminFormulaService';

export default function FormulaRegistryPage() {
  const { isInternalYodel, isSuperAdmin } = usePermissions();

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedFormula, setSelectedFormula] = useState<FormulaWithUsage | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Permission check
  if (!isInternalYodel && !isSuperAdmin) {
    return <Navigate to="/no-access" replace />;
  }

  // Fetch formula registry
  const { data: registry, isLoading, error } = useFormulaRegistry();

  // Filter formulas
  const filteredFormulas = (registry?.formulas || []).filter((formula) => {
    const matchesSearch =
      formula.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      formula.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      formula.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === 'all' || formula.type === typeFilter;

    return matchesSearch && matchesType;
  });

  const handleRowClick = (formula: FormulaWithUsage) => {
    setSelectedFormula(formula);
    setIsPanelOpen(true);
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      weighted_sum: 'bg-blue-500/10 text-blue-600',
      ratio: 'bg-green-500/10 text-green-600',
      composite: 'bg-purple-500/10 text-purple-600',
      threshold_based: 'bg-orange-500/10 text-orange-600',
      custom: 'bg-gray-500/10 text-gray-600',
    };

    return (
      <Badge variant="outline" className={colors[type] || ''}>
        {type.replace('_', ' ')}
      </Badge>
    );
  };

  const getEditableBadge = (editable: boolean) => {
    return editable ? (
      <Badge className="bg-green-500">Editable</Badge>
    ) : (
      <Badge variant="outline">Read-Only</Badge>
    );
  };

  return (
    <AdminLayout currentPage="formula-registry">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Target className="w-8 h-8" />
              Formula Registry
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              View and manage all metadata scoring formulas
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
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search formulas by name, ID, or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="weighted_sum">Weighted Sum</SelectItem>
                  <SelectItem value="ratio">Ratio</SelectItem>
                  <SelectItem value="composite">Composite</SelectItem>
                  <SelectItem value="threshold_based">Threshold Based</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Total Formulas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {registry?.statistics.total || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Editable</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {registry?.statistics.editable || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Total KPI Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {registry?.statistics.totalUsage || 0}
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
              <div className="text-2xl font-bold">{filteredFormulas.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Formula Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              {filteredFormulas.length} Formula{filteredFormulas.length !== 1 ? 's' : ''}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12 text-gray-500">
                Loading formula registry...
              </div>
            ) : error ? (
              <div className="text-center py-12 text-red-500">
                Error loading formula registry. Please try again.
              </div>
            ) : filteredFormulas.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No formulas found matching your filters.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Formula Name</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>KPIs Using</TableHead>
                    <TableHead>Components</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFormulas.map((formula) => (
                    <TableRow
                      key={formula.id}
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                      onClick={() => handleRowClick(formula)}
                    >
                      <TableCell className="font-medium">{formula.label}</TableCell>
                      <TableCell>
                        <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">
                          {formula.id}
                        </code>
                      </TableCell>
                      <TableCell>{getTypeBadge(formula.type)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{formula.usageCount} KPI(s)</Badge>
                      </TableCell>
                      <TableCell>
                        {formula.components ? (
                          <Badge variant="outline">
                            {formula.components.length} component(s)
                          </Badge>
                        ) : formula.thresholds ? (
                          <Badge variant="outline">
                            {formula.thresholds.length} threshold(s)
                          </Badge>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {formula.deprecated ? (
                          <Badge variant="outline" className="bg-red-500/10 text-red-600">
                            Deprecated
                          </Badge>
                        ) : (
                          getEditableBadge(formula.admin?.editable || false)
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Type Distribution */}
        {registry?.statistics && (
          <Card>
            <CardHeader>
              <CardTitle>Formula Type Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {Object.entries(registry.statistics.byType).map(([type, count]) => (
                  <div
                    key={type}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      {getTypeBadge(type)}
                      <div className="text-xs text-gray-500 mt-1">
                        {type.replace('_', ' ')}
                      </div>
                    </div>
                    <div className="text-2xl font-bold">{count}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Formula Detail Panel */}
      {selectedFormula && (
        <FormulaDetailPanel
          formulaId={selectedFormula.id}
          isOpen={isPanelOpen}
          onClose={() => {
            setIsPanelOpen(false);
            setSelectedFormula(null);
          }}
        />
      )}
    </AdminLayout>
  );
}
