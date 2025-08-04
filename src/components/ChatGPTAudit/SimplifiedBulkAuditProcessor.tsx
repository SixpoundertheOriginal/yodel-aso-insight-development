
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DatabaseService } from '@/lib/services/database.service';
import { 
  Play, 
  Square, 
  CheckCircle, 
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

interface SimplifiedBulkAuditProcessorProps {
  auditRun: AuditRun;
  selectedTemplates?: QueryTemplate[];
  generatedQueries?: GeneratedQuery[];
  organizationId: string;
  onStatusChange: () => void;
}

interface ProcessingProgress {
  current: number;
  total: number;
  completed: number;
  failed: number;
  logs: string[];
}

export const SimplifiedBulkAuditProcessor: React.FC<SimplifiedBulkAuditProcessorProps> = ({
  auditRun,
  selectedTemplates = [],
  generatedQueries = [],
  organizationId,
  onStatusChange
}) => {
  const { toast } = useToast();
  
  // Fixed state management - using clear boolean flags
  const [isRunning, setIsRunning] = useState(false);
  const [shouldStop, setShouldStop] = useState(false);
  const [progress, setProgress] = useState<ProcessingProgress>({
    current: 0,
    total: 0,
    completed: 0,
    failed: 0,
    logs: []
  });

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(`[SIMPLIFIED-PROCESSOR] ${message}`);
    setProgress(prev => ({
      ...prev,
      logs: [logMessage, ...prev.logs.slice(0, 19)] // Keep last 20 logs
    }));
  };

  const generateQueriesFromTemplates = async (): Promise<number> => {
    console.log('[SIMPLIFIED-PROCESSOR] Generating queries from templates...');
    
    try {
      let queries: any[] = [];

      // Prioritize generated queries over static templates
      if (generatedQueries.length > 0) {
        console.log(`[SIMPLIFIED-PROCESSOR] Using ${generatedQueries.length} AI-generated queries...`);
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
        console.log(`[SIMPLIFIED-PROCESSOR] Using ${selectedTemplates.length} template queries...`);
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

      console.log(`[SIMPLIFIED-PROCESSOR] Inserting ${queries.length} queries into database...`);

      // Insert queries into database
      const { error } = await supabase
        .from('chatgpt_queries')
        .insert(queries);

      if (error) throw error;

      // Update audit run with query count
      const { error: updateError } = await DatabaseService.updateAuditRun(
        auditRun.id,
        { 
          total_queries: queries.length,
          status: 'pending'
        },
        { organizationId }
      );

      if (updateError) throw updateError;

      console.log(`[SIMPLIFIED-PROCESSOR] Successfully generated ${queries.length} queries`);
      addLog(`Generated ${queries.length} queries successfully`);
      onStatusChange();

      return queries.length;
    } catch (error) {
      console.error('[SIMPLIFIED-PROCESSOR] Error generating queries:', error);
      addLog(`Error generating queries: ${error.message}`);
      throw error;
    }
  };

  const processSingleQuery = async (query: any, index: number, total: number) => {
    console.log(`[SIMPLIFIED-PROCESSOR] Processing query ${index + 1}/${total}: ${query.id}`);
    addLog(`Processing query ${index + 1}/${total}: ${query.query_text.substring(0, 50)}...`);

    const startTime = Date.now();

    try {
      const functionPayload = {
        queryId: query.id,
        queryText: query.query_text,
        auditRunId: auditRun.id,
        organizationId: organizationId,
        appId: auditRun.app_id
      };

      console.log(`[SIMPLIFIED-PROCESSOR] Calling edge function with payload:`, functionPayload);

      // Call the edge function
      const { data: functionData, error: functionError } = await supabase.functions.invoke('chatgpt-visibility-query', {
        body: functionPayload
      });

      if (functionError) {
        throw new Error(`Edge function error: ${functionError.message}`);
      }

      const responseTime = Date.now() - startTime;
      console.log(`[SIMPLIFIED-PROCESSOR] Query ${index + 1} completed in ${responseTime}ms`);
      addLog(`✓ Query ${index + 1} completed (${responseTime}ms)`);

      return { success: true, responseTime };
    } catch (error) {
      console.error(`[SIMPLIFIED-PROCESSOR] Query ${index + 1} failed:`, error);
      addLog(`✗ Query ${index + 1} failed: ${error.message}`);
      
      // Mark query as failed in database
      try {
        await DatabaseService.updateChatGPTQuery(
          query.id,
          { status: 'error' },
          { organizationId }
        );
      } catch (updateError) {
        console.error('[SIMPLIFIED-PROCESSOR] Failed to update query status:', updateError);
      }

      return { success: false, error: error.message };
    }
  };

  const runAudit = async () => {
    console.log('[SIMPLIFIED-PROCESSOR] Starting audit run...');
    setIsRunning(true);
    setShouldStop(false);
    
    try {
      // Step 1: Generate queries if needed
      if (auditRun.total_queries === 0) {
        console.log('[SIMPLIFIED-PROCESSOR] No queries found, generating from templates...');
        await generateQueriesFromTemplates();
      }

      // Step 2: Get pending queries
      addLog('Fetching pending queries...');
      const { data: queries, error } = await supabase
        .from('chatgpt_queries')
        .select('*')
        .eq('audit_run_id', auditRun.id)
        .eq('organization_id', organizationId)
        .eq('status', 'pending')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (!queries || queries.length === 0) {
        addLog('No pending queries found');
        return;
      }

      console.log(`[SIMPLIFIED-PROCESSOR] Found ${queries.length} pending queries`);
      
      // Initialize progress
      setProgress(prev => ({
        ...prev,
        current: 0,
        total: queries.length,
        completed: 0,
        failed: 0
      }));

      // Step 3: Update audit run to running
      await DatabaseService.updateAuditRun(
        auditRun.id,
        { 
          status: 'running',
          started_at: new Date().toISOString()
        },
        { organizationId }
      );
      onStatusChange();

      // Step 4: Process queries one by one - FIXED LOOP CONDITION
      for (let i = 0; i < queries.length; i++) {
        // Check if we should stop (but continue if we're still running)
        if (shouldStop) {
          console.log(`[SIMPLIFIED-PROCESSOR] Stopping audit at query ${i + 1}/${queries.length}`);
          addLog(`Audit stopped by user at query ${i + 1}/${queries.length}`);
          break;
        }

        console.log(`[SIMPLIFIED-PROCESSOR] Processing query ${i + 1}/${queries.length} - isRunning: ${isRunning}, shouldStop: ${shouldStop}`);
        
        const result = await processSingleQuery(queries[i], i, queries.length);
        
        setProgress(prev => ({
          ...prev,
          current: i + 1,
          completed: prev.completed + (result.success ? 1 : 0),
          failed: prev.failed + (result.success ? 0 : 1)
        }));

        // Rate limiting - wait 2 seconds between queries (but only if not stopping)
        if (i < queries.length - 1 && !shouldStop) {
          console.log(`[SIMPLIFIED-PROCESSOR] Waiting 2 seconds before next query...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      // Step 5: Complete the audit
      if (!shouldStop) {
        await DatabaseService.updateAuditRun(
          auditRun.id,
          { 
            status: 'completed',
            completed_at: new Date().toISOString()
          },
          { organizationId }
        );
        onStatusChange();
        addLog('Audit completed successfully!');
        console.log('[SIMPLIFIED-PROCESSOR] Audit completed successfully');
      } else {
        await DatabaseService.updateAuditRun(
          auditRun.id,
          { status: 'paused' },
          { organizationId }
        );
        onStatusChange();
        addLog('Audit paused by user');
        console.log('[SIMPLIFIED-PROCESSOR] Audit paused by user');
      }

    } catch (error) {
      console.error('[SIMPLIFIED-PROCESSOR] Audit error:', error);
      addLog(`Audit error: ${error.message}`);
      
      // Update audit run to error status
      try {
        await DatabaseService.updateAuditRun(
          auditRun.id,
          { status: 'error' },
          { organizationId }
        );
        onStatusChange();
      } catch (updateError) {
        console.error('[SIMPLIFIED-PROCESSOR] Failed to update audit status:', updateError);
      }

      toast({
        title: 'Audit Failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsRunning(false);
      setShouldStop(false);
    }
  };

  const stopAudit = () => {
    console.log('[SIMPLIFIED-PROCESSOR] User requested stop...');
    setShouldStop(true);
    addLog('Stop requested by user...');
  };

  const progressPercentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Processing Controls */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center space-x-2">
            <Zap className="h-5 w-5" />
            <span>ChatGPT Visibility Audit</span>
          </CardTitle>
          <CardDescription className="text-zinc-400">
            Simple, reliable batch processing of ChatGPT queries
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-zinc-400">Total Queries</p>
              <p className="text-2xl font-bold text-foreground">{progress.total}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-zinc-400">Completed</p>
              <p className="text-2xl font-bold text-green-400">{progress.completed}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-zinc-400">Failed</p>
              <p className="text-2xl font-bold text-red-400">{progress.failed}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-zinc-400">Progress</p>
              <p className="text-2xl font-bold text-blue-400">{Math.round(progressPercentage)}%</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Processing Progress</span>
              <Badge variant={isRunning ? 'default' : 'outline'}>
                {isRunning ? 'Running' : shouldStop ? 'Stopping' : auditRun.status}
              </Badge>
            </div>
            <Progress value={progressPercentage} className="h-3" />
            {isRunning && (
              <p className="text-xs text-zinc-500">
                Current: Query {progress.current}/{progress.total}
              </p>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center space-x-3">
            {!isRunning && auditRun.status !== 'completed' && (
              <Button 
                onClick={runAudit}
                className="flex items-center space-x-2"
              >
                <Play className="h-4 w-4" />
                <span>
                  {auditRun.total_queries === 0 ? 'Generate & Start Audit' : 'Start Audit'}
                </span>
              </Button>
            )}

            {isRunning && (
              <Button 
                onClick={stopAudit}
                variant="destructive"
                className="flex items-center space-x-2"
              >
                <Square className="h-4 w-4" />
                <span>Stop Audit</span>
              </Button>
            )}

            {auditRun.status === 'completed' && (
              <div className="flex items-center space-x-2 text-green-400">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Audit Completed</span>
              </div>
            )}
          </div>

          {/* Estimated Time */}
          {isRunning && progress.total > 0 && (
            <Alert className="bg-blue-900/20 border-blue-700/50">
              <Clock className="h-4 w-4" />
              <AlertDescription className="text-blue-400">
                Estimated time remaining: {Math.ceil((progress.total - progress.current) * 2 / 60)} minutes
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Processing Logs */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center space-x-2">
            <RefreshCw className="h-5 w-5" />
            <span>Processing Logs</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-zinc-950 border border-zinc-800 rounded-md p-4 h-64 overflow-y-auto">
            {progress.logs.length === 0 ? (
              <p className="text-zinc-500 text-sm">No logs yet. Start the audit to see real-time updates.</p>
            ) : (
              <div className="space-y-1">
                {progress.logs.map((log, index) => (
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
            <CardTitle className="text-foreground">Generated Queries ({generatedQueries.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {generatedQueries.slice(0, 6).map(query => (
                <div key={query.id} className="p-3 bg-zinc-800/50 rounded-md border border-zinc-700">
                  <div className="flex items-center space-x-2 mb-2">
                    {query.icon}
                    <span className="text-sm font-medium text-foreground">{query.generated_from}</span>
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
            <CardTitle className="text-foreground">Selected Templates ({selectedTemplates.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {selectedTemplates.map(template => (
                <div key={template.id} className="p-3 bg-zinc-800/50 rounded-md border border-zinc-700">
                  <div className="flex items-center space-x-2 mb-2">
                    {template.icon}
                    <span className="text-sm font-medium text-foreground">{template.name}</span>
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
