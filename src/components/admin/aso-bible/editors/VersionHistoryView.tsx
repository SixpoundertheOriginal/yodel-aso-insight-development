/**
 * Version History View
 *
 * Phase 13.3: Display audit log and version history
 *
 * Features:
 * - View all changes to the ruleset
 * - See who made changes and when
 * - View change details
 * - Rollback capability (future)
 */

import React from 'react';
import { useAuditLog } from '@/hooks/admin/useRulesets';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { History, RotateCcw } from 'lucide-react';

interface VersionHistoryViewProps {
  vertical?: string;
  market?: string;
  organizationId?: string;
}

export function VersionHistoryView({
  vertical,
  market,
  organizationId,
}: VersionHistoryViewProps) {
  const { data: auditLog, isLoading } = useAuditLog(100);

  // Filter audit log for current scope
  const filteredLog = (auditLog || []).filter((entry) => {
    if (organizationId && entry.organization_id === organizationId) return true;
    if (vertical && !market && entry.vertical === vertical && !entry.market) return true;
    if (market && !vertical && entry.market === market && !entry.vertical) return true;
    if (vertical && market && entry.vertical === vertical && entry.market === market) return true;
    return false;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'create':
        return <Badge className="bg-green-500">Created</Badge>;
      case 'update':
        return <Badge className="bg-blue-500">Updated</Badge>;
      case 'delete':
        return <Badge className="bg-red-500">Deleted</Badge>;
      case 'publish':
        return <Badge className="bg-purple-500">Published</Badge>;
      case 'rollback':
        return <Badge className="bg-orange-500">Rolled Back</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12 text-gray-500">
        Loading version history...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Version History</h3>
          <p className="text-sm text-gray-500">
            View all changes made to this ruleset
          </p>
        </div>
        <div className="text-sm text-gray-500">
          <History className="w-4 h-4 inline mr-1" />
          {filteredLog.length} change{filteredLog.length !== 1 ? 's' : ''}
        </div>
      </div>

      {filteredLog.length === 0 ? (
        <div className="text-center py-12 text-gray-500 border border-dashed rounded-lg">
          No version history available for this ruleset.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLog.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="text-sm">
                  {formatDate(entry.created_at)}
                </TableCell>
                <TableCell>{getActionBadge(entry.action)}</TableCell>
                <TableCell className="text-sm">
                  {entry.user_email || 'System'}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    v{entry.version_after || entry.version_before || '1'}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-md">
                  <div className="truncate text-sm text-gray-600">
                    {entry.notes || '—'}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Rollback to this version (coming soon)"
                      disabled
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {filteredLog.length > 0 && (
        <div className="text-xs text-gray-500 mt-4">
          Showing most recent 100 changes. Contact support to view older history.
        </div>
      )}
    </div>
  );
}
