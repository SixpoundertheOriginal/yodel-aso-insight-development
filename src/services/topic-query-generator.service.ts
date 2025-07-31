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

// NEW - Entity-specific query templates (only used when entityToTrack is provided)
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
    
    // If entity tracking is enabled, generate a mix of topic and entity queries
    if (topicData.entityToTrack) {
      // Generate 60% topic queries, 40% entity-specific queries
      const topicQueryCount = Math.ceil(count * 0.6);
      const entityQueryCount = count - topicQueryCount;
      
      // Generate topic queries (existing behavior)
      const shuffledTopicTemplates = [...TOPIC_QUERY_TEMPLATES].sort(() => Math.random() - 0.5);
      for (let i = 0; i < Math.min(topicQueryCount, shuffledTopicTemplates.length); i++) {
        const template = shuffledTopicTemplates[i];
        const query = this.fillTemplate(template, topicData);
        
        queries.push({
          id: crypto.randomUUID(),
          query_text: query,
          query_type: template.type,
          priority: template.priority,
          target_entity: topicData.topic
        });
      }
      
      // Generate entity-specific queries (NEW)
      const shuffledEntityTemplates = [...ENTITY_QUERY_TEMPLATES].sort(() => Math.random() - 0.5);
      for (let i = 0; i < Math.min(entityQueryCount, shuffledEntityTemplates.length); i++) {
        const template = shuffledEntityTemplates[i];
        const query = this.fillEntityTemplate(template, topicData);
        
        queries.push({
          id: crypto.randomUUID(),
          query_text: query,
          query_type: template.type,
          priority: template.priority,
          target_entity: topicData.entityToTrack || topicData.topic
        });
      }
    } else {
      // Original behavior for topic-only queries
      const shuffledTemplates = [...TOPIC_QUERY_TEMPLATES].sort(() => Math.random() - 0.5);
      
      for (let i = 0; i < Math.min(count, shuffledTemplates.length); i++) {
        const template = shuffledTemplates[i];
        const query = this.fillTemplate(template, topicData);
        
        queries.push({
          id: crypto.randomUUID(),
          query_text: query,
          query_type: template.type,
          priority: template.priority,
          target_entity: topicData.topic
        });
      }
      
      // If we need more queries, add variations
      if (count > TOPIC_QUERY_TEMPLATES.length) {
        const additionalQueries = this.generateVariations(topicData, count - TOPIC_QUERY_TEMPLATES.length);
        queries.push(...additionalQueries);
      }
    }
    
    return queries.sort((a, b) => a.priority - b.priority);
  }
  
  private static fillTemplate(template: TopicQueryTemplate, topicData: TopicAuditData): string {
    let query = template.template;
    
    // Replace placeholders with actual data
    query = query.replace(/{topic}/g, topicData.topic);
    query = query.replace(/{target_audience}/g, topicData.target_audience);
    query = query.replace(/{target_audience_context}/g, this.getContextualAudience(topicData.target_audience));
    
    return query;
  }
  
  // NEW - Fill entity-specific templates
  private static fillEntityTemplate(template: TopicQueryTemplate, topicData: TopicAuditData): string {
    let query = template.template;
    
    // Replace placeholders with actual data
    query = query.replace(/{entity}/g, topicData.entityToTrack || '');
    query = query.replace(/{topic}/g, topicData.topic);
    query = query.replace(/{topic_category}/g, this.getTopicCategory(topicData.topic));
    query = query.replace(/{target_audience}/g, topicData.target_audience);
    
    return query;
  }
  
  // NEW - Convert topic to category for entity queries
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