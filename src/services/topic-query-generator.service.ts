import { TopicAuditData, GeneratedTopicQuery } from '@/types/topic-audit.types';

export interface TopicQueryTemplate {
  template: string;
  type: 'comparison' | 'recommendation' | 'problem_solving' | 'conversational';
  priority: number;
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

export class TopicQueryGeneratorService {
  static generateQueries(topicData: TopicAuditData, count: number = 10): GeneratedTopicQuery[] {
    const queries: GeneratedTopicQuery[] = [];
    
    // Generate context-aware queries using industry category and target audience
    const contextualQueries = this.generateContextualQueries(topicData, count);
    queries.push(...contextualQueries);
    
    // Fill remaining slots with variations if needed
    if (queries.length < count) {
      const additionalQueries = this.generateVariations(topicData, count - queries.length);
      queries.push(...additionalQueries);
    }
    
    return queries.slice(0, count);
  }

  private static generateContextualQueries(topicData: TopicAuditData, count: number): GeneratedTopicQuery[] {
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
        target_entity: topicData.topic
      });
    }
    
    return variations;
  }
}