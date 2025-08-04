import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { ModeSelector } from './ModeSelector';
import { TopicAnalysisInterface } from './TopicAnalysisInterface';
import { EntityIntelligenceAnalyzer } from './EntityIntelligenceAnalyzer';
import { AppIntelligenceAnalyzer } from './AppIntelligenceAnalyzer';
import { TopicEntityConfirmation } from './TopicEntityConfirmation';
import { AuditMode, TopicAuditData, GeneratedTopicQuery } from '@/types/topic-audit.types';
import { TopicQueryGeneratorService } from '@/services/topic-query-generator.service';
import { supabase } from '@/integrations/supabase/client';
import { 
  Target, 
  Brain, 
  MessageSquare, 
  Settings, 
  ChevronRight, 
  ChevronLeft,
  Edit3,
  CheckCircle,
  Plus,
  Zap,
  Eye,
  Loader2
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
  const [currentStep, setCurrentStep] = useState<'mode' | 'entity' | 'auto-populate' | 'queries' | 'review'>('mode');
  const [selectedApp, setSelectedApp] = useState<App | null>(null);
  const [topicData, setTopicData] = useState<TopicAuditData | null>(null);
  const [generatedQueries, setGeneratedQueries] = useState<GeneratedTopicQuery[]>([]);
  const [appIntelligence, setAppIntelligence] = useState<any>(null);
  const [entityIntelligence, setEntityIntelligence] = useState<any>(null);
  const [enhancedEntityIntelligence, setEnhancedEntityIntelligence] = useState<any>(null);
  const [showEntityAnalyzer, setShowEntityAnalyzer] = useState(false);
  
  // Auto-population state
  const [autoPopulatedData, setAutoPopulatedData] = useState<TopicAuditData | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [entityInput, setEntityInput] = useState('');
  const [isAnalyzingEntity, setIsAnalyzingEntity] = useState(false);
  
  // Loading states
  const [isGeneratingTopicAnalysis, setIsGeneratingTopicAnalysis] = useState(false);
  const [isGeneratingQueries, setIsGeneratingQueries] = useState(false);
  const [isCreatingAudit, setIsCreatingAudit] = useState(false);
  const [queryGenerationProgress, setQueryGenerationProgress] = useState({ current: 0, total: 0, stage: '' });
  
  // Form state
  const [auditName, setAuditName] = useState('');
  const [auditDescription, setAuditDescription] = useState('');
  const [editingQueryId, setEditingQueryId] = useState<string | null>(null);
  const [newQueryText, setNewQueryText] = useState('');

  const { toast } = useToast();

  const steps = [
    { id: 'mode', label: 'Analysis Type', icon: Settings },
    { id: 'entity', label: auditMode === 'app' ? 'Select App' : 'Entity Input', icon: Target },
    { id: 'auto-populate', label: 'Review & Edit', icon: Brain },
    { id: 'queries', label: 'Query Generation', icon: MessageSquare },
    { id: 'review', label: 'Review & Create', icon: CheckCircle }
  ];

  const getCurrentStepIndex = () => steps.findIndex(step => step.id === currentStep);
  const isStepComplete = (stepId: string) => {
    const index = steps.findIndex(step => step.id === stepId);
    return index < getCurrentStepIndex();
  };
  const canGoBack = () => getCurrentStepIndex() > 0;
  const canGoForward = () => {
    const index = getCurrentStepIndex();
    if (index === 0) return auditMode !== null; // Mode step
    // Skip generic continue for entity and confirmation steps - they have specific action buttons
    if (index === 1) return false; // Entity step - handled by specific buttons
    if (index === 2) return false; // Confirmation step - handled by specific buttons  
    if (index === 3) return generatedQueries.length > 0; // Queries step
    return false;
  };

  const goToPreviousStep = () => {
    const currentIndex = getCurrentStepIndex();
    if (currentIndex > 0) {
      const previousStep = steps[currentIndex - 1];
      setCurrentStep(previousStep.id as any);
      
      // Reset state when going back to avoid inconsistencies
      if (previousStep.id === 'mode') {
        // Don't reset mode, just go back
      } else if (previousStep.id === 'entity') {
        setGeneratedQueries([]);
        setShowEntityAnalyzer(false);
        setEnhancedEntityIntelligence(null);
      } else if (previousStep.id === 'auto-populate') {
        setGeneratedQueries([]);
      } else if (previousStep.id === 'queries') {
        // Keep queries but allow editing
      }
    }
  };

  const goToNextStep = () => {
    const currentIndex = getCurrentStepIndex();
    if (currentIndex < steps.length - 1 && canGoForward()) {
      const nextStep = steps[currentIndex + 1];
      setCurrentStep(nextStep.id as any);
    }
  };

  const handleModeChange = (mode: AuditMode) => {
    onModeChange(mode);
    if (mode !== auditMode) {
      // Reset subsequent steps when mode changes
      setSelectedApp(null);
      setTopicData(null);
      setGeneratedQueries([]);
      setAppIntelligence(null);
      setEntityIntelligence(null);
      setEnhancedEntityIntelligence(null);
      setShowEntityAnalyzer(false);
    }
  };

  const handleAppSelect = (app: App) => {
    setSelectedApp(app);
    setAuditName(`${app.app_name} Visibility Audit - ${new Date().toLocaleDateString()}`);
    setAuditDescription(`ChatGPT visibility analysis for ${app.app_name} to identify optimization opportunities.`);
    // Auto-proceed to auto-populate for app mode
    setCurrentStep('auto-populate');
  };

  const handleTopicAnalysis = async (topic: TopicAuditData) => {
    setIsGeneratingTopicAnalysis(true);
    
    try {
      setTopicData(topic);
      setAuditName(`${topic.topic} Visibility Audit - ${new Date().toLocaleDateString()}`);
      
      toast({
        title: "Analyzing Topic",
        description: "Generating entity intelligence...",
      });
      
      // Enhanced analysis will be handled by EntityIntelligenceAnalyzer component
      console.log('🔍 Starting enhanced entity intelligence analysis for:', topic.entityToTrack);
      toast({
        title: "Enhanced Analysis Starting",
        description: "Using AI to analyze entity intelligence...",
      });
      
      // Automatically proceed to auto-populate step
      setCurrentStep('auto-populate');
    } catch (error) {
      console.error('Error in topic analysis:', error);
      toast({
        title: "Analysis Failed",
        description: "There was an error generating entity intelligence. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingTopicAnalysis(false);
    }
  };

  const handleRegenerateQueries = (count: number = 10) => {
    if (!topicData) return;
    
    console.log('StreamlinedSetupFlow: Regenerating', count, 'queries for topic:', topicData.topic);
    const newQueries = TopicQueryGeneratorService.generateQueries(topicData, count);
    console.log('StreamlinedSetupFlow: Generated new queries:', newQueries.length);
    setGeneratedQueries(newQueries);
  };

  const handleGenerateMoreQueries = (additionalCount: number = 10) => {
    if (!topicData) return;
    
    console.log('StreamlinedSetupFlow: Generating', additionalCount, 'additional queries');
    const newQueries = TopicQueryGeneratorService.generateQueries(topicData, additionalCount);
    setGeneratedQueries(prev => [...prev, ...newQueries]);
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

  const generateQueriesFromEnhancedEntity = async (entityIntelligence: any) => {
    try {
      console.log('🚀 Generating queries from enhanced entity intelligence:', entityIntelligence);
      
      // Try AI-enhanced query generation with enhanced intelligence
      const { data: aiResponse } = await supabase.functions.invoke('query-enhancer', {
        body: {
          topicData: topicData,
          entityIntelligence: {
            entityName: entityIntelligence.entityName,
            description: entityIntelligence.description,
            services: entityIntelligence.services,
            targetClients: entityIntelligence.targetClients,
            competitors: entityIntelligence.competitors.map((comp: any) => comp.name),
            marketPosition: entityIntelligence.marketPosition,
            industryFocus: entityIntelligence.industryFocus,
            recentNews: entityIntelligence.recentNews,
            confidenceScore: entityIntelligence.confidence_score,
            scrapedAt: entityIntelligence.scrapedAt
          },
          queryCount: 25
        }
      });
      
      if (aiResponse?.queries?.length) {
        console.log('✅ Enhanced AI queries generated:', aiResponse.queries.length);
        setGeneratedQueries(aiResponse.queries);
      } else {
        console.warn('⚠️ Enhanced AI query generation failed, using fallback');
        await generateTemplateQueries();
      }
    } catch (error) {
      console.error('❌ Enhanced query generation error:', error);
      await generateTemplateQueries();
    }
  };

  const generateTemplateQueries = async () => {
    if (!topicData) return;
    
    console.log('🔄 Generating template queries for topic:', topicData.topic);
    const queries = TopicQueryGeneratorService.generateQueries(topicData, 15);
    setGeneratedQueries(queries);
  };

  const handleCreateAudit = async () => {
    setIsCreatingAudit(true);
    
    try {
      toast({
        title: "Creating Audit",
        description: "Setting up your visibility audit...",
      });
      
      const auditData = {
        name: auditName,
        description: auditDescription,
        mode: auditMode,
        app: selectedApp || undefined,
        topicData: topicData || undefined,
        queries: generatedQueries.length > 0 ? generatedQueries : undefined
      };
      
      await onAuditCreate(auditData);
      
      toast({
        title: "Audit Created",
        description: "Your visibility audit has been created successfully!",
      });
    } catch (error) {
      console.error('Error creating audit:', error);
      toast({
        title: "Creation Failed",
        description: "There was an error creating the audit. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingAudit(false);
    }
  };

  const handleConfirmation = async (confirmedData: any) => {
    setIsGeneratingQueries(true);
    setQueryGenerationProgress({ current: 0, total: 25, stage: 'Analyzing context...' });
    
    try {
      console.log('🔄 Proceeding with confirmed data:', confirmedData);
      
      toast({
        title: "Generating Queries",
        description: "Creating optimized search queries...",
      });
      
      // Simulate progress stages
      setQueryGenerationProgress({ current: 5, total: 25, stage: 'Processing entity intelligence...' });
      
      // Update state with confirmed data
      if (confirmedData.entityIntelligence) {
        setQueryGenerationProgress({ current: 10, total: 25, stage: 'Generating AI-enhanced queries...' });
        setEnhancedEntityIntelligence(confirmedData.entityIntelligence);
        await generateQueriesFromEnhancedEntity(confirmedData.entityIntelligence);
      } else {
        setQueryGenerationProgress({ current: 10, total: 25, stage: 'Generating template queries...' });
        await generateTemplateQueries();
      }
      
      setQueryGenerationProgress({ current: 25, total: 25, stage: 'Complete!' });
      
      toast({
        title: "Queries Generated", 
        description: `Successfully created ${generatedQueries.length} search queries!`,
      });
      
      setCurrentStep('queries');
    } catch (error) {
      console.error('Error generating queries:', error);
      toast({
        title: "Generation Failed",
        description: "There was an error generating queries. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingQueries(false);
      setQueryGenerationProgress({ current: 0, total: 0, stage: '' });
    }
  };

  const canProceedToQueries = () => {
    return auditMode === 'app' ? selectedApp : topicData;
  };

  const canCreateAudit = () => {
    return auditName.trim() && canProceedToQueries();
  };

  // Auto-population logic using entity intelligence
  const autoPopulateFromEntity = (intelligence: any) => {
    console.log('🤖 Auto-populating from entity intelligence:', intelligence);
    
    // Simple mapping rules as specified in requirements
    const mapTopicFromServices = (services: string[]): string => {
      if (!services || services.length === 0) return intelligence.entityName + " services";
      
      const firstService = services[0].toLowerCase();
      if (firstService.includes('marketing')) return "mobile marketing agencies";
      if (firstService.includes('fitness')) return "fitness apps";
      if (firstService.includes('language')) return "language learning apps";
      
      return services[0] + " providers";
    };

    const mapIndustryFromFocus = (industryFocus: string[], services: string[]): string => {
      if (industryFocus && industryFocus.length > 0) {
        return industryFocus[0];
      }
      if (services && services.length > 0) {
        const service = services[0].toLowerCase();
        if (service.includes('tech') || service.includes('software')) return "Technology";
        if (service.includes('health') || service.includes('fitness')) return "Healthcare";
        if (service.includes('finance')) return "Financial Services";
        if (service.includes('education')) return "Education";
        if (service.includes('marketing')) return "Marketing & Advertising";
      }
      return "Technology"; // Default
    };

    const mapTargetAudience = (targetClients: string[], services: string[]): string => {
      if (targetClients && targetClients.length > 0) {
        const firstClient = targetClients[0].toLowerCase();
        if (firstClient.includes('enterprise') || firstClient.includes('business')) return "enterprise companies";
        if (firstClient.includes('consumer') || firstClient.includes('individual')) return "consumers";
        if (firstClient.includes('small business')) return "small businesses";
      }
      
      // Infer from services
      if (services && services.length > 0) {
        const service = services[0].toLowerCase();
        if (service.includes('agency') || service.includes('consulting')) return "enterprise companies";
        if (service.includes('app') || service.includes('consumer')) return "consumers";
      }
      
      return "businesses"; // Default
    };

    const autoPopulated: TopicAuditData = {
      topic: mapTopicFromServices(intelligence.services || []),
      industry: mapIndustryFromFocus(intelligence.industryFocus || [], intelligence.services || []),
      target_audience: mapTargetAudience(intelligence.targetClients || [], intelligence.services || []),
      context_description: intelligence.description || `Visibility analysis for ${intelligence.entityName}`,
      known_players: intelligence.competitors ? intelligence.competitors.map((comp: any) => 
        typeof comp === 'string' ? comp : comp.name
      ).slice(0, 5) : [],
      geographic_focus: '',
      entityToTrack: intelligence.entityName,
      entityAliases: [],
      queryStrategy: 'market_research',
      competitorFocus: true,
      intentLevel: 'medium',
      entityIntelligence: intelligence
    };

    setAutoPopulatedData(autoPopulated);
    setTopicData(autoPopulated);
    setAuditName(`${intelligence.entityName} Visibility Audit - ${new Date().toLocaleDateString()}`);
    setAuditDescription(`AI-powered ChatGPT visibility analysis for ${intelligence.entityName}`);
    
    console.log('✅ Auto-populated topic data:', autoPopulated);
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
                           onClick={() => handleAppSelect(app)}
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
                   <h3 className="text-lg font-semibold text-primary">Entity Intelligence Analysis</h3>
                   <div className="space-y-4">
                     <div className="space-y-2">
                       <Label htmlFor="entityInput">Entity to Analyze</Label>
                       <Input
                         id="entityInput"
                         value={entityInput}
                         onChange={(e) => setEntityInput(e.target.value)}
                         placeholder="Enter entity name (e.g., 'Ogilvy', 'HubSpot', 'Instagram')"
                         className="w-full"
                       />
                       <p className="text-xs text-muted-foreground">
                         Enter the business, brand, or entity you want to analyze for ChatGPT visibility
                       </p>
                     </div>
                     
                     {entityInput.trim() && !isAnalyzingEntity && (
                       <Button 
                         onClick={() => {
                           setIsAnalyzingEntity(true);
                           // Start entity analysis which will auto-populate fields
                         }}
                         className="w-full"
                       >
                         <Brain className="h-4 w-4 mr-2" />
                         Analyze Entity
                       </Button>
                     )}
                     
                     {isAnalyzingEntity && entityInput.trim() && (
                       <EntityIntelligenceAnalyzer
                         entityData={{
                           entityName: entityInput.trim(),
                           context: 'topic audit analysis',
                           auditContext: {
                             industry: '',
                             topic: '',
                             target_audience: '',
                             known_competitors: [],
                             queryStrategy: 'market_research'
                           }
                         }}
                         onIntelligenceGenerated={(intelligence) => {
                           setEnhancedEntityIntelligence(intelligence);
                           // Auto-populate fields from entity intelligence
                           autoPopulateFromEntity(intelligence);
                         }}
                         onAnalysisComplete={() => {
                           setIsAnalyzingEntity(false);
                           if (autoPopulatedData) {
                             setCurrentStep('auto-populate');
                           }
                         }}
                       />
                     )}
                   </div>
                 </>
               )}
            </div>
          )}

          {/* Step 3: Auto-Populate & Edit */}
          {currentStep === 'auto-populate' && (
            <div className="space-y-4">
              {auditMode === 'topic' && autoPopulatedData ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-primary">Review Auto-Populated Fields</h3>
                    <Badge variant="outline" className="text-green-600 border-green-200">
                      <Brain className="h-3 w-3 mr-1" />
                      AI Suggested
                    </Badge>
                  </div>
                  
                  <Alert className="bg-blue-900/20 border-blue-700/50">
                    <Brain className="h-4 w-4" />
                    <AlertDescription className="text-blue-400">
                      Fields have been auto-populated based on entity analysis. Click the edit icon next to any field to modify it.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-4">
                    {/* Topic Field */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Topic</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingField(editingField === 'topic' ? null : 'topic')}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                      </div>
                      {editingField === 'topic' ? (
                        <Input
                          value={autoPopulatedData.topic}
                          onChange={(e) => setAutoPopulatedData(prev => prev ? {...prev, topic: e.target.value} : null)}
                          onBlur={() => setEditingField(null)}
                          autoFocus
                          className="w-full"
                        />
                      ) : (
                        <p className="text-sm bg-background/50 border rounded-lg p-3">{autoPopulatedData.topic}</p>
                      )}
                    </div>

                    {/* Industry Field */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Industry</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingField(editingField === 'industry' ? null : 'industry')}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                      </div>
                      {editingField === 'industry' ? (
                        <Input
                          value={autoPopulatedData.industry}
                          onChange={(e) => setAutoPopulatedData(prev => prev ? {...prev, industry: e.target.value} : null)}
                          onBlur={() => setEditingField(null)}
                          autoFocus
                          className="w-full"
                        />
                      ) : (
                        <p className="text-sm bg-background/50 border rounded-lg p-3">{autoPopulatedData.industry}</p>
                      )}
                    </div>

                    {/* Target Audience Field */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Target Audience</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingField(editingField === 'target_audience' ? null : 'target_audience')}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                      </div>
                      {editingField === 'target_audience' ? (
                        <Input
                          value={autoPopulatedData.target_audience}
                          onChange={(e) => setAutoPopulatedData(prev => prev ? {...prev, target_audience: e.target.value} : null)}
                          onBlur={() => setEditingField(null)}
                          autoFocus
                          className="w-full"
                        />
                      ) : (
                        <p className="text-sm bg-background/50 border rounded-lg p-3">{autoPopulatedData.target_audience}</p>
                      )}
                    </div>

                    {/* Competitors Field */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Known Competitors</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingField(editingField === 'competitors' ? null : 'competitors')}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                      </div>
                      {editingField === 'competitors' ? (
                        <Textarea
                          value={autoPopulatedData.known_players.join(', ')}
                          onChange={(e) => setAutoPopulatedData(prev => prev ? {...prev, known_players: e.target.value.split(',').map(s => s.trim()).filter(Boolean)} : null)}
                          onBlur={() => setEditingField(null)}
                          autoFocus
                          placeholder="Enter competitors separated by commas"
                          className="w-full min-h-[80px]"
                        />
                      ) : (
                        <div className="bg-background/50 border rounded-lg p-3">
                          <div className="flex flex-wrap gap-1">
                            {autoPopulatedData.known_players.map((competitor, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {competitor}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Context Description */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Context Description</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingField(editingField === 'context' ? null : 'context')}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                      </div>
                      {editingField === 'context' ? (
                        <Textarea
                          value={autoPopulatedData.context_description || ''}
                          onChange={(e) => setAutoPopulatedData(prev => prev ? {...prev, context_description: e.target.value} : null)}
                          onBlur={() => setEditingField(null)}
                          autoFocus
                          placeholder="Brief description of the analysis context"
                          className="w-full min-h-[80px]"
                        />
                      ) : (
                        <p className="text-sm bg-background/50 border rounded-lg p-3">{autoPopulatedData.context_description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <Button
                      onClick={() => {
                        setTopicData(autoPopulatedData);
                        handleConfirmation({ entityIntelligence: enhancedEntityIntelligence });
                      }}
                      className="flex-1"
                      disabled={isGeneratingQueries}
                    >
                      {isGeneratingQueries ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Generating Queries...
                        </>
                      ) : (
                        <>
                          <Zap className="h-4 w-4 mr-2" />
                          Continue to Query Generation
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setCurrentStep('entity')}
                    >
                      <ChevronLeft className="h-4 w-4 mr-2" />
                      Back to Entity Input
                    </Button>
                  </div>
                  
                  {isGeneratingQueries && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>{queryGenerationProgress.stage}</span>
                        <span>{queryGenerationProgress.current}/{queryGenerationProgress.total}</span>
                      </div>
                      <div className="w-full bg-background/50 rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${(queryGenerationProgress.current / queryGenerationProgress.total) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">App mode auto-population coming soon...</p>
                  <Button onClick={() => setCurrentStep('queries')} className="mt-4">
                    Continue to Query Generation
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Query Generation */}
          {currentStep === 'queries' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-primary">
                  Generated Queries ({generatedQueries.length})
                </h3>
                <div className="flex space-x-2">
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
              </div>

              {/* Query Management Actions */}
              <div className="flex flex-wrap gap-2 p-4 bg-background/30 rounded-lg border border-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRegenerateQueries(10)}
                  disabled={!topicData}
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Regenerate Queries
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleGenerateMoreQueries(10)}
                  disabled={!topicData}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Generate 10 More
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleGenerateMoreQueries(20)}
                  disabled={!topicData}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Generate 20 More
                </Button>

                {topicData?.entityIntelligence && (
                  <Badge variant="secondary" className="flex items-center">
                    <Brain className="h-3 w-3 mr-1" />
                    Entity-Enhanced Queries (AI Generated)
                  </Badge>
                )}
                
                <div className="flex items-center text-xs text-muted-foreground">
                  {generatedQueries.length > 0 && generatedQueries[0]?.source === 'openai_enhanced' ? (
                    <Badge variant="outline" className="text-green-600 border-green-200">
                      AI Generated
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-yellow-600 border-yellow-200">
                      Template Generated
                    </Badge>
                  )}
                </div>
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
                            <div className="text-sm text-muted-foreground space-y-1">
                              <div className="flex items-center space-x-2">
                                <Badge variant="outline" className="text-xs">
                                  {query.query_type}
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  Priority: {query.priority}
                                </Badge>
                                {query.source && (
                                  <Badge variant="outline" className="text-xs">
                                    {query.source === 'openai_enhanced' ? 'AI' : 'Template'}
                                  </Badge>
                                )}
                              </div>
                              {query.persona && (
                                <div className="text-xs">
                                  Persona: <span className="font-medium">{query.persona}</span>
                                </div>
                              )}
                              {query.reasoning && (
                                <div className="text-xs italic">
                                  {query.reasoning}
                                </div>
                              )}
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

          {/* Step 5: Review & Create */}
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
                disabled={!canCreateAudit() || isCreatingAudit}
                className="w-full"
                size="lg"
              >
                {isCreatingAudit ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Audit...
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Create Audit Run
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Navigation Controls */}
        <div className="flex justify-between pt-4 border-t border-border">
          <Button 
            variant="outline" 
            onClick={goToPreviousStep}
            disabled={!canGoBack()}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>

          {/* Only show Continue button for steps that don't have specific action buttons */}
          {currentStep !== 'review' && canGoForward() && (
            <Button 
              onClick={goToNextStep}
              className="flex items-center gap-2"
            >
              Continue
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};