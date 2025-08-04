import { TopicAuditData, GeneratedTopicQuery } from '@/types/topic-audit.types';

export interface TopicQueryTemplate {
  template: string;
  type: 'comparison' | 'recommendation' | 'problem_solving' | 'conversational' | 'high_intent' | 'medium_intent' | 'low_intent';
  priority: number;
  intentLevel?: 'high' | 'medium' | 'low';
  purchaseIntent?: boolean;
}

const TOPIC_QUERY_TEMPLATES: TopicQueryTemplate[] = [
  {
    template: "What are the best {topic} for {target_audience}?",
    type: "recommendation",
    priority: 1
  },
  {
    template: "I need help choosing {topic} for my {target_audience_context}. What do you recommend?",
    type: "recommendation", 
    priority: 1
  },
  {
    template: "Compare the top {topic} available right now",
    type: "comparison",
    priority: 2
  },
  {
    template: "What {topic} should I use for {target_audience}?",
    type: "recommendation",
    priority: 1
  },
  {
    template: "I'm looking for {topic} that work well for {target_audience}. Any suggestions?",
    type: "conversational",
    priority: 2
  },
  {
    template: "Which {topic} are most popular among {target_audience}?",
    type: "recommendation",
    priority: 2
  },
  {
    template: "Help me find the right {topic} for {target_audience}",
    type: "problem_solving",
    priority: 2
  },
  {
    template: "What are some alternatives to popular {topic}?",
    type: "comparison",
    priority: 3
  },
  {
    template: "I'm having trouble choosing between different {topic}. What should I consider?",
    type: "problem_solving",
    priority: 3
  },
  {
    template: "Can you recommend {topic} that are suitable for {target_audience}?",
    type: "recommendation",
    priority: 1
  }
];

// Entity-specific query templates (only used when entityToTrack is provided)
const ENTITY_QUERY_TEMPLATES: TopicQueryTemplate[] = [
  {
    template: "What do you think about {entity}?",
    type: "conversational",
    priority: 1
  },
  {
    template: "Is {entity} good for {topic_category}?",
    type: "recommendation",
    priority: 1
  },
  {
    template: "{entity} vs competitors",
    type: "comparison",
    priority: 2
  },
  {
    template: "Alternatives to {entity}",
    type: "comparison",
    priority: 2
  },
  {
    template: "Should I use {entity} or something else for {topic_category}?",
    type: "conversational",
    priority: 1
  },
  {
    template: "How does {entity} compare to other {topic}?",
    type: "comparison",
    priority: 2
  },
  {
    template: "What are the pros and cons of {entity}?",
    type: "problem_solving",
    priority: 2
  }
];

// Intent-based query templates for competitive discovery
const INTENT_BASED_TEMPLATES: TopicQueryTemplate[] = [
  // High-Intent Queries (Direct Product Discovery)
  {
    template: "Best {topic} for {target_audience}",
    type: "high_intent",
    priority: 1,
    intentLevel: "high",
    purchaseIntent: true
  },
  {
    template: "Top {topic} with proven ROI",
    type: "high_intent", 
    priority: 1,
    intentLevel: "high",
    purchaseIntent: true
  },
  {
    template: "Which {topic} should I hire for {target_audience}?",
    type: "high_intent",
    priority: 1,
    intentLevel: "high",
    purchaseIntent: true
  },
  {
    template: "{topic} pricing and services comparison",
    type: "high_intent",
    priority: 1,
    intentLevel: "high",
    purchaseIntent: true
  },
  
  // Medium-Intent Queries (Solution Comparison)
  {
    template: "{topic} vs in-house team",
    type: "medium_intent",
    priority: 2,
    intentLevel: "medium",
    purchaseIntent: true
  },
  {
    template: "Compare {topic} platforms",
    type: "medium_intent",
    priority: 2,
    intentLevel: "medium",
    purchaseIntent: true
  },
  {
    template: "Pros and cons of hiring {topic}",
    type: "medium_intent",
    priority: 2,
    intentLevel: "medium",
    purchaseIntent: true
  },
  
  // Low-Intent Queries (Problem/Solution Exploration)
  {
    template: "How to improve {context_problem}",
    type: "low_intent",
    priority: 3,
    intentLevel: "low",
    purchaseIntent: false
  },
  {
    template: "{industry} strategies for {target_audience}",
    type: "low_intent",
    priority: 3,
    intentLevel: "low",
    purchaseIntent: false
  },
  {
    template: "Best practices for {topic_category}",
    type: "low_intent",
    priority: 3,
    intentLevel: "low",
    purchaseIntent: false
  }
];

// Client scenario templates for realistic customer journeys
const CLIENT_SCENARIO_TEMPLATES: TopicQueryTemplate[] = [
  {
    template: "Need {topic} for {client_scenario} - recommendations?",
    type: "high_intent",
    priority: 1,
    intentLevel: "high",
    purchaseIntent: true
  },
  {
    template: "Looking for {topic} agency to handle {service_need}",
    type: "high_intent",
    priority: 1,
    intentLevel: "high", 
    purchaseIntent: true
  },
  {
    template: "Who provides {service_type} for {target_clients}?",
    type: "medium_intent",
    priority: 2,
    intentLevel: "medium",
    purchaseIntent: true
  },
  {
    template: "Help with {pain_point} for {target_audience}",
    type: "medium_intent",
    priority: 2,
    intentLevel: "medium",
    purchaseIntent: true
  }
];

export class TopicQueryGeneratorService {
  static generateQueries(topicData: TopicAuditData, count: number = 10): GeneratedTopicQuery[] {
    const queries: GeneratedTopicQuery[] = [];
    
    // Determine query strategy
    const strategy = topicData.queryStrategy || 'mixed';
    const intentLevel = topicData.intentLevel || 'medium';
    
    // Generate intent-driven queries based on strategy
    if (strategy === 'competitive_discovery' || strategy === 'mixed') {
      const intentQueries = this.generateIntentDrivenQueries(topicData, Math.ceil(count * 0.5));
      queries.push(...intentQueries);
    }
    
    // Enhanced query generation with entity intelligence
    if (topicData.entityIntelligence) {
      const remaining = count - queries.length;
      const intelligenceQueries = this.generateIntelligenceBasedQueries(topicData, Math.ceil(remaining * 0.6));
      queries.push(...intelligenceQueries);
    }
    
    // Generate context-aware queries using industry category and target audience
    const remaining = count - queries.length;
    if (remaining > 0) {
      const contextualQueries = this.generateUserContextQueries(topicData, remaining);
      queries.push(...contextualQueries);
    }
    
    // Fill remaining slots with variations if needed
    if (queries.length < count) {
      const additionalQueries = this.generateVariations(topicData, count - queries.length);
      queries.push(...additionalQueries);
    }
    
    return queries.slice(0, count);
  }

  private static generateUserContextQueries(topicData: TopicAuditData, count: number): GeneratedTopicQuery[] {
    const queries: GeneratedTopicQuery[] = [];
    
    // Base queries with target audience context
    const baseQueries = [
      `Best ${topicData.topic}`,
      `Top ${topicData.topic} for ${topicData.target_audience}`,
      `${topicData.topic} recommendations ${new Date().getFullYear()}`
    ];
    
    // Industry-specific queries
    const industryQueries = [
      `${topicData.industry} tools for ${topicData.target_audience}`,
      `Best ${topicData.industry} platforms`,
      `${topicData.topic} for ${topicData.target_audience} comparison`
    ];
    
    // Client-discovery queries (realistic client scenarios)
    const discoveryQueries = [
      `Best ${topicData.topic} for ${topicData.target_audience}`,
      `Top ${topicData.topic} recommendations ${new Date().getFullYear()}`, 
      `${topicData.industry} providers for ${topicData.target_audience}`,
      `Leading ${topicData.topic} with proven results`,
      `${topicData.topic} comparison for ${topicData.target_audience}`,
      `Recommended ${topicData.topic} platforms`
    ];
    
    // Context-specific queries (if additional context provided)
    const contextQueries = topicData.context_description ? [
      `${topicData.topic} ${topicData.context_description}`,
      `Best ${topicData.industry} ${topicData.context_description}`
    ] : [];
    
    // Known players queries
    const knownPlayersQueries = topicData.known_players.length > 0 ? [
      `${topicData.known_players.slice(0, 3).join(' vs ')} comparison`,
      `${topicData.topic} ${topicData.known_players[0]} vs alternatives`
    ] : [];
    
    // Combine all query types
    const allQueries = [...baseQueries, ...industryQueries, ...discoveryQueries, ...contextQueries, ...knownPlayersQueries];
    
    // Convert to GeneratedTopicQuery objects with priorities
    allQueries.forEach((queryText, index) => {
      const priority = this.calculateQueryPriority(queryText, topicData);
      const type = this.determineQueryType(queryText);
      
      queries.push({
        id: crypto.randomUUID(),
        query_text: queryText,
        query_type: type,
        priority,
        target_entity: topicData.entityToTrack || topicData.topic
      });
    });
    
    // Sort by priority and return top queries
    return queries.sort((a, b) => b.priority - a.priority).slice(0, Math.min(count, queries.length));
  }

  private static calculateQueryPriority(queryText: string, topicData: TopicAuditData): number {
    let priority = 3; // Base priority
    
    // Higher priority for entity-specific queries
    if (topicData.entityToTrack && queryText.includes(topicData.entityToTrack)) {
      priority = 1;
    }
    
    // Higher priority for target audience specific queries
    if (queryText.includes(topicData.target_audience)) {
      priority = Math.min(priority, 2);
    }
    
    // Higher priority for industry-specific queries
    if (queryText.includes(topicData.industry)) {
      priority = Math.min(priority, 2);
    }
    
    return priority;
  }

  private static generateIntentDrivenQueries(topicData: TopicAuditData, count: number): GeneratedTopicQuery[] {
    const queries: GeneratedTopicQuery[] = [];
    const intentLevel = topicData.intentLevel || 'medium';
    
    // Filter templates by intent level and competitor focus
    let relevantTemplates = INTENT_BASED_TEMPLATES;
    if (topicData.competitorFocus) {
      relevantTemplates = relevantTemplates.filter(t => t.purchaseIntent);
    }
    
    // Generate client scenario queries
    const scenarioQueries = this.generateClientScenarioQueries(topicData, Math.ceil(count * 0.4));
    queries.push(...scenarioQueries);
    
    // Generate template-based intent queries
    const templateQueries = this.generateFromIntentTemplates(topicData, count - queries.length, relevantTemplates);
    queries.push(...templateQueries);
    
    return queries.slice(0, count);
  }

  private static generateClientScenarioQueries(topicData: TopicAuditData, count: number): GeneratedTopicQuery[] {
    const queries: GeneratedTopicQuery[] = [];
    const intelligence = topicData.entityIntelligence;
    
    if (!intelligence) return queries;
    
    // Create realistic client scenarios
    const scenarios = [
      `${topicData.target_audience} struggling with low app downloads`,
      `startup needing help with app store visibility`,
      `${topicData.target_audience} wanting to improve app rankings`,
      `company looking to boost app user acquisition`,
      `${topicData.target_audience} seeking ASO expertise`
    ];
    
    scenarios.slice(0, count).forEach((scenario, index) => {
      const queryText = `Need ${topicData.topic} for ${scenario}`;
      queries.push({
        id: crypto.randomUUID(),
        query_text: queryText,
        query_type: 'high_intent',
        priority: 1,
        target_entity: topicData.entityToTrack,
        client_scenario: scenario,
        purchase_intent: 'high',
        search_intent: 'immediate_need',
        source: 'intent_based'
      });
    });
    
    return queries;
  }

  private static generateFromIntentTemplates(topicData: TopicAuditData, count: number, templates: TopicQueryTemplate[]): GeneratedTopicQuery[] {
    const queries: GeneratedTopicQuery[] = [];
    
    templates.slice(0, count).forEach(template => {
      const queryText = this.fillIntentTemplate(template, topicData);
      queries.push({
        id: crypto.randomUUID(),
        query_text: queryText,
        query_type: template.type as any,
        priority: template.priority,
        target_entity: topicData.entityToTrack,
        purchase_intent: template.purchaseIntent ? 'high' : 'low',
        search_intent: template.purchaseIntent ? 'purchase_intent' : 'research',
        source: 'intent_based'
      });
    });
    
    return queries;
  }

  private static fillIntentTemplate(template: TopicQueryTemplate, topicData: TopicAuditData): string {
    let query = template.template;
    
    // Replace placeholders
    query = query.replace(/{topic}/g, topicData.topic);
    query = query.replace(/{target_audience}/g, topicData.target_audience);
    query = query.replace(/{industry}/g, topicData.industry);
    query = query.replace(/{context_problem}/g, this.getContextProblem(topicData));
    query = query.replace(/{topic_category}/g, this.getTopicCategory(topicData.topic));
    query = query.replace(/{client_scenario}/g, this.getClientScenario(topicData));
    query = query.replace(/{service_need}/g, this.getServiceNeed(topicData));
    query = query.replace(/{service_type}/g, this.getServiceType(topicData));
    query = query.replace(/{target_clients}/g, topicData.entityIntelligence?.targetClients?.[0] || topicData.target_audience);
    query = query.replace(/{pain_point}/g, this.getPainPoint(topicData));
    
    return query;
  }

  private static getContextProblem(topicData: TopicAuditData): string {
    const problems = {
      'marketing': 'app downloads and user acquisition',
      'technology': 'app performance and visibility',
      'mobile': 'app store rankings and optimization',
      'advertising': 'user acquisition costs and ROI'
    };
    return problems[topicData.industry.toLowerCase()] || 'business growth and efficiency';
  }

  private static getClientScenario(topicData: TopicAuditData): string {
    return `${topicData.target_audience} needing ${topicData.industry} expertise`;
  }

  private static getServiceNeed(topicData: TopicAuditData): string {
    return topicData.entityIntelligence?.services?.[0] || `${topicData.industry} services`;
  }

  private static getServiceType(topicData: TopicAuditData): string {
    return topicData.entityIntelligence?.services?.join(' and ') || topicData.topic;
  }

  private static getPainPoint(topicData: TopicAuditData): string {
    const painPoints = {
      'marketing': 'low conversion rates',
      'mobile': 'poor app visibility',
      'technology': 'scaling challenges',
      'advertising': 'high acquisition costs'
    };
    return painPoints[topicData.industry.toLowerCase()] || 'operational challenges';
  }

  private static determineQueryType(queryText: string): 'comparison' | 'recommendation' | 'problem_solving' | 'conversational' {
    const lowerText = queryText.toLowerCase();
    
    if (lowerText.includes('vs') || lowerText.includes('comparison') || lowerText.includes('compare')) {
      return 'comparison';
    }
    
    if (lowerText.includes('best') || lowerText.includes('top') || lowerText.includes('recommend')) {
      return 'recommendation';
    }
    
    if (lowerText.includes('help') || lowerText.includes('choose') || lowerText.includes('should')) {
      return 'problem_solving';
    }
    
    return 'conversational';
  }

  private static classifyQueryByIntent(queryText: string): 'high' | 'medium' | 'low' {
    const lowerText = queryText.toLowerCase();
    
    // High intent indicators
    const highIntentKeywords = ['hire', 'pricing', 'cost', 'buy', 'purchase', 'need', 'looking for', 'which should i'];
    if (highIntentKeywords.some(keyword => lowerText.includes(keyword))) {
      return 'high';
    }
    
    // Medium intent indicators  
    const mediumIntentKeywords = ['compare', 'vs', 'pros and cons', 'alternatives', 'review'];
    if (mediumIntentKeywords.some(keyword => lowerText.includes(keyword))) {
      return 'medium';
    }
    
    // Low intent (research/educational)
    return 'low';
  }
  
  private static fillTemplate(template: TopicQueryTemplate, topicData: TopicAuditData): string {
    let query = template.template;
    
    // Replace placeholders with actual data
    query = query.replace(/{topic}/g, topicData.topic);
    query = query.replace(/{target_audience}/g, topicData.target_audience);
    query = query.replace(/{target_audience_context}/g, this.getContextualAudience(topicData.target_audience));
    
    return query;
  }
  
  // Fill entity-specific templates
  private static fillEntityTemplate(template: TopicQueryTemplate, topicData: TopicAuditData): string {
    let query = template.template;
    
    // Replace placeholders with actual data
    query = query.replace(/{entity}/g, topicData.entityToTrack || '');
    query = query.replace(/{topic}/g, topicData.topic);
    query = query.replace(/{topic_category}/g, this.getTopicCategory(topicData.topic));
    query = query.replace(/{target_audience}/g, topicData.target_audience);
    
    return query;
  }
  
  // Convert topic to category for entity queries
  private static getTopicCategory(topic: string): string {
    // Convert "marketing agencies" -> "marketing"
    // Convert "productivity tools" -> "productivity" 
    const categoryMap: Record<string, string> = {
      'marketing agencies': 'marketing',
      'productivity tools': 'productivity',
      'language learning platforms': 'language learning',
      'project management tools': 'project management',
      'email marketing services': 'email marketing',
      'accounting software': 'accounting',
    };
    
    return categoryMap[topic.toLowerCase()] || topic.replace(/\s+(tools|services|platforms|agencies|software)$/i, '');
  }
  
  private static getContextualAudience(audience: string): string {
    // Convert audience to more contextual forms
    const contextMap: Record<string, string> = {
      'small businesses': 'small business',
      'enterprise companies': 'enterprise',
      'individual consumers': 'personal use',
      'developers': 'development work',
      'marketers': 'marketing team',
      'students': 'studies',
      'professionals': 'professional work'
    };
    
    return contextMap[audience.toLowerCase()] || audience;
  }
  
  private static generateIntelligenceBasedQueries(topicData: TopicAuditData, count: number): GeneratedTopicQuery[] {
    const queries: GeneratedTopicQuery[] = [];
    const intelligence = topicData.entityIntelligence!;
    
    // Service-specific client search queries
    intelligence.services.forEach(service => {
      // How real clients would search for these services
      queries.push({
        id: crypto.randomUUID(),
        query_text: `${service} agency for ${topicData.target_audience}`,
        query_type: 'recommendation',
        priority: 1,
        target_entity: topicData.entityToTrack
      });
      
      queries.push({
        id: crypto.randomUUID(),
        query_text: `Best ${service} company`,
        query_type: 'recommendation',
        priority: 1,
        target_entity: topicData.entityToTrack
      });

      queries.push({
        id: crypto.randomUUID(),
        query_text: `${service} services for mobile apps`,
        query_type: 'recommendation',
        priority: 1,
        target_entity: topicData.entityToTrack
      });

      queries.push({
        id: crypto.randomUUID(),
        query_text: `Who does ${service} for ${topicData.target_audience}?`,
        query_type: 'conversational',
        priority: 1,
        target_entity: topicData.entityToTrack
      });
    });

    // Client pain point queries based on services
    intelligence.services.forEach(service => {
      const painPointQueries = [
        `Need help with ${service} for my app`,
        `${service} consultant recommendations`,
        `Outsource ${service} to agency`,
        `${service} expert for ${topicData.target_audience}`
      ];

      painPointQueries.forEach(queryText => {
        queries.push({
          id: crypto.randomUUID(),
          query_text: queryText,
          query_type: 'problem_solving',
          priority: 1,
          target_entity: topicData.entityToTrack
        });
      });
    });

    // Target client realistic scenarios
    intelligence.targetClients.forEach(clientType => {
      queries.push({
        id: crypto.randomUUID(),
        query_text: `${topicData.topic} specialized for ${clientType}`,
        query_type: 'recommendation',
        priority: 1,
        target_entity: topicData.entityToTrack
      });

      queries.push({
        id: crypto.randomUUID(),
        query_text: `${clientType} app marketing solutions`,
        query_type: 'recommendation',
        priority: 1,
        target_entity: topicData.entityToTrack
      });
    });

    // Competitive landscape queries
    intelligence.competitors.slice(0, 3).forEach(competitor => {
      queries.push({
        id: crypto.randomUUID(),
        query_text: `${competitor} alternatives`,
        query_type: 'comparison',
        priority: 2,
        target_entity: topicData.entityToTrack
      });
      
      queries.push({
        id: crypto.randomUUID(),
        query_text: `${topicData.entityToTrack} vs ${competitor} comparison`,
        query_type: 'comparison',
        priority: 1,
        target_entity: topicData.entityToTrack
      });
    });

    // Industry focus based queries
    intelligence.industryFocus.forEach(industry => {
      queries.push({
        id: crypto.randomUUID(),
        query_text: `${industry} app marketing agency`,
        query_type: 'recommendation',
        priority: 1,
        target_entity: topicData.entityToTrack
      });

      queries.push({
        id: crypto.randomUUID(),
        query_text: `Best ${topicData.topic} for ${industry} companies`,
        query_type: 'recommendation',
        priority: 1,
        target_entity: topicData.entityToTrack
      });
    });

    // Market position enhanced queries
    const positionQueries = [
      `Top performing ${topicData.topic}`,
      `Leading ${intelligence.marketPosition} ${topicData.topic}`,
      `Most recommended ${topicData.topic} agencies`,
      `Proven ${topicData.topic} with results`,
      `Enterprise ${topicData.topic} providers`
    ];
    
    positionQueries.forEach(queryText => {
      queries.push({
        id: crypto.randomUUID(),
        query_text: queryText,
        query_type: 'recommendation',
        priority: 2,
        target_entity: topicData.entityToTrack
      });
    });

    // Shuffle and return top queries prioritizing entity-specific ones
    const shuffled = queries
      .sort((a, b) => a.priority - b.priority)
      .sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  private static generateVariations(topicData: TopicAuditData, count: number): GeneratedTopicQuery[] {
    const variations: GeneratedTopicQuery[] = [];
    const baseQueries = [
      `What ${topicData.topic} do you recommend?`,
      `I'm looking for good ${topicData.topic}`,
      `Help me choose ${topicData.topic}`,
      `Best ${topicData.topic} for ${topicData.target_audience}?`,
      `Compare different ${topicData.topic}`
    ];
    
    for (let i = 0; i < count && i < baseQueries.length; i++) {
      variations.push({
        id: crypto.randomUUID(),
        query_text: baseQueries[i],
        query_type: 'recommendation',
        priority: 4,
        target_entity: topicData.entityToTrack
      });
    }
    
    return variations;
  }
}