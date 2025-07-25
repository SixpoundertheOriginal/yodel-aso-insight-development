
import React, { useState, useEffect } from 'react';
import { MainLayout } from '@/layouts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { DatabaseService } from '@/lib/services/database.service';
import { 
  SimplifiedBulkAuditProcessor,
  VisibilityResults
} from '@/components/ChatGPTAudit';
import { TopicBulkAuditProcessor } from '@/components/ChatGPTAudit/TopicBulkAuditProcessor';
import { AuditRunManager } from '@/components/ChatGPTAudit/AuditRunManager';
import { StreamlinedSetupFlow } from '@/components/ChatGPTAudit/StreamlinedSetupFlow';
import { AuditMode, TopicAuditData, GeneratedTopicQuery } from '@/types/topic-audit.types';
import { 
  MessageSquare, 
  Plus, 
  Search, 
  Settings, 
  TrendingUp,
  Zap,
  Target,
  BarChart3,
  Brain
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

export default function ChatGPTVisibilityAudit() {
  const { toast } = useToast();
  const [apps, setApps] = useState<App[]>([]);
  const [auditRuns, setAuditRuns] = useState<AuditRun[]>([]);
  const [selectedApp, setSelectedApp] = useState<App | null>(null);
  const [selectedAuditRun, setSelectedAuditRun] = useState<AuditRun | null>(null);
  const [organizationId, setOrganizationId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'setup' | 'runs' | 'results'>('setup');

  // Mode selection state
  const [auditMode, setAuditMode] = useState<AuditMode>('app');

  // No form state needed - handled by StreamlinedSetupFlow component

  useEffect(() => {
    initializeData();
  }, []);

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

      const { data, error } = await supabase
        .from('chatgpt_audit_runs')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      // Insert queries if provided
      if (auditData.queries && auditData.queries.length > 0) {
        const queryInserts = auditData.queries.map(query => ({
          id: query.id,
          organization_id: organizationId,
          audit_run_id: data.id,
          query_text: query.query_text,
          query_type: query.query_type,
          priority: query.priority,
          status: 'pending'
        }));

        await supabase
          .from('chatgpt_queries')
          .insert(queryInserts);
      }

      setSelectedAuditRun({
        ...data,
        status: data.status as 'pending' | 'running' | 'completed' | 'error' | 'paused',
        audit_type: data.audit_type || auditData.mode,
        total_queries: data.total_queries || 0,
        completed_queries: data.completed_queries || 0
      });
      
      setActiveTab('runs');
      await loadAuditRuns(organizationId);

      const entityName = auditData.mode === 'app' 
        ? auditData.app?.app_name 
        : auditData.topicData?.topic;
      
      toast({
        title: 'Audit Created',
        description: `Created ${auditData.mode} audit "${data.name}" for ${entityName}`,
      });
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
          <h1 className="text-3xl font-bold text-white flex items-center space-x-3">
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
                  ? 'bg-blue-600 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-700'
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

            {/* Conditional Rendering based on mode */}
            {auditMode === 'app' ? (
              <>
                {/* App Selection */}
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center space-x-2">
                      <Target className="h-5 w-5" />
                      <span>Select App to Audit</span>
                    </CardTitle>
                    <CardDescription className="text-zinc-400">
                      Choose which app you want to analyze for ChatGPT visibility
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {apps.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-zinc-400 mb-4">No apps found. Please add an app first.</p>
                        <Button variant="outline">
                          <Plus className="h-4 w-4 mr-2" />
                          Add App
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {apps.map(app => (
                          <div
                            key={app.id}
                            onClick={() => handleAppSelection(app)}
                            className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                              selectedApp?.id === app.id
                                ? 'border-blue-500 bg-blue-500/10'
                                : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
                            }`}
                          >
                            <div className="flex items-center space-x-3 mb-2">
                              {app.app_icon_url && (
                                <img 
                                  src={app.app_icon_url} 
                                  alt={app.app_name}
                                  className="h-8 w-8 rounded-lg"
                                />
                              )}
                              <div>
                                <h3 className="text-white font-medium">{app.app_name}</h3>
                                <p className="text-sm text-zinc-400">{app.platform}</p>
                              </div>
                            </div>
                            
                            {app.category && (
                              <Badge variant="outline" className="text-xs mb-2">
                                {app.category}
                              </Badge>
                            )}
                            
                            {selectedApp?.id === app.id && (
                              <Badge className="bg-blue-600 text-white text-xs">
                                <Brain className="h-3 w-3 mr-1" />
                                Selected for Analysis
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* App Intelligence Integration */}
                {selectedApp && (
                  <>
                    {/* App Intelligence Analyzer */}
                    <AppIntelligenceAnalyzer
                      appData={{
                        app_name: selectedApp.app_name,
                        description: selectedApp.app_description || `${selectedApp.app_name} is a ${selectedApp.category || 'mobile'} app developed by ${selectedApp.developer_name || 'Unknown Developer'}.`,
                        category: selectedApp.category || selectedApp.app_store_category || '',
                        developer: selectedApp.developer_name || '',
                        bundle_id: selectedApp.bundle_id || selectedApp.app_store_id || ''
                      }}
                      onIntelligenceGenerated={handleIntelligenceGenerated}
                      onAnalysisComplete={() => {
                        // Automatically switch to showing generated queries
                        console.log('Analysis complete, intelligence ready for query generation');
                      }}
                    />

                    {/* Create New Audit */}
                    <Card className="bg-zinc-900/50 border-zinc-800">
                      <CardHeader>
                        <CardTitle className="text-white flex items-center space-x-2">
                          <Plus className="h-5 w-5" />
                          <span>Create Intelligent Audit</span>
                          {appIntelligence && (
                            <Badge className="bg-green-600 text-white">
                              <Brain className="h-3 w-3 mr-1" />
                              AI Ready
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="text-zinc-400">
                          Set up a new ChatGPT visibility audit for {selectedApp.app_name}
                          {appIntelligence && (
                            <span className="text-green-400"> with AI-generated queries</span>
                          )}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="audit-name" className="text-white">Audit Name</Label>
                          <Input
                            id="audit-name"
                            value={newAuditName}
                            onChange={(e) => setNewAuditName(e.target.value)}
                            placeholder="e.g., Q1 2024 Visibility Check"
                            className="bg-zinc-800 border-zinc-700 text-white"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="audit-description" className="text-white">Description (Optional)</Label>
                          <Textarea
                            id="audit-description"
                            value={newAuditDescription}
                            onChange={(e) => setNewAuditDescription(e.target.value)}
                            placeholder="Describe the purpose of this audit..."
                            className="bg-zinc-800 border-zinc-700 text-white"
                            rows={3}
                          />
                        </div>

                        <Button
                          onClick={createAuditRun}
                          disabled={!newAuditName.trim() || !appIntelligence}
                          className="w-full"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          {appIntelligence 
                            ? 'Create Intelligent Audit Run' 
                            : 'Waiting for App Analysis...'
                          }
                        </Button>
                        
                        {!appIntelligence && (
                          <p className="text-xs text-zinc-500 text-center">
                            Complete app analysis above to enable intelligent audit creation
                          </p>
                        )}
                      </CardContent>
                    </Card>

                    {/* Enhanced Query Generation */}
                    {appIntelligence && (
                      <>
                        <MetadataQueryGenerator
                          validatedApp={{
                            appId: selectedApp?.app_store_id || selectedApp?.id || '',
                            metadata: {
                              name: selectedApp?.app_name || '',
                              appId: selectedApp?.app_store_id || selectedApp?.id || '',
                              title: selectedApp?.app_name || '',
                              subtitle: selectedApp?.app_subtitle,
                              description: selectedApp?.app_description,
                              applicationCategory: selectedApp?.category || selectedApp?.app_store_category,
                              developer: selectedApp?.developer_name,
                              rating: selectedApp?.app_rating,
                              reviews: selectedApp?.app_reviews,
                              icon: selectedApp?.app_icon_url,
                              url: '',
                              locale: 'en-US'
                            },
                            isValid: true
                          }}
                          onQueriesGenerated={setGeneratedQueries}
                          selectedQueries={generatedQueries.map(q => q.id)}
                          appIntelligence={appIntelligence}
                        />

                        {/* Query Templates */}
                        {!appIntelligence && (
                          <QueryTemplateLibrary
                            onSelectTemplates={(templates) => setSelectedTemplates(templates.map(t => t.id))}
                            selectedTemplates={selectedTemplates}
                            appContext={selectedApp ? {
                              name: selectedApp.app_name,
                              category: selectedApp.category || selectedApp.platform
                            } : undefined}
                          />
                        )}
                      </>
                    )}
                  </>
                )}
              </>
            ) : (
              <>
                {showQueryReview ? (
                  <QueryReviewInterface
                    queries={generatedTopicQueries}
                    onQueriesApproved={handleQueriesApproved}
                    onBack={handleBackToSetup}
                    topicData={topicData}
                  />
                ) : (
                  <TopicAnalysisInterface 
                    onTopicAnalysisGenerated={handleTopicAnalysisGenerated} 
                  />
                )}
                
                {/* Create New Topic Audit */}
                {topicData && !showQueryReview && (
                  <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center space-x-2">
                        <Plus className="h-5 w-5" />
                        <span>Create Topic Audit</span>
                        {topicIntelligence && (
                          <Badge className="bg-green-600 text-white">
                            <Target className="h-3 w-3 mr-1" />
                            Ready
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="text-zinc-400">
                        Set up a new ChatGPT visibility audit for "{topicData.topic}"
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="topic-audit-name" className="text-white">Audit Name</Label>
                        <Input
                          id="topic-audit-name"
                          value={newAuditName}
                          onChange={(e) => setNewAuditName(e.target.value)}
                          placeholder="e.g., Marketing Tools Visibility Analysis"
                          className="bg-zinc-800 border-zinc-700 text-white"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="topic-audit-description" className="text-white">Description (Optional)</Label>
                        <Textarea
                          id="topic-audit-description"
                          value={newAuditDescription}
                          onChange={(e) => setNewAuditDescription(e.target.value)}
                          placeholder="Describe the purpose of this topic analysis..."
                          className="bg-zinc-800 border-zinc-700 text-white"
                          rows={3}
                        />
                      </div>

                      <Button
                        onClick={createAuditRun}
                        disabled={!newAuditName.trim() || !topicData || generatedTopicQueries.length === 0}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create Topic Audit Run ({generatedTopicQueries.length} queries)
                      </Button>
                      
                      {generatedTopicQueries.length === 0 && (
                        <p className="text-xs text-zinc-500 text-center">
                          Generate and approve queries first to create audit run
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        )}

        {/* Audit Runs Tab */}
        {activeTab === 'runs' && (
          <div className="space-y-6">
            {/* Enhanced Audit Run Manager */}
            <AuditRunManager
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
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardContent className="text-center py-12">
                  <MessageSquare className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-white mb-2">No Audit Runs Yet</h3>
                  <p className="text-zinc-400 mb-4">Create your first ChatGPT visibility audit to get started.</p>
                  <Button onClick={() => setActiveTab('setup')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Audit
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {auditRuns.map(run => (
                  <Card key={run.id} className="bg-zinc-900/50 border-zinc-800">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-white">{run.name}</CardTitle>
                          <CardDescription className="text-zinc-400">
                            {run.description}
                          </CardDescription>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge 
                            variant={run.status === 'completed' ? 'default' : 
                                   run.status === 'running' ? 'secondary' : 'outline'}
                          >
                            {run.status}
                          </Badge>
                          <Button
                            size="sm"
                            onClick={() => setSelectedAuditRun(run)}
                            variant={selectedAuditRun?.id === run.id ? 'default' : 'outline'}
                          >
                            {selectedAuditRun?.id === run.id ? 'Selected' : 'Select'}
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-zinc-400">Total Queries</p>
                          <p className="text-white font-medium">{run.total_queries}</p>
                        </div>
                        <div>
                          <p className="text-zinc-400">Completed</p>
                          <p className="text-white font-medium">{run.completed_queries}</p>
                        </div>
                        <div>
                          <p className="text-zinc-400">Created</p>
                          <p className="text-white font-medium">
                            {new Date(run.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-zinc-400">Progress</p>
                          <p className="text-white font-medium">
                            {run.total_queries > 0 
                              ? Math.round((run.completed_queries / run.total_queries) * 100)
                              : 0}%
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Selected Audit Run Processor */}
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
                  selectedTemplates={selectedTemplates}
                  generatedQueries={generatedQueries}
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
                  <h3 className="text-xl font-medium text-white mb-2">No Results Available</h3>
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
