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

interface MetadataQueryGeneratorProps {
  validatedApp: ValidatedApp;
  onQueriesGenerated: (queries: GeneratedQuery[]) => void;
  selectedQueries: string[];
  appIntelligence?: any; // Intelligence data from AppIntelligenceAnalyzer
}

export const MetadataQueryGenerator: React.FC<MetadataQueryGeneratorProps> = ({
  validatedApp,
  onQueriesGenerated,
  selectedQueries,
  appIntelligence
}) => {
  const [generatedQueries, setGeneratedQueries] = useState<GeneratedQuery[]>([]);
  const [customVariables, setCustomVariables] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);

  // Extract meaningful variables from app metadata
  const extractAppVariables = () => {
    const metadata = validatedApp.metadata;
    const variables: Record<string, string> = {};

    // Core app variables
    variables.app_name = metadata.name || metadata.title;
    variables.developer = metadata.developer || 'developer';
    variables.category = metadata.applicationCategory || 'mobile app';
    
    // Derive additional variables from description
    if (metadata.description) {
      const desc = metadata.description.toLowerCase();
      
      // Try to extract target audience from description
      if (desc.includes('beginner') || desc.includes('new user')) {
        variables.target_audience = 'beginners';
      } else if (desc.includes('professional') || desc.includes('advanced')) {
        variables.target_audience = 'professionals';
      } else if (desc.includes('family') || desc.includes('kid')) {
        variables.target_audience = 'families';
      } else {
        variables.target_audience = 'users';
      }

      // Extract use cases from description
      if (desc.includes('track') || desc.includes('monitor')) {
        variables.use_case = 'tracking and monitoring';
      } else if (desc.includes('learn') || desc.includes('education')) {
        variables.use_case = 'learning and education';
      } else if (desc.includes('social') || desc.includes('connect')) {
        variables.use_case = 'social connection';
      } else if (desc.includes('fitness') || desc.includes('health')) {
        variables.use_case = 'fitness and health';
      } else {
        variables.use_case = 'general productivity';
      }
    } else {
      variables.target_audience = 'users';
      variables.use_case = 'general use';
    }

    // Category-specific variables
    const category = metadata.applicationCategory?.toLowerCase() || '';
    if (category.includes('finance')) {
      variables.specific_need = 'manage finances and budgets';
    } else if (category.includes('health') || category.includes('fitness')) {
      variables.specific_need = 'stay healthy and fit';
    } else if (category.includes('productivity')) {
      variables.specific_need = 'stay organized and productive';
    } else if (category.includes('education')) {
      variables.specific_need = 'learn new skills';
    } else if (category.includes('social')) {
      variables.specific_need = 'connect with others';
    } else {
      variables.specific_need = 'achieve their goals';
    }

    return variables;
  };

  const generateQueriesFromMetadata = () => {
    setIsGenerating(true);
    
    const appVariables = extractAppVariables();
    const queries: GeneratedQuery[] = [];

    // Generate queries based on templates, prioritizing by app category
    const templates = QUERY_TEMPLATE_LIBRARY.slice(); // Copy array
    
    templates.forEach(template => {
      // Create a smart variable mapping
      const variableMapping: Record<string, string> = {};
      
      Object.keys(template.variables).forEach(key => {
        if (appVariables[key]) {
          variableMapping[key] = appVariables[key];
        } else if (customVariables[key]) {
          variableMapping[key] = customVariables[key];
        } else {
          // Smart defaults based on key name
          switch (key) {
            case 'app_name':
              variableMapping[key] = appVariables.app_name;
              break;
            case 'category':
              variableMapping[key] = appVariables.category;
              break;
            case 'target_audience':
              variableMapping[key] = appVariables.target_audience;
              break;
            case 'specific_need':
              variableMapping[key] = appVariables.specific_need;
              break;
            case 'use_case':
              variableMapping[key] = appVariables.use_case;
              break;
            case 'competitor_app':
              // Generate logical competitor based on category
              const category = appVariables.category.toLowerCase();
              if (category.includes('fitness')) {
                variableMapping[key] = 'MyFitnessPal';
              } else if (category.includes('finance')) {
                variableMapping[key] = 'Mint';
              } else if (category.includes('social')) {
                variableMapping[key] = 'Instagram';
              } else if (category.includes('productivity')) {
                variableMapping[key] = 'Notion';
              } else {
                variableMapping[key] = 'popular alternatives';
              }
              break;
            case 'competitor_1':
              variableMapping[key] = 'CompetitorA';
              break;
            case 'competitor_2':
              variableMapping[key] = 'CompetitorB';
              break;
            case 'feature':
              variableMapping[key] = 'key features';
              break;
            case 'problem':
              variableMapping[key] = `challenges with ${appVariables.category}`;
              break;
            case 'workflow':
              variableMapping[key] = `${appVariables.category} workflow`;
              break;
            case 'activity':
              variableMapping[key] = appVariables.category.replace('app', '').trim();
              break;
            case 'user_type':
              variableMapping[key] = appVariables.target_audience;
              break;
            case 'purpose':
              variableMapping[key] = appVariables.use_case;
              break;
            default:
              variableMapping[key] = template.variables[key] || 'general use';
          }
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

  useEffect(() => {
    generateQueriesFromMetadata();
  }, [validatedApp, customVariables]);

  const handleCustomVariableChange = (key: string, value: string) => {
    setCustomVariables(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const appVariables = extractAppVariables();

  return (
    <div className="space-y-6">
      {/* App Context Summary */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <Brain className="h-5 w-5 text-yodel-orange" />
            <span>AI-Generated Queries</span>
          </CardTitle>
          <CardDescription className="text-zinc-400">
            Intelligent queries generated from {validatedApp.metadata.name} metadata
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-zinc-400">App:</span>
              <span className="text-white ml-2">{appVariables.app_name}</span>
            </div>
            <div>
              <span className="text-zinc-400">Category:</span>
              <span className="text-white ml-2">{appVariables.category}</span>
            </div>
            <div>
              <span className="text-zinc-400">Target Audience:</span>
              <span className="text-white ml-2">{appVariables.target_audience}</span>
            </div>
            <div>
              <span className="text-zinc-400">Use Case:</span>
              <span className="text-white ml-2">{appVariables.use_case}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Custom Variables Override */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Custom Variables</span>
          </CardTitle>
          <CardDescription className="text-zinc-400">
            Override extracted variables to fine-tune query generation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(appVariables).map(([key, defaultValue]) => (
              <div key={key} className="space-y-1">
                <Label className="text-xs text-zinc-400 capitalize">
                  {key.replace('_', ' ')}:
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
              onClick={generateQueriesFromMetadata}
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
          <CardTitle className="text-white">Generated Query Library</CardTitle>
          <CardDescription className="text-zinc-400">
            {generatedQueries.length} queries generated • {selectedQueries.length} selected
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