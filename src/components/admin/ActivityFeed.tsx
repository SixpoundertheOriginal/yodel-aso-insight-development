/**
 * Real-Time Activity Feed Component
 *
 * Purpose: Show live feed of user actions for super admin monitoring
 * Features:
 * - Auto-refresh every 5 seconds
 * - Filter by action type, user, status
 * - Color-coded by action type
 * - Expandable details
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Search, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface AuditLogEntry {
  id: string;
  user_email: string | null;
  action: string;
  resource_type: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
  details: any;
  ip_address: string | null;
  user_agent: string | null;
}

export function ActivityFeed() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  // Load logs
  const loadLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Failed to load logs:', error);
        return;
      }

      setLogs(data || []);
    } catch (err) {
      console.error('Error loading logs:', err);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh every 5 seconds
  useEffect(() => {
    loadLogs();

    if (autoRefresh) {
      const interval = setInterval(loadLogs, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  // Apply filters
  useEffect(() => {
    let filtered = logs;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (log) =>
          log.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.resource_type?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((log) => log.status === statusFilter);
    }

    // Action filter
    if (actionFilter !== 'all') {
      filtered = filtered.filter((log) => log.action === actionFilter);
    }

    setFilteredLogs(filtered);
  }, [logs, searchQuery, statusFilter, actionFilter]);

  // Get unique actions for filter
  const uniqueActions = Array.from(new Set(logs.map((log) => log.action))).sort();

  // Get action badge color
  const getActionBadgeColor = (action: string) => {
    if (action.includes('login')) return 'bg-blue-500';
    if (action.includes('logout')) return 'bg-gray-500';
    if (action.includes('create')) return 'bg-green-500';
    if (action.includes('update') || action.includes('edit')) return 'bg-yellow-500';
    if (action.includes('delete')) return 'bg-red-500';
    if (action.includes('view') || action.includes('page_view')) return 'bg-purple-500';
    if (action.includes('export')) return 'bg-orange-500';
    return 'bg-gray-400';
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-500">Success</Badge>;
      case 'failure':
        return <Badge className="bg-red-500">Failure</Badge>;
      case 'denied':
        return <Badge className="bg-orange-500">Denied</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Live Activity Feed</CardTitle>
            <CardDescription>Real-time user actions (auto-refresh: {autoRefresh ? 'ON' : 'OFF'})</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
              {autoRefresh ? 'Pause' : 'Resume'}
            </Button>
            <Button variant="outline" size="sm" onClick={loadLogs} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="grid gap-4 md:grid-cols-3 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search user, action, resource..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="failure">Failure</SelectItem>
              <SelectItem value="denied">Denied</SelectItem>
            </SelectContent>
          </Select>

          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              {uniqueActions.map((action) => (
                <SelectItem key={action} value={action}>
                  {action}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Activity Feed */}
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {filteredLogs.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              {loading ? 'Loading...' : 'No activity found'}
            </p>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className="border rounded-lg p-3 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={getActionBadgeColor(log.action)}>
                        {log.action}
                      </Badge>
                      {getStatusBadge(log.status)}
                      {log.resource_type && (
                        <Badge variant="outline">{log.resource_type}</Badge>
                      )}
                    </div>

                    <div className="text-sm mt-2">
                      <span className="font-medium">{log.user_email || 'Unknown user'}</span>
                      <span className="text-muted-foreground">
                        {' '}• {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                      </span>
                    </div>

                    {log.error_message && (
                      <div className="text-sm text-red-600 mt-1 bg-red-50 dark:bg-red-950 p-2 rounded">
                        {log.error_message}
                      </div>
                    )}

                    {/* Expandable details */}
                    {(log.details || log.ip_address || log.user_agent) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                        className="mt-2 p-0 h-auto"
                      >
                        {expandedLog === log.id ? (
                          <>
                            <ChevronUp className="h-4 w-4 mr-1" />
                            Hide details
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-4 w-4 mr-1" />
                            Show details
                          </>
                        )}
                      </Button>
                    )}

                    {expandedLog === log.id && (
                      <div className="mt-2 p-3 bg-muted rounded text-sm space-y-2">
                        {log.ip_address && (
                          <div>
                            <span className="font-medium">IP Address:</span> {log.ip_address}
                          </div>
                        )}
                        {log.user_agent && (
                          <div>
                            <span className="font-medium">User Agent:</span> {log.user_agent}
                          </div>
                        )}
                        {log.details && Object.keys(log.details).length > 0 && (
                          <div>
                            <span className="font-medium">Details:</span>
                            <pre className="mt-1 p-2 bg-background rounded text-xs overflow-auto max-h-40">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
