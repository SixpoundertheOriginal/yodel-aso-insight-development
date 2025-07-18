import React, { useState, useEffect, useRef } from 'react';
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

  // Ref to track if database load has been attempted
  const dbLoadAttempted = useRef(false);

  // Use context state when available, fallback to local state
  const isProcessing = processingState.isProcessing;
  const currentQueryIndex = processingState.currentQueryIndex;
  const logs = processingState.logs;
  const processingStats = { ...localProcessingStats, ...processingState.processingStats };

  // Initialize processing if we can resume - only on mount and once
  useEffect(() => {
    let mounted = true;
    
    const initializeProcessing = async () => {
      if (!mounted || dbLoadAttempted.current) return;
      
      dbLoadAttempted.current = true;
      
      if (canResume(auditRun.id)) {
        console.log(`[BULK-PROCESSOR] Processing state restored for audit: ${auditRun.name}`);
      } else {
        // Try loading from database on mount
        try {
          await loadFromDatabase(auditRun.id, organizationId);
        } catch (error) {
          console.error('[BULK-PROCESSOR] Failed to load processing state:', error);
        }
      }
    };
    
    initializeProcessing();
    
    return () => {
      mounted = false;
    };
  }, [auditRun.id, organizationId, canResume, loadFromDatabase]);

  // Auto-save to database when processing state changes meaningfully
  useEffect(() => {
    let mounted = true;
    
    const saveState = async () => {
      if (!mounted || !processingState.isProcessing || processingState.auditRunId !== auditRun.id) {
        return;
      }
      
      try {
        await saveToDatabase(auditRun.id, organizationId);
      } catch (error) {
        console.error('[BULK-PROCESSOR] Failed to save processing state:', error);
      }
    };
    
    // Only save when actually processing and when meaningful state changes occur
    if (processingState.isProcessing && processingState.auditRunId === auditRun.id) {
      const timeoutId = setTimeout(saveState, 1000); // Debounce saves
      return () => {
        mounted = false;
        clearTimeout(timeoutId);
      };
    }
    
    return () => {
      mounted = false;
    };
  }, [processingState.isProcessing, processingState.currentQueryIndex, processingState.auditRunId, auditRun.id, organizationId, saveToDatabase]);

  const generateQueriesFromTemplates = async () => {
    console.log('[BULK-PROCESSOR] Starting generateQueriesFromTemplates...');
    
    try {
      let queries: any[] = [];

      // Prioritize generated queries over static templates
      if (generatedQueries.length > 0) {
        console.log(`[BULK-PROCESSOR] Using ${generatedQueries.length} AI-generated queries...`);
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
        console.log(`[BULK-PROCESSOR] Using ${selectedTemplates.length} template queries...`);
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
        const errorMsg = 'No queries available - please generate queries or select templates first';
        console.error(`[BULK-PROCESSOR] ${errorMsg}`);
        throw new Error(errorMsg);
      }

      console.log(`[BULK-PROCESSOR] Inserting ${queries.length} queries into database...`);

      // Insert queries into database
      const { error } = await supabase
        .from('chatgpt_queries')
        .insert(queries);

      if (error) {
        console.error('[BULK-PROCESSOR] Database insert error:', error);
        throw error;
      }

      console.log('[BULK-PROCESSOR] Queries inserted successfully, updating audit run...');

      // Update audit run with query count using explicit organization filter
      const { error: updateError } = await DatabaseService.updateAuditRun(
        auditRun.id,
        { 
          total_queries: queries.length,
          status: 'pending'
        },
        { organizationId }
      );

      if (updateError) {
        console.error('[BULK-PROCESSOR] Audit run update error:', updateError);
        throw updateError;
      }

      console.log(`[BULK-PROCESSOR] Successfully generated ${queries.length} queries`);
      addLog(`Generated ${queries.length} queries successfully`);
      onStatusChange();

      return queries.length;
    } catch (error) {
      console.error('[BULK-PROCESSOR] Error in generateQueriesFromTemplates:', error);
      addLog(`Error generating queries: ${error.message}`);
      throw error;
    }
  };

  const processQueriesBatch = async () => {
    console.log('[BULK-PROCESSOR] Starting processQueriesBatch...');
    
    try {
      console.log('[BULK-PROCESSOR] Calling startProcessing...');
      startProcessing(auditRun.id);
      console.log('[BULK-PROCESSOR] startProcessing completed - isProcessing should be true');
      addLog('Starting batch processing...');

      // Test auth context first
      console.log('[BULK-PROCESSOR] Testing auth context...');
      const authTest = await DatabaseService.testAuthContext();
      console.log('[BULK-PROCESSOR] Auth test result:', authTest);
      addLog(`Auth status: ${authTest.hasAuth ? 'Connected' : 'Failed'} - User: ${authTest.userId || 'None'}`);
      
      if (authTest.error && !authTest.hasAuth) {
        console.warn('[BULK-PROCESSOR] Auth warning:', authTest.error);
        addLog(`Auth warning: ${authTest.error}`);
      }

      console.log('[BULK-PROCESSOR] Fetching pending queries...');
      console.log('[BULK-PROCESSOR] Query params:', { auditRunId: auditRun.id, organizationId });

      // Get pending queries with direct supabase approach
      const { data: queries, error } = await supabase
        .from('chatgpt_queries')
        .select('*')
        .eq('audit_run_id', auditRun.id)
        .eq('organization_id', organizationId)
        .eq('status', 'pending')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true });

      console.log('[BULK-PROCESSOR] Query fetch result:', { 
        queriesCount: queries?.length || 0, 
        error: error?.message || 'none',
        sampleQuery: queries?.[0] || 'none'
      });

      if (error) {
        console.error('[BULK-PROCESSOR] Query fetch error:', error);
        throw error;
      }

      if (!queries || queries.length === 0) {
        const msg = 'No pending queries found';
        console.log(`[BULK-PROCESSOR] ${msg}`);
        addLog(msg);
        return;
      }

      console.log(`[BULK-PROCESSOR] Found ${queries.length} pending queries, starting processing...`);

      // Update audit run to running with explicit organization filter
      console.log('[BULK-PROCESSOR] Updating audit run status to running...');
      await DatabaseService.updateAuditRun(
        auditRun.id,
        { 
          status: 'running',
          started_at: new Date().toISOString()
        },
        { organizationId }
      );

      console.log('[BULK-PROCESSOR] Audit run status updated, calling onStatusChange...');
      onStatusChange();

      console.log('[BULK-PROCESSOR] Starting query processing loop...');
      console.log('[BULK-PROCESSOR] Current processing state before loop:', { 
        isProcessing: processingState.isProcessing,
        auditRunId: processingState.auditRunId 
      });
      
      // Process queries with rate limiting (1 every 2 seconds to avoid hitting OpenAI limits)
      for (let i = 0; i < queries.length; i++) {
        console.log(`[BULK-PROCESSOR] Processing query ${i + 1}/${queries.length}...`);
        console.log('[BULK-PROCESSOR] Checking processing state:', { 
          isProcessing: processingState.isProcessing,
          auditRunId: processingState.auditRunId,
          currentAuditId: auditRun.id
        });
        
        if (!processingState.isProcessing || processingState.auditRunId !== auditRun.id) {
          console.log('[BULK-PROCESSOR] Processing stopped or audit changed, breaking loop');
          addLog('Processing stopped or interrupted');
          break;
        }

        const query = queries[i];
        console.log(`[BULK-PROCESSOR] Current query:`, { 
          id: query.id, 
          text: query.query_text.substring(0, 50) + '...',
          category: query.query_category
        });
        
        updateProgress(i + 1);
        
        addLog(`Processing query ${i + 1}/${queries.length}: ${query.query_text.substring(0, 50)}...`);

        const startTime = Date.now();

        try {
          console.log('[BULK-PROCESSOR] Calling edge function chatgpt-visibility-query...');
          
          const functionPayload = {
            queryId: query.id,
            queryText: query.query_text,
            auditRunId: auditRun.id,
            organizationId: organizationId,
            appId: auditRun.app_id
          };
          
          console.log('[BULK-PROCESSOR] Function payload:', functionPayload);

          // Call the edge function
          const { data: functionData, error: functionError } = await supabase.functions.invoke('chatgpt-visibility-query', {
            body: functionPayload
          });

          console.log('[BULK-PROCESSOR] Edge function response:', { 
            data: functionData, 
            error: functionError?.message || 'none' 
          });

          if (functionError) {
            console.error('[BULK-PROCESSOR] Edge function error:', functionError);
            throw new Error(`Edge function error: ${functionError.message}`);
          }

          const responseTime = Date.now() - startTime;
          console.log(`[BULK-PROCESSOR] Query ${i + 1} completed in ${responseTime}ms`);
          
          const newStats = {
            completedQueries: processingStats.completedQueries + 1,
            avgResponseTime: (processingStats.avgResponseTime * processingStats.completedQueries + responseTime) / (processingStats.completedQueries + 1),
            estimatedTimeRemaining: (queries.length - (i + 1)) * 2000 // 2 seconds per query
          };
          
          setLocalProcessingStats(prev => ({ ...prev, ...newStats }));
          updateStats(newStats);

          addLog(`✓ Query ${i + 1} completed (${responseTime}ms)`);

        } catch (error) {
          console.error(`[BULK-PROCESSOR] Query ${i + 1} failed:`, error);
          addLog(`✗ Query ${i + 1} failed: ${error.message}`);
          
          const newStats = { failedQueries: processingStats.failedQueries + 1 };
          setLocalProcessingStats(prev => ({ ...prev, ...newStats }));
          updateStats(newStats);

          // Mark query as failed with explicit organization filter
          console.log(`[BULK-PROCESSOR] Marking query ${query.id} as failed...`);
          try {
            await DatabaseService.updateChatGPTQuery(
              query.id,
              { status: 'error' },
              { organizationId }
            );
          } catch (updateError) {
            console.error('[BULK-PROCESSOR] Failed to update query status:', updateError);
          }
        }

        // Rate limiting delay
        if (i < queries.length - 1) {
          console.log('[BULK-PROCESSOR] Waiting 2 seconds before next query...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      console.log('[BULK-PROCESSOR] Batch processing completed successfully');
      addLog('Batch processing completed');
      onStatusChange();

    } catch (error) {
      console.error('[BULK-PROCESSOR] Batch processing error:', error);
      addLog(`Batch processing error: ${error.message}`);
      toast({
        title: 'Processing Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      console.log('[BULK-PROCESSOR] Stopping processing...');
      stopProcessing();
    }
  };

  const handleStartProcessing = async () => {
    console.log('[BULK-PROCESSOR] handleStartProcessing called');
    
    try {
      if (auditRun.total_queries === 0) {
        console.log('[BULK-PROCESSOR] No queries found, generating from templates...');
        await generateQueriesFromTemplates();
      }
      
      console.log('[BULK-PROCESSOR] Starting query batch processing...');
      await processQueriesBatch();
    } catch (error) {
      console.error('[BULK-PROCESSOR] Error in handleStartProcessing:', error);
      toast({
        title: 'Error',
        description: 'Failed to start processing. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleStopProcessing = () => {
    console.log('[BULK-PROCESSOR] handleStopProcessing called');
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
