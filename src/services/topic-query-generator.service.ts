import { TopicAuditData, GeneratedTopicQuery } from '@/types/topic-audit.types';

export interface TopicQueryTemplate {
  template: string;
  type: 'comparison' | 'recommendation' | 'problem_solving' | 'conversational' | 'high_intent' | 'medium_intent' | 'low_intent';
  priority: number;
  intentLevel?: 'high' | 'medium' | 'low';
  purchaseIntent?: boolean;
}

// Foundation Templates for High-Volume Discovery Queries (Priority 1)
const FOUNDATION_TEMPLATES: TopicQueryTemplate[] = [
  {
    template: "Best {primary_solution} {entity_type}",
    type: "high_intent",
    priority: 1,
    intentLevel: "high",
    purchaseIntent: true
  },
  {
    template: "Top {primary_solution} {entity_type}",
    type: "high_intent",
    priority: 1,
    intentLevel: "high", 
    purchaseIntent: true
  },
  {
    template: "Leading {primary_solution} {entity_type}",
    type: "high_intent",
    priority: 1,
    intentLevel: "high",
    purchaseIntent: true
  },
  {
    template: "Best {entity_type} for {primary_solution}",
    type: "high_intent",
    priority: 1,
    intentLevel: "high",
    purchaseIntent: true
  },
  {
    template: "Top {entity_type} for {primary_solution}",
    type: "high_intent",
    priority: 1,
    intentLevel: "high",
    purchaseIntent: true
  },
  {
    template: "Best {primary_solution} {entity_type} for {refined_audience}",
    type: "high_intent",
    priority: 1,
    intentLevel: "high",
    purchaseIntent: true
  }
];

// Universal Enhanced Templates (work for agencies, apps, platforms, tools)
const UNIVERSAL_ENHANCED_TEMPLATES: TopicQueryTemplate[] = [
  // High-Intent Hiring/Selection Patterns (Universal)
  {
    template: "Need {topic} for {pain_point}",
    type: "high_intent",
    priority: 2,
    intentLevel: "high",
    purchaseIntent: true
  },
  {
    template: "Looking to {action_verb} {topic} for {business_goal}",
    type: "high_intent",
    priority: 1,
    intentLevel: "high", 
    purchaseIntent: true
  },
  {
    template: "Which {topic} should I choose for {specific_context}?",
    type: "high_intent",
    priority: 1,
    intentLevel: "high",
    purchaseIntent: true
  },
  {
    template: "Best {topic} for {specific_need}",
    type: "high_intent",
    priority: 1,
    intentLevel: "high",
    purchaseIntent: true
  },
  {
    template: "{topic} recommendations for {refined_audience}",
    type: "high_intent",
    priority: 1,
    intentLevel: "high",
    purchaseIntent: true
  },
  
  // Comparison Intent (Universal)
  {
    template: "{competitor_a} vs {competitor_b} for {use_case}",
    type: "comparison",
    priority: 2,
    intentLevel: "medium",
    purchaseIntent: true
  },
  {
    template: "How to choose the right {topic}",
    type: "comparison", 
    priority: 2,
    intentLevel: "medium",
    purchaseIntent: true
  },
  {
    template: "Compare top {topic} options",
    type: "comparison",
    priority: 2,
    intentLevel: "medium",
    purchaseIntent: true
  },
  
  // Urgent Need Intent (Universal)  
  {
    template: "Need {topic} ASAP for {deadline_context}",
    type: "high_intent",
    priority: 1,
    intentLevel: "high",
    purchaseIntent: true
  },
  {
    template: "Quick {topic} recommendations",
    type: "high_intent", 
    priority: 1,
    intentLevel: "high",
    purchaseIntent: true
  },
  {
    template: "Immediate {topic} needed for {project_type}",
    type: "high_intent",
    priority: 1,
    intentLevel: "high", 
    purchaseIntent: true
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

  // Intent-based query templates for competitive discovery (Enhanced)
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
  // Geographic-specific templates
  {
    template: "Best {topic} in {geographic_focus}",
    type: "high_intent",
    priority: 1,
    intentLevel: "high",
    purchaseIntent: true
  },
  {
    template: "Top-rated {topic} near me",
    type: "high_intent",
    priority: 1,
    intentLevel: "high",
    purchaseIntent: true
  },
  // Industry-specific templates
  {
    template: "Best {topic} for {industry_subvertical}",
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
    
    // Apply universal enhancements FIRST
    const enhancedTopicData = this.applyUniversalEnhancements(topicData);
    
    // Use analysis depth to determine actual query count
    const targetCount = this.getQueryCountFromDepth(enhancedTopicData.analysisDepth || 'standard', count);
    
    // Determine query strategy
    const strategy = enhancedTopicData.queryStrategy || 'mixed';
    const intentLevel = enhancedTopicData.intentLevel || 'medium';
    
    // Priority 1: Generate foundation templates (30% of queries)
    const foundationQueries = this.generateFoundationQueries(enhancedTopicData, Math.ceil(targetCount * 0.3));
    queries.push(...foundationQueries);
    
    // Priority 2: Generate enhanced universal queries (40% of queries)
    const universalQueries = this.generateUniversalQueries(enhancedTopicData, Math.ceil(targetCount * 0.4));
    queries.push(...universalQueries);
    
    // Fill remaining slots with fallback queries if needed
    if (queries.length < targetCount) {
      const remaining = targetCount - queries.length;
      const fallbackQueries = this.generateUserContextQueries(enhancedTopicData, remaining);
      queries.push(...fallbackQueries);
    }
    
    return queries.slice(0, targetCount);
  }

  // Universal enhancements - Step 1: Apply smart fixes
  private static applyUniversalEnhancements(topicData: TopicAuditData): TopicAuditData {
    return {
      ...topicData,
      target_audience: this.refineAudience(topicData.topic, topicData.target_audience),
      solutionsOffered: this.cleanSolutions(topicData.solutionsOffered || [])
    };
  }

  // Step 2: Smart audience detection (Universal)
  private static refineAudience(topic: string, originalAudience: string): string {
    if (originalAudience === 'consumers') {
      if (topic.includes('agency') || topic.includes('consultant') || topic.includes('specialist')) {
        return 'business owners';
      }
      if (topic.includes('fitness') || topic.includes('health')) {
        return 'health-conscious individuals';
      }
      if (topic.includes('language') || topic.includes('learning')) {
        return 'language learners';
      }
      if (topic.includes('mobile') || topic.includes('app')) {
        return 'mobile users';
      }
    }
    return originalAudience;
  }

  // Step 3: Clean solution text processing
  private static cleanSolutions(solutions: string[]): string[] {
    return solutions.map(solution => 
      solution.replace(/\s+services?$/i, '').replace(/\s+solutions?$/i, '')
    );
  }

  // NEW: Generate foundation templates for high-volume discovery queries 
  private static generateFoundationQueries(topicData: TopicAuditData, count: number): GeneratedTopicQuery[] {
    const queries: GeneratedTopicQuery[] = [];
    
    // Extract primary solution and detect entity type
    const primarySolution = this.extractPrimarySolution(topicData);
    const entityType = this.detectEntityType(topicData);
    
    FOUNDATION_TEMPLATES.forEach(template => {
      if (queries.length >= count) return;
      
      const queryText = this.populateFoundationVariables(template.template, topicData, primarySolution, entityType);
      
      queries.push({
        id: crypto.randomUUID(),
        query_text: queryText,
        query_type: template.type as any,
        priority: template.priority,
        target_entity: topicData.entityToTrack,
        search_intent: template.purchaseIntent ? 'purchase_intent' : 'research',
        purchase_intent: template.purchaseIntent ? 'high' : 'low',
        source: 'foundation'
      });
    });
    
    return queries.slice(0, count);
  }

  // Step 4: Generate universal queries using enhanced templates
  private static generateUniversalQueries(topicData: TopicAuditData, count: number): GeneratedTopicQuery[] {
    const queries: GeneratedTopicQuery[] = [];
    
    UNIVERSAL_ENHANCED_TEMPLATES.forEach(template => {
      if (queries.length >= count) return;
      
      const queryText = this.populateUniversalVariables(template.template, topicData);
      
      queries.push({
        id: crypto.randomUUID(),
        query_text: queryText,
        query_type: template.type as any,
        priority: template.priority,
        target_entity: topicData.entityToTrack,
        search_intent: template.purchaseIntent ? 'purchase_intent' : 'research',
        purchase_intent: template.purchaseIntent ? 'high' : 'low',
        source: 'universal_enhanced'
      });
    });
    
    return queries.slice(0, count);
  }

  // Step 5: Smart variable population (Universal) - Enhanced with geographic support
  private static populateUniversalVariables(template: string, context: TopicAuditData): string {
    const actionVerb = context.topic.includes('agency') ? 'hire' : 'find';
    const painPoint = this.generatePainPoints(context.industry);
    const businessGoal = this.generateGoals(context.target_audience);
    const specificContext = context.industrySubVertical || context.industry;
    const specificNeed = `${context.target_audience} needs`;
    const refinedAudience = context.target_audience;
    const competitors = context.known_players;
    const useCase = `${context.target_audience} use cases`;
    const deadlineContext = 'urgent project needs';
    const projectType = `${context.industry} projects`;
    const geographicFocus = context.geographic_focus || 'globally';
    const industrySubvertical = context.industrySubVertical || context.industry;
    
    return template
      .replace(/{topic}/g, context.topic)
      .replace(/{action_verb}/g, actionVerb)
      .replace(/{pain_point}/g, painPoint)
      .replace(/{business_goal}/g, businessGoal)
      .replace(/{specific_context}/g, specificContext)
      .replace(/{specific_need}/g, specificNeed)
      .replace(/{refined_audience}/g, refinedAudience)
      .replace(/{competitor_a}/g, competitors[0] || 'leading provider')
      .replace(/{competitor_b}/g, competitors[1] || 'alternatives')
      .replace(/{use_case}/g, useCase)
      .replace(/{deadline_context}/g, deadlineContext)
      .replace(/{project_type}/g, projectType)
      .replace(/{geographic_focus}/g, geographicFocus)
      .replace(/{industry_subvertical}/g, industrySubvertical);
  }

  // NEW: Extract primary solution from solutions offered
  private static extractPrimarySolution(topicData: TopicAuditData): string {
    if (!topicData.solutionsOffered || topicData.solutionsOffered.length === 0) {
      return topicData.topic;
    }
    
    // Take the first solution and extract main terms
    const primarySolution = topicData.solutionsOffered[0]
      .toLowerCase()
      .replace(/\b(app store optimization|aso)\b/gi, 'ASO')
      .replace(/\b(user acquisition)\b/gi, 'user acquisition')
      .replace(/\b(mobile analytics)\b/gi, 'mobile analytics')
      .replace(/\b(creative strategy)\b/gi, 'creative strategy');
    
    return primarySolution;
  }

  // NEW: Detect entity type from context
  private static detectEntityType(topicData: TopicAuditData): string {
    const topic = topicData.topic.toLowerCase();
    const solutions = (topicData.solutionsOffered || []).join(' ').toLowerCase();
    
    if (topic.includes('agency') || solutions.includes('agency') || solutions.includes('consultant') || solutions.includes('specialist')) {
      return 'agency';
    }
    if (topic.includes('app') || topicData.industry.includes('Mobile')) {
      return 'app';
    }
    if (topic.includes('platform') || topic.includes('software') || topic.includes('tool')) {
      return 'platform';
    }
    return 'company';
  }

  // NEW: Populate foundation template variables
  private static populateFoundationVariables(template: string, context: TopicAuditData, primarySolution: string, entityType: string): string {
    return template
      .replace(/{primary_solution}/g, primarySolution)
      .replace(/{entity_type}/g, entityType)
      .replace(/{refined_audience}/g, context.target_audience);
  }

  // Universal context generators
  private static generatePainPoints(industry: string): string {
    const painPoints: Record<string, string> = {
      'Technology': 'declining app downloads',
      'Mobile Technology': 'poor app store visibility',
      'Marketing': 'low user acquisition',
      'Advertising': 'high customer acquisition costs'
    };
    return painPoints[industry] || 'business growth challenges';
  }

  private static generateGoals(audience: string): string {
    const goals: Record<string, string> = {
      'business owners': 'business growth',
      'mobile users': 'better app experience',
      'health-conscious individuals': 'fitness goals',
      'language learners': 'language mastery'
    };
    return goals[audience] || 'improved outcomes';
  }

  private static getQueryCountFromDepth(depth: 'standard' | 'comprehensive' | 'deep', requestedCount: number): number {
    switch (depth) {
      case 'comprehensive': return Math.max(requestedCount, 50);
      case 'deep': return Math.max(requestedCount, 100);
      default: return Math.max(requestedCount, 20);
    }
  }

  // 🆕 NEW: Generate solution-specific discovery queries
  private static generateSolutionBasedQueries(topicData: TopicAuditData, count: number): GeneratedTopicQuery[] {
    const queries: GeneratedTopicQuery[] = [];
    
    if (!topicData.solutionsOffered || topicData.solutionsOffered.length === 0) return queries;
    
    const discoveryTemplates = [
      "Best {solution} for {audience}",
      "Top {solution} with proven results",
      "Which {solution} should I choose for {subVertical}",
      "Leading {solution} providers {year}",
      "{solution} comparison for {audience}",
      "Recommended {solution} for {industry}",
      "{solution} pricing and reviews",
      "Top-rated {solution} agencies",
      "{solution} vs in-house solutions",
      "Best {solution} agencies with case studies"
    ];
    
    const year = new Date().getFullYear();
    
    topicData.solutionsOffered.forEach((solution, solutionIndex) => {
      if (queries.length >= count) return;
      
      discoveryTemplates.slice(0, Math.ceil(count / topicData.solutionsOffered.length)).forEach(template => {
        if (queries.length >= count) return;
        
        let queryText = template
          .replace(/{solution}/g, solution)
          .replace(/{audience}/g, topicData.target_audience)
          .replace(/{subVertical}/g, topicData.industrySubVertical || topicData.industry)
          .replace(/{industry}/g, topicData.industry)
          .replace(/{year}/g, year.toString());
        
        queries.push({
          id: crypto.randomUUID(),
          query_text: queryText,
          query_type: 'high_intent',
          priority: 1,
          target_entity: topicData.entityToTrack,
          search_intent: 'purchase_intent',
          purchase_intent: 'high',
          source: 'solution_based'
        });
      });
    });
    
    return queries.slice(0, count);
  }

  private static generateUserContextQueries(topicData: TopicAuditData, count: number): GeneratedTopicQuery[] {
    const queries: GeneratedTopicQuery[] = [];
    const year = new Date().getFullYear();
    
    // 🆕 Enhanced base queries with sub-vertical integration
    const baseQueries = [
      `Best ${topicData.topic}`,
      `Top ${topicData.topic} for ${topicData.target_audience}`,
      `${topicData.topic} recommendations ${year}`
    ];
    
    // 🆕 Sub-vertical specific queries (high precision targeting)
    const subVerticalQueries = topicData.industrySubVertical ? [
      `Best ${topicData.industrySubVertical} for ${topicData.target_audience}`,
      `Top ${topicData.industrySubVertical} specialists`,
      `Leading ${topicData.industrySubVertical} providers ${year}`,
      `${topicData.industrySubVertical} vs competitors`,
      `${topicData.industrySubVertical} agencies with proven results`
    ] : [];
    
    // 🆕 Solution-enhanced industry queries
    const industryQueries = [
      `${topicData.industry} tools for ${topicData.target_audience}`,
      `Best ${topicData.industry} platforms`,
      `${topicData.topic} for ${topicData.target_audience} comparison`
    ];
    
    // 🆕 Enhanced discovery queries with intent focus
    const discoveryQueries = topicData.queryStrategy === 'competitive_discovery' ? [
      `Which ${topicData.topic} should I choose for ${topicData.target_audience}`,
      `Best ${topicData.topic} agencies with case studies`,
      `Top-rated ${topicData.topic} with proven ROI`,
      `${topicData.topic} comparison for ${topicData.target_audience}`,
      `Recommended ${topicData.topic} providers ${year}`,
      `${topicData.industrySubVertical || topicData.industry} specialists comparison`
    ] : [
      `${topicData.industry} market trends ${year}`,
      `${topicData.topic} industry analysis`,
      `${topicData.target_audience} behavior patterns`,
      `${topicData.industry} best practices`
    ];
    
    // Context-specific queries (if additional context provided)
    const contextQueries = topicData.context_description ? [
      `${topicData.topic} ${topicData.context_description}`,
      `Best ${topicData.industry} ${topicData.context_description}`
    ] : [];
    
    // 🆕 Enhanced known players queries with competitive focus
    const knownPlayersQueries = topicData.known_players.length > 0 ? [
      `${topicData.known_players.slice(0, 3).join(' vs ')} comparison`,
      `${topicData.known_players[0]} vs alternatives for ${topicData.target_audience}`,
      `Is ${topicData.known_players[0]} the best choice for ${topicData.industrySubVertical || topicData.topic}?`,
      `Alternatives to ${topicData.known_players[0]} for ${topicData.target_audience}`
    ] : [];
    
    // Combine all query types with priority to sub-vertical and discovery queries
    const allQueries = [...subVerticalQueries, ...discoveryQueries, ...baseQueries, ...industryQueries, ...contextQueries, ...knownPlayersQueries];
    
    // Convert to GeneratedTopicQuery objects with enhanced priorities
    allQueries.forEach((queryText, index) => {
      const priority = this.calculateEnhancedQueryPriority(queryText, topicData);
      const type = this.determineQueryType(queryText);
      const searchIntent = this.classifySearchIntent(queryText, topicData);
      
      queries.push({
        id: crypto.randomUUID(),
        query_text: queryText,
        query_type: type,
        priority,
        target_entity: topicData.entityToTrack || topicData.topic,
        search_intent: searchIntent,
        purchase_intent: this.classifyPurchaseIntent(queryText),
        source: 'template'
      });
    });
    
    // Sort by priority and return top queries
    return queries.sort((a, b) => b.priority - a.priority).slice(0, Math.min(count, queries.length));
  }

  // 🆕 Enhanced priority calculation considering new strategic fields
  private static calculateEnhancedQueryPriority(queryText: string, topicData: TopicAuditData): number {
    let priority = 3; // Base priority
    
    // Higher priority for sub-vertical specific queries
    if (topicData.industrySubVertical && queryText.toLowerCase().includes(topicData.industrySubVertical.toLowerCase())) {
      priority = 1;
    }
    
    // Higher priority for solution-specific queries
    if (topicData.solutionsOffered?.some(solution => queryText.toLowerCase().includes(solution.toLowerCase()))) {
      priority = Math.min(priority, 1);
    }
    
    // Higher priority for entity-specific queries
    if (topicData.entityToTrack && queryText.includes(topicData.entityToTrack)) {
      priority = Math.min(priority, 1);
    }
    
    // Higher priority for discovery-focused queries when strategy is competitive_discovery
    if (topicData.queryStrategy === 'competitive_discovery') {
      const discoveryKeywords = ['best', 'top', 'which', 'should i choose', 'recommend'];
      if (discoveryKeywords.some(keyword => queryText.toLowerCase().includes(keyword))) {
        priority = Math.min(priority, 1);
      }
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

  // 🆕 Enhanced search intent classification
  private static classifySearchIntent(queryText: string, topicData: TopicAuditData): 'immediate_need' | 'research' | 'comparison' | 'education' | 'purchase_intent' {
    const lowerText = queryText.toLowerCase();
    
    // High purchase intent indicators
    const purchaseKeywords = ['best', 'top', 'which should i', 'recommend', 'choose', 'hire'];
    if (purchaseKeywords.some(keyword => lowerText.includes(keyword))) {
      return 'purchase_intent';
    }
    
    // Comparison intent
    if (lowerText.includes('vs') || lowerText.includes('comparison') || lowerText.includes('compare')) {
      return 'comparison';
    }
    
    // Immediate need indicators
    if (lowerText.includes('need') || lowerText.includes('looking for') || lowerText.includes('urgent')) {
      return 'immediate_need';
    }
    
    // Research indicators
    if (lowerText.includes('trends') || lowerText.includes('analysis') || lowerText.includes('market')) {
      return 'research';
    }
    
    return 'education';
  }

  // 🆕 Enhanced purchase intent classification
  private static classifyPurchaseIntent(queryText: string): 'high' | 'medium' | 'low' {
    const lowerText = queryText.toLowerCase();
    
    // High intent indicators
    const highIntentKeywords = ['hire', 'pricing', 'cost', 'buy', 'purchase', 'which should i', 'best for my'];
    if (highIntentKeywords.some(keyword => lowerText.includes(keyword))) {
      return 'high';
    }
    
    // Medium intent indicators  
    const mediumIntentKeywords = ['compare', 'vs', 'alternatives', 'review', 'recommend'];
    if (mediumIntentKeywords.some(keyword => lowerText.includes(keyword))) {
      return 'medium';
    }
    
    return 'low';
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