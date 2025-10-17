import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Play, 
  Pause, 
  Trash2, 
  Search, 
  Filter,
  CheckSquare,
  Square,
  Target,
  MessageSquare,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  MoreHorizontal,
  RefreshCw
} from 'lucide-react';

interface AuditRun {
  id: string;
  name: string;
  app_id: string;
  status: 'pending' | 'running' | 'completed' | 'error' | 'paused';
  total_queries: number;
  completed_queries: number;
  started_at?: string;
  completed_at?: string;
  description?: string;
  created_at: string;
  audit_type: string;
  topic_data?: any;
}

interface AuditRunManagerProps {
  auditRuns: AuditRun[];
  selectedAuditRun: AuditRun | null;
  onAuditRunSelect: (run: AuditRun) => void;
  onRefresh: () => void;
  organizationId: string;
}

export const AuditRunManager: React.FC<AuditRunManagerProps> = ({
  auditRuns,
  selectedAuditRun,
  onAuditRunSelect,
  onRefresh,
  organizationId
}) => {
  const { toast } = useToast();
  
  // Selection and filtering state
  const [selectedRuns, setSelectedRuns] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  
  // Bulk delete confirmation
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  
  // Filter runs based on search and filters
  const filteredRuns = auditRuns.filter(run => {
    const matchesSearch = run.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         run.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || run.status === statusFilter;
    const matchesType = typeFilter === 'all' || run.audit_type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const handleSelectRun = (runId: string, checked: boolean) => {
    const newSelected = new Set(selectedRuns);
    if (checked) {
      newSelected.add(runId);
    } else {
      newSelected.delete(runId);
    }
    setSelectedRuns(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRuns(new Set(filteredRuns.map(run => run.id)));
    } else {
      setSelectedRuns(new Set());
    }
  };

  const deleteAuditRun = async (runId: string) => {
    try {
      // Delete related queries first
      const { error: queriesError } = await supabase
        .from('chatgpt_queries' as any)
        .delete()
        .eq('audit_run_id', runId)
        .eq('organization_id', organizationId);

      if (queriesError) throw queriesError;

      // Delete related query results
      const { error: resultsError } = await supabase
        .from('chatgpt_query_results')
        .delete()
        .eq('audit_run_id', runId)
        .eq('organization_id', organizationId);

      if (resultsError) throw resultsError;

      // Delete the audit run
      const { error: runError } = await supabase
        .from('chatgpt_audit_runs')
        .delete()
        .eq('id', runId)
        .eq('organization_id', organizationId);

      if (runError) throw runError;

      toast({
        title: 'Audit Deleted',
        description: 'Audit run and all related data have been removed.',
      });

      onRefresh();
    } catch (error) {
      console.error('Error deleting audit run:', error);
      toast({
        title: 'Delete Failed',
        description: 'Failed to delete audit run. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const bulkDeleteSelected = async () => {
    try {
      const runIds = Array.from(selectedRuns);
      
      // Delete in parallel for better performance
      await Promise.all([
        // Delete queries
        supabase
          .from('chatgpt_queries' as any)
          .delete()
          .in('audit_run_id', runIds)
          .eq('organization_id', organizationId),
        
        // Delete query results
        supabase
          .from('chatgpt_query_results')
          .delete()
          .in('audit_run_id', runIds)
          .eq('organization_id', organizationId)
      ]);

      // Delete audit runs
      const { error: runError } = await supabase
        .from('chatgpt_audit_runs')
        .delete()
        .in('id', runIds)
        .eq('organization_id', organizationId);

      if (runError) throw runError;

      toast({
        title: 'Audits Deleted',
        description: `Successfully deleted ${runIds.length} audit runs.`,
      });

      setSelectedRuns(new Set());
      setShowBulkDeleteDialog(false);
      onRefresh();
    } catch (error) {
      console.error('Error bulk deleting audit runs:', error);
      toast({
        title: 'Bulk Delete Failed',
        description: 'Failed to delete some audit runs. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const quickAction = async (action: 'clearCompleted' | 'clearFailed') => {
    try {
      const targetStatus = action === 'clearCompleted' ? 'completed' : 'error';
      const runsToDelete = auditRuns.filter(run => run.status === targetStatus);
      
      if (runsToDelete.length === 0) {
        toast({
          title: 'No Items Found',
          description: `No ${targetStatus} audit runs to delete.`,
        });
        return;
      }

      const runIds = runsToDelete.map(run => run.id);
      
      // Delete related data
      await Promise.all([
        supabase.from('chatgpt_queries').delete().in('audit_run_id', runIds),
        supabase.from('chatgpt_query_results').delete().in('audit_run_id', runIds)
      ]);

      // Delete audit runs
      await supabase
        .from('chatgpt_audit_runs')
        .delete()
        .in('id', runIds)
        .eq('organization_id', organizationId);

      toast({
        title: 'Cleanup Complete',
        description: `Removed ${runIds.length} ${targetStatus} audit runs.`,
      });

      onRefresh();
    } catch (error) {
      console.error('Error in quick action:', error);
      toast({
        title: 'Cleanup Failed',
        description: 'Failed to clean up audit runs.',
        variant: 'destructive'
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'running': return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'paused': return <Pause className="h-4 w-4 text-yellow-500" />;
      default: return <Clock className="h-4 w-4 text-zinc-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'running': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'error': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'paused': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      default: return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5" />
              <span>Audit Runs ({filteredRuns.length})</span>
            </CardTitle>
            <CardDescription>
              Manage and monitor your ChatGPT visibility audits
            </CardDescription>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Quick Actions */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => quickAction('clearCompleted')}
              className="text-green-400 border-green-500/20 hover:bg-green-500/10"
            >
              Clear Completed
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => quickAction('clearFailed')}
              className="text-red-400 border-red-500/20 hover:bg-red-500/10"
            >
              Clear Failed
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="Search audit runs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="app">App</SelectItem>
              <SelectItem value="topic">Topic</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Bulk Actions */}
        {selectedRuns.size > 0 && (
          <div className="flex items-center justify-between p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <span className="text-sm text-blue-400">
              {selectedRuns.size} audit run{selectedRuns.size > 1 ? 's' : ''} selected
            </span>
            
            <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Selected
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Selected Audits?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete {selectedRuns.size} audit run{selectedRuns.size > 1 ? 's' : ''} and all related queries and results. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={bulkDeleteSelected} className="bg-red-600 hover:bg-red-700">
                    Delete All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {/* Select All Checkbox */}
        {filteredRuns.length > 0 && (
          <div className="flex items-center space-x-2 pb-2 border-b border-border">
            <Checkbox
              checked={selectedRuns.size === filteredRuns.length && filteredRuns.length > 0}
              onCheckedChange={handleSelectAll}
            />
            <span className="text-sm text-zinc-400">Select all visible</span>
          </div>
        )}

        {/* Audit Runs List */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {filteredRuns.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
              <p className="text-zinc-400">No audit runs found</p>
              <p className="text-sm text-zinc-500">Create your first audit to get started</p>
            </div>
          ) : (
            filteredRuns.map(run => (
              <div
                key={run.id}
                className={`group flex items-center space-x-3 p-4 rounded-lg border cursor-pointer transition-all ${
                  selectedAuditRun?.id === run.id
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-border bg-background/50 hover:border-zinc-600'
                }`}
                onClick={() => onAuditRunSelect(run)}
              >
                {/* Selection Checkbox */}
                <Checkbox
                  checked={selectedRuns.has(run.id)}
                  onCheckedChange={(checked) => handleSelectRun(run.id, checked as boolean)}
                  onClick={(e) => e.stopPropagation()}
                />

                {/* Status Icon */}
                <div className="flex-shrink-0">
                  {getStatusIcon(run.status)}
                </div>

                {/* Main Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <h4 className="font-medium text-primary truncate">
                        {run.name}
                      </h4>
                      <Badge variant="outline" className={getStatusColor(run.status)}>
                        {run.status}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {run.audit_type}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-zinc-400">
                        {run.completed_queries}/{run.total_queries} queries
                      </span>
                      
                      {/* Quick Delete Button */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Audit Run?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete "{run.name}" and all related queries and results. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => deleteAuditRun(run.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                  
                  {run.description && (
                    <p className="text-sm text-zinc-400 mt-1 truncate">
                      {run.description}
                    </p>
                  )}
                  
                  <div className="flex items-center space-x-4 mt-2 text-xs text-zinc-500">
                    <span className="flex items-center space-x-1">
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(run.created_at).toLocaleDateString()}</span>
                    </span>
                    
                    {run.audit_type === 'topic' && run.topic_data && (
                      <span className="flex items-center space-x-1">
                        <Target className="h-3 w-3" />
                        <span>{run.topic_data.topic}</span>
                      </span>
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
};