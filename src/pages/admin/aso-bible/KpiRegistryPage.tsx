/**
 * KPI Registry Page
 *
 * Phase 14: Admin UI for viewing and managing KPI registry
 *
 * Features:
 * - Table of all KPIs with family, weight, formula info
 * - Filter by family, search by name
 * - Click row to open detail panel
 * - View effective weights (base + overrides)
 * - Permission-gated (internal users only)
 */

import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';
import { useKpiRegistry } from '@/hooks/admin/useKpiRegistry';
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
import { Search, Filter } from 'lucide-react';
import { KpiDetailPanel } from '@/components/admin/aso-bible/kpi/KpiDetailPanel';
import type { KpiWithAdminMeta } from '@/services/admin/adminKpiService';

export default function KpiRegistryPage() {
  const { isInternalYodel, isSuperAdmin } = usePermissions();

  const [searchTerm, setSearchTerm] = useState('');
  const [familyFilter, setFamilyFilter] = useState<string>('all');
  const [selectedKpi, setSelectedKpi] = useState<KpiWithAdminMeta | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Permission check
  if (!isInternalYodel && !isSuperAdmin) {
    return <Navigate to="/no-access" replace />;
  }

  // Fetch KPI registry
  const { data: registry, isLoading, error } = useKpiRegistry();

  // Filter KPIs
  const filteredKpis = (registry?.kpis || []).filter((kpi) => {
    const matchesSearch =
      kpi.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      kpi.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFamily = familyFilter === 'all' || kpi.familyId === familyFilter;

    return matchesSearch && matchesFamily;
  });

  const handleRowClick = (kpi: KpiWithAdminMeta) => {
    setSelectedKpi(kpi);
    setIsPanelOpen(true);
  };

  const getFamilyLabel = (familyId: string) => {
    const family = registry?.families.find((f) => f.id === familyId);
    return family?.label || familyId;
  };

  const getWeightBadge = (weight: number) => {
    if (weight < 0.3) {
      return <Badge variant="outline" className="bg-gray-500/10">Low</Badge>;
    } else if (weight < 0.7) {
      return <Badge variant="outline" className="bg-blue-500/10 text-blue-600">Medium</Badge>;
    } else {
      return <Badge variant="outline" className="bg-green-500/10 text-green-600">High</Badge>;
    }
  };

  return (
    <AdminLayout currentPage="kpi-registry">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              KPI Registry
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              View and manage all metadata scoring KPIs
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
                    placeholder="Search KPIs by name or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select
                value={familyFilter}
                onValueChange={setFamilyFilter}
              >
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Filter by family" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Families</SelectItem>
                  {(registry?.families || []).map((family) => (
                    <SelectItem key={family.id} value={family.id}>
                      {family.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Total KPIs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {registry?.totalKpis || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Families</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {registry?.totalFamilies || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Filtered Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {filteredKpis.length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">With Overrides</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(registry?.kpis || []).filter((k) => k.hasOverride).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* KPI Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              {filteredKpis.length} KPI{filteredKpis.length !== 1 ? 's' : ''}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12 text-gray-500">Loading KPI registry...</div>
            ) : error ? (
              <div className="text-center py-12 text-red-500">
                Error loading KPI registry. Please try again.
              </div>
            ) : filteredKpis.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No KPIs found matching your filters.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>KPI Name</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Family</TableHead>
                    <TableHead>Base Weight</TableHead>
                    <TableHead>Effective Weight</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredKpis.map((kpi) => (
                    <TableRow
                      key={kpi.id}
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                      onClick={() => handleRowClick(kpi)}
                    >
                      <TableCell className="font-medium">{kpi.label}</TableCell>
                      <TableCell>
                        <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">
                          {kpi.id}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getFamilyLabel(kpi.familyId)}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {kpi.weight.toFixed(2)}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {kpi.effectiveWeight?.toFixed(2) || kpi.weight.toFixed(2)}
                        {kpi.hasOverride && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            {kpi.overrideMultiplier}x
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {getWeightBadge(kpi.effectiveWeight || kpi.weight)}
                      </TableCell>
                      <TableCell>
                        {kpi.enabled === false ? (
                          <Badge variant="outline" className="bg-gray-500/10">Disabled</Badge>
                        ) : kpi.experimental ? (
                          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600">Experimental</Badge>
                        ) : (
                          <Badge className="bg-green-500">Active</Badge>
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

      {/* KPI Detail Panel */}
      {selectedKpi && (
        <KpiDetailPanel
          kpiId={selectedKpi.id}
          isOpen={isPanelOpen}
          onClose={() => {
            setIsPanelOpen(false);
            setSelectedKpi(null);
          }}
        />
      )}
    </AdminLayout>
  );
}
