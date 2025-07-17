import React, { useState } from 'react';
import { MainLayout } from '@/layouts';
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
  AlertCircle
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

interface QueryTemplate {
  id: string;
  query_text: string;
  query_category: string;
  variables: Record<string, any>;
}

const ChatGPTVisibilityAuditPage: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState('overview');
  const [newAuditName, setNewAuditName] = useState('');
  const [newAuditApp, setNewAuditApp] = useState('');
  const [customQuery, setCustomQuery] = useState('');

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

  // Query templates
  const queryTemplates: QueryTemplate[] = [
    {
      id: '1',
      query_text: 'What are the best {category} apps for {demographic}?',
      query_category: 'recommendation',
      variables: { category: 'fitness', demographic: 'beginners' }
    },
    {
      id: '2', 
      query_text: 'I need a reliable {category} app. What do you recommend?',
      query_category: 'recommendation',
      variables: { category: 'finance' }
    },
    {
      id: '3',
      query_text: 'Compare the top {category} apps available.',
      query_category: 'comparison',
      variables: { category: 'productivity' }
    }
  ];

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

  const handleCreateAudit = () => {
    if (!newAuditName.trim() || !newAuditApp.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please provide both audit name and app ID.',
        variant: 'destructive',
      });
      return;
    }

    createAuditMutation.mutate({ 
      name: newAuditName.trim(), 
      appId: newAuditApp.trim() 
    });
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
          <TabsList className="grid w-full grid-cols-4 bg-zinc-900 border-zinc-800 h-12">
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
              Query Templates
            </TabsTrigger>
            <TabsTrigger value="insights" className="text-sm font-medium">
              <Target className="h-4 w-4 mr-2" />
              Insights
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
                                value={(audit.completed_queries / audit.total_queries) * 100} 
                                className="h-2"
                              />
                            </div>
                          )}
                          <Badge 
                            variant="outline" 
                            className={`${getStatusColor(audit.status)} text-white border-transparent`}
                          >
                            {audit.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="create" className="space-y-6">
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white">Create New Audit</CardTitle>
                <CardDescription className="text-zinc-400">
                  Set up a new ChatGPT visibility audit for your app
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="auditName" className="text-white">Audit Name</Label>
                    <Input
                      id="auditName"
                      placeholder="e.g., Q1 2024 Visibility Check"
                      value={newAuditName}
                      onChange={(e) => setNewAuditName(e.target.value)}
                      className="bg-zinc-800 border-zinc-700 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="appId" className="text-white">App ID/Name</Label>
                    <Input
                      id="appId"
                      placeholder="e.g., MyFitnessApp or com.company.app"
                      value={newAuditApp}
                      onChange={(e) => setNewAuditApp(e.target.value)}
                      className="bg-zinc-800 border-zinc-700 text-white"
                    />
                  </div>
                </div>

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

                <Button 
                  onClick={handleCreateAudit}
                  disabled={createAuditMutation.isPending}
                  className="w-full"
                >
                  <Play className="h-4 w-4 mr-2" />
                  {createAuditMutation.isPending ? 'Creating...' : 'Create Audit'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates" className="space-y-6">
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white">Query Templates</CardTitle>
                <CardDescription className="text-zinc-400">
                  Pre-built query templates for comprehensive visibility testing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4">
                  {queryTemplates.map((template) => (
                    <div key={template.id} className="p-4 rounded-lg border border-zinc-800 bg-zinc-900/30">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <Badge variant="outline" className="text-xs">
                              {template.query_category}
                            </Badge>
                          </div>
                          <p className="text-white font-medium mb-2">{template.query_text}</p>
                          <div className="text-sm text-zinc-400">
                            Variables: {Object.entries(template.variables).map(([key, value]) => 
                              `${key}: ${value}`
                            ).join(', ')}
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          Use Template
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white">Visibility Insights</CardTitle>
                <CardDescription className="text-zinc-400">
                  Coming soon: Advanced analytics and competitive intelligence
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Target className="h-16 w-16 text-zinc-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">Insights Dashboard</h3>
                  <p className="text-zinc-400 mb-4">
                    Advanced visibility scoring, competitive analysis, and trend tracking will be available here.
                  </p>
                  <Badge variant="outline" className="text-yodel-orange border-yodel-orange">
                    Coming in Phase 3
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default ChatGPTVisibilityAuditPage;