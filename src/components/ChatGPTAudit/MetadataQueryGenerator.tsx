
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Lightbulb, 
  Zap, 
  Target, 
  Star,
  Users,
  TrendingUp,
  MessageSquare,
  Search,
  Brain,
  Settings,
  RefreshCw
} from 'lucide-react';
import { QueryTemplate, QUERY_TEMPLATE_LIBRARY } from './QueryTemplateLibrary';
import { AppIntelligenceAnalyzer } from './AppIntelligenceAnalyzer';

interface AppStoreSearchResult {
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
}

interface ValidatedApp {
  appId: string;
  metadata: AppStoreSearchResult;
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

interface AppIntelligence {
  refined_category: string;
  learning_method?: string;
  target_audience: string[];
  competitors: string[];
  key_features: string[];
  use_cases: string[];
  market_position: string;
  confidence_score: number;
}

interface MetadataQueryGeneratorProps {
  validatedApp: ValidatedApp;
  onQueriesGenerated: (queries: GeneratedQuery[]) => void;
  selectedQueries: string[];
  appIntelligence?: AppIntelligence;
}

export const MetadataQueryGenerator: React.FC<MetadataQueryGeneratorProps> = ({
  validatedApp,
  onQueriesGenerated,
  selectedQueries,
  appIntelligence: externalIntelligence
}) => {
  const [generatedQueries, setGeneratedQueries] = useState<GeneratedQuery[]>([]);
  const [customVariables, setCustomVariables] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [appIntelligence, setAppIntelligence] = useState<AppIntelligence | null>(externalIntelligence || null);
  const [showIntelligenceAnalyzer, setShowIntelligenceAnalyzer] = useState(!externalIntelligence);

  // Enhanced app variables extraction using intelligence
  const extractEnhancedAppVariables = () => {
    const metadata = validatedApp.metadata;
    const intelligence = appIntelligence;
    const variables: Record<string, string> = {};

    if (intelligence) {
      // Use intelligence data for smart variables
      variables.app_name = metadata.name || metadata.title;
      variables.developer = metadata.developer || 'developer';
      variables.category = intelligence.refined_category;
      variables.target_audience = intelligence.target_audience.join(' and ');
      variables.specific_need = intelligence.use_cases.join(' and ');
      variables.use_case = intelligence.use_cases[0] || 'general use';
      
      // Set competitor variables
      if (intelligence.competitors.length > 0) {
        variables.competitor_app = intelligence.competitors[0];
        variables.competitor_1 = intelligence.competitors[0] || 'CompetitorA';
        variables.competitor_2 = intelligence.competitors[1] || 'CompetitorB';
      }
      
      // Feature-based variables
      variables.feature = intelligence.key_features.join(' and ') || 'key features';
      variables.problem = `challenges with ${intelligence.refined_category}`;
      variables.workflow = `${intelligence.refined_category} workflow`;
      variables.activity = intelligence.refined_category.replace('_', ' ');
      variables.user_type = intelligence.target_audience[0] || 'users';
      variables.purpose = intelligence.use_cases[0] || intelligence.refined_category;
    } else {
      // Fallback to basic extraction
      variables.app_name = metadata.name || metadata.title;
      variables.developer = metadata.developer || 'developer';
      variables.category = metadata.applicationCategory || 'mobile app';
      variables.target_audience = 'users';
      variables.specific_need = 'achieve their goals';
      variables.use_case = 'general use';
      variables.competitor_app = 'popular alternatives';
      variables.competitor_1 = 'CompetitorA';
      variables.competitor_2 = 'CompetitorB';
      variables.feature = 'key features';
      variables.problem = 'challenges';
      variables.workflow = 'workflow';
      variables.activity = 'activities';
      variables.user_type = 'users';
      variables.purpose = 'general use';
    }

    return variables;
  };

  const generateQueriesFromIntelligence = () => {
    setIsGenerating(true);
    
    const appVariables = extractEnhancedAppVariables();
    const queries: GeneratedQuery[] = [];

    // Filter templates based on intelligence category
    let relevantTemplates = QUERY_TEMPLATE_LIBRARY;
    
    if (appIntelligence) {
      const category = appIntelligence.refined_category.toLowerCase();
      
      // Category-specific template filtering
      relevantTemplates = QUERY_TEMPLATE_LIBRARY.filter(template => {
        const templateCategory = template.category.toLowerCase();
        const templateSubcategory = template.subcategory.toLowerCase();
        
        return (
          templateCategory.includes(category) ||
          templateSubcategory.includes(category) ||
          (category.includes('language') && (templateCategory.includes('education') || templateSubcategory.includes('learning'))) ||
          (category.includes('fitness') && templateCategory.includes('health')) ||
          (category.includes('meditation') && templateCategory.includes('wellness')) ||
          template.priority <= 2 // Always include high-priority templates
        );
      });
      
      // If no specific templates found, take top priority ones
      if (relevantTemplates.length < 3) {
        relevantTemplates = QUERY_TEMPLATE_LIBRARY.filter(t => t.priority <= 3).slice(0, 6);
      }
    }

    relevantTemplates.forEach(template => {
      // Create smart variable mapping
      const variableMapping: Record<string, string> = {};
      
      Object.keys(template.variables).forEach(key => {
        if (appVariables[key]) {
          variableMapping[key] = appVariables[key];
        } else if (customVariables[key]) {
          variableMapping[key] = customVariables[key];
        } else {
          variableMapping[key] = template.variables[key] || 'general';
        }
      });

      // Replace variables in query text
      let processedQuery = template.query_text;
      Object.entries(variableMapping).forEach(([key, value]) => {
        processedQuery = processedQuery.replace(new RegExp(`{${key}}`, 'g'), value);
      });

      queries.push({
        id: `generated_${template.id}_${Date.now()}`,
        query_text: processedQuery,
        category: template.category,
        subcategory: template.subcategory,
        generated_from: `${template.name} (${template.category})`,
        priority: template.priority,
        variables_used: variableMapping,
        icon: template.icon
      });
    });

    // Sort by priority and relevance
    queries.sort((a, b) => a.priority - b.priority);

    setGeneratedQueries(queries);
    onQueriesGenerated(queries);
    setIsGenerating(false);
  };

  const handleIntelligenceGenerated = (intelligence: AppIntelligence) => {
    setAppIntelligence(intelligence);
    setShowIntelligenceAnalyzer(false);
  };

  const handleAnalysisComplete = () => {
    generateQueriesFromIntelligence();
  };

  useEffect(() => {
    if (appIntelligence) {
      generateQueriesFromIntelligence();
    }
  }, [appIntelligence, customVariables]);

  const handleCustomVariableChange = (key: string, value: string) => {
    setCustomVariables(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const appVariables = extractEnhancedAppVariables();

  return (
    <div className="space-y-6">
      {/* App Intelligence Analyzer */}
      {showIntelligenceAnalyzer && (
        <AppIntelligenceAnalyzer
          appData={{
            app_name: validatedApp.metadata.name || validatedApp.metadata.title,
            description: validatedApp.metadata.description || '',
            category: validatedApp.metadata.applicationCategory || '',
            developer: validatedApp.metadata.developer || '',
            bundle_id: validatedApp.appId
          }}
          onIntelligenceGenerated={handleIntelligenceGenerated}
          onAnalysisComplete={handleAnalysisComplete}
        />
      )}

      {/* Intelligence Summary */}
      {appIntelligence && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Brain className="h-5 w-5 text-green-400" />
              <span>App Intelligence Applied</span>
              <Badge variant="default" className="bg-green-600">
                {Math.round(appIntelligence.confidence_score * 100)}% Confidence
              </Badge>
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Using AI analysis for {validatedApp.metadata.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-zinc-400">Category:</span>
                <span className="text-white ml-2">{appIntelligence.refined_category.replace('_', ' ')}</span>
              </div>
              <div>
                <span className="text-zinc-400">Audience:</span>
                <span className="text-white ml-2">{appIntelligence.target_audience.slice(0, 2).join(', ')}</span>
              </div>
              <div>
                <span className="text-zinc-400">Competitors:</span>
                <span className="text-white ml-2">{appIntelligence.competitors.slice(0, 2).join(', ')}</span>
              </div>
              <div>
                <span className="text-zinc-400">Queries:</span>
                <span className="text-green-400 ml-2">{generatedQueries.length} Generated</span>
              </div>
            </div>
            <Button
              onClick={() => setShowIntelligenceAnalyzer(true)}
              variant="outline"
              size="sm"
              className="mt-4 border-zinc-600"
            >
              <Settings className="h-4 w-4 mr-2" />
              Reanalyze App
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Custom Variables Override */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Smart Variables</span>
            {appIntelligence && (
              <Badge variant="outline" className="text-green-400 border-green-400">
                AI Enhanced
              </Badge>
            )}
          </CardTitle>
          <CardDescription className="text-zinc-400">
            {appIntelligence 
              ? 'Variables automatically extracted from app intelligence'
              : 'Override extracted variables to fine-tune query generation'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(appVariables).map(([key, defaultValue]) => (
              <div key={key} className="space-y-1">
                <Label className="text-xs text-zinc-400 capitalize flex items-center gap-2">
                  {key.replace('_', ' ')}:
                  {appIntelligence && (
                    <Badge variant="outline" className="text-xs text-green-400 border-green-400">
                      AI
                    </Badge>
                  )}
                </Label>
                <Input
                  placeholder={defaultValue}
                  value={customVariables[key] || ''}
                  onChange={(e) => handleCustomVariableChange(key, e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-white text-sm h-8"
                />
              </div>
            ))}
          </div>
          <div className="mt-4">
            <Button
              onClick={generateQueriesFromIntelligence}
              disabled={isGenerating}
              variant="outline"
              size="sm"
              className="border-zinc-600"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
              Regenerate Queries
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Generated Queries */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <Brain className="h-5 w-5 text-blue-400" />
            <span>
              {appIntelligence ? 'Intelligent Query Library' : 'Generated Query Library'}
            </span>
          </CardTitle>
          <CardDescription className="text-zinc-400">
            {generatedQueries.length} queries generated • {selectedQueries.length} selected
            {appIntelligence && (
              <span className="text-green-400"> • AI-Enhanced</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {generatedQueries.map((query) => {
              const isSelected = selectedQueries.includes(query.id);
              
              return (
                <div
                  key={query.id}
                  className={`p-4 border rounded-lg transition-all duration-200 ${
                    isSelected 
                      ? 'border-yodel-orange bg-yodel-orange/10' 
                      : 'border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => {
                          // This will be handled by parent component
                        }}
                        className="border-zinc-600 mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          {query.icon}
                          <span className="text-sm font-medium text-white">
                            {query.generated_from}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {query.category}
                          </Badge>
                          <Badge variant="outline" className="text-xs text-zinc-400">
                            Priority {query.priority}
                          </Badge>
                          {appIntelligence && (
                            <Badge variant="outline" className="text-xs text-green-400 border-green-400">
                              AI
                            </Badge>
                          )}
                        </div>
                        
                        <div className="p-3 bg-zinc-800/50 rounded-md border border-zinc-700 mb-3">
                          <code className="text-sm text-zinc-200">{query.query_text}</code>
                        </div>

                        <div className="text-xs text-zinc-500">
                          Variables used: {Object.entries(query.variables_used)
                            .map(([key, value]) => `${key}="${value}"`)
                            .join(', ')}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {isSelected && (
                    <div className="mt-3 p-3 bg-green-900/20 border border-green-700/50 rounded-md">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-xs text-green-400 font-medium">Selected for audit</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
