import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';

import { TopicAnalysisInterface } from './TopicAnalysisInterface';
import { EntityIntelligenceAnalyzer } from './EntityIntelligenceAnalyzer';
import { AppStoreIntegrationService } from '@/services/appstore-integration.service';
import { AppIntelligenceAnalyzer } from './AppIntelligenceAnalyzer';
import { TopicEntityConfirmation } from './TopicEntityConfirmation';
import { AppSearchResultsModal } from '@/components/AsoAiHub/MetadataCopilot/AppSearchResultsModal';
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
  Loader2,
  Search,
  Trash2,
  Copy,
  MoreVertical,
  HelpCircle,
  CheckSquare
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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

// Simple mode options data - FIXED TO SEPARATE SERVICE TYPES FROM ENTITY TRACKING
const SERVICE_TYPE_OPTIONS = [
  {
    value: 'aso-agency',
    label: 'ASO Agency',
    description: 'App Store Optimization services',
    queryBase: 'ASO agency',
    services: ['App store optimization', 'Keyword optimization', 'Listing optimization'],
    explainer: 'Tests generic ASO agency queries (NOT your specific company)'
  },
  {
    value: 'mobile-marketing-agency', 
    label: 'Mobile Marketing Agency',
    description: 'Paid advertising and growth services for mobile apps',
    queryBase: 'mobile marketing agency',
    services: ['Facebook ads', 'Google campaigns', 'User acquisition'],
    explainer: 'Tests generic mobile marketing queries'
  },
  {
    value: 'app-development-agency',
    label: 'App Development Agency',
    description: 'Mobile app creation and development services',
    queryBase: 'app development agency',
    services: ['iOS development', 'Android development', 'Cross-platform apps'],
    explainer: 'Tests generic app development queries'
  },
  {
    value: 'mobile-analytics-platform',
    label: 'Mobile Analytics Platform',
    description: 'App performance tracking and analytics tools',
    queryBase: 'mobile analytics platform',
    services: ['Performance monitoring', 'User analytics', 'Revenue tracking'],
    explainer: 'Tests generic analytics platform queries'
  },
  {
    value: 'fitness-app',
    label: 'Fitness App',
    description: 'Health and fitness mobile applications',
    queryBase: 'fitness app',
    services: ['Workout tracking', 'Health monitoring', 'Fitness coaching'],
    explainer: 'Tests generic fitness app recommendation queries'
  },
  {
    value: 'custom',
    label: 'Custom Service Type',
    description: 'Enter your own service type',
    queryBase: '',
    services: [],
    explainer: 'Specify your exact service type for testing'
  }
];

const TARGET_MARKET_OPTIONS = [
  {
    value: 'mobile-apps',
    label: 'Mobile Apps',
    description: 'General mobile app market',
    explainer: 'Creates queries like "best ASO agency for mobile apps"'
  },
  {
    value: 'startups',
    label: 'Startups', 
    description: 'Early-stage companies',
    explainer: 'Creates queries like "ASO agency for startups"'
  },
  {
    value: 'enterprise',
    label: 'Enterprise',
    description: 'Large corporations',
    explainer: 'Creates queries like "enterprise mobile marketing solutions"'
  },
  {
    value: 'gaming',
    label: 'Gaming Apps',
    description: 'Mobile games and gaming platforms',
    explainer: 'Creates queries specific to gaming industry'
  },
  {
    value: 'ecommerce',
    label: 'E-commerce',
    description: 'Shopping and retail applications',
    explainer: 'Creates queries for e-commerce app services'
  }
];

const BUSINESS_CONTEXT_OPTIONS = [
  {
    value: 'need-help',
    label: 'Need Help',
    description: 'Problem-focused queries',
    explainer: 'Creates queries like "need help with ASO"'
  },
  {
    value: 'recommendations',
    label: 'Seeking Recommendations',
    description: 'Recommendation-seeking queries',
    explainer: 'Creates queries like "ASO agency recommendations"'
  },
  {
    value: 'comparison',
    label: 'Comparing Options',
    description: 'Comparison-focused queries',
    explainer: 'Creates queries like "top ASO agencies comparison"'
  },
  {
    value: 'budget-conscious',
    label: 'Budget-Conscious',
    description: 'Cost-focused queries',
    explainer: 'Creates queries like "affordable ASO services"'
  }
];

export const StreamlinedSetupFlow: React.FC<StreamlinedSetupFlowProps> = ({
  apps,
  auditMode,
  onModeChange,
  onAuditCreate
}) => {
  // Setup mode state
  const [setupMode, setSetupMode] = useState<'simple' | 'advanced'>('simple');
  
  // Simple mode state - FIXED TO SEPARATE TRACKING FROM QUERY GENERATION
  const [simpleInputs, setSimpleInputs] = useState({
    entityToTrack: '', // ONLY for tracking in responses - NEVER in queries
    serviceType: null as typeof SERVICE_TYPE_OPTIONS[0] | null, // For query generation
    customServiceType: '', // When user selects "custom"
    targetMarket: null as typeof TARGET_MARKET_OPTIONS[0] | null,
    businessContext: [] as typeof BUSINESS_CONTEXT_OPTIONS
  });
  
  // Setup state
  const [currentStep, setCurrentStep] = useState<'mode' | 'entity' | 'auto-populate' | 'queries' | 'review'>('entity');
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
  const [entityAliases, setEntityAliases] = useState<string[]>([]);
  const [newAlias, setNewAlias] = useState('');
  const [isAnalyzingEntity, setIsAnalyzingEntity] = useState(false);
  
  // App Store Integration State
  const [isAppEnabled, setIsAppEnabled] = useState(false);
  const [appStoreUrl, setAppStoreUrl] = useState('');
  const [appStoreData, setAppStoreData] = useState<any>(null);
  const [isLoadingAppData, setIsLoadingAppData] = useState(false);
  const [isSearchingApps, setIsSearchingApps] = useState(false);
  const [appSearchResults, setAppSearchResults] = useState<any[]>([]);
  const [showAppPicker, setShowAppPicker] = useState(false);
  const [distinctiveFeatures, setDistinctiveFeatures] = useState('');
  
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
  const [selectedQueries, setSelectedQueries] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  const { toast } = useToast();

  // App Store Integration Helper Functions
  const validateAppStoreUrl = (url: string): boolean => {
    const iosPattern = /^https:\/\/apps\.apple\.com\/.+/;
    const androidPattern = /^https:\/\/play\.google\.com\/store\/apps\/.+/;
    return iosPattern.test(url) || androidPattern.test(url);
  };

  const extractKeyFeatures = (appData: any): string[] => {
    const features = [];
    
    if (appData?.featureAnalysis?.topFeatures) {
      features.push(...appData.featureAnalysis.topFeatures.slice(0, 5));
    }
    
    if (appData?.competitiveOpportunities) {
      appData.competitiveOpportunities.forEach((opp: string) => {
        if (opp.includes('feature') || opp.includes('capability')) {
          features.push(opp.split(' ').slice(0, 2).join(' '));
        }
      });
    }

    // Extract features from description analysis
    if (appData?.description) {
      const descWords = appData.description.toLowerCase();
      const featureKeywords = ['feature', 'tool', 'tracking', 'analysis', 'monitoring', 'management', 'optimization'];
      featureKeywords.forEach(keyword => {
        if (descWords.includes(keyword)) {
          features.push(keyword);
        }
      });
    }

    // Extract from category
    if (appData?.applicationCategory) {
      features.push(appData.applicationCategory.toLowerCase().replace(/[^a-z\s]/g, ''));
    }
    
    return features.filter(Boolean).slice(0, 8);
  };

  const searchAppsForEntity = async (entityName: string) => {
    if (!entityName.trim()) return;
    
    setIsSearchingApps(true);
    try {
      console.log('🔍 Auto-searching apps for entity:', entityName);
      const response = await AppStoreIntegrationService.searchApp(entityName, 'default-org');
      
      console.log('📱 App search response:', response);
      
      if (response.success && response.data && response.data.length > 0) {
        console.log('✅ Found apps:', response.data.length);
        
        // Handle multiple results (ambiguous search) - SHOW PICKER
        if (response.data.length > 1) {
          console.log('🔀 Multiple apps found, showing picker');
          setAppSearchResults(response.data);
          setShowAppPicker(true);
          toast({
            title: 'Multiple apps found',
            description: `Found ${response.data.length} apps matching "${entityName}". Please select the correct one.`,
            variant: 'default'
          });
        } else {
          // Single result - auto-select it
          console.log('🎯 Single app found, auto-selecting');
          await handleAppSelection(response.data[0]);
        }
      } else {
        console.log('❌ No apps found in response');
        toast({
          title: 'No apps found',
          description: `No matching apps found for "${entityName}". You can enter an App Store URL manually.`,
          variant: 'default'
        });
      }
    } catch (error) {
      console.error('💥 App search failed:', error);
      toast({
        title: 'Search failed',
        description: 'App search failed. You can enter an App Store URL manually.',
        variant: 'destructive'
      });
    } finally {
      setIsSearchingApps(false);
    }
  };

  const handleAppSelection = async (selectedApp: any) => {
    console.log('📱 App selected:', selectedApp);
    setShowAppPicker(false);
    
    // Auto-populate URL field
    setAppStoreUrl(selectedApp.url);
    
    // Analyze the selected app
    setIsLoadingAppData(true);
    try {
      const appData = await fetchAppStoreData(selectedApp.url);
      if (appData) {
        // Extract distinctive features and populate the field
        const features = extractKeyFeatures(appData);
        setDistinctiveFeatures(features.join(', '));
        
        toast({
          title: 'App analyzed successfully',
          description: `Found ${features.length} distinctive features for ${selectedApp.name}`,
        });
      }
    } catch (error) {
      console.error('App analysis failed:', error);
    } finally {
      setIsLoadingAppData(false);
    }
  };

  const handleAppToggle = async (enabled: boolean) => {
    setIsAppEnabled(enabled);
    
    if (enabled) {
      // Auto-trigger app search using the entity name
      const entityName = simpleInputs.entityToTrack || entityInput;
      if (entityName.trim()) {
        await searchAppsForEntity(entityName);
      }
    } else {
      // Reset app-related state
      setAppStoreUrl('');
      setAppStoreData(null);
      setAppSearchResults([]);
      setDistinctiveFeatures('');
      setShowAppPicker(false);
    }
  };

  const fetchAppStoreData = async (url: string) => {
    if (!isAppEnabled || !url || !validateAppStoreUrl(url)) {
      return null;
    }
    
    setIsLoadingAppData(true);
    try {
      const response = await AppStoreIntegrationService.searchApp(url, 'default-org');
      if (response.success && response.data && response.data.length > 0) {
        const appData = response.data[0];
        setAppStoreData(appData);
        return appData;
      } else {
        toast({
          title: 'App Store Analysis Failed',
          description: response.error || 'Could not analyze app store data',
          variant: 'destructive'
        });
        return null;
      }
    } catch (error) {
      console.error('Failed to fetch app store data:', error);
      toast({
        title: 'App Store Analysis Failed',
        description: 'Failed to analyze app store data. Continuing with basic analysis.',
        variant: 'destructive'
      });
      return null;
    } finally {
      setIsLoadingAppData(false);
    }
  };

  const handleAnalyzeEntity = async () => {
    setIsAnalyzingEntity(true);
    
    // Fetch app store data if enabled
    let appData = null;
    if (isAppEnabled && appStoreUrl) {
      appData = await fetchAppStoreData(appStoreUrl);
    }
    
    // Continue with entity analysis (existing logic will handle this)
  };

  // Data mapping function for simple mode
  const getTopicAuditData = (): TopicAuditData => {
    if (setupMode === 'simple') {
      const serviceType = simpleInputs.serviceType?.value === 'custom' 
        ? simpleInputs.customServiceType 
        : simpleInputs.serviceType?.queryBase || 'service';
        
      return {
        // ✅ Entity is ONLY for tracking - NEVER in query generation
        entityToTrack: simpleInputs.entityToTrack,
        
        // Context builds around SERVICE TYPE (not entity)
        topic: `${serviceType} services`,
        industry: simpleInputs.serviceType?.value || 'technology',
        target_audience: simpleInputs.targetMarket?.label || 'general users',
        known_players: [],
        entityIntelligence: {
          entityName: simpleInputs.entityToTrack, // ✅ Only for tracking
          description: `Provider of ${serviceType} services`,
          services: simpleInputs.serviceType?.services || [],
          targetClients: [simpleInputs.targetMarket?.label || 'general users'],
          competitors: [],
          recentNews: [],
          marketPosition: 'unknown',
          industryFocus: [serviceType],
          confidenceScore: 0.8,
          scrapedAt: new Date().toISOString()
        }
      };
    } else {
      return topicData || {
        topic: '',
        industry: '',
        target_audience: '',
        entityToTrack: '',
        known_players: []
      };
    }
  };

  // Validation for simple inputs - CRITICAL: entity and service type required
  const validateSimpleInputs = () => {
    const errors = [];
    if (!simpleInputs.entityToTrack.trim()) errors.push('Entity to track is required');
    if (!simpleInputs.serviceType) errors.push('Service type is required');
    if (simpleInputs.serviceType?.value === 'custom' && !simpleInputs.customServiceType.trim()) {
      errors.push('Custom service type description is required');
    }
    return errors;
  };

  // Automatically set mode to 'topic' on mount
  useEffect(() => {
    if (auditMode !== 'topic') {
      onModeChange('topic');
    }
  }, [auditMode, onModeChange]);

  const steps = [
    { id: 'entity', label: 'Entity Input', icon: Target },
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
    // Skip generic continue for entity and confirmation steps - they have specific action buttons
    if (index === 0) return false; // Entity step - handled by specific buttons
    if (index === 1) return false; // Confirmation step - handled by specific buttons  
    if (index === 2) return generatedQueries.length > 0; // Queries step
    return false;
  };

  const goToPreviousStep = () => {
    const currentIndex = getCurrentStepIndex();
    if (currentIndex > 0) {
      const previousStep = steps[currentIndex - 1];
      setCurrentStep(previousStep.id as any);
      
      // Reset state when going back to avoid inconsistencies
      if (previousStep.id === 'entity') {
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
    setSelectedQueries(prev => {
      const newSet = new Set(prev);
      newSet.delete(queryId);
      return newSet;
    });
  };

  const toggleQuerySelection = (queryId: string) => {
    setSelectedQueries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(queryId)) {
        newSet.delete(queryId);
      } else {
        newSet.add(queryId);
      }
      return newSet;
    });
  };

  const selectAllQueries = () => {
    setSelectedQueries(new Set(filteredQueries.map(q => q.id)));
  };

  const clearSelection = () => {
    setSelectedQueries(new Set());
  };

  const handleBulkDelete = () => {
    setGeneratedQueries(prev => prev.filter(q => !selectedQueries.has(q.id)));
    setSelectedQueries(new Set());
    toast({ 
      title: "Queries deleted", 
      description: `${selectedQueries.size} queries removed` 
    });
  };

  const handleDuplicateQuery = (query: GeneratedTopicQuery) => {
    const duplicatedQuery: GeneratedTopicQuery = {
      ...query,
      id: crypto.randomUUID(),
      query_text: query.query_text + " (copy)"
    };
    setGeneratedQueries(prev => [...prev, duplicatedQuery]);
    toast({ 
      title: "Query duplicated", 
      description: "A copy has been added to your list" 
    });
  };

  // Filtered queries for search
  const filteredQueries = useMemo(() => {
    return generatedQueries.filter(query => 
      query.query_text.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [generatedQueries, searchTerm]);

  const handleAddQuery = () => {
    if (!newQueryText.trim()) return;
    
    // Handle multiple queries (one per line)
    const queries = newQueryText.split('\n').filter(q => q.trim());
    const newQueries: GeneratedTopicQuery[] = queries.map((queryText, index) => ({
      id: crypto.randomUUID(),
      query_text: queryText.trim(),
      query_type: 'conversational',
      priority: 5,
      target_entity: auditMode === 'app' ? selectedApp?.app_name || '' : topicData?.topic || '',
      personas: []
    }));
    
    setGeneratedQueries(prev => [...prev, ...newQueries]);
    setNewQueryText('');
    
    toast({ 
      title: "Queries added", 
      description: `${newQueries.length} custom queries added` 
    });
  };

  const generateQueriesFromEnhancedEntity = async (entityIntelligence: any) => {
    try {
      console.log('🚀 Generating queries from enhanced entity intelligence:', entityIntelligence);
      
      // Generate base queries using existing logic
      const baseQueries = await generateBaseQueries(entityIntelligence);
      
      // If app toggle is enabled and we have app data, enhance queries
      if (isAppEnabled && appStoreData) {
        const enhancedQueries = generateAppEnhancedQueries(appStoreData, entityIntelligence);
        
        // Combine and deduplicate, maintaining priority order
        const allQueries = [...baseQueries, ...enhancedQueries];
        const uniqueQueries = removeDuplicateQueries(allQueries);
        
        setGeneratedQueries(uniqueQueries.slice(0, 20)); // Limit to 20 total queries
      } else {
        setGeneratedQueries(baseQueries);
      }
    } catch (error) {
      console.error('❌ Enhanced query generation error:', error);
      await generateTemplateQueries();
    }
  };

  const generateBaseQueries = async (entityIntelligence: any): Promise<GeneratedTopicQuery[]> => {
    // Try AI-enhanced query generation with enhanced intelligence
    try {
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
          queryCount: 15
        }
      });
      
      if (aiResponse?.queries?.length) {
        console.log('✅ Enhanced AI queries generated:', aiResponse.queries.length);
        return aiResponse.queries;
      } else {
        console.warn('⚠️ Enhanced AI query generation failed, using fallback');
        return generateFallbackQueries();
      }
    } catch (error) {
      console.error('❌ Base query generation error:', error);
      return generateFallbackQueries();
    }
  };

  const generateFallbackQueries = (): GeneratedTopicQuery[] => {
    if (!topicData) return [];
    console.log('🔄 Generating fallback queries for topic:', topicData.topic);
    return TopicQueryGeneratorService.generateQueries(topicData, 15);
  };

  const generateAppEnhancedQueries = (appData: any, entityData: any): GeneratedTopicQuery[] => {
    const appCategory = extractAppCategory(appData);
    const keyFeatures = extractKeyFeatures(appData);
    const topKeywords = extractTopKeywords(appData);
    const competitors = extractCompetitors(appData);
    
    const enhancedQueries: GeneratedTopicQuery[] = [];
    let priority = 100;
    
    // Feature-based queries
    keyFeatures.forEach(feature => {
      enhancedQueries.push({
        id: `app-feature-${Date.now()}-${Math.random()}`,
        query_text: `best ${appCategory} with ${feature}`,
        query_type: 'service_specific',
        priority: priority--,
        target_entity: entityData.entityName,
        source: 'app_enhanced'
      });
      
      enhancedQueries.push({
        id: `app-feature-rec-${Date.now()}-${Math.random()}`,
        query_text: `${feature} app recommendations`,
        query_type: 'recommendation',
        priority: priority--,
        target_entity: entityData.entityName,
        source: 'app_enhanced'
      });
    });
    
    // Category + use case queries
    enhancedQueries.push({
      id: `app-category-${Date.now()}-${Math.random()}`,
      query_text: `best ${appCategory} for professionals`,
      query_type: 'recommendation',
      priority: priority--,
      target_entity: entityData.entityName,
      source: 'app_enhanced'
    });
    
    enhancedQueries.push({
      id: `app-top-${Date.now()}-${Math.random()}`,
      query_text: `top ${appCategory} apps`,
      query_type: 'recommendation',
      priority: priority--,
      target_entity: entityData.entityName,
      source: 'app_enhanced'
    });
    
    // Competitive queries
    competitors.forEach(competitor => {
      enhancedQueries.push({
        id: `app-alt-${Date.now()}-${Math.random()}`,
        query_text: `alternatives to ${competitor}`,
        query_type: 'comparison',
        priority: priority--,
        target_entity: entityData.entityName,
        source: 'app_enhanced'
      });
      
      enhancedQueries.push({
        id: `app-vs-${Date.now()}-${Math.random()}`,
        query_text: `${entityData.entityName} vs ${competitor}`,
        query_type: 'comparison',
        priority: priority--,
        target_entity: entityData.entityName,
        source: 'app_enhanced'
      });
    });
    
    // Keyword-based queries
    topKeywords.forEach(keyword => {
      enhancedQueries.push({
        id: `app-keyword-${Date.now()}-${Math.random()}`,
        query_text: `best apps for ${keyword}`,
        query_type: 'recommendation',
        priority: priority--,
        target_entity: entityData.entityName,
        source: 'app_enhanced'
      });
    });
    
    return enhancedQueries.filter(Boolean);
  };

  const extractAppCategory = (appData: any): string => {
    return appData.applicationCategory || appData.category || 'mobile app';
  };

  const extractTopKeywords = (appData: any): string[] => {
    // Extract keywords from app description and title
    const keywords = [];
    
    if (appData.description) {
      // Simple keyword extraction from description
      const words = appData.description.toLowerCase().split(/\s+/);
      const relevantWords = words.filter(word => 
        word.length > 4 && 
        !['this', 'that', 'with', 'from', 'they', 'have', 'been', 'will'].includes(word)
      );
      keywords.push(...relevantWords.slice(0, 4));
    }
    
    return keywords.filter(Boolean).slice(0, 5);
  };

  const extractCompetitors = (appData: any): string[] => {
    // For now, return empty array as we'd need competitor analysis
    // This could be enhanced later with actual competitor data
    return [];
  };

  const removeDuplicateQueries = (queries: GeneratedTopicQuery[]): GeneratedTopicQuery[] => {
    const seen = new Set();
    return queries.filter(query => {
      const normalized = query.query_text.toLowerCase().trim();
      if (seen.has(normalized)) {
        return false;
      }
      seen.add(normalized);
      return true;
    });
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

    const mapSolutionsFromServices = (services: string[]): string[] => {
      return services.map(service => service.includes('services') ? service : `${service} services`);
    };

    const mapQueryStrategy = (services: string[]): 'competitive_discovery' | 'market_research' | 'mixed' => {
      if (!services || services.length === 0) return 'market_research';
      
      const hasServiceKeywords = services.some(service => 
        service.toLowerCase().includes('consulting') || 
        service.toLowerCase().includes('agency') || 
        service.toLowerCase().includes('marketing') ||
        service.toLowerCase().includes('development')
      );
      
      return hasServiceKeywords ? 'competitive_discovery' : 'market_research';
    };

    const mapSubVertical = (services: string[], industry: string): string => {
      if (!services || services.length === 0) return '';
      
      const service = services[0].toLowerCase();
      if (service.includes('aso')) return 'App Store Optimization';
      if (service.includes('fitness')) return 'Fitness & Wellness Apps';
      if (service.includes('language')) return 'Language Learning';
      if (service.includes('marketing')) return 'Digital Marketing';
      if (service.includes('fintech')) return 'Financial Technology';
      
      return '';
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
      queryStrategy: mapQueryStrategy(intelligence.services || []),
      competitorFocus: true,
      intentLevel: 'high', // Default to high for competitive discovery
      solutionsOffered: mapSolutionsFromServices(intelligence.services || []),
      analysisDepth: 'standard', // Default to 20 queries
      industrySubVertical: mapSubVertical(intelligence.services || [], mapIndustryFromFocus(intelligence.industryFocus || [], intelligence.services || [])),
      entityIntelligence: intelligence
    };

    setAutoPopulatedData(autoPopulated);
    setTopicData(autoPopulated);
    setAuditName(`${intelligence.entityName} Visibility Audit - ${new Date().toLocaleDateString()}`);
    setAuditDescription(`AI-powered ChatGPT visibility analysis for ${intelligence.entityName}`);
    
    console.log('✅ Auto-populated topic data:', autoPopulated);
  };

  return (
    <>
      <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Zap className="h-5 w-5" />
          <span>Create New Audit</span>
          {appIntelligence && (
            <Badge className="bg-green-600 text-foreground">
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
              <div key={step.id} className="flex items-center">
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
                  <ChevronRight className="h-4 w-4 text-zinc-600 ml-4" />
                )}
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <div className="min-h-[400px]">
          {/* Step 1: Entity Selection */}
          {currentStep === 'entity' && (
            <div className="space-y-6">
              {/* Mode Toggle */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-primary">Setup Mode</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Card 
                    className={`cursor-pointer transition-all ${setupMode === 'simple' ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                    onClick={() => setSetupMode('simple')}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="text-2xl">⚡</div>
                        <div>
                          <h4 className="font-medium">Quick Setup</h4>
                          <p className="text-sm text-muted-foreground">Enter your entity + basic context to start tracking ChatGPT visibility</p>
                          <p className="text-xs text-muted-foreground mt-1">Like Google Search Console, but for ChatGPT recommendations</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card 
                    className={`cursor-pointer transition-all ${setupMode === 'advanced' ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                    onClick={() => setSetupMode('advanced')}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="text-2xl">🧠</div>
                        <div>
                          <h4 className="font-medium">AI Analysis</h4>
                          <p className="text-sm text-muted-foreground">Full entity intelligence (current system)</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Simple Mode Section */}
              {setupMode === 'simple' ? (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-primary">Quick Setup</h3>
                  
                  {/* STEP 1: Entity to Track - REQUIRED & PRIMARY */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Label htmlFor="simpleEntity">Entity to Track</Label>
                      <span className="text-red-500">*</span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <div className="space-y-2">
                              <p className="font-medium">What entity do you want to track in ChatGPT responses?</p>
                              <p className="text-sm">Just like how SEO tools track your website rankings in Google, we'll track how often your entity appears in ChatGPT recommendations.</p>
                              <div className="text-sm">
                                <p className="font-medium">Examples:</p>
                                <p>• Company: "Yodel Mobile", "Gummicube", "Ogilvy"</p>
                                <p>• App: "Fitness Pal", "Duolingo", "Slack"</p>
                                <p>• Service: "AppTweak", "Sensor Tower"</p>
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Input
                      id="simpleEntity"
                      value={simpleInputs.entityToTrack}
                      onChange={(e) => setSimpleInputs({...simpleInputs, entityToTrack: e.target.value})}
                      placeholder="Your company/app name to track (e.g., 'Yodel Mobile')"
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      This is the primary entity we'll search for in all ChatGPT responses
                    </p>
                  </div>

                  {/* STEP 2: Service Type - For Query Generation (NOT entity) */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Label htmlFor="serviceType">Service Type</Label>
                      <span className="text-red-500">*</span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <div className="space-y-2">
                              <p className="font-medium">What service type should we test queries for?</p>
                              <p className="text-sm">This determines what types of generic queries we'll test (WITHOUT your entity name).</p>
                              <div className="text-sm">
                                <p className="font-medium">Examples:</p>
                                <p>• "ASO agency" creates queries like "best ASO agency"</p>
                                <p>• "fitness app" creates queries like "top fitness apps"</p>
                              </div>
                              <p className="text-xs font-medium text-orange-600">⚠️ Your entity name is NEVER included in queries</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Select 
                      value={simpleInputs.serviceType?.value || ''} 
                      onValueChange={(value) => {
                        const serviceType = SERVICE_TYPE_OPTIONS.find(opt => opt.value === value);
                        setSimpleInputs({...simpleInputs, serviceType: serviceType || null});
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="What service type should we test?" />
                      </SelectTrigger>
                      <SelectContent>
                        {SERVICE_TYPE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div>
                              <div className="font-medium">{option.label}</div>
                              <div className="text-sm text-muted-foreground">{option.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Custom Service Type Input */}
                    {simpleInputs.serviceType?.value === 'custom' && (
                      <div className="mt-2">
                        <Input
                          value={simpleInputs.customServiceType}
                          onChange={(e) => setSimpleInputs({...simpleInputs, customServiceType: e.target.value})}
                          placeholder="e.g., fitness app, travel booking platform, meditation app"
                          className="w-full"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Enter the service type for query generation (without your entity name)
                        </p>
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground">
                      Creates queries like "best {simpleInputs.serviceType?.queryBase || 'service'}" - then tracks if your entity appears
                    </p>
                  </div>

                  {/* STEP 3: Target Market - For Query Context */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Label>Target Market</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="font-medium">What market context should we add to queries?</p>
                            <p className="text-sm">Adds context like "for startups" or "for mobile apps" to make queries more specific.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Select 
                      value={simpleInputs.targetMarket?.value || ''} 
                      onValueChange={(value) => {
                        const targetMarket = TARGET_MARKET_OPTIONS.find(opt => opt.value === value);
                        setSimpleInputs({...simpleInputs, targetMarket: targetMarket || null});
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select target market (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {TARGET_MARKET_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div>
                              <div className="font-medium">{option.label}</div>
                              <div className="text-sm text-muted-foreground">{option.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Adds context to queries (e.g., "ASO agency for startups")
                    </p>
                  </div>

                  {/* STEP 4: Business Context - For Query Variety */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Label>Query Context</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="font-medium">What types of queries should we create?</p>
                            <p className="text-sm">Creates different query styles like "need help with..." or "recommendations for..."</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {BUSINESS_CONTEXT_OPTIONS.map((option) => (
                        <div key={option.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={option.value}
                            checked={simpleInputs.businessContext.some(c => c.value === option.value)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSimpleInputs({
                                  ...simpleInputs, 
                                  businessContext: [...simpleInputs.businessContext, option]
                                });
                              } else {
                                setSimpleInputs({
                                  ...simpleInputs,
                                  businessContext: simpleInputs.businessContext.filter(c => c.value !== option.value)
                                });
                              }
                            }}
                          />
                          <Label htmlFor={option.value} className="text-sm">{option.label}</Label>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Creates different query styles for comprehensive testing
                    </p>
                  </div>

                  {/* Validation Errors */}
                  {validateSimpleInputs().length > 0 && (
                    <Alert variant="destructive">
                      <AlertDescription>
                        <ul className="list-disc list-inside">
                          {validateSimpleInputs().map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Continue Button */}
                  <Button 
                    onClick={() => {
                      const errors = validateSimpleInputs();
                      if (errors.length === 0) {
                        const simpleTopicData = getTopicAuditData();
                        setTopicData(simpleTopicData);
                        setAuditName(`${simpleTopicData.entityToTrack} ChatGPT Visibility Audit - ${new Date().toLocaleDateString()}`);
                        setCurrentStep('queries');
                        // Generate queries immediately for simple mode - WITHOUT entity name in queries
                        const queries = TopicQueryGeneratorService.generateQueries(simpleTopicData, 20);
                        setGeneratedQueries(queries);
                        toast({ 
                          title: "Setup Complete", 
                          description: `Generated ${queries.length} generic queries to test ${simpleTopicData.entityToTrack} visibility` 
                        });
                      }
                    }}
                    className="w-full"
                    disabled={validateSimpleInputs().length > 0}
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Generate Tracking Queries
                  </Button>
                </div>
              ) : (
                <>
                  {/* Advanced Mode Section with App Store Integration */}
                  <div className="space-y-4">
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

                    {/* App Store Integration Toggle */}
                    {entityInput.trim() && (
                      <div className="space-y-4 p-4 bg-accent/10 rounded-lg border">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <Label htmlFor="isApp" className="text-sm font-medium">Is this an app?</Label>
                            <p className="text-xs text-muted-foreground">
                              Enable app store analysis for enhanced queries
                            </p>
                          </div>
                          <Switch
                            id="isApp"
                            checked={isAppEnabled}
                            onCheckedChange={handleAppToggle}
                          />
                        </div>
                        
                        {isSearchingApps && (
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground p-3">
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
                            <span>Searching for apps...</span>
                          </div>
                        )}

                        {isAppEnabled && (
                          <div className="space-y-3">
                            <div className="space-y-2">
                              <Label htmlFor="appStoreUrl" className="text-sm font-medium">App Store URL</Label>
                              <Input
                                id="appStoreUrl"
                                value={appStoreUrl}
                                onChange={(e) => setAppStoreUrl(e.target.value)}
                                placeholder="https://apps.apple.com/... or https://play.google.com/..."
                                className="w-full"
                              />
                              <p className="text-xs text-muted-foreground">
                                Select an app from the search above or enter URL manually
                              </p>
                            </div>
                            
                            {appStoreUrl && !isLoadingAppData && !appStoreData && (
                              <Button
                                onClick={() => fetchAppStoreData(appStoreUrl)}
                                size="sm"
                                variant="outline"
                                className="w-full"
                              >
                                Analyze App Store URL
                              </Button>
                            )}
                            
                            {isLoadingAppData && (
                              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
                                <span>Analyzing app...</span>
                              </div>
                            )}
                            
                            {appStoreData && (
                              <div className="space-y-3">
                                <div className="space-y-2 p-3 bg-primary/10 rounded-lg">
                                  <h4 className="text-sm font-medium text-primary">App Analysis Complete</h4>
                                  <div className="flex items-center space-x-2">
                                    {appStoreData.icon && (
                                      <img src={appStoreData.icon} alt="App Icon" className="w-8 h-8 rounded" />
                                    )}
                                    <div>
                                      <p className="text-sm font-medium">{appStoreData.name}</p>
                                      <p className="text-xs text-muted-foreground">{appStoreData.developer}</p>
                                    </div>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="distinctiveFeatures" className="text-sm font-medium">Distinctive Features</Label>
                                  <Textarea
                                    id="distinctiveFeatures"
                                    value={distinctiveFeatures}
                                    onChange={(e) => setDistinctiveFeatures(e.target.value)}
                                    placeholder="fitness tracking, workout plans, health monitoring..."
                                    rows={3}
                                    className="w-full"
                                  />
                                  <p className="text-xs text-muted-foreground">
                                    These features will be used to generate more targeted queries. You can edit or add additional features.
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {entityInput.trim() && !isAnalyzingEntity && (
                      <Button 
                        onClick={handleAnalyzeEntity}
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
                          // Always move to auto-populate step after analysis completes
                          setCurrentStep('auto-populate');
                        }}
                      />
                    )}
                  </div>
                </div>
                </>
              )}
            </div>
          )}

          {/* Step 2: Auto-Populate & Edit */}
          {currentStep === 'auto-populate' && (
            <div className="space-y-4">
              {autoPopulatedData ? (
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

                    {/* NEW STRATEGIC FIELDS */}
                    
                    {/* Solutions Offered */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Solutions Offered</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingField(editingField === 'solutions' ? null : 'solutions')}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                      </div>
                      {editingField === 'solutions' ? (
                        <Textarea
                          value={autoPopulatedData.solutionsOffered?.join(', ') || ''}
                          onChange={(e) => setAutoPopulatedData(prev => prev ? {...prev, solutionsOffered: e.target.value.split(',').map(s => s.trim()).filter(Boolean)} : null)}
                          onBlur={() => setEditingField(null)}
                          autoFocus
                          placeholder="Enter solutions separated by commas"
                          className="w-full min-h-[80px]"
                        />
                      ) : (
                        <div className="bg-background/50 border rounded-lg p-3">
                          <div className="flex flex-wrap gap-1">
                            {autoPopulatedData.solutionsOffered?.map((solution, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {solution}
                              </Badge>
                            )) || <span className="text-muted-foreground text-sm">No solutions specified</span>}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Query Strategy */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Query Strategy</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingField(editingField === 'queryStrategy' ? null : 'queryStrategy')}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                      </div>
                      {editingField === 'queryStrategy' ? (
                        <select
                          value={autoPopulatedData.queryStrategy || 'market_research'}
                          onChange={(e) => setAutoPopulatedData(prev => prev ? {...prev, queryStrategy: e.target.value as any} : null)}
                          onBlur={() => setEditingField(null)}
                          autoFocus
                          className="w-full p-2 bg-background border border-border rounded-lg text-sm"
                        >
                          <option value="competitive_discovery">Product Discovery Focus</option>
                          <option value="market_research">Market Research Focus</option>
                          <option value="mixed">Balanced Analysis</option>
                        </select>
                      ) : (
                        <div className="bg-background/50 border rounded-lg p-3">
                          <span className="text-sm capitalize">
                            {autoPopulatedData.queryStrategy?.replace('_', ' ') || 'market research'}
                          </span>
                          <p className="text-xs text-muted-foreground mt-1">
                            {autoPopulatedData.queryStrategy === 'competitive_discovery' && 'Focuses on competitive positioning queries'}
                            {autoPopulatedData.queryStrategy === 'market_research' && 'Focuses on market and industry analysis'}
                            {autoPopulatedData.queryStrategy === 'mixed' && 'Balanced mix of discovery and research queries'}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Intent Level */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Intent Level</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingField(editingField === 'intentLevel' ? null : 'intentLevel')}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                      </div>
                      {editingField === 'intentLevel' ? (
                        <select
                          value={autoPopulatedData.intentLevel || 'high'}
                          onChange={(e) => setAutoPopulatedData(prev => prev ? {...prev, intentLevel: e.target.value as any} : null)}
                          onBlur={() => setEditingField(null)}
                          autoFocus
                          className="w-full p-2 bg-background border border-border rounded-lg text-sm"
                        >
                          <option value="high">High Intent</option>
                          <option value="medium">Medium Intent</option>
                          <option value="low">Low Intent</option>
                        </select>
                      ) : (
                        <div className="bg-background/50 border rounded-lg p-3">
                          <span className="text-sm capitalize">{autoPopulatedData.intentLevel || 'high'} Intent</span>
                        </div>
                      )}
                    </div>

                    {/* Analysis Depth */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Analysis Depth</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingField(editingField === 'analysisDepth' ? null : 'analysisDepth')}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                      </div>
                      {editingField === 'analysisDepth' ? (
                        <select
                          value={autoPopulatedData.analysisDepth || 'standard'}
                          onChange={(e) => setAutoPopulatedData(prev => prev ? {...prev, analysisDepth: e.target.value as any} : null)}
                          onBlur={() => setEditingField(null)}
                          autoFocus
                          className="w-full p-2 bg-background border border-border rounded-lg text-sm"
                        >
                          <option value="standard">Standard (20 queries)</option>
                          <option value="comprehensive">Comprehensive (50 queries)</option>
                          <option value="deep">Deep Analysis (100 queries)</option>
                        </select>
                      ) : (
                        <div className="bg-background/50 border rounded-lg p-3 flex items-center justify-between">
                          <div>
                            <span className="text-sm capitalize">{autoPopulatedData.analysisDepth || 'standard'}</span>
                            <p className="text-xs text-muted-foreground">
                              {autoPopulatedData.analysisDepth === 'standard' && '20 queries - Good for initial insights'}
                              {autoPopulatedData.analysisDepth === 'comprehensive' && '50 queries - Detailed competitive analysis'}
                              {autoPopulatedData.analysisDepth === 'deep' && '100 queries - Exhaustive market research'}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {autoPopulatedData.analysisDepth === 'comprehensive' ? 'Pro' : autoPopulatedData.analysisDepth === 'deep' ? 'Enterprise' : 'Free'}
                          </Badge>
                        </div>
                      )}
                    </div>

                    {/* Industry Sub-Vertical */}
                    {autoPopulatedData.industrySubVertical && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">Industry Sub-Vertical</Label>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingField(editingField === 'subVertical' ? null : 'subVertical')}
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                        </div>
                        {editingField === 'subVertical' ? (
                          <Input
                            value={autoPopulatedData.industrySubVertical || ''}
                            onChange={(e) => setAutoPopulatedData(prev => prev ? {...prev, industrySubVertical: e.target.value} : null)}
                            onBlur={() => setEditingField(null)}
                            autoFocus
                            placeholder="e.g., App Store Optimization, Language Learning"
                            className="w-full"
                          />
                        ) : (
                          <div className="bg-background/50 border rounded-lg p-3">
                            <span className="text-sm">{autoPopulatedData.industrySubVertical}</span>
                            <p className="text-xs text-muted-foreground mt-1">Precision targeting for better query relevance</p>
                          </div>
                        )}
                      </div>
                    )}
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
                  {selectedQueries.size > 0 && ` • ${selectedQueries.size} selected`}
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

              {/* Search and Bulk Actions */}
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search queries..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                {generatedQueries.length > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={selectedQueries.size === filteredQueries.length && filteredQueries.length > 0}
                        onCheckedChange={(checked) => checked ? selectAllQueries() : clearSelection()}
                      />
                      <span className="text-sm text-muted-foreground">
                        Select all visible
                      </span>
                      {selectedQueries.size > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearSelection}
                          className="text-muted-foreground"
                        >
                          Clear selection
                        </Button>
                      )}
                    </div>

                    {selectedQueries.size > 0 && (
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleBulkDelete}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Selected ({selectedQueries.size})
                        </Button>
                      </div>
                    )}
                  </div>
                )}
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
                {filteredQueries.map(query => (
                  <div key={query.id} className={`p-4 border border-border rounded-lg bg-background/50 transition-all ${selectedQueries.has(query.id) ? 'ring-2 ring-primary/30 bg-primary/5' : ''}`}>
                    <div className="flex items-start justify-between space-x-3">
                      <div className="flex items-start space-x-3">
                        <Checkbox
                          checked={selectedQueries.has(query.id)}
                          onCheckedChange={() => toggleQuerySelection(query.id)}
                          className="mt-1"
                        />
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
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleDuplicateQuery(query)}>
                                <Copy className="h-4 w-4 mr-2" />
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleDeleteQuery(query.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {filteredQueries.length === 0 && generatedQueries.length > 0 && (
                <div className="text-center text-muted-foreground py-8">
                  <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No queries match your search</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchTerm('')}
                    className="mt-2"
                  >
                    Clear search
                  </Button>
                </div>
              )}

              {/* Enhanced Add New Query */}
              <div className="space-y-4 p-4 border border-border rounded-lg bg-background/30">
                <div className="flex items-center space-x-2">
                  <Plus className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="newQuery" className="text-sm font-medium text-muted-foreground">
                    Add Custom Queries
                  </Label>
                </div>
                
                <Textarea
                  id="newQuery"
                  placeholder="Add one or more custom queries (one per line)&#10;&#10;Example:&#10;Best ASO agency for mobile apps&#10;Affordable app store optimization services&#10;Top mobile app marketing companies"
                  value={newQueryText}
                  onChange={(e) => setNewQueryText(e.target.value)}
                  className="min-h-[120px]"
                  rows={6}
                />
                
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    {newQueryText.split('\n').filter(q => q.trim()).length} queries ready to add
                  </div>
                  <Button
                    onClick={handleAddQuery}
                    disabled={!newQueryText.trim()}
                    variant="outline"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Queries
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

    {/* App Search Results Modal */}
    <AppSearchResultsModal
      isOpen={showAppPicker}
      results={appSearchResults}
      searchTerm={entityInput}
      onSelect={handleAppSelection}
      onCancel={() => setShowAppPicker(false)}
    />
    </>
  );
};