import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
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

interface BulkAuditProcessorProps {
  auditRun: AuditRun;
  selectedTemplates: QueryTemplate[];
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
  selectedTemplates,
  organizationId,
  onStatusChange
}) => {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentQueryIndex, setCurrentQueryIndex] = useState(0);
  const [processingStats, setProcessingStats] = useState<ProcessingStats>({
    totalQueries: 0,
    completedQueries: 0,
    failedQueries: 0,
    avgResponseTime: 0,
    totalCost: 0,
    estimatedTimeRemaining: 0
  });
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]); // Keep last 20 logs
  };

  const generateQueriesFromTemplates = async () => {
    try {
      addLog('Generating queries from selected templates...');
      
      const queries = selectedTemplates.map(template => {
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

      // Insert queries into database
      const { error } = await supabase
        .from('chatgpt_queries')
        .insert(queries);

      if (error) throw error;

      // Update audit run with query count
      const { error: updateError } = await supabase
        .from('chatgpt_audit_runs')
        .update({ 
          total_queries: queries.length,
          status: 'pending'
        })
        .eq('id', auditRun.id);

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
      setIsProcessing(true);
      addLog('Starting batch processing...');

      // Get pending queries
      const { data: queries, error } = await supabase
        .from('chatgpt_queries')
        .select('*')
        .eq('audit_run_id', auditRun.id)
        .eq('status', 'pending')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (!queries || queries.length === 0) {
        addLog('No pending queries found');
        return;
      }

      // Update audit run to running
      await supabase
        .from('chatgpt_audit_runs')
        .update({ 
          status: 'running',
          started_at: new Date().toISOString()
        })
        .eq('id', auditRun.id);

      onStatusChange();

      // Process queries with rate limiting (1 every 2 seconds to avoid hitting OpenAI limits)
      for (let i = 0; i < queries.length; i++) {
        if (!isProcessing) break; // Check if stopped

        const query = queries[i];
        setCurrentQueryIndex(i + 1);
        
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
          
          setProcessingStats(prev => ({
            ...prev,
            completedQueries: prev.completedQueries + 1,
            avgResponseTime: (prev.avgResponseTime * prev.completedQueries + responseTime) / (prev.completedQueries + 1),
            estimatedTimeRemaining: (queries.length - (i + 1)) * 2000 // 2 seconds per query
          }));

          addLog(`✓ Query ${i + 1} completed (${responseTime}ms)`);

        } catch (error) {
          addLog(`✗ Query ${i + 1} failed: ${error.message}`);
          
          setProcessingStats(prev => ({
            ...prev,
            failedQueries: prev.failedQueries + 1
          }));

          // Mark query as failed
          await supabase
            .from('chatgpt_queries')
            .update({ status: 'error' })
            .eq('id', query.id);
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
      setIsProcessing(false);
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
    setIsProcessing(false);
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
                <span>{auditRun.total_queries === 0 ? 'Generate & Start' : 'Resume Processing'}</span>
              </Button>
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

      {/* Selected Templates Preview */}
      {selectedTemplates.length > 0 && (
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