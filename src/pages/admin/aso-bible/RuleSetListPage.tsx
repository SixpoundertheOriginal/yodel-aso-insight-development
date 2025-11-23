/**
 * ASO Bible Rule Set List Page
 *
 * Phase 13.3: Admin UI for viewing and managing all rulesets
 *
 * Features:
 * - List all rulesets (vertical, market, client)
 * - Search and filter
 * - View, edit, preview actions
 * - Permission-gated (internal users only)
 */

import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';
import { useRulesetList } from '@/hooks/admin/useRulesets';
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
import { Edit, Eye, Upload, Plus, Search } from 'lucide-react';
import type { RulesetListItem } from '@/services/admin/adminRulesetApi';

export default function RuleSetListPage() {
  const { isInternalYodel, isSuperAdmin } = usePermissions();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [scopeFilter, setScopeFilter] = useState<'vertical' | 'market' | 'client' | 'all'>('all');

  // Permission check
  if (!isInternalYodel && !isSuperAdmin) {
    return <Navigate to="/no-access" replace />;
  }

  // Fetch rulesets
  const { data: rulesets, isLoading, error } = useRulesetList(
    scopeFilter === 'all' ? undefined : scopeFilter
  );

  // Filter rulesets by search term
  const filteredRulesets = (rulesets || []).filter((ruleset) =>
    ruleset.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ruleset.vertical?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ruleset.market?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (ruleset: RulesetListItem) => {
    if (ruleset.vertical && ruleset.market) {
      navigate(`/admin/aso-bible/rulesets/${ruleset.vertical}/${ruleset.market}`);
    } else if (ruleset.vertical) {
      navigate(`/admin/aso-bible/rulesets/${ruleset.vertical}`);
    } else if (ruleset.market) {
      navigate(`/admin/aso-bible/rulesets/market/${ruleset.market}`);
    }
  };

  const handlePreview = (ruleset: RulesetListItem) => {
    // TODO: Open preview modal
    console.log('Preview ruleset:', ruleset);
  };

  return (
    <AdminLayout currentPage="aso-bible-rulesets">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              ASO Bible Rule Sets
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Manage vertical, market, and client-specific ASO rulesets
            </p>
          </div>
          <Button onClick={() => navigate('/admin/aso-bible/rulesets/new')}>
            <Plus className="w-4 h-4 mr-2" />
            Create New Ruleset
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
                    placeholder="Search rulesets..."
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

        {/* Rulesets Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              {filteredRulesets.length} Ruleset{filteredRulesets.length !== 1 ? 's' : ''}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12 text-gray-500">Loading rulesets...</div>
            ) : error ? (
              <div className="text-center py-12 text-red-500">
                Error loading rulesets. Please try again.
              </div>
            ) : filteredRulesets.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No rulesets found. Create your first ruleset to get started.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Vertical</TableHead>
                    <TableHead>Market</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRulesets.map((ruleset) => (
                    <TableRow key={ruleset.id}>
                      <TableCell className="font-medium">{ruleset.label}</TableCell>
                      <TableCell>
                        {ruleset.vertical ? (
                          <Badge variant="outline">{ruleset.vertical}</Badge>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {ruleset.market ? (
                          <Badge variant="outline">{ruleset.market}</Badge>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">v{ruleset.version}</Badge>
                      </TableCell>
                      <TableCell>
                        {ruleset.is_active ? (
                          <Badge className="bg-green-500">Active</Badge>
                        ) : (
                          <Badge variant="outline">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {new Date(ruleset.updated_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePreview(ruleset)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(ruleset)}
                          >
                            <Edit className="w-4 h-4" />
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

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Vertical Rulesets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {rulesets?.filter((r) => r.vertical && !r.market).length || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Market Rulesets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {rulesets?.filter((r) => r.market && !r.vertical).length || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Combined Rulesets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {rulesets?.filter((r) => r.vertical && r.market).length || 0}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
