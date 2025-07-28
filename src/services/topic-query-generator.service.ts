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

export class TopicQueryGeneratorService {
  static generateQueries(topicData: TopicAuditData, count: number = 10): GeneratedTopicQuery[] {
    const queries: GeneratedTopicQuery[] = [];
    
    // Use templates to generate queries
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