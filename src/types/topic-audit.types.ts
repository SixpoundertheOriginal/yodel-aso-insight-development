export interface TopicAuditData {
  topic: string;
  industry: string;
  target_audience: string;
  context_description?: string;
  known_players: string[];
  geographic_focus?: string;
}

export interface TopicIntelligence {
  refined_topic: string;
  target_personas: Array<{
    name: string;
    demographics: string;
    search_intent: string[];
  }>;
  key_players: string[];
  search_contexts: string[];
  query_variations: string[];
  competitive_landscape: Array<{
    category: string;
    players: string[];
  }>;
}

export interface GeneratedTopicQuery {
  id: string;
  query_text: string;
  query_type: 'comparison' | 'recommendation' | 'problem_solving' | 'conversational';
  priority: number;
  target_entity: string;
  personas?: string[];
}

export type AuditMode = 'app' | 'topic';

export interface TopicVisibilityAnalysis {
  entity_mentioned: boolean;
  mention_count: number;
  mention_position?: number;
  competitors_mentioned: string[];
  visibility_score: number;
  analysis_type: 'topic';
}