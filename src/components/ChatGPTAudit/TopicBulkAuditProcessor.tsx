import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { TopicQueryGeneratorService } from '@/services/topic-query-generator.service';
import { TopicAuditData } from '@/types/topic-audit.types';
import { Play, Pause, Square, Target, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface AuditRun {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'error' | 'paused';
  total_queries: number;
  completed_queries: number;
  topic_data?: TopicAuditData;
  audit_type: string;
  created_at: string;
  completed_at?: string;
}

interface TopicBulkAuditProcessorProps {
  selectedAuditRun: AuditRun | null;
  onStatusChange: () => void;
  organizationId: string;
}

export const TopicBulkAuditProcessor: React.FC<TopicBulkAuditProcessorProps> = ({
  selectedAuditRun,
  onStatusChange,
  organizationId,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStats, setProcessingStats] = useState({
    completed: 0,
    failed: 0,
    total: 0,
    currentQuery: ''
  });
  const isProcessingRef = useRef(false);

  const canProcess = selectedAuditRun && 
    selectedAuditRun.audit_type === 'topic' && 
    ['pending', 'paused'].includes(selectedAuditRun.status);

  const canPause = selectedAuditRun && 
    selectedAuditRun.audit_type === 'topic' && 
    selectedAuditRun.status === 'running';

  const testFunctionAccessibility = async () => {
    try {
      console.log('🔧 Testing Edge Function accessibility...');
      const response = await supabase.functions.invoke('chatgpt-topic-analysis', {
        body: { test: 'accessibility_check' }
      });
      console.log('🔧 Accessibility test response:', response);
      return !response.error;
    } catch (error) {
      console.error('🔧 Function accessibility test failed:', error);
      return false;
    }
  };

  const processQueryWithDetailedLogging = async (query: any) => {
    // ADD THESE LOGS FIRST:
    console.log('🚀 ENTERED processQueryWithDetailedLogging function');
    console.log('📝 Query parameter received:', {
      id: query?.id,
      query_text: query?.query_text?.substring(0, 50) + '...',
      type: typeof query
    });
    
    try {
      console.log('🔧 About to start function accessibility test...');
      
      // Test function accessibility
      const isAccessible = await testFunctionAccessibility();
      console.log('🔧 Function accessibility result:', isAccessible);
      
      if (!isAccessible) {
        console.error('❌ Function not accessible, aborting query processing');
        return;
      }
      
      console.log('✅ Function accessible, proceeding with query processing');
      
      // Continue with existing code...
      console.group(`📋 Processing Query: ${query.id}`);

      setProcessingStats(prev => ({ 
        ...prev, 
        currentQuery: query.query_text 
      }));

      console.log('Query Details:', {
        queryId: query.id,
        queryText: query.query_text?.substring(0, 100) + '...',
        auditRunId: selectedAuditRun.id,
        organizationId,
        targetTopic: selectedAuditRun.topic_data.topic
      });

      const requestPayload = {
        queryId: query.id,
        queryText: query.query_text,
        auditRunId: selectedAuditRun.id,
        organizationId: organizationId,
        targetTopic: selectedAuditRun.topic_data.topic
      };

      console.log('Edge Function Request Payload:', requestPayload);

      const startTime = Date.now();
      
      // Call the topic analysis function
      const { data, error } = await supabase.functions.invoke('chatgpt-topic-analysis', {
        body: requestPayload
      });

      const duration = Date.now() - startTime;
      console.log('Edge Function Response:', {
        duration: `${duration}ms`,
        hasError: !!error,
        hasData: !!data,
        errorDetails: error
      });

      if (error) {
        console.error('❌ Query processing failed:', error);
        console.groupEnd();
        toast({
          title: 'Query Failed',
          description: `Query "${query.query_text.substring(0, 50)}..." failed: ${error.message}`,
          variant: 'destructive'
        });
        setProcessingStats(prev => ({ 
          ...prev, 
          failed: prev.failed + 1 
        }));
      } else {
        console.log('✅ Successfully processed query in', duration + 'ms:', data);
        console.groupEnd();
        toast({
          title: 'Query Completed',
          description: `Query "${query.query_text.substring(0, 50)}..." completed successfully`,
        });
        setProcessingStats(prev => ({ 
          ...prev, 
          completed: prev.completed + 1 
        }));
      }

      // Add delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error) {
      console.error('💥 FATAL ERROR in processQueryWithDetailedLogging:', error);
      console.error('Query processing error:', error);
      toast({
        title: 'Query Error',
        description: `Query "${query.query_text.substring(0, 50)}..." failed: ${error.message || 'Unknown error'}`,
        variant: 'destructive'
      });
      setProcessingStats(prev => ({ 
        ...prev, 
        failed: prev.failed + 1 
      }));
      throw error;
    }
  };

  const startProcessing = async () => {
    if (!selectedAuditRun || !selectedAuditRun.topic_data) {
      toast({
        title: 'Error',
        description: 'No topic data found for this audit run',
        variant: 'destructive'
      });
      return;
    }

    // 🔍 Environment and Configuration Audit
    console.group('🔍 TopicBulkAuditProcessor - Environment Audit');
    console.log('Environment:', {
      nodeEnv: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      supabaseConfigured: !!supabase,
      organizationId,
      auditRunId: selectedAuditRun.id,
      auditRunType: selectedAuditRun.audit_type,
      targetTopic: selectedAuditRun.topic_data?.topic
    });
    console.groupEnd();

    setIsProcessing(true);
    isProcessingRef.current = true;
    setProcessingStats({
      completed: selectedAuditRun.completed_queries,
      failed: 0,
      total: 0,
      currentQuery: ''
    });

    try {
      console.log('TopicBulkAuditProcessor: Starting processing for audit run:', selectedAuditRun.id);

      // Check if queries already exist
      console.log('TopicBulkAuditProcessor: Checking existing queries for audit run:', selectedAuditRun.id);
      const existingQueries = await supabase
        .from('chatgpt_queries')
        .select('id')
        .eq('audit_run_id', selectedAuditRun.id);

      console.log('TopicBulkAuditProcessor: Found existing queries:', existingQueries.data?.length || 0);

      if (!existingQueries.data || existingQueries.data.length === 0) {
        console.log('TopicBulkAuditProcessor: No existing queries found, generating new ones');
        
        // Generate queries using the topic data
        const queries = TopicQueryGeneratorService.generateQueries(selectedAuditRun.topic_data, 10);
        console.log('TopicBulkAuditProcessor: Generated queries:', queries.length);
        
        const queryInserts = queries.map(query => ({
          id: query.id,
          organization_id: organizationId,
          audit_run_id: selectedAuditRun.id,
          query_text: query.query_text,
          query_type: query.query_type,
          priority: query.priority,
          status: 'pending'
        }));

        console.log('TopicBulkAuditProcessor: Inserting queries into database');
        const { error: insertError } = await supabase
          .from('chatgpt_queries')
          .insert(queryInserts);

        if (insertError) {
          console.error('TopicBulkAuditProcessor: Error inserting queries:', insertError);
          throw new Error(`Failed to insert queries: ${insertError.message}`);
        }

        // Update total queries count
        console.log('TopicBulkAuditProcessor: Updating total queries count to:', queries.length);
        const { error: updateError } = await supabase
          .from('chatgpt_audit_runs')
          .update({ total_queries: queries.length })
          .eq('id', selectedAuditRun.id);

        if (updateError) {
          console.error('TopicBulkAuditProcessor: Error updating total queries count:', updateError);
        }
      } else {
        console.log('TopicBulkAuditProcessor: Using existing queries');
      }

      // Verify queries exist before starting processing
      const allQueries = await supabase
        .from('chatgpt_queries')
        .select('*')
        .eq('audit_run_id', selectedAuditRun.id);

      if (!allQueries.data || allQueries.data.length === 0) {
        throw new Error('No queries found for this audit run');
      }

      console.log('TopicBulkAuditProcessor: Found total queries:', allQueries.data.length);
      setProcessingStats(prev => ({ ...prev, total: allQueries.data.length }));

      // Update audit status to running only after queries are confirmed
      console.log('TopicBulkAuditProcessor: Updating audit status to running');
      await supabase
        .from('chatgpt_audit_runs')
        .update({ 
          status: 'running',
          started_at: new Date().toISOString()
        })
        .eq('id', selectedAuditRun.id);

      // Process queries
      const pendingQueries = await supabase
        .from('chatgpt_queries')
        .select('*')
        .eq('audit_run_id', selectedAuditRun.id)
        .eq('status', 'pending')
        .order('priority');

      console.log('🔄 About to start processing queries:', {
        totalQueries: pendingQueries.data?.length || 0,
        firstQueryId: pendingQueries.data?.[0]?.id,
        processingMode: 'topic-analysis'
      });

      if (pendingQueries.data) {
        for (let i = 0; i < pendingQueries.data.length; i++) {
          const query = pendingQueries.data[i];
          console.log(`🎯 Starting query ${i + 1}/${pendingQueries.data.length}: ${query.id}`);
          
          if (!isProcessingRef.current) break; // Check if processing was stopped

          console.log('🚀 ABOUT TO CALL processQueryWithDetailedLogging');
          console.log('📝 Query data:', { id: query.id, text: query.query_text?.substring(0, 50) });

          try {
            const result = await processQueryWithDetailedLogging(query);
            console.log('✅ processQueryWithDetailedLogging RETURNED successfully');
            console.log('📤 Result:', result);
          } catch (error) {
            console.error('❌ processQueryWithDetailedLogging FAILED with error:', error);
            console.error('🔍 Error details:', {
              message: (error as any).message,
              stack: (error as any).stack?.substring(0, 200)
            });
            throw error;
          }

          console.log('🏁 COMPLETED processQueryWithDetailedLogging call');
        }
      }

      toast({
        title: 'Processing Complete',
        description: `Processed ${processingStats.completed} queries successfully`,
      });

    } catch (error) {
      console.error('Processing error:', error);
      toast({
        title: 'Processing Error',
        description: 'Failed to process audit. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
      setProcessingStats(prev => ({ ...prev, currentQuery: '' }));
      onStatusChange();
    }
  };

  const pauseProcessing = async () => {
    setIsProcessing(false);
    isProcessingRef.current = false;
    
    if (selectedAuditRun) {
      await supabase
        .from('chatgpt_audit_runs')
        .update({ status: 'paused' })
        .eq('id', selectedAuditRun.id);
      
      onStatusChange();
    }
  };

  const stopProcessing = async () => {
    setIsProcessing(false);
    isProcessingRef.current = false;
    
    if (selectedAuditRun) {
      await supabase
        .from('chatgpt_audit_runs')
        .update({ 
          status: 'pending',
          started_at: null
        })
        .eq('id', selectedAuditRun.id);
      
      onStatusChange();
    }
  };

  if (!selectedAuditRun || selectedAuditRun.audit_type !== 'topic') {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5" />
            <span>Topic Audit Processor</span>
          </CardTitle>
          <CardDescription>
            Select a topic audit run to begin processing
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const progress = selectedAuditRun.total_queries > 0 
    ? (selectedAuditRun.completed_queries / selectedAuditRun.total_queries) * 100 
    : 0;

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Target className="h-5 w-5" />
          <span>Topic Audit Processor</span>
          <Badge variant={
            selectedAuditRun.status === 'completed' ? 'default' :
            selectedAuditRun.status === 'running' ? 'secondary' :
            selectedAuditRun.status === 'error' ? 'destructive' : 'outline'
          }>
            {selectedAuditRun.status}
          </Badge>
        </CardTitle>
        <CardDescription>
          Processing audit: {selectedAuditRun.name}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Progress Section */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>{selectedAuditRun.completed_queries} / {selectedAuditRun.total_queries}</span>
          </div>
          <Progress value={progress} className="w-full" />
        </div>

        {/* Topic Information */}
        {selectedAuditRun.topic_data && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Topic Details</h4>
            <div className="bg-background/50 p-3 rounded-lg space-y-2">
              <div><strong>Topic:</strong> {selectedAuditRun.topic_data.topic}</div>
              <div><strong>Industry:</strong> {selectedAuditRun.topic_data.industry}</div>
              <div><strong>Target Audience:</strong> {selectedAuditRun.topic_data.target_audience}</div>
              {selectedAuditRun.topic_data.known_players.length > 0 && (
                <div>
                  <strong>Known Players:</strong> {selectedAuditRun.topic_data.known_players.join(', ')}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Current Processing Status */}
        {isProcessing && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span>Currently Processing</span>
            </h4>
            <div className="bg-background/50 p-3 rounded-lg">
              <div className="text-sm text-muted-foreground">
                {processingStats.currentQuery || 'Preparing next query...'}
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        {(isProcessing || selectedAuditRun.status === 'running') && (
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{processingStats.completed}</div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{processingStats.failed}</div>
              <div className="text-xs text-muted-foreground">Failed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {processingStats.total - processingStats.completed - processingStats.failed}
              </div>
              <div className="text-xs text-muted-foreground">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{processingStats.total}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-2">
          {canProcess && (
            <Button 
              onClick={startProcessing}
              disabled={isProcessing}
              className="flex items-center space-x-2"
            >
              <Play className="h-4 w-4" />
              <span>Start Processing</span>
            </Button>
          )}
          
          {canPause && isProcessing && (
            <Button 
              onClick={pauseProcessing}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <Pause className="h-4 w-4" />
              <span>Pause</span>
            </Button>
          )}
          
          {isProcessing && (
            <Button 
              onClick={stopProcessing}
              variant="destructive"
              className="flex items-center space-x-2"
            >
              <Square className="h-4 w-4" />
              <span>Stop</span>
            </Button>
          )}
          
          {!isProcessing && processingStats.total > 0 && (
            <div className="text-sm text-muted-foreground flex items-center">
              Processing query {processingStats.completed + processingStats.failed + 1} of {processingStats.total}
            </div>
          )}
        </div>

        {/* Status Messages */}
        {selectedAuditRun.status === 'completed' && (
          <div className="flex items-center space-x-2 text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm">Audit completed successfully</span>
          </div>
        )}
        
        {selectedAuditRun.status === 'error' && (
          <div className="flex items-center space-x-2 text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">Audit encountered errors</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};