import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ModeSelector } from './ModeSelector';
import { TopicAnalysisInterface } from './TopicAnalysisInterface';
import { AppIntelligenceAnalyzer } from './AppIntelligenceAnalyzer';
import { AuditMode, TopicAuditData, GeneratedTopicQuery } from '@/types/topic-audit.types';
import { TopicQueryGeneratorService } from '@/services/topic-query-generator.service';
import { 
  Target, 
  Brain, 
  MessageSquare, 
  Settings, 
  ChevronRight, 
  Edit3,
  CheckCircle,
  Plus,
  Zap,
  Eye
} from 'lucide-react';

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

interface StreamlinedSetupFlowProps {
  apps: App[];
  auditMode: AuditMode;
  onModeChange: (mode: AuditMode) => void;
  onAuditCreate: (auditData: {
    name: string;
    description: string;
    mode: AuditMode;
    app?: App;
    topicData?: TopicAuditData;
    queries?: GeneratedTopicQuery[];
  }) => void;
}

export const StreamlinedSetupFlow: React.FC<StreamlinedSetupFlowProps> = ({
  apps,
  auditMode,
  onModeChange,
  onAuditCreate
}) => {
  // Setup state
  const [currentStep, setCurrentStep] = useState<'mode' | 'entity' | 'queries' | 'review'>('mode');
  const [selectedApp, setSelectedApp] = useState<App | null>(null);
  const [topicData, setTopicData] = useState<TopicAuditData | null>(null);
  const [generatedQueries, setGeneratedQueries] = useState<GeneratedTopicQuery[]>([]);
  const [appIntelligence, setAppIntelligence] = useState<any>(null);
  
  // Form state
  const [auditName, setAuditName] = useState('');
  const [auditDescription, setAuditDescription] = useState('');
  const [editingQueryId, setEditingQueryId] = useState<string | null>(null);
  const [newQueryText, setNewQueryText] = useState('');

  const steps = [
    { id: 'mode', label: 'Analysis Type', icon: Settings },
    { id: 'entity', label: auditMode === 'app' ? 'Select App' : 'Topic Setup', icon: Target },
    { id: 'queries', label: 'Query Generation', icon: MessageSquare },
    { id: 'review', label: 'Review & Create', icon: CheckCircle }
  ];

  const getCurrentStepIndex = () => steps.findIndex(step => step.id === currentStep);
  const isStepComplete = (stepId: string) => {
    const index = steps.findIndex(step => step.id === stepId);
    return index < getCurrentStepIndex();
  };

  const handleModeChange = (mode: AuditMode) => {
    onModeChange(mode);
    setSelectedApp(null);
    setTopicData(null);
    setGeneratedQueries([]);
    setAppIntelligence(null);
    setCurrentStep('entity');
  };

  const handleAppSelection = (app: App) => {
    setSelectedApp(app);
    setAuditName(`${app.app_name} Visibility Audit - ${new Date().toLocaleDateString()}`);
    setCurrentStep('queries');
  };

  const handleTopicAnalysis = (topic: TopicAuditData) => {
    setTopicData(topic);
    setAuditName(`${topic.topic} Visibility Audit - ${new Date().toLocaleDateString()}`);
    
    // Generate queries immediately
    const queries = TopicQueryGeneratorService.generateQueries(topic, 12);
    setGeneratedQueries(queries);
    setCurrentStep('queries');
  };

  const handleIntelligenceGenerated = (intelligence: any) => {
    setAppIntelligence(intelligence);
  };

  const handleQueryEdit = (queryId: string, newText: string) => {
    setGeneratedQueries(prev => 
      prev.map(query => 
        query.id === queryId ? { ...query, query_text: newText } : query
      )
    );
    setEditingQueryId(null);
  };

  const handleDeleteQuery = (queryId: string) => {
    setGeneratedQueries(prev => prev.filter(query => query.id !== queryId));
  };

  const handleAddQuery = () => {
    if (!newQueryText.trim()) return;
    
    const newQuery: GeneratedTopicQuery = {
      id: crypto.randomUUID(),
      query_text: newQueryText.trim(),
      query_type: 'conversational',
      priority: 5,
      target_entity: auditMode === 'app' ? selectedApp?.app_name || '' : topicData?.topic || '',
      personas: []
    };
    
    setGeneratedQueries(prev => [...prev, newQuery]);
    setNewQueryText('');
  };

  const handleCreateAudit = () => {
    const auditData = {
      name: auditName,
      description: auditDescription,
      mode: auditMode,
      app: selectedApp || undefined,
      topicData: topicData || undefined,
      queries: generatedQueries.length > 0 ? generatedQueries : undefined
    };
    
    onAuditCreate(auditData);
  };

  const canProceedToQueries = () => {
    return auditMode === 'app' ? selectedApp : topicData;
  };

  const canCreateAudit = () => {
    return auditName.trim() && canProceedToQueries();
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Zap className="h-5 w-5" />
          <span>Create New Audit</span>
          {appIntelligence && (
            <Badge className="bg-green-600 text-white">
              <Brain className="h-3 w-3 mr-1" />
              AI Enhanced
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Streamlined setup for ChatGPT visibility analysis
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Progress Steps */}
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isCurrent = step.id === currentStep;
            const isComplete = isStepComplete(step.id);
            
            return (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center space-y-2">
                  <div className={`p-2 rounded-full border-2 transition-colors ${
                    isCurrent 
                      ? 'border-blue-500 bg-blue-500/10 text-blue-400' 
                      : isComplete 
                        ? 'border-green-500 bg-green-500/10 text-green-400'
                        : 'border-zinc-600 bg-zinc-800 text-zinc-400'
                  }`}>
                    {isComplete ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  <span className={`text-xs font-medium ${
                    isCurrent ? 'text-blue-400' : isComplete ? 'text-green-400' : 'text-zinc-400'
                  }`}>
                    {step.label}
                  </span>
                </div>
                
                {index < steps.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-zinc-600" />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Step Content */}
        <div className="min-h-[400px]">
          {/* Step 1: Mode Selection */}
          {currentStep === 'mode' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-primary">Choose Analysis Type</h3>
              <ModeSelector mode={auditMode} onModeChange={handleModeChange} />
            </div>
          )}

          {/* Step 2: Entity Selection */}
          {currentStep === 'entity' && (
            <div className="space-y-4">
              {auditMode === 'app' ? (
                <>
                  <h3 className="text-lg font-semibold text-primary">Select App to Analyze</h3>
                  {apps.length === 0 ? (
                    <Alert>
                      <AlertDescription>
                        No apps found. Please add an app to continue.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {apps.map(app => (
                        <div
                          key={app.id}
                          onClick={() => handleAppSelection(app)}
                          className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                            selectedApp?.id === app.id
                              ? 'border-blue-500 bg-blue-500/10'
                              : 'border-border bg-background/50 hover:border-zinc-600'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            {app.app_icon_url && (
                              <img 
                                src={app.app_icon_url} 
                                alt={app.app_name}
                                className="h-10 w-10 rounded-lg"
                              />
                            )}
                            <div className="flex-1">
                              <h4 className="font-medium text-primary">{app.app_name}</h4>
                              <p className="text-sm text-muted-foreground">{app.platform}</p>
                              {app.app_store_category && (
                                <Badge variant="outline" className="text-xs">
                                  {app.app_store_category}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {selectedApp && (
                    <AppIntelligenceAnalyzer
                      appData={{
                        app_name: selectedApp.app_name,
                        description: selectedApp.app_description || '',
                        category: selectedApp.app_store_category || selectedApp.category || '',
                        developer: selectedApp.developer_name || '',
                        bundle_id: selectedApp.bundle_id || selectedApp.app_store_id || ''
                      }}
                      onIntelligenceGenerated={handleIntelligenceGenerated}
                      onAnalysisComplete={() => {}}
                    />
                  )}
                </>
              ) : (
                <>
                  <h3 className="text-lg font-semibold text-primary">Topic Analysis Setup</h3>
                  <TopicAnalysisInterface onTopicAnalysisGenerated={handleTopicAnalysis} />
                </>
              )}
              
              {canProceedToQueries() && (
                <Button onClick={() => setCurrentStep('queries')} className="w-full">
                  Continue to Query Generation
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          )}

          {/* Step 3: Query Generation/Review */}
          {currentStep === 'queries' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-primary">
                  Generated Queries ({generatedQueries.length})
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentStep('review')}
                  disabled={generatedQueries.length === 0}
                >
                  Review & Create
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>

              {/* Query List */}
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {generatedQueries.map(query => (
                  <div key={query.id} className="p-4 border border-border rounded-lg bg-background/50">
                    <div className="flex items-start justify-between space-x-3">
                      <div className="flex-1">
                        {editingQueryId === query.id ? (
                          <div className="space-y-2">
                            <Textarea
                              value={query.query_text}
                              onChange={(e) => setGeneratedQueries(prev =>
                                prev.map(q => q.id === query.id ? { ...q, query_text: e.target.value } : q)
                              )}
                              className="min-h-[80px]"
                            />
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                onClick={() => handleQueryEdit(query.id, query.query_text)}
                              >
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingQueryId(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-sm text-foreground mb-2">{query.query_text}</p>
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline" className="text-xs">
                                {query.query_type}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                Priority: {query.priority}
                              </Badge>
                            </div>
                          </>
                        )}
                      </div>
                      
                      {editingQueryId !== query.id && (
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingQueryId(query.id)}
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteQuery(query.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Add New Query */}
              <div className="space-y-2">
                <Label htmlFor="newQuery">Add Custom Query</Label>
                <div className="flex space-x-2">
                  <Textarea
                    id="newQuery"
                    placeholder="Enter a custom query to test..."
                    value={newQueryText}
                    onChange={(e) => setNewQueryText(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={handleAddQuery} disabled={!newQueryText.trim()}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Review & Create */}
          {currentStep === 'review' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-primary">Review & Create Audit</h3>

              {/* Audit Details Form */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="auditName">Audit Name</Label>
                  <Input
                    id="auditName"
                    value={auditName}
                    onChange={(e) => setAuditName(e.target.value)}
                    placeholder="Enter audit name..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="auditDescription">Description (Optional)</Label>
                  <Textarea
                    id="auditDescription"
                    value={auditDescription}
                    onChange={(e) => setAuditDescription(e.target.value)}
                    placeholder="Brief description of this audit..."
                    rows={3}
                  />
                </div>
              </div>

              {/* Summary */}
              <div className="space-y-4 p-4 bg-background/50 rounded-lg border border-border">
                <h4 className="font-medium text-primary">Audit Summary</h4>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Type:</span>
                    <span className="ml-2 text-foreground capitalize">{auditMode}</span>
                  </div>
                  
                  <div>
                    <span className="text-muted-foreground">Queries:</span>
                    <span className="ml-2 text-foreground">{generatedQueries.length}</span>
                  </div>
                  
                  {auditMode === 'app' && selectedApp && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Target App:</span>
                      <span className="ml-2 text-foreground">{selectedApp.app_name}</span>
                    </div>
                  )}
                  
                  {auditMode === 'topic' && topicData && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Topic:</span>
                      <span className="ml-2 text-foreground">{topicData.topic}</span>
                    </div>
                  )}
                </div>

                {appIntelligence && (
                  <Alert className="bg-green-900/20 border-green-700/50">
                    <Brain className="h-4 w-4" />
                    <AlertDescription className="text-green-400">
                      This audit is enhanced with AI-generated intelligent queries and insights.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Create Button */}
              <Button 
                onClick={handleCreateAudit}
                disabled={!canCreateAudit()}
                className="w-full"
                size="lg"
              >
                <Eye className="h-4 w-4 mr-2" />
                Create Audit Run
              </Button>
            </div>
          )}
        </div>

        {/* Navigation */}
        {currentStep !== 'mode' && currentStep !== 'review' && (
          <div className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={() => {
                const currentIndex = getCurrentStepIndex();
                if (currentIndex > 0) {
                  setCurrentStep(steps[currentIndex - 1].id as any);
                }
              }}
            >
              Back
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};