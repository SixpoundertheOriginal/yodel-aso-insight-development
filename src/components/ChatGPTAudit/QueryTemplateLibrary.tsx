import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Lightbulb, 
  Search, 
  Target, 
  Users, 
  Zap, 
  TrendingUp,
  MessageSquare,
  Star
} from 'lucide-react';

export interface QueryTemplate {
  id: string;
  name: string;
  query_text: string;
  category: string;
  subcategory: string;
  variables: Record<string, string>;
  description: string;
  expectedMentions?: string[];
  priority: number;
  icon: React.ReactNode;
}

export const QUERY_TEMPLATE_LIBRARY: QueryTemplate[] = [
  // RECOMMENDATION QUERIES
  {
    id: 'rec_general_best',
    name: 'General Best Apps',
    query_text: 'What are the best {specific_category} apps for {target_personas}?',
    category: 'recommendation',
    subcategory: 'general',
    variables: { specific_category: 'language learning', target_personas: 'business travelers' },
    description: 'Tests how the app ranks in general "best of" recommendations',
    priority: 1,
    icon: <Star className="h-4 w-4" />
  },
  {
    id: 'rec_persona_based',
    name: 'Persona-Based Recommendation',
    query_text: 'I\'m a {target_personas} looking for {specific_category} app for {authentic_use_cases}. What do you recommend?',
    category: 'recommendation',
    subcategory: 'persona',
    variables: { target_personas: 'busy professional', specific_category: 'language learning', authentic_use_cases: 'business travel preparation' },
    description: 'Tests recommendations based on specific user personas',
    priority: 1,
    icon: <Users className="h-4 w-4" />
  },
  {
    id: 'rec_specific_need',
    name: 'Specific Need',
    query_text: 'I need a {specific_category} app that can help me {authentic_use_cases}. What do you recommend?',
    category: 'recommendation',
    subcategory: 'specific',
    variables: { specific_category: 'language learning', authentic_use_cases: 'learn Spanish for business meetings' },
    description: 'Tests recommendations for specific use cases',
    priority: 1,
    icon: <Target className="h-4 w-4" />
  },
  {
    id: 'user_intent_goal_based',
    name: 'Goal-Based Query',
    query_text: 'What\'s the best app for {persona_goals}?',
    category: 'recommendation',
    subcategory: 'goals',
    variables: { persona_goals: 'learning Spanish for business travel' },
    description: 'Tests visibility for specific user goals',
    priority: 1,
    icon: <Target className="h-4 w-4" />
  },
  {
    id: 'rec_alternative',
    name: 'Alternative Requests',
    query_text: 'What are some good alternatives to {competitor_app} for {category}?',
    category: 'recommendation',
    subcategory: 'alternative',
    variables: { competitor_app: 'MyFitnessPal', category: 'fitness tracking' },
    description: 'Tests visibility when users seek alternatives',
    priority: 2,
    icon: <TrendingUp className="h-4 w-4" />
  },
  {
    id: 'rec_budget',
    name: 'Budget-Conscious',
    query_text: 'What are the best free {category} apps available?',
    category: 'recommendation',
    subcategory: 'budget',
    variables: { category: 'productivity' },
    description: 'Tests positioning in free/budget app recommendations',
    priority: 2,
    icon: <Zap className="h-4 w-4" />
  },

  // COMPARISON QUERIES
  {
    id: 'comp_direct',
    name: 'Direct Comparison',
    query_text: 'Compare {app_name} vs {competitor_1} vs {competitor_2} for {authentic_use_cases}',
    category: 'comparison',
    subcategory: 'direct',
    variables: { app_name: 'MyApp', competitor_1: 'Duolingo', competitor_2: 'Babbel', authentic_use_cases: 'learning Spanish for business' },
    description: 'Direct head-to-head comparisons',
    priority: 1,
    icon: <Target className="h-4 w-4" />
  },
  {
    id: 'comp_vs_competitor',
    name: 'Head-to-Head Comparison', 
    query_text: 'How does {app_name} compare to {competitor} for {authentic_use_cases}?',
    category: 'comparison',
    subcategory: 'versus',
    variables: { app_name: 'Pimsleur', competitor: 'Duolingo', authentic_use_cases: 'learning languages for travel' },
    description: 'Tests head-to-head positioning against competitors',
    priority: 1,
    icon: <TrendingUp className="h-4 w-4" />
  },
  {
    id: 'comp_better_than',
    name: 'Better Alternative Query',
    query_text: 'Is {app_name} better than {competitor} for {authentic_use_cases}?',
    category: 'comparison', 
    subcategory: 'better',
    variables: { app_name: 'Pimsleur', competitor: 'Babbel', authentic_use_cases: 'professional language learning' },
    description: 'Tests positioning as superior alternative',
    priority: 2,
    icon: <Star className="h-4 w-4" />
  },
  {
    id: 'comp_features',
    name: 'Feature Comparison',
    query_text: 'Which {category} app has the best {feature}?',
    category: 'comparison',
    subcategory: 'features',
    variables: { category: 'fitness', feature: 'workout tracking' },
    description: 'Tests feature-based positioning',
    priority: 2,
    icon: <Search className="h-4 w-4" />
  },

  // PROBLEM-SOLVING QUERIES
  {
    id: 'prob_solution',
    name: 'Problem Solution',
    query_text: 'I\'m having trouble with {pain_points_solved}. What app can help me solve this?',
    category: 'problem_solving',
    subcategory: 'solution',
    variables: { pain_points_solved: 'finding time to learn languages effectively' },
    description: 'Tests visibility for problem-solving scenarios',
    priority: 1,
    icon: <Lightbulb className="h-4 w-4" />
  },
  {
    id: 'prob_competitor_weakness',
    name: 'Competitor Weakness',
    query_text: 'I tried {competitor} but had issues with {pain_points_solved}. Any alternatives?',
    category: 'problem_solving',
    subcategory: 'alternative',
    variables: { competitor: 'Duolingo', pain_points_solved: 'too gamified approach for serious learning' },
    description: 'Tests positioning against competitor weaknesses',
    priority: 2,
    icon: <TrendingUp className="h-4 w-4" />
  },
  {
    id: 'prob_workflow',
    name: 'Workflow Optimization',
    query_text: 'How can I improve my {workflow} with mobile apps?',
    category: 'problem_solving',
    subcategory: 'workflow',
    variables: { workflow: 'daily productivity routine' },
    description: 'Tests recommendations for workflow improvements',
    priority: 2,
    icon: <TrendingUp className="h-4 w-4" />
  },

  // USER INTENT QUERIES
  {
    id: 'intent_beginner',
    name: 'Beginner-Friendly',
    query_text: 'I\'m new to {activity}. What {category} app is best for beginners?',
    category: 'user_intent',
    subcategory: 'beginner',
    variables: { activity: 'meditation', category: 'mindfulness' },
    description: 'Tests positioning for new users',
    priority: 2,
    icon: <Users className="h-4 w-4" />
  },
  {
    id: 'intent_advanced',
    name: 'Advanced Features',
    query_text: 'What {category} app has the most advanced features for {user_type}?',
    category: 'user_intent',
    subcategory: 'advanced',
    variables: { category: 'photo editing', user_type: 'professional photographers' },
    description: 'Tests visibility for advanced users',
    priority: 3,
    icon: <Star className="h-4 w-4" />
  },

  // CONVERSATIONAL QUERIES
  {
    id: 'conv_casual',
    name: 'Casual Mention',
    query_text: 'My friend mentioned {app_name}. Is it any good for {use_case}?',
    category: 'conversational',
    subcategory: 'validation',
    variables: { app_name: 'MyApp', use_case: 'fitness tracking' },
    description: 'Tests validation scenarios',
    priority: 3,
    icon: <MessageSquare className="h-4 w-4" />
  },
  {
    id: 'conv_social',
    name: 'Social Proof',
    query_text: 'What {category} app do most people use for {purpose}?',
    category: 'conversational',
    subcategory: 'social_proof',
    variables: { category: 'food delivery', purpose: 'ordering lunch' },
    description: 'Tests social proof positioning',
    priority: 2,
    icon: <Users className="h-4 w-4" />
  }
];

// Topic-specific query templates for the new topic analysis mode
export const TOPIC_QUERY_TEMPLATES = {
  // Service/Agency Recommendations
  service_recommendation: {
    name: "Service Recommendation",
    description: "Tests how the topic ranks in general service recommendations",
    priority: 1,
    templates: [
      "What are the best {topic} for {target_audience}?",
      "I need reliable {topic} for {specific_use_case}, any recommendations?",
      "Top {topic} that {target_audience} should consider in 2024?",
      "Which {topic} provide the best value for {target_audience}?"
    ]
  },

  // Comparison Analysis  
  comparison_analysis: {
    name: "Competitive Comparison",
    description: "Tests how key players compare in ChatGPT responses",
    priority: 1,
    templates: [
      "{player_1} vs {player_2} for {specific_need}",
      "Which is better: {player_1} or {player_2} for {target_audience}?",
      "Compare {player_1} and {player_2} for {use_case}",
      "{player_1} vs {player_2}: pros and cons for {target_audience}"
    ]
  },

  // Problem-Solving Queries
  problem_solving: {
    name: "Problem-Solving Context",
    description: "Tests mentions in problem-solving scenarios",
    priority: 2,
    templates: [
      "I'm struggling with {common_problem}, what {topic} can help?",
      "Need {topic} that excel at {specific_capability} for {target_audience}",
      "Looking for {topic} alternative to {popular_player} for {use_case}",
      "Best {topic} for {target_audience} who need {specific_outcome}?"
    ]
  },

  // Feature-Specific Queries
  feature_specific: {
    name: "Feature-Specific Analysis", 
    description: "Tests mentions for specific capabilities or features",
    priority: 2,
    templates: [
      "{topic} with {specific_feature} for {target_audience}",
      "Do any {topic} offer {specific_capability}?",
      "Best {topic} that specialize in {niche_area}",
      "{topic} with proven {outcome} for {target_audience}"
    ]
  },

  // Market Context Queries
  market_context: {
    name: "Market Context Analysis",
    description: "Tests mentions in broader market discussions", 
    priority: 3,
    templates: [
      "How is the {topic} market evolving for {target_audience}?",
      "What should {target_audience} look for when choosing {topic}?",
      "Current trends in {topic} for {industry} in 2024",
      "Future of {topic} for {target_audience}"
    ]
  }
};

interface QueryTemplateLibraryProps {
  onSelectTemplates: (templates: QueryTemplate[]) => void;
  selectedTemplates: string[];
  appContext?: {
    name: string;
    category?: string;
    targetAudience?: string;
  };
}

export const QueryTemplateLibrary: React.FC<QueryTemplateLibraryProps> = ({
  onSelectTemplates,
  selectedTemplates,
  appContext
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [customVariables, setCustomVariables] = useState<Record<string, Record<string, string>>>({});

  const categories = ['all', ...new Set(QUERY_TEMPLATE_LIBRARY.map(t => t.category))];
  
  const filteredTemplates = QUERY_TEMPLATE_LIBRARY.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleTemplateToggle = (template: QueryTemplate) => {
    const isSelected = selectedTemplates.includes(template.id);
    let newSelected: QueryTemplate[];
    
    if (isSelected) {
      newSelected = QUERY_TEMPLATE_LIBRARY.filter(t => 
        selectedTemplates.includes(t.id) && t.id !== template.id
      );
    } else {
      newSelected = [
        ...QUERY_TEMPLATE_LIBRARY.filter(t => selectedTemplates.includes(t.id)),
        template
      ];
    }
    
    onSelectTemplates(newSelected);
  };

  const handleVariableChange = (templateId: string, variableKey: string, value: string) => {
    setCustomVariables(prev => ({
      ...prev,
      [templateId]: {
        ...prev[templateId],
        [variableKey]: value
      }
    }));
  };

  const getTemplateVariables = (template: QueryTemplate) => {
    return {
      ...template.variables,
      ...customVariables[template.id]
    };
  };

  const renderTemplate = (template: QueryTemplate) => {
    const isSelected = selectedTemplates.includes(template.id);
    const variables = getTemplateVariables(template);

    return (
      <Card 
        key={template.id} 
        className={`bg-zinc-900/30 border transition-all duration-200 ${
          isSelected ? 'border-yodel-orange bg-yodel-orange/10' : 'border-zinc-800 hover:border-zinc-700'
        }`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => handleTemplateToggle(template)}
                  className="border-zinc-600"
                />
                {template.icon}
              </div>
              <div>
                <CardTitle className="text-sm font-medium text-foreground">
                  {template.name}
                </CardTitle>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {template.category}
                  </Badge>
                  <Badge variant="outline" className="text-xs text-zinc-400">
                    Priority {template.priority}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-zinc-400">{template.description}</p>
          
          <div className="space-y-2">
            <Label className="text-xs font-medium text-zinc-300">Query Template:</Label>
            <div className="p-3 bg-zinc-800/50 rounded-md border border-zinc-700">
              <code className="text-sm text-zinc-200">{template.query_text}</code>
            </div>
          </div>

          {Object.keys(template.variables).length > 0 && (
            <div className="space-y-3">
              <Label className="text-xs font-medium text-zinc-300">Variables:</Label>
              <div className="grid grid-cols-1 gap-2">
                {Object.entries(template.variables).map(([key, defaultValue]) => (
                  <div key={key} className="space-y-1">
                    <Label className="text-xs text-zinc-400">{key}:</Label>
                    <Input
                      placeholder={defaultValue}
                      value={variables[key] || defaultValue}
                      onChange={(e) => handleVariableChange(template.id, key, e.target.value)}
                      className="bg-zinc-800 border-zinc-700 text-foreground text-sm h-8"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {isSelected && (
            <div className="p-3 bg-green-900/20 border border-green-700/50 rounded-md">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs text-green-400 font-medium">Selected for audit</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Search and Filter Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-foreground">Search Templates</Label>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="Search by name or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-zinc-800 border-zinc-700 text-foreground"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-foreground">Category</Label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full p-2 bg-zinc-800 border border-zinc-700 rounded-md text-foreground"
          >
            {categories.map(category => (
              <option key={category} value={category}>
                {category === 'all' ? 'All Categories' : category.replace('_', ' ').toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Selected Count */}
      {selectedTemplates.length > 0 && (
        <div className="p-4 bg-yodel-orange/10 border border-yodel-orange/30 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-yodel-orange font-medium">
              {selectedTemplates.length} template{selectedTemplates.length !== 1 ? 's' : ''} selected
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSelectTemplates([])}
              className="text-zinc-400 border-zinc-600"
            >
              Clear All
            </Button>
          </div>
        </div>
      )}

      {/* Templates Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredTemplates.map(renderTemplate)}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <Search className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No templates found</h3>
          <p className="text-zinc-400">Try adjusting your search or filter criteria</p>
        </div>
      )}
    </div>
  );
};