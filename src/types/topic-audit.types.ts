export interface TopicAuditData {
  topic: string;
  industry: string;
  target_audience: string;
  context_description?: string;
  known_players: string[];
  geographic_focus?: string;
  
  // Entity tracking - REQUIRED for analysis
  entityToTrack: string; // e.g., "Ogilvy", "HubSpot", "Instagram"
  entityAliases?: string[]; // e.g., ["Ogilvy & Mather", "Ogilvy Agency"]
  
  // Intent-driven query configuration
  queryStrategy?: 'competitive_discovery' | 'market_research' | 'mixed';
  competitorFocus?: boolean;
  intentLevel?: 'high' | 'medium' | 'low';
  
  // Strategic enhancement fields
  solutionsOffered?: string[]; // Auto-populated from entity.services
  keyFeatures?: string[]; // App-specific: distinctive features for query generation
  analysisDepth?: 'standard' | 'comprehensive' | 'deep'; // Controls query count (20/50/100)
  industrySubVertical?: string; // Precision targeting field
  
  // Entity Intelligence Data (populated automatically)
  entityIntelligence?: EntityIntelligence;
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
  query_type: 'comparison' | 'recommendation' | 'problem_solving' | 'conversational' | 'research' | 'service_specific' | 'industry_specific' | 'high_intent' | 'medium_intent' | 'low_intent';
  priority: number;
  target_entity: string;
  personas?: string[];
  reasoning?: string;
  persona?: string;
  search_intent?: 'immediate_need' | 'research' | 'comparison' | 'education' | 'purchase_intent';
  purchase_intent?: 'high' | 'medium' | 'low';
  client_scenario?: string;
  source?: 'openai_enhanced' | 'template' | 'intent_based' | 'solution_based' | 'universal_enhanced' | 'foundation' | 'app_enhanced';
}

export type AuditMode = 'app' | 'topic';

export interface TopicVisibilityAnalysis {
  entity_mentioned: boolean;
  mention_count: number;
  mention_position?: number;
  competitors_mentioned: string[];
  visibility_score: number;
  analysis_type: 'topic';
  
  // NEW - Entity-specific analysis
  entityAnalysis?: EntityAnalysis;
}

export interface EntityAnalysis {
  entityMentioned: boolean;
  mentionCount: number;
  mentionContexts: string[]; // Sentences where entity was mentioned
  entityPosition?: number; // Position in recommendation list (if applicable)
  sentiment: 'positive' | 'neutral' | 'negative';
}

export interface EntityIntelligence {
  entityName: string;
  description: string;
  services: string[];
  targetClients: string[];
  competitors: string[];
  marketPosition: string;
  industryFocus: string[];
  confidenceScore?: number;
  target_personas?: any[];
  pain_points_solved?: string[];
  scrapedAt?: string;
}