import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DatabaseService } from '@/lib/services/database.service';
import { useAuditProcessing } from '@/context/AuditProcessingContext';
import { useNavigationGuard } from '@/hooks/useNavigationGuard';
import { 
  Play, 
  Pause, 
  Square, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Zap,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { QueryTemplate } from './QueryTemplateLibrary';

interface AuditRun {
  id: string;
  name: string;
  app_id: string;
  status: 'pending' | 'running' | 'completed' | 'error' | 'paused';
  total_queries: number;
  completed_queries: number;
  started_at?: string;
  completed_at?: string;
}

interface GeneratedQuery {
  id: string;
  query_text: string;
  category: string;
  subcategory: string;
  generated_from: string;
  priority: number;
  variables_used: Record<string, string>;
  icon: React.ReactNode;
}

interface BulkAuditProcessorProps {
  auditRun: AuditRun;
  selectedTemplates?: QueryTemplate[];
  generatedQueries?: GeneratedQuery[];
  organizationId: string;
  onStatusChange: () => void;
}

interface ProcessingStats {
  totalQueries: number;
  completedQueries: number;
  failedQueries: number;
  avgResponseTime: number;
  totalCost: number;
  estimatedTimeRemaining: number;
}

export const BulkAuditProcessor: React.FC<BulkAuditProcessorProps> = ({
  auditRun,
  selectedTemplates = [],
  generatedQueries = [],
  organizationId,
  onStatusChange
}) => {
  const { toast } = useToast();
  const { 
    state: processingState, 
    startProcessing, 
    stopProcessing, 
    updateProgress, 
    addLog, 
    updateStats,
    canResume,
    saveToDatabase,
    loadFromDatabase
  } = useAuditProcessing();
  
  // Navigation guard to prevent accidental tab closure during processing
  useNavigationGuard();
  
  // Local state for compatibility - gradually migrate to context
  const [localProcessingStats, setLocalProcessingStats] = useState<ProcessingStats>({
    totalQueries: 0,
    completedQueries: 0,
    failedQueries: 0,
    avgResponseTime: 0,
    totalCost: 0,
    estimatedTimeRemaining: 0
  });

  // Use context state when available, fallback to local state
  const isProcessing = processingState.isProcessing;
  const currentQueryIndex = processingState.currentQueryIndex;
  const logs = processingState.logs;
  const processingStats = { ...localProcessingStats, ...processingState.processingStats };

  // Initialize processing if we can resume
  useEffect(() => {
    if (canResume(auditRun.id)) {
      addLog(`Processing state restored for audit: ${auditRun.name}`);
    } else {
      // Try loading from database on mount
      loadFromDatabase(auditRun.id, organizationId);
    }
  }, [auditRun.id, canResume, organizationId]);

  // Auto-save to database when processing state changes
  useEffect(() => {
    if (processingState.isProcessing && processingState.auditRunId === auditRun.id) {
      saveToDatabase(auditRun.id, organizationId);
    }
  }, [processingState, auditRun.id, organizationId]);

  const generateQueriesFromTemplates = async () => {
    try {
      let queries: any[] = [];

      // Prioritize generated queries over static templates
      if (generatedQueries.length > 0) {
        addLog(`Using ${generatedQueries.length} AI-generated queries...`);
        
        queries = generatedQueries.map(query => ({
          organization_id: organizationId,
          audit_run_id: auditRun.id,
          query_text: query.query_text,
          query_category: query.category,
          query_type: 'generated',
          variables: query.variables_used,
          priority: query.priority,
          status: 'pending'
        }));
      } else if (selectedTemplates.length > 0) {
        addLog('Generating queries from selected templates...');
        
        queries = selectedTemplates.map(template => {
          // Replace variables in query text
          let queryText = template.query_text;
          Object.entries(template.variables).forEach(([key, value]) => {
            queryText = queryText.replace(`{${key}}`, value);
          });

          return {
            organization_id: organizationId,
            audit_run_id: auditRun.id,
            query_text: queryText,
            query_category: template.category,
            query_type: 'template',
            variables: template.variables,
            priority: template.priority,
            status: 'pending'
          };
        });
      } else {
        throw new Error('No queries available - please generate queries or select templates first');
      }

      // Insert queries into database
      const { error } = await supabase
        .from('chatgpt_queries')
        .insert(queries);

      if (error) throw error;

      // Update audit run with query count using explicit organization filter
      const { error: updateError } = await DatabaseService.updateAuditRun(
        auditRun.id,
        { 
          total_queries: queries.length,
          status: 'pending'
        },
        { organizationId }
      );

      if (updateError) throw updateError;

      addLog(`Generated ${queries.length} queries successfully`);
      onStatusChange();

      return queries.length;
    } catch (error) {
      addLog(`Error generating queries: ${error.message}`);
      throw error;
    }
  };

  const processQueriesBatch = async () => {
    try {
      startProcessing(auditRun.id);
      addLog('Starting batch processing...');

      // Test auth context first
      const authTest = await DatabaseService.testAuthContext();
      addLog(`Auth status: ${authTest.hasAuth ? 'Connected' : 'Failed'} - User: ${authTest.userId || 'None'}`);
      
      if (authTest.error && !authTest.hasAuth) {
        addLog(`Auth warning: ${authTest.error}`);
      }

      // Get pending queries with explicit organization filtering
      const { data: queries, error } = await DatabaseService
        .getChatGPTQueries(auditRun.id, { organizationId })
        .eq('status', 'pending')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (!queries || queries.length === 0) {
        addLog('No pending queries found');
        return;
      }

      // Update audit run to running with explicit organization filter
      await DatabaseService.updateAuditRun(
        auditRun.id,
        { 
          status: 'running',
          started_at: new Date().toISOString()
        },
        { organizationId }
      );

      onStatusChange();

      // Process queries with rate limiting (1 every 2 seconds to avoid hitting OpenAI limits)
      for (let i = 0; i < queries.length; i++) {
        if (!processingState.isProcessing) break; // Check if stopped

        const query = queries[i];
        updateProgress(i + 1);
        
        addLog(`Processing query ${i + 1}/${queries.length}: ${query.query_text.substring(0, 50)}...`);

        const startTime = Date.now();

        try {
          // Call the edge function
          const { error: functionError } = await supabase.functions.invoke('chatgpt-visibility-query', {
            body: {
              queryId: query.id,
              queryText: query.query_text,
              auditRunId: auditRun.id,
              organizationId: organizationId,
              appId: auditRun.app_id
            }
          });

          if (functionError) {
            throw new Error(`Edge function error: ${functionError.message}`);
          }

          const responseTime = Date.now() - startTime;
          
          const newStats = {
            completedQueries: processingStats.completedQueries + 1,
            avgResponseTime: (processingStats.avgResponseTime * processingStats.completedQueries + responseTime) / (processingStats.completedQueries + 1),
            estimatedTimeRemaining: (queries.length - (i + 1)) * 2000 // 2 seconds per query
          };
          
          setLocalProcessingStats(prev => ({ ...prev, ...newStats }));
          updateStats(newStats);

          addLog(`✓ Query ${i + 1} completed (${responseTime}ms)`);

        } catch (error) {
          addLog(`✗ Query ${i + 1} failed: ${error.message}`);
          
          const newStats = { failedQueries: processingStats.failedQueries + 1 };
          setLocalProcessingStats(prev => ({ ...prev, ...newStats }));
          updateStats(newStats);

          // Mark query as failed with explicit organization filter
          await DatabaseService.updateChatGPTQuery(
            query.id,
            { status: 'error' },
            { organizationId }
          );
        }

        // Rate limiting delay
        if (i < queries.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      addLog('Batch processing completed');
      onStatusChange();

    } catch (error) {
      addLog(`Batch processing error: ${error.message}`);
      toast({
        title: 'Processing Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      stopProcessing();
    }
  };

  const handleStartProcessing = async () => {
    try {
      if (auditRun.total_queries === 0) {
        await generateQueriesFromTemplates();
      }
      await processQueriesBatch();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to start processing. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleStopProcessing = () => {
    stopProcessing();
    addLog('Processing stopped by user');
  };

  const progress = auditRun.total_queries > 0 
    ? (auditRun.completed_queries / auditRun.total_queries) * 100 
    : 0;

  return (
    <div className="space-y-6">
      {/* Processing Controls */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <Zap className="h-5 w-5" />
            <span>Bulk Processing Engine</span>
          </CardTitle>
          <CardDescription className="text-zinc-400">
            Process multiple queries with real-time progress tracking
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-zinc-400">Total Queries</p>
              <p className="text-2xl font-bold text-white">{auditRun.total_queries}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-zinc-400">Completed</p>
              <p className="text-2xl font-bold text-green-400">{auditRun.completed_queries}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-zinc-400">Failed</p>
              <p className="text-2xl font-bold text-red-400">{processingStats.failedQueries}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-zinc-400">Progress</p>
              <p className="text-2xl font-bold text-blue-400">{Math.round(progress)}%</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Processing Progress</span>
              <Badge variant={auditRun.status === 'running' ? 'default' : 'outline'}>
                {auditRun.status}
              </Badge>
            </div>
            <Progress value={progress} className="h-3" />
            {isProcessing && (
              <p className="text-xs text-zinc-500">
                Current: Query {currentQueryIndex}/{auditRun.total_queries}
              </p>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center space-x-3">
            {!isProcessing && auditRun.status !== 'completed' && (
              <Button 
                onClick={handleStartProcessing}
                className="flex items-center space-x-2"
              >
                <Play className="h-4 w-4" />
                <span>
                  {auditRun.total_queries === 0 ? 'Generate & Start' : 
                   canResume(auditRun.id) ? 'Resume Processing' : 'Start Processing'}
                </span>
              </Button>
            )}

            {canResume(auditRun.id) && !isProcessing && (
              <Alert className="bg-blue-900/20 border-blue-700/50 text-blue-300 text-sm">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Processing can be resumed from where you left off
                </AlertDescription>
              </Alert>
            )}

            {isProcessing && (
              <Button 
                onClick={handleStopProcessing}
                variant="destructive"
                className="flex items-center space-x-2"
              >
                <Square className="h-4 w-4" />
                <span>Stop Processing</span>
              </Button>
            )}

            {auditRun.status === 'completed' && (
              <div className="flex items-center space-x-2 text-green-400">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Processing Completed</span>
              </div>
            )}
          </div>

          {/* Estimated Time */}
          {isProcessing && processingStats.estimatedTimeRemaining > 0 && (
            <Alert className="bg-blue-900/20 border-blue-700/50">
              <Clock className="h-4 w-4" />
              <AlertDescription className="text-blue-400">
                Estimated time remaining: {Math.ceil(processingStats.estimatedTimeRemaining / 1000 / 60)} minutes
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Processing Logs */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <RefreshCw className="h-5 w-5" />
            <span>Processing Logs</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-zinc-950 border border-zinc-800 rounded-md p-4 h-64 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-zinc-500 text-sm">No logs yet. Start processing to see real-time updates.</p>
            ) : (
              <div className="space-y-1">
                {logs.map((log, index) => (
                  <div key={index} className="text-sm font-mono text-zinc-300">
                    {log}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Query Preview */}
      {generatedQueries.length > 0 ? (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Generated Queries ({generatedQueries.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {generatedQueries.slice(0, 6).map(query => (
                <div key={query.id} className="p-3 bg-zinc-800/50 rounded-md border border-zinc-700">
                  <div className="flex items-center space-x-2 mb-2">
                    {query.icon}
                    <span className="text-sm font-medium text-white">{query.generated_from}</span>
                  </div>
                  <p className="text-xs text-zinc-400">{query.query_text.substring(0, 100)}...</p>
                  <Badge variant="outline" className="text-xs mt-2">
                    {query.category}
                  </Badge>
                </div>
              ))}
            </div>
            {generatedQueries.length > 6 && (
              <p className="text-xs text-zinc-500 mt-3">
                ...and {generatedQueries.length - 6} more queries
              </p>
            )}
          </CardContent>
        </Card>
      ) : selectedTemplates.length > 0 && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Selected Templates ({selectedTemplates.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {selectedTemplates.map(template => (
                <div key={template.id} className="p-3 bg-zinc-800/50 rounded-md border border-zinc-700">
                  <div className="flex items-center space-x-2 mb-2">
                    {template.icon}
                    <span className="text-sm font-medium text-white">{template.name}</span>
                  </div>
                  <p className="text-xs text-zinc-400">{template.description}</p>
                  <Badge variant="outline" className="text-xs mt-2">
                    {template.category}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};