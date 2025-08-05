import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Play, 
  Pause, 
  RefreshCw,
  Copy,
  Trash2, 
  Search, 
  CheckSquare,
  MessageSquare,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Settings,
  Zap,
  RotateCcw,
  PlayCircle,
  StopCircle
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

interface QueueItem {
  id: string;
  auditRun: AuditRun;
  priority: number;
  status: 'waiting' | 'processing' | 'completed' | 'failed';
  retryCount: number;
}

interface EnhancedAuditManagerProps {
  auditRuns: AuditRun[];
  selectedAuditRun: AuditRun | null;
  onAuditRunSelect: (run: AuditRun) => void;
  onRefresh: () => void;
  organizationId: string;
}

export const EnhancedAuditManager: React.FC<EnhancedAuditManagerProps> = ({
  auditRuns,
  selectedAuditRun,
  onAuditRunSelect,
  onRefresh,
  organizationId
}) => {
  const { toast } = useToast();
  
  // Queue management state
  const [processingQueue, setProcessingQueue] = useState<QueueItem[]>([]);
  const [isQueueRunning, setIsQueueRunning] = useState(false);
  const [currentlyProcessing, setCurrentlyProcessing] = useState<string | null>(null);
  
  // Selection and filtering state
  const [selectedRuns, setSelectedRuns] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  
  // Dialogs state
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [showRerunDialog, setShowRerunDialog] = useState(false);
  const [showQueueDialog, setShowQueueDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  
  // Filter runs based on search and filters
  const filteredRuns = auditRuns.filter(run => {
    const matchesSearch = run.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         run.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || run.status === statusFilter;
    const matchesType = typeFilter === 'all' || run.audit_type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  // Count running audits properly
  const runningAudits = auditRuns.filter(run => run.status === 'running');

  // Queue monitoring effect
  useEffect(() => {
    if (isQueueRunning && processingQueue.length > 0) {
      processNextInQueue();
    }
  }, [isQueueRunning, processingQueue]);

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

  // Create a duplicate audit run with new queries
  const duplicateAuditRun = async (originalRun: AuditRun): Promise<string> => {
    try {
      // Create new audit run
      const newRunData = {
        organization_id: organizationId,
        name: `${originalRun.name} (Copy)`,
        description: `Copy of ${originalRun.name} - ${new Date().toLocaleDateString()}`,
        app_id: originalRun.app_id,
        audit_type: originalRun.audit_type,
        topic_data: originalRun.topic_data,
        status: 'pending',
        total_queries: 0,
        completed_queries: 0
      };

      const { data: newRun, error: runError } = await supabase
        .from('chatgpt_audit_runs')
        .insert(newRunData)
        .select()
        .single();

      if (runError) throw runError;

      // Copy queries from original run
      const { data: originalQueries, error: queriesError } = await supabase
        .from('chatgpt_queries')
        .select('*')
        .eq('audit_run_id', originalRun.id)
        .eq('organization_id', organizationId);

      if (queriesError) throw queriesError;

      if (originalQueries && originalQueries.length > 0) {
        const newQueries = originalQueries.map(query => {
          const { id, created_at, updated_at, processed_at, ...queryWithoutSystemFields } = query;
          return {
            ...queryWithoutSystemFields,
            audit_run_id: newRun.id,
            status: 'pending'
          };
        });

        const { error: insertError } = await supabase
          .from('chatgpt_queries')
          .insert(newQueries);

        if (insertError) throw insertError;

        // Update total queries count
        await supabase
          .from('chatgpt_audit_runs')
          .update({ total_queries: newQueries.length })
          .eq('id', newRun.id);
      }

      return newRun.id;
    } catch (error) {
      console.error('Error duplicating audit run:', error);
      throw error;
    }
  };

  // Reset audit run for re-run
  const resetAuditRun = async (runId: string) => {
    try {
      // Delete existing results
      await supabase
        .from('chatgpt_query_results')
        .delete()
        .eq('audit_run_id', runId)
        .eq('organization_id', organizationId);

      await supabase
        .from('chatgpt_ranking_snapshots')
        .delete()
        .eq('audit_run_id', runId)
        .eq('organization_id', organizationId);

      // Reset query statuses
      await supabase
        .from('chatgpt_queries')
        .update({ status: 'pending' })
        .eq('audit_run_id', runId)
        .eq('organization_id', organizationId);

      // Reset audit run status
      await supabase
        .from('chatgpt_audit_runs')
        .update({
          status: 'pending',
          completed_queries: 0,
          started_at: null,
          completed_at: null
        })
        .eq('id', runId)
        .eq('organization_id', organizationId);

    } catch (error) {
      console.error('Error resetting audit run:', error);
      throw error;
    }
  };

  // Add runs to processing queue
  const addToQueue = (runIds: string[], priority: number = 5) => {
    const newItems: QueueItem[] = runIds.map(runId => {
      const auditRun = auditRuns.find(run => run.id === runId);
      if (!auditRun) throw new Error(`Audit run not found: ${runId}`);
      
      return {
        id: `${runId}-${Date.now()}`,
        auditRun,
        priority,
        status: 'waiting',
        retryCount: 0
      };
    });

    setProcessingQueue(prev => [...prev, ...newItems].sort((a, b) => b.priority - a.priority));
  };

  // Process next item in queue
  const processNextInQueue = async () => {
    if (!isQueueRunning || processingQueue.length === 0) return;

    const nextItem = processingQueue.find(item => item.status === 'waiting');
    if (!nextItem) {
      setIsQueueRunning(false);
      setCurrentlyProcessing(null);
      toast({
        title: 'Queue Complete',
        description: 'All queued audits have been processed.',
      });
      return;
    }

    setCurrentlyProcessing(nextItem.id);
    setProcessingQueue(prev => 
      prev.map(item => 
        item.id === nextItem.id ? { ...item, status: 'processing' } : item
      )
    );

    try {
      // Start the audit run processing
      await processAuditRun(nextItem.auditRun.id);
      
      setProcessingQueue(prev => 
        prev.map(item => 
          item.id === nextItem.id ? { ...item, status: 'completed' } : item
        )
      );

      // Wait before processing next item
      setTimeout(() => {
        if (isQueueRunning) {
          processNextInQueue();
        }
      }, 3000); // 3 second delay between runs

    } catch (error) {
      console.error('Error processing queue item:', error);
      
      const shouldRetry = nextItem.retryCount < 2;
      setProcessingQueue(prev => 
        prev.map(item => 
          item.id === nextItem.id 
            ? { 
                ...item, 
                status: shouldRetry ? 'waiting' : 'failed',
                retryCount: item.retryCount + 1
              }
            : item
        )
      );

      if (shouldRetry) {
        setTimeout(() => {
          if (isQueueRunning) {
            processNextInQueue();
          }
        }, 10000); // 10 second delay before retry
      } else {
        processNextInQueue(); // Continue with next item
      }
    }
  };

  // Process individual audit run
  const processAuditRun = async (runId: string) => {
    try {
      // Get the audit run details
      const { data: auditRun, error: runError } = await supabase
        .from('chatgpt_audit_runs')
        .select('*')
        .eq('id', runId)
        .eq('organization_id', organizationId)
        .single();

      if (runError) throw runError;

      // Get pending queries
      const { data: queries, error: queriesError } = await supabase
        .from('chatgpt_queries')
        .select('*')
        .eq('audit_run_id', runId)
        .eq('organization_id', organizationId)
        .eq('status', 'pending')
        .order('priority', { ascending: false });

      if (queriesError) throw queriesError;
      if (!queries || queries.length === 0) return;

      // Update status to running
      await supabase
        .from('chatgpt_audit_runs')
        .update({ 
          status: 'running',
          started_at: new Date().toISOString()
        })
        .eq('id', runId);

      // Process queries using appropriate edge function
      const edgeFunction = auditRun.audit_type === 'topic' 
        ? 'chatgpt-topic-analysis' 
        : 'chatgpt-visibility-query';

      for (const query of queries) {
        if (!isQueueRunning) break; // Stop if queue is stopped

        const functionPayload = auditRun.audit_type === 'topic' ? {
          queryId: query.id,
          queryText: query.query_text,
          auditRunId: runId,
          organizationId: organizationId,
          targetTopic: (auditRun.topic_data as any)?.topic || 'Unknown Topic',
          topicData: auditRun.topic_data
        } : {
          queryId: query.id,
          queryText: query.query_text,
          auditRunId: runId,
          organizationId: organizationId,
          appId: auditRun.app_id
        };

        await supabase.functions.invoke(edgeFunction, {
          body: functionPayload
        });

        // Small delay between queries
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Update status to completed
      await supabase
        .from('chatgpt_audit_runs')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', runId);

    } catch (error) {
      // Update status to error
      await supabase
        .from('chatgpt_audit_runs')
        .update({ status: 'error' })
        .eq('id', runId);
      
      throw error;
    }
  };

  // Handle re-run selected audits
  const handleRerunSelected = async (strategy: 'reset' | 'duplicate') => {
    try {
      const selectedRunIds = Array.from(selectedRuns);
      
      if (strategy === 'reset') {
        // Reset existing runs
        for (const runId of selectedRunIds) {
          await resetAuditRun(runId);
        }
        addToQueue(selectedRunIds);
      } else {
        // Create duplicates
        const newRunIds: string[] = [];
        for (const runId of selectedRunIds) {
          const originalRun = auditRuns.find(run => run.id === runId);
          if (originalRun) {
            const newRunId = await duplicateAuditRun(originalRun);
            newRunIds.push(newRunId);
          }
        }
        addToQueue(newRunIds);
      }

      setSelectedRuns(new Set());
      setShowRerunDialog(false);
      onRefresh();

      toast({
        title: 'Audits Queued',
        description: `${selectedRunIds.length} audits have been queued for processing.`,
      });

    } catch (error) {
      console.error('Error handling re-run:', error);
      toast({
        title: 'Re-run Failed',
        description: 'Failed to queue audits for re-run.',
        variant: 'destructive'
      });
    }
  };

  // Bulk queue selected audits
  const handleBulkQueue = () => {
    const selectedRunIds = Array.from(selectedRuns);
    addToQueue(selectedRunIds);
    setSelectedRuns(new Set());
    setShowBulkDialog(false);
    
    toast({
      title: 'Audits Queued',
      description: `${selectedRunIds.length} audits added to processing queue.`,
    });
  };

  const startQueue = () => {
    setIsQueueRunning(true);
  };

  const stopQueue = () => {
    setIsQueueRunning(false);
    setCurrentlyProcessing(null);
  };

  const clearQueue = () => {
    setProcessingQueue([]);
    setIsQueueRunning(false);
    setCurrentlyProcessing(null);
  };

  const removeFromQueue = (itemId: string) => {
    setProcessingQueue(prev => prev.filter(item => item.id !== itemId));
  };

  // Delete single audit run
  const deleteAuditRun = async (runId: string) => {
    try {
      // Delete related data first
      await supabase
        .from('chatgpt_query_results')
        .delete()
        .eq('audit_run_id', runId)
        .eq('organization_id', organizationId);

      await supabase
        .from('chatgpt_ranking_snapshots')
        .delete()
        .eq('audit_run_id', runId)
        .eq('organization_id', organizationId);

      await supabase
        .from('chatgpt_queries')
        .delete()
        .eq('audit_run_id', runId)
        .eq('organization_id', organizationId);

      // Delete the audit run itself
      const { error } = await supabase
        .from('chatgpt_audit_runs')
        .delete()
        .eq('id', runId)
        .eq('organization_id', organizationId);

      if (error) throw error;

      toast({
        title: 'Audit Deleted',
        description: 'Audit run and all related data have been deleted.',
      });

      onRefresh();
    } catch (error) {
      console.error('Error deleting audit run:', error);
      toast({
        title: 'Delete Failed',
        description: 'Failed to delete audit run.',
        variant: 'destructive'
      });
    }
  };

  // Bulk delete selected audits
  const handleBulkDelete = async () => {
    try {
      const selectedRunIds = Array.from(selectedRuns);
      
      for (const runId of selectedRunIds) {
        await deleteAuditRun(runId);
      }

      setSelectedRuns(new Set());
      setShowBulkDeleteDialog(false);

      toast({
        title: 'Audits Deleted',
        description: `${selectedRunIds.length} audit runs have been deleted.`,
      });

    } catch (error) {
      console.error('Error bulk deleting:', error);
      toast({
        title: 'Bulk Delete Failed',
        description: 'Failed to delete some audit runs.',
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
    <div className="space-y-6">
      {/* Processing Queue Card */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="h-5 w-5" />
                <span>Processing Queue ({processingQueue.length})</span>
              </CardTitle>
              <CardDescription>
                Manage bulk audit processing and re-runs
              </CardDescription>
            </div>
            
            <div className="flex items-center space-x-2">
              <Dialog open={showQueueDialog} onOpenChange={setShowQueueDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Manage Queue
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Processing Queue Management</DialogTitle>
                    <DialogDescription>
                      Monitor and control bulk audit processing
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    {/* Queue Controls */}
                    <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                      <div className="flex items-center space-x-4">
                        <Badge variant={isQueueRunning ? 'default' : 'secondary'}>
                          {isQueueRunning ? 'Running' : 'Stopped'}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {processingQueue.filter(item => item.status === 'waiting').length} waiting
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {!isQueueRunning ? (
                          <Button onClick={startQueue} size="sm">
                            <PlayCircle className="h-4 w-4 mr-2" />
                            Start Queue
                          </Button>
                        ) : (
                          <Button onClick={stopQueue} variant="destructive" size="sm">
                            <StopCircle className="h-4 w-4 mr-2" />
                            Stop Queue
                          </Button>
                        )}
                        <Button onClick={clearQueue} variant="outline" size="sm">
                          Clear All
                        </Button>
                      </div>
                    </div>

                    {/* Queue Items */}
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {processingQueue.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">
                          No items in queue
                        </p>
                      ) : (
                        processingQueue.map(item => (
                          <div
                            key={item.id}
                            className={`flex items-center justify-between p-3 rounded-lg border ${
                              currentlyProcessing === item.id ? 'border-blue-500 bg-blue-500/10' : 'border-border'
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <Badge variant="outline" className={getStatusColor(item.status)}>
                                {item.status}
                              </Badge>
                              <span className="font-medium">{item.auditRun.name}</span>
                              {item.retryCount > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  Retry {item.retryCount}
                                </Badge>
                              )}
                            </div>
                            
                            <Button
                              onClick={() => removeFromQueue(item.id)}
                              variant="ghost"
                              size="sm"
                              className="text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {!isQueueRunning && processingQueue.length > 0 && (
                <Button onClick={startQueue}>
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Start Queue
                </Button>
              )}
              
              {isQueueRunning && (
                <Button onClick={stopQueue} variant="destructive">
                  <StopCircle className="h-4 w-4 mr-2" />
                  Stop Queue
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        {processingQueue.length > 0 && (
          <CardContent>
            <div className="space-y-3">
              <Progress 
                value={processingQueue.length > 0 ? (processingQueue.filter(item => item.status === 'completed').length / processingQueue.length) * 100 : 0} 
                className="h-2" 
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>
                  {processingQueue.filter(item => item.status === 'completed').length} / {processingQueue.length} completed
                </span>
                <span>
                  {currentlyProcessing ? 'Processing...' : isQueueRunning ? 'Waiting...' : 'Stopped'}
                </span>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Main Audit Manager */}
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
              {selectedRuns.size > 0 && (
                <>
                  <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-red-400 hover:text-red-300">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Selected
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Selected Audits</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete {selectedRuns.size} selected audit runs? 
                          This will permanently delete all audit data, queries, and results. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={handleBulkDelete}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Delete {selectedRuns.size} Audits
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <Dialog open={showRerunDialog} onOpenChange={setShowRerunDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Re-run Selected
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Re-run Selected Audits</DialogTitle>
                        <DialogDescription>
                          Choose how to re-run {selectedRuns.size} selected audits
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-4">
                          <Button
                            onClick={() => handleRerunSelected('reset')}
                            className="h-auto p-4 justify-start"
                          >
                            <div className="text-left">
                              <div className="font-medium">Reset & Re-run</div>
                              <div className="text-sm text-muted-foreground">
                                Clear existing results and re-run the same audits
                              </div>
                            </div>
                          </Button>
                          
                          <Button
                            onClick={() => handleRerunSelected('duplicate')}
                            variant="outline"
                            className="h-auto p-4 justify-start"
                          >
                            <div className="text-left">
                              <div className="font-medium">Duplicate & Run</div>
                              <div className="text-sm text-muted-foreground">
                                Create copies and run them (preserves original results)
                              </div>
                            </div>
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Zap className="h-4 w-4 mr-2" />
                        Queue Selected
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add to Processing Queue</DialogTitle>
                        <DialogDescription>
                          Add {selectedRuns.size} selected audits to the processing queue
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button onClick={handleBulkQueue}>Add to Queue</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </>
              )}
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
                <SelectItem value="running">Running ({runningAudits.length})</SelectItem>
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

          {/* Bulk Selection Header */}
          {selectedRuns.size > 0 && (
            <div className="flex items-center justify-between p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <span className="text-sm text-blue-400">
                {selectedRuns.size} audit run{selectedRuns.size > 1 ? 's' : ''} selected
              </span>
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
                        
                        {/* Quick Actions */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              addToQueue([run.id]);
                              toast({
                                title: 'Added to Queue',
                                description: `${run.name} has been added to the processing queue.`,
                              });
                            }}
                            variant="ghost"
                            size="sm"
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                onClick={(e) => e.stopPropagation()}
                                variant="ghost"
                                size="sm"
                                className="text-red-400 hover:text-red-300"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Audit Run</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{run.name}"? 
                                  This will permanently delete all audit data, queries, and results. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => deleteAuditRun(run.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete Audit
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
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
                          <MessageSquare className="h-3 w-3" />
                          <span>{(run.topic_data as any)?.topic}</span>
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
    </div>
  );
};