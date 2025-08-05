import React, { useState, useEffect } from 'react';
import { MainLayout } from '@/layouts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  SimplifiedBulkAuditProcessor,
  VisibilityResults,
  EnhancedAuditManager
} from '@/components/ChatGPTAudit';
import { TopicBulkAuditProcessor } from '@/components/ChatGPTAudit/TopicBulkAuditProcessor';
import { AuditRunManager } from '@/components/ChatGPTAudit/AuditRunManager';
import { StreamlinedSetupFlow } from '@/components/ChatGPTAudit/StreamlinedSetupFlow';
import { AuditRunIdentifier } from '@/components/ChatGPTAudit/AuditRunIdentifier';
import { AuditMode, TopicAuditData, GeneratedTopicQuery } from '@/types/topic-audit.types';
import { 
  MessageSquare, 
  Plus, 
  Settings, 
  TrendingUp,
  Zap,
  BarChart3
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
  topic_data?: any; // Use any to match database Json type
}

interface App {
  id: string;
  app_name: string;
  bundle_id?: string;
  platform: string;
  app_store_id?: string;
  app_description?: string;
  app_store_category?: string;
  app_rating?: number;
  app_reviews?: number;
  app_subtitle?: string;
  app_icon_url?: string;
  category?: string;
  developer_name?: string;
}

function ChatGPTVisibilityAudit() {
  const { toast } = useToast();
  const [apps, setApps] = useState<App[]>([]);
  const [auditRuns, setAuditRuns] = useState<AuditRun[]>([]);
  const [selectedAuditRun, setSelectedAuditRun] = useState<AuditRun | null>(null);
  const [organizationId, setOrganizationId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'setup' | 'runs' | 'results'>('setup');

  // Mode selection state
  const [auditMode, setAuditMode] = useState<AuditMode>('app');

  useEffect(() => {
    initializeData();
  }, []);

  // Real-time updates for audit runs and queries
  useEffect(() => {
    if (!organizationId) return;

    const channel = supabase
      .channel('audit-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chatgpt_audit_runs',
          filter: `organization_id=eq.${organizationId}`
        },
        (payload) => {
          console.log('🔄 Real-time audit run update:', payload);
          
          // Auto-navigate to results when audit completes
          if (payload.new.status === 'completed' && selectedAuditRun?.id === payload.new.id) {
            setActiveTab('results');
          }
          
          loadAuditRuns(organizationId);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chatgpt_queries',
          filter: `organization_id=eq.${organizationId}`
        },
        (payload) => {
          console.log('🔄 Real-time query update:', payload);
          loadAuditRuns(organizationId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId, selectedAuditRun]);

  const initializeData = async () => {
    try {
      // Get current user's organization
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast({
          title: 'Authentication Required',
          description: 'Please sign in to access ChatGPT visibility audits.',
          variant: 'destructive'
        });
        return;
      }

      // Get user profile to get organization ID
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (profileError || !profile?.organization_id) {
        toast({
          title: 'Organization Required',
          description: 'You need to be part of an organization to use this feature.',
          variant: 'destructive'
        });
        return;
      }

      setOrganizationId(profile.organization_id);

      // Fetch apps
      const { data: appsData, error: appsError } = await supabase
        .from('apps')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .eq('is_active', true);

      if (appsError) {
        console.error('Error fetching apps:', appsError);
        toast({
          title: 'Error',
          description: 'Failed to load apps. Please try again.',
          variant: 'destructive'
        });
      } else {
        setApps(appsData || []);
      }

      // Fetch audit runs
      await loadAuditRuns(profile.organization_id);

    } catch (error) {
      console.error('Error initializing data:', error);
      toast({
        title: 'Error',
        description: 'Failed to initialize the page. Please refresh and try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAuditRuns = async (orgId: string) => {
    try {
      const { data: runsData, error: runsError } = await supabase
        .from('chatgpt_audit_runs')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });

      if (runsError) {
        console.error('Error fetching audit runs:', runsError);
      } else {
        // Type cast to fix status and other field type mismatches
        const typedRuns = (runsData || []).map(run => ({
          ...run,
          status: run.status as 'pending' | 'running' | 'completed' | 'error' | 'paused',
          audit_type: run.audit_type || 'app',
          total_queries: run.total_queries || 0,
          completed_queries: run.completed_queries || 0
        }));
        setAuditRuns(typedRuns);
        
        // Fix: Auto-select the most recent RUNNING audit run if one exists, otherwise the most recent one
        if (!selectedAuditRun && typedRuns.length > 0) {
          const runningAudit = typedRuns.find(run => run.status === 'running');
          setSelectedAuditRun(runningAudit || typedRuns[0]);
        }
        
        // Fix: Update selected audit run if it exists in the new data to sync progress
        if (selectedAuditRun && typedRuns.length > 0) {
          const updatedSelectedRun = typedRuns.find(run => run.id === selectedAuditRun.id);
          if (updatedSelectedRun && updatedSelectedRun.completed_queries !== selectedAuditRun.completed_queries) {
            console.log(`🔄 Syncing audit run progress: ${updatedSelectedRun.completed_queries}/${updatedSelectedRun.total_queries}`);
            setSelectedAuditRun(updatedSelectedRun);
          }
        }
      }
    } catch (error) {
      console.error('Error loading audit runs:', error);
    }
  };

  const handleAuditCreate = async (auditData: {
    name: string;
    description: string;
    mode: AuditMode;
    app?: any;
    topicData?: TopicAuditData;
    queries?: GeneratedTopicQuery[];
  }) => {
    try {
      console.log('ChatGPTVisibilityAudit: Creating audit with data:', auditData);
      
      // Fix: Check for duplicate audit names to prevent confusion
      const existingAudit = auditRuns.find(run => 
        run.name.toLowerCase().trim() === auditData.name.toLowerCase().trim() &&
        run.audit_type === auditData.mode
      );
      
      if (existingAudit) {
        toast({
          title: 'Duplicate Audit Name',
          description: `An audit with name "${auditData.name}" already exists. Please choose a different name.`,
          variant: 'destructive'
        });
        return;
      }
      
      const insertData: any = {
        organization_id: organizationId,
        name: auditData.name.trim(),
        description: auditData.description.trim() || null,
        status: 'pending',
        total_queries: 0,
        completed_queries: 0,
        audit_type: auditData.mode
      };

      if (auditData.mode === 'app' && auditData.app) {
        insertData.app_id = auditData.app.id;
      } else if (auditData.mode === 'topic' && auditData.topicData) {
        insertData.app_id = 'topic'; // Placeholder for topic audits
        insertData.topic_data = auditData.topicData;
        insertData.total_queries = auditData.queries?.length || 0;
      }

      console.log('ChatGPTVisibilityAudit: Inserting audit run:', insertData);
      
      const { data, error } = await supabase
        .from('chatgpt_audit_runs')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('ChatGPTVisibilityAudit: Error creating audit run:', error);
        throw error;
      }

      console.log('ChatGPTVisibilityAudit: Created audit run:', data.id);

      // Insert queries if provided
      if (auditData.queries && auditData.queries.length > 0) {
        console.log('ChatGPTVisibilityAudit: Inserting queries:', auditData.queries.length);
        
        const queryInserts = auditData.queries.map(query => ({
          id: query.id,
          organization_id: organizationId,
          audit_run_id: data.id,
          query_text: query.query_text,
          query_type: query.query_type,
          priority: query.priority,
          status: 'pending'
        }));

        const { error: queryError } = await supabase
          .from('chatgpt_queries')
          .insert(queryInserts);

        if (queryError) {
          console.error('ChatGPTVisibilityAudit: Error inserting queries:', queryError);
          throw queryError;
        }

        console.log('ChatGPTVisibilityAudit: Successfully inserted queries');
      }

      setSelectedAuditRun({
        ...data,
        status: data.status as 'pending' | 'running' | 'completed' | 'error' | 'paused',
        audit_type: data.audit_type || auditData.mode,
        total_queries: data.total_queries || 0,
        completed_queries: data.completed_queries || 0
      });
      
      await loadAuditRuns(organizationId);

      const entityName = auditData.mode === 'app' 
        ? auditData.app?.app_name 
        : auditData.topicData?.topic;
      
      toast({
        title: 'Audit Created',
        description: `Created ${auditData.mode} audit "${data.name}" for ${entityName}`,
      });

      // Auto-navigate to runs tab after all operations complete
      setTimeout(() => {
        setActiveTab('runs');
      }, 100);
    } catch (error) {
      console.error('Error creating audit run:', error);
      toast({
        title: 'Error',
        description: 'Failed to create audit run. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleStatusChange = () => {
    loadAuditRuns(organizationId);
  };

  const handleModeChange = (mode: AuditMode) => {
    setAuditMode(mode);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-zinc-400">Loading ChatGPT Visibility Audit...</p>
        </div>
      </div>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground flex items-center space-x-3">
            <MessageSquare className="h-8 w-8 text-blue-400" />
            <span>ChatGPT Visibility Audit</span>
          </h1>
          <p className="text-zinc-400">
            Analyze how often your app is mentioned by ChatGPT across different queries and contexts
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-zinc-800 p-1 rounded-lg w-fit">
          {[
            { id: 'setup', label: 'Setup', icon: Settings },
            { id: 'runs', label: 'Audit Runs', icon: Zap },
            { id: 'results', label: 'Results', icon: BarChart3 }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                activeTab === id
                  ? 'bg-blue-600 text-foreground'
                  : 'text-zinc-400 hover:text-foreground hover:bg-zinc-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Setup Tab */}
        {activeTab === 'setup' && (
          <StreamlinedSetupFlow
            apps={apps}
            auditMode={auditMode}
            onModeChange={handleModeChange}
            onAuditCreate={handleAuditCreate}
          />
        )}

        {/* Audit Runs Tab */}
         {activeTab === 'runs' && (
           <div className="space-y-6">
             {/* Currently Selected Audit Run */}
             {selectedAuditRun && (
               <div className="space-y-4">
                 <div className="text-sm font-medium text-muted-foreground">Currently Selected:</div>
                  <AuditRunIdentifier 
                    auditRun={selectedAuditRun} 
                    isSelected={true}
                    showDetails={true}
                    onNameUpdate={async (id: string, newName: string) => {
                      try {
                        const { error } = await supabase
                          .from('chatgpt_audit_runs')
                          .update({ name: newName })
                          .eq('id', id)
                          .eq('organization_id', organizationId);

                        if (error) throw error;
                        await loadAuditRuns(organizationId);
                      } catch (error) {
                        console.error('Error updating audit name:', error);
                        throw error;
                      }
                    }}
                  />
               </div>
             )}

             {/* Enhanced Audit Run Manager */}
             <EnhancedAuditManager
               auditRuns={auditRuns}
               selectedAuditRun={selectedAuditRun}
               onAuditRunSelect={setSelectedAuditRun}
               onRefresh={handleStatusChange}
               organizationId={organizationId}
             />

            {/* Processor */}
            {selectedAuditRun && (
              selectedAuditRun.audit_type === 'topic' ? (
                <TopicBulkAuditProcessor
                  selectedAuditRun={selectedAuditRun}
                  onStatusChange={handleStatusChange}
                  organizationId={organizationId}
                />
              ) : (
                <SimplifiedBulkAuditProcessor
                  auditRun={selectedAuditRun}
                  organizationId={organizationId}
                  onStatusChange={handleStatusChange}
                />
              )
            )}
          </div>
        )}

        {/* Results Tab */}
        {activeTab === 'results' && (
          <div className="space-y-6">
            {selectedAuditRun && selectedAuditRun.status === 'completed' ? (
              <VisibilityResults 
                auditRunId={selectedAuditRun.id}
                organizationId={organizationId}
              />
            ) : (
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardContent className="text-center py-12">
                  <TrendingUp className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-foreground mb-2">No Results Available</h3>
                  <p className="text-zinc-400 mb-4">
                    {selectedAuditRun 
                      ? 'Complete the selected audit run to view results.'
                      : 'Select and complete an audit run to view results.'
                    }
                  </p>
                  {!selectedAuditRun && (
                    <Button onClick={() => setActiveTab('runs')}>
                      View Audit Runs
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}

export default ChatGPTVisibilityAudit;