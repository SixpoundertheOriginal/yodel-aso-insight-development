import React, { useState, useEffect } from 'react';
import { MainLayout } from '@/layouts';
import { AuditProcessingProvider } from '@/context/AuditProcessingContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { QueryTemplateLibrary, QueryTemplate, QUERY_TEMPLATE_LIBRARY } from '@/components/ChatGPTAudit/QueryTemplateLibrary';
import { BulkAuditProcessor } from '@/components/ChatGPTAudit/BulkAuditProcessor';
import { VisibilityResults } from '@/components/ChatGPTAudit/VisibilityResults';
import { CompetitiveAnalytics } from '@/components/ChatGPTAudit/CompetitiveAnalytics';
import { AppValidationForm } from '@/components/ChatGPTAudit/AppValidationForm';
import { MetadataQueryGenerator } from '@/components/ChatGPTAudit/MetadataQueryGenerator';
import { 
  Brain, 
  Play, 
  Plus, 
  Search, 
  BarChart3, 
  Target, 
  Lightbulb,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Zap,
  Settings,
  Edit3,
  Trash2,
  Download,
  TrendingUp,
  Users2,
  Trophy
} from 'lucide-react';

// Types for ChatGPT Visibility Audit
interface AuditRun {
  id: string;
  name: string;
  description?: string;
  app_id: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  total_queries: number;
  completed_queries: number;
  created_at: string;
}

interface ValidatedApp {
  appId: string;
  metadata: {
    name: string;
    appId: string;
    title: string;
    subtitle?: string;
    description?: string;
    url: string;
    icon?: string;
    rating?: number;
    reviews?: number;
    developer?: string;
    applicationCategory?: string;
    locale: string;
  };
  isValid: boolean;
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

// Interface for audit runs - now enhanced for Phase 2

const ChatGPTVisibilityAuditPage: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Persist tab selection in localStorage
  const [selectedTab, setSelectedTab] = useState(() => {
    return localStorage.getItem('audit_selected_tab') || 'overview';
  });
  const [newAuditName, setNewAuditName] = useState('');
  const [newAuditApp, setNewAuditApp] = useState('');
  const [customQuery, setCustomQuery] = useState('');
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  const [selectedAuditForProcessing, setSelectedAuditForProcessing] = useState<string | null>(null);
  const [editingAudit, setEditingAudit] = useState<string | null>(null);
  const [editAuditName, setEditAuditName] = useState('');
  const [editAuditApp, setEditAuditApp] = useState('');
  const [validatedApp, setValidatedApp] = useState<ValidatedApp | null>(null);
  const [generatedQueries, setGeneratedQueries] = useState<GeneratedQuery[]>([]);
  const [useAppValidation, setUseAppValidation] = useState(true);

  // Save tab selection to localStorage
  useEffect(() => {
    localStorage.setItem('audit_selected_tab', selectedTab);
  }, [selectedTab]);

  // Get current user's organization
  const { data: userContext } = useQuery({
    queryKey: ['user-context'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      return {
        organizationId: profile?.organization_id || null
      };
    },
  });

  // Fetch audit runs
  const { data: auditRuns, isLoading: loadingRuns } = useQuery({
    queryKey: ['chatgpt-audit-runs', userContext?.organizationId],
    queryFn: async () => {
      if (!userContext?.organizationId) return [];
      
      const { data, error } = await supabase
        .from('chatgpt_audit_runs')
        .select('*')
        .eq('organization_id', userContext.organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AuditRun[];
    },
    enabled: !!userContext?.organizationId,
  });

  const getSelectedTemplateObjects = (): QueryTemplate[] => {
    return QUERY_TEMPLATE_LIBRARY.filter(template => selectedTemplates.includes(template.id));
  };

  // Create new audit run
  const createAuditMutation = useMutation({
    mutationFn: async ({ name, appId }: { name: string; appId: string }) => {
      if (!userContext?.organizationId) throw new Error('No organization ID');

      const { data, error } = await supabase
        .from('chatgpt_audit_runs')
        .insert({
          organization_id: userContext.organizationId,
          name,
          app_id: appId,
          status: 'pending',
          total_queries: 0,
          completed_queries: 0
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatgpt-audit-runs'] });
      setNewAuditName('');
      setNewAuditApp('');
      toast({
        title: 'Audit Created',
        description: 'Your ChatGPT visibility audit has been created successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to create audit. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Update audit mutation
  const updateAuditMutation = useMutation({
    mutationFn: async ({ id, name, appId }: { id: string; name: string; appId: string }) => {
      if (!userContext?.organizationId) throw new Error('No organization ID');

      const { data, error } = await supabase
        .from('chatgpt_audit_runs')
        .update({
          name,
          app_id: appId,
        })
        .eq('id', id)
        .eq('organization_id', userContext.organizationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatgpt-audit-runs'] });
      setEditingAudit(null);
      setEditAuditName('');
      setEditAuditApp('');
      toast({
        title: 'Audit Updated',
        description: 'Your audit has been updated successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update audit. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Delete audit mutation
  const deleteAuditMutation = useMutation({
    mutationFn: async (auditId: string) => {
      if (!userContext?.organizationId) throw new Error('No organization ID');

      const { error } = await supabase
        .from('chatgpt_audit_runs')
        .delete()
        .eq('id', auditId)
        .eq('organization_id', userContext.organizationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatgpt-audit-runs'] });
      toast({
        title: 'Audit Deleted',
        description: 'The audit has been deleted successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to delete audit. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleCreateAudit = () => {
    if (useAppValidation && !validatedApp) {
      toast({
        title: 'App Validation Required',
        description: 'Please validate your app first using the App Store search.',
        variant: 'destructive',
      });
      return;
    }

    if (!newAuditName.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please provide an audit name.',
        variant: 'destructive',
      });
      return;
    }

    const appId = validatedApp ? validatedApp.appId : newAuditApp.trim();
    if (!appId) {
      toast({
        title: 'Missing App Information',
        description: 'Please provide an app ID or validate an app.',
        variant: 'destructive',
      });
      return;
    }

    createAuditMutation.mutate({ 
      name: newAuditName.trim(), 
      appId: appId
    });
  };

  const handleAppValidated = (app: ValidatedApp) => {
    setValidatedApp(app);
    setNewAuditApp(app.appId);
    console.log('✅ App validated for audit:', app);
  };

  const handleQueriesGenerated = (queries: GeneratedQuery[]) => {
    setGeneratedQueries(queries);
    // Auto-select high priority queries
    const highPriorityQueries = queries
      .filter(q => q.priority <= 2)
      .slice(0, 8)
      .map(q => q.id);
    setSelectedTemplates(highPriorityQueries);
    console.log('✅ Queries generated:', queries.length, 'Auto-selected:', highPriorityQueries.length);
  };

  const handleEditAudit = (audit: AuditRun) => {
    setEditingAudit(audit.id);
    setEditAuditName(audit.name);
    setEditAuditApp(audit.app_id);
  };

  const handleUpdateAudit = () => {
    if (!editingAudit || !editAuditName.trim() || !editAuditApp.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please provide both audit name and app ID.',
        variant: 'destructive',
      });
      return;
    }

    updateAuditMutation.mutate({
      id: editingAudit,
      name: editAuditName.trim(),
      appId: editAuditApp.trim()
    });
  };

  const handleDeleteAudit = (auditId: string) => {
    if (confirm('Are you sure you want to delete this audit? This action cannot be undone.')) {
      deleteAuditMutation.mutate(auditId);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'running':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'running':
        return 'bg-blue-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-yellow-500';
    }
  };

  if (!userContext?.organizationId) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <Brain className="h-16 w-16 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Authentication Required</h3>
          <p className="text-zinc-400">Please sign in to access ChatGPT Visibility Audit</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <AuditProcessingProvider>
      <MainLayout>
        <div className="space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <Brain className="h-12 w-12 text-yodel-orange" />
            <h1 className="text-4xl font-bold text-white">ChatGPT Visibility Audit</h1>
            <Badge variant="outline" className="text-yodel-orange border-yodel-orange">
              AI-Powered
            </Badge>
          </div>
          <p className="text-zinc-400 text-lg max-w-4xl mx-auto leading-relaxed">
            Measure and optimize your app's visibility in ChatGPT responses. Test how AI recommends your app 
            across different queries and use cases.
          </p>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 bg-zinc-900 border-zinc-800 h-12">
            <TabsTrigger value="overview" className="text-sm font-medium">
              <BarChart3 className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="create" className="text-sm font-medium">
              <Plus className="h-4 w-4 mr-2" />
              Create Audit
            </TabsTrigger>
            <TabsTrigger value="templates" className="text-sm font-medium">
              <Lightbulb className="h-4 w-4 mr-2" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="processor" className="text-sm font-medium">
              <Zap className="h-4 w-4 mr-2" />
              Processor
            </TabsTrigger>
            <TabsTrigger value="results" className="text-sm font-medium">
              <Target className="h-4 w-4 mr-2" />
              Results
            </TabsTrigger>
            <TabsTrigger value="insights" className="text-sm font-medium">
              <Trophy className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Stats Cards */}
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-zinc-400">Total Audits</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">
                    {auditRuns?.length || 0}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-zinc-400">Completed</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-400">
                    {auditRuns?.filter(run => run.status === 'completed').length || 0}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-zinc-400">In Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-400">
                    {auditRuns?.filter(run => run.status === 'running').length || 0}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Audits */}
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white">Recent Audits</CardTitle>
                <CardDescription className="text-zinc-400">
                  Your latest ChatGPT visibility audit runs
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingRuns ? (
                  <div className="text-zinc-400">Loading audits...</div>
                ) : auditRuns?.length === 0 ? (
                  <div className="text-center py-8">
                    <Search className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
                    <p className="text-zinc-400">No audits created yet</p>
                    <Button 
                      onClick={() => setSelectedTab('create')}
                      className="mt-4"
                      variant="outline"
                    >
                      Create Your First Audit
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {auditRuns?.slice(0, 5).map((audit) => (
                      <div key={audit.id} className="flex items-center justify-between p-4 rounded-lg border border-zinc-800 bg-zinc-900/30">
                        <div className="flex items-center space-x-4">
                          {getStatusIcon(audit.status)}
                          <div>
                            <h4 className="font-medium text-white">{audit.name}</h4>
                            <p className="text-sm text-zinc-400">App: {audit.app_id}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          {audit.status === 'running' && (
                            <div className="w-32">
                              <Progress 
                                value={audit.total_queries > 0 ? (audit.completed_queries / audit.total_queries) * 100 : 0} 
                                className="h-2"
                              />
                            </div>
                          )}
                          <div className="flex items-center space-x-2">
                            <Badge 
                              variant="outline" 
                              className={`${getStatusColor(audit.status)} text-white border-transparent`}
                            >
                              {audit.status}
                            </Badge>
                            
                            {/* Edit button for pending audits only */}
                            {audit.status === 'pending' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditAudit(audit)}
                              >
                                <Edit3 className="h-3 w-3" />
                              </Button>
                            )}
                            
                            {/* Delete button available for all audits */}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteAudit(audit.id)}
                            >
                              <Trash2 className="h-3 w-3 text-red-400" />
                            </Button>
                            
                            {(audit.status === 'pending' || audit.status === 'running') && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedAuditForProcessing(audit.id);
                                  setSelectedTab('processor');
                                }}
                              >
                                <Zap className="h-3 w-3 mr-1" />
                                Process
                              </Button>
                            )}
                            {audit.status === 'completed' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedAuditForProcessing(audit.id);
                                  setSelectedTab('results');
                                }}
                              >
                                <Target className="h-3 w-3 mr-1" />
                                Results
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="create" className="space-y-6">
            {/* App Validation Section */}
            {!editingAudit && useAppValidation && !validatedApp && (
              <AppValidationForm
                onAppValidated={handleAppValidated}
                organizationId={userContext?.organizationId || ''}
              />
            )}

            {/* Metadata-Driven Query Generation */}
            {!editingAudit && validatedApp && (
              <MetadataQueryGenerator
                validatedApp={validatedApp}
                onQueriesGenerated={handleQueriesGenerated}
                selectedQueries={selectedTemplates}
              />
            )}

            {/* Traditional Audit Creation Form */}
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white">
                  {editingAudit ? 'Edit Audit' : 'Create New Audit'}
                </CardTitle>
                <CardDescription className="text-zinc-400">
                  {editingAudit ? 'Update your ChatGPT visibility audit' : (
                    validatedApp ? 
                      `Creating audit for ${validatedApp.metadata.name}` :
                      'Set up a new ChatGPT visibility audit for your app'
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* App Validation Toggle - Only for new audits */}
                {!editingAudit && (
                  <div className="flex items-center justify-between p-4 bg-blue-900/20 border border-blue-700/50 rounded-lg">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-blue-200">Enhanced App Validation</p>
                      <p className="text-xs text-blue-300">
                        Use App Store scraper to validate apps and generate intelligent queries
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="useAppValidation"
                        checked={useAppValidation}
                        onChange={(e) => {
                          setUseAppValidation(e.target.checked);
                          if (!e.target.checked) {
                            setValidatedApp(null);
                            setGeneratedQueries([]);
                          }
                        }}
                        className="h-4 w-4 text-yodel-orange"
                      />
                      <Label htmlFor="useAppValidation" className="text-blue-200">Enable</Label>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="auditName" className="text-white">Audit Name</Label>
                    <Input
                      id="auditName"
                      placeholder="e.g., Q1 2024 Visibility Check"
                      value={editingAudit ? editAuditName : newAuditName}
                      onChange={(e) => editingAudit ? setEditAuditName(e.target.value) : setNewAuditName(e.target.value)}
                      className="bg-zinc-800 border-zinc-700 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="appId" className="text-white">
                      {useAppValidation && validatedApp ? 'Validated App' : 'App ID/Name'}
                    </Label>
                    <Input
                      id="appId"
                      placeholder={useAppValidation ? "App will be auto-filled after validation" : "e.g., MyFitnessApp or com.company.app"}
                      value={editingAudit ? editAuditApp : newAuditApp}
                      onChange={(e) => editingAudit ? setEditAuditApp(e.target.value) : setNewAuditApp(e.target.value)}
                      className="bg-zinc-800 border-zinc-700 text-white"
                      disabled={useAppValidation && !!validatedApp}
                    />
                    {validatedApp && (
                      <p className="text-xs text-green-400">
                        ✓ Validated: {validatedApp.metadata.name}
                      </p>
                    )}
                  </div>
                </div>

                {!editingAudit && !useAppValidation && (
                  <div className="space-y-2">
                    <Label htmlFor="customQuery" className="text-white">Custom Query (Optional)</Label>
                    <Textarea
                      id="customQuery"
                      placeholder="Enter a custom query to test, or leave blank to use templates"
                      value={customQuery}
                      onChange={(e) => setCustomQuery(e.target.value)}
                      className="bg-zinc-800 border-zinc-700 text-white min-h-[100px]"
                    />
                  </div>
                )}

                {/* Query Summary for validated apps */}
                {!editingAudit && generatedQueries.length > 0 && (
                  <div className="p-4 bg-green-900/20 border border-green-700/50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-200">Smart Queries Generated</p>
                        <p className="text-xs text-green-300">
                          {generatedQueries.length} total • {selectedTemplates.length} selected for audit
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedTab('templates')}
                        className="border-green-600 text-green-300"
                      >
                        Review Queries
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex gap-4">
                  {editingAudit ? (
                    <>
                      <Button 
                        onClick={handleUpdateAudit}
                        disabled={updateAuditMutation.isPending}
                        className="flex-1"
                      >
                        <Edit3 className="h-4 w-4 mr-2" />
                        {updateAuditMutation.isPending ? 'Updating...' : 'Update Audit'}
                      </Button>
                      <Button 
                        onClick={() => {
                          setEditingAudit(null);
                          setEditAuditName('');
                          setEditAuditApp('');
                        }}
                        variant="outline"
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button 
                      onClick={handleCreateAudit}
                      disabled={createAuditMutation.isPending}
                      className="w-full"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      {createAuditMutation.isPending ? 'Creating...' : 'Create Audit'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates" className="space-y-6">
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <Lightbulb className="h-5 w-5" />
                  <span>Query Template Library</span>
                </CardTitle>
                <CardDescription className="text-zinc-400">
                  Choose from our comprehensive library of pre-built query templates designed to test different visibility scenarios
                </CardDescription>
              </CardHeader>
              <CardContent>
                <QueryTemplateLibrary
                  onSelectTemplates={(templates) => setSelectedTemplates(templates.map(t => t.id))}
                  selectedTemplates={selectedTemplates}
                  appContext={{ 
                    name: newAuditApp || 'YourApp',
                    category: 'fitness',
                    targetAudience: 'general users'
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="processor" className="space-y-6">
            {selectedAuditForProcessing ? (
              (() => {
                const selectedAudit = auditRuns?.find(audit => audit.id === selectedAuditForProcessing);
                if (!selectedAudit) {
                  return (
                    <Card className="bg-zinc-900/50 border-zinc-800">
                      <CardContent className="text-center py-12">
                        <AlertCircle className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-white mb-2">Audit Not Found</h3>
                        <p className="text-zinc-400">The selected audit could not be found.</p>
                      </CardContent>
                    </Card>
                  );
                }

                return (
                  <BulkAuditProcessor
                    auditRun={selectedAudit}
                    selectedTemplates={getSelectedTemplateObjects()}
                    generatedQueries={generatedQueries}
                    organizationId={userContext.organizationId}
                    onStatusChange={() => {
                      queryClient.invalidateQueries({ queryKey: ['chatgpt-audit-runs'] });
                    }}
                  />
                );
              })()
            ) : (
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardContent className="text-center py-12">
                  <Zap className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">Select an Audit to Process</h3>
                  <p className="text-zinc-400 mb-4">
                    Choose an audit from the overview tab to start bulk processing queries
                  </p>
                  <Button 
                    onClick={() => setSelectedTab('overview')}
                    variant="outline"
                  >
                    Go to Overview
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="results" className="space-y-6">
            {selectedAuditForProcessing && userContext?.organizationId ? (
              <VisibilityResults
                auditRunId={selectedAuditForProcessing}
                organizationId={userContext.organizationId}
              />
            ) : (
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardContent className="text-center py-12">
                  <Target className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">Select an Audit to View Results</h3>
                  <p className="text-zinc-400 mb-4">
                    Choose a completed audit from the overview tab to view detailed results
                  </p>
                  <Button 
                    onClick={() => setSelectedTab('overview')}
                    variant="outline"
                  >
                    Go to Overview
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            {userContext?.organizationId ? (
              <CompetitiveAnalytics organizationId={userContext.organizationId} />
            ) : (
              <div className="text-center py-12">
                <Trophy className="h-16 w-16 text-zinc-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Analytics Dashboard</h3>
                <p className="text-zinc-400">Authentication required to view analytics</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
        </div>
      </MainLayout>
    </AuditProcessingProvider>
  );
};

export default ChatGPTVisibilityAuditPage;