/**
 * INSIGHT CLASSIFICATION ENGINE
 *
 * Classifies semantic insights as:
 * - ASO (App Store Optimization): Discovery-related language that indicates keyword opportunities
 * - Product: UX/retention features that improve in-app experience
 * - Both: Can be relevant to both ASO and product strategy
 *
 * Example classifications:
 * - "identify plants" → ASO (discovery verb + searchable noun)
 * - "offline mode" → Product (UX feature)
 * - "quick search" → Both (discovery + UX feature)
 */

import { SemanticTopic } from './semantic-extraction.engine';

/**
 * Classification result for a semantic topic
 */
export interface InsightClassification {
  topicId: string;
  insightType: 'aso' | 'product' | 'both';
  category: string;                  // e.g., "Discovery", "UX", "Performance"
  subcategory: string | null;        // e.g., "Search", "Offline", "Speed"
  confidence: number;                // 0-1 confidence score
  reasoning: string;                 // Human-readable explanation
  asoRelevance: {
    isSearchable: boolean;           // Is this a searchable user need?
    keywordPotential: 'high' | 'medium' | 'low';
    suggestedKeywords: string[];     // Potential ASO keywords
  };
  productRelevance: {
    isFeatureRequest: boolean;       // Is this a feature request?
    implementationComplexity: 'low' | 'medium' | 'high';
    userImpact: 'high' | 'medium' | 'low';
  };
}

/**
 * Classification rules and patterns
 */
interface ClassificationRule {
  name: string;
  insightType: 'aso' | 'product' | 'both';
  category: string;
  subcategory?: string;
  verbPatterns?: string[];           // Verbs that trigger this rule
  nounPatterns?: string[];           // Nouns that trigger this rule
  phrasePatterns?: string[];         // Full phrases that trigger this rule
  weight: number;                    // Rule weight (0-1)
}

/**
 * Main Classification Engine
 */
export class InsightClassificationEngine {
  private readonly rules: ClassificationRule[] = [
    // === ASO RULES (Discovery & Search) ===
    {
      name: 'Discovery Verbs',
      insightType: 'aso',
      category: 'Discovery',
      subcategory: 'Search',
      verbPatterns: ['identify', 'find', 'search', 'discover', 'lookup', 'locate'],
      weight: 0.9
    },
    {
      name: 'Scanning Actions',
      insightType: 'aso',
      category: 'Discovery',
      subcategory: 'Scanning',
      verbPatterns: ['scan', 'detect', 'recognize', 'capture'],
      weight: 0.85
    },
    {
      name: 'Tracking & Monitoring',
      insightType: 'aso',
      category: 'Discovery',
      subcategory: 'Tracking',
      verbPatterns: ['track', 'monitor', 'follow', 'watch'],
      weight: 0.8
    },
    {
      name: 'Information Access',
      insightType: 'aso',
      category: 'Discovery',
      subcategory: 'Information',
      verbPatterns: ['check', 'view', 'see', 'look up', 'access'],
      nounPatterns: ['information', 'data', 'details', 'stats', 'history'],
      weight: 0.75
    },

    // === PRODUCT RULES (UX & Features) ===
    {
      name: 'Offline Functionality',
      insightType: 'product',
      category: 'UX',
      subcategory: 'Offline',
      phrasePatterns: ['offline mode', 'offline access', 'work offline', 'without internet'],
      nounPatterns: ['offline'],
      weight: 0.95
    },
    {
      name: 'Sync & Backup',
      insightType: 'product',
      category: 'UX',
      subcategory: 'Data Management',
      verbPatterns: ['sync', 'backup', 'restore', 'save'],
      nounPatterns: ['sync', 'backup', 'cloud storage', 'synchronization'],
      weight: 0.9
    },
    {
      name: 'Export & Sharing',
      insightType: 'product',
      category: 'UX',
      subcategory: 'Sharing',
      verbPatterns: ['export', 'share', 'send', 'download'],
      nounPatterns: ['export', 'sharing', 'download'],
      weight: 0.85
    },
    {
      name: 'Notifications',
      insightType: 'product',
      category: 'UX',
      subcategory: 'Notifications',
      phrasePatterns: ['push notifications', 'notifications', 'alerts', 'reminders'],
      nounPatterns: ['notification', 'alert', 'reminder'],
      weight: 0.9
    },
    {
      name: 'Performance & Speed',
      insightType: 'product',
      category: 'Performance',
      subcategory: 'Speed',
      nounPatterns: ['speed', 'performance', 'loading', 'lag', 'crash', 'freeze'],
      phrasePatterns: ['slow loading', 'app crashes', 'freezes', 'lags'],
      weight: 0.85
    },
    {
      name: 'UI/UX Elements',
      insightType: 'product',
      category: 'UX',
      subcategory: 'Interface',
      nounPatterns: ['dark mode', 'theme', 'widget', 'interface', 'layout', 'design'],
      phrasePatterns: ['dark mode', 'widgets', 'ui', 'user interface'],
      weight: 0.8
    },
    {
      name: 'Customization',
      insightType: 'product',
      category: 'UX',
      subcategory: 'Customization',
      verbPatterns: ['customize', 'personalize', 'configure', 'adjust'],
      nounPatterns: ['customization', 'personalization', 'settings', 'preferences'],
      weight: 0.75
    },
    {
      name: 'Organization & Management',
      insightType: 'product',
      category: 'UX',
      subcategory: 'Organization',
      verbPatterns: ['organize', 'sort', 'filter', 'manage', 'categorize'],
      nounPatterns: ['organization', 'sorting', 'filtering', 'categories', 'folders'],
      weight: 0.7
    },

    // === BOTH RULES (Hybrid) ===
    {
      name: 'Quick Actions',
      insightType: 'both',
      category: 'Discovery + UX',
      phrasePatterns: ['quick search', 'fast identification', 'instant results'],
      weight: 0.8
    },
    {
      name: 'Advanced Features',
      insightType: 'both',
      category: 'Discovery + UX',
      phrasePatterns: ['advanced search', 'advanced filtering', 'detailed results'],
      nounPatterns: ['advanced'],
      weight: 0.75
    },
    {
      name: 'Create & Add',
      insightType: 'both',
      category: 'Discovery + UX',
      verbPatterns: ['create', 'add'],
      weight: 0.6
    }
  ];

  /**
   * Classify a semantic topic
   */
  classify(topic: SemanticTopic): InsightClassification {
    // Calculate match scores for all rules
    const ruleMatches = this.rules.map(rule => ({
      rule,
      score: this.calculateRuleMatch(topic, rule)
    }));

    // Find best matching rule
    const bestMatch = ruleMatches.reduce((best, current) =>
      current.score > best.score ? current : best
    );

    const matchedRule = bestMatch.rule;
    const confidence = bestMatch.score;

    // Determine final classification
    const insightType = this.determineInsightType(topic, matchedRule, confidence);

    // Calculate ASO relevance
    const asoRelevance = this.calculateASORelevance(topic, insightType);

    // Calculate product relevance
    const productRelevance = this.calculateProductRelevance(topic, insightType);

    // Generate reasoning
    const reasoning = this.generateReasoning(topic, matchedRule, insightType, confidence);

    return {
      topicId: topic.topicId,
      insightType,
      category: matchedRule.category,
      subcategory: matchedRule.subcategory || null,
      confidence,
      reasoning,
      asoRelevance,
      productRelevance
    };
  }

  /**
   * Batch classify multiple topics
   */
  classifyBatch(topics: SemanticTopic[]): InsightClassification[] {
    return topics.map(topic => this.classify(topic));
  }

  /**
   * Calculate how well a rule matches a topic
   */
  private calculateRuleMatch(topic: SemanticTopic, rule: ClassificationRule): number {
    let score = 0;
    let matchCount = 0;
    let totalChecks = 0;

    const lowerPhrase = topic.contextPhrase.toLowerCase();
    const lowerVerb = topic.verb?.toLowerCase() || '';
    const lowerNoun = topic.noun?.toLowerCase() || '';

    // Check phrase patterns (highest weight)
    if (rule.phrasePatterns) {
      totalChecks++;
      const matches = rule.phrasePatterns.some(pattern =>
        lowerPhrase.includes(pattern.toLowerCase())
      );
      if (matches) {
        score += 1.0;
        matchCount++;
      }
    }

    // Check verb patterns
    if (rule.verbPatterns && lowerVerb) {
      totalChecks++;
      const matches = rule.verbPatterns.some(pattern =>
        lowerVerb.includes(pattern.toLowerCase())
      );
      if (matches) {
        score += 0.8;
        matchCount++;
      }
    }

    // Check noun patterns
    if (rule.nounPatterns && lowerNoun) {
      totalChecks++;
      const matches = rule.nounPatterns.some(pattern =>
        lowerNoun.includes(pattern.toLowerCase()) ||
        lowerPhrase.includes(pattern.toLowerCase())
      );
      if (matches) {
        score += 0.7;
        matchCount++;
      }
    }

    // No pattern matched
    if (totalChecks === 0) return 0;

    // Calculate weighted score
    const matchRatio = matchCount / totalChecks;
    return matchRatio * rule.weight;
  }

  /**
   * Determine final insight type based on rule match and heuristics
   */
  private determineInsightType(
    topic: SemanticTopic,
    matchedRule: ClassificationRule,
    confidence: number
  ): 'aso' | 'product' | 'both' {
    // Low confidence = fallback to 'both'
    if (confidence < 0.5) {
      return 'both';
    }

    // High confidence = use rule classification
    if (confidence >= 0.7) {
      return matchedRule.insightType;
    }

    // Medium confidence = apply additional heuristics
    const hasDiscoveryVerb = this.hasDiscoveryVerb(topic.verb);
    const hasUXNoun = this.hasUXNoun(topic.noun);

    if (hasDiscoveryVerb && hasUXNoun) return 'both';
    if (hasDiscoveryVerb) return 'aso';
    if (hasUXNoun) return 'product';

    return matchedRule.insightType;
  }

  /**
   * Check if verb is a discovery/search verb
   */
  private hasDiscoveryVerb(verb: string | null): boolean {
    if (!verb) return false;
    const discoveryVerbs = ['identify', 'find', 'search', 'discover', 'scan', 'detect', 'track', 'locate'];
    return discoveryVerbs.some(dv => verb.toLowerCase().includes(dv));
  }

  /**
   * Check if noun is a UX-related term
   */
  private hasUXNoun(noun: string | null): boolean {
    if (!noun) return false;
    const uxTerms = ['mode', 'theme', 'widget', 'notification', 'sync', 'export', 'backup', 'offline'];
    return uxTerms.some(term => noun.toLowerCase().includes(term));
  }

  /**
   * Calculate ASO relevance metrics
   */
  private calculateASORelevance(
    topic: SemanticTopic,
    insightType: 'aso' | 'product' | 'both'
  ): InsightClassification['asoRelevance'] {
    // Determine if searchable
    const isSearchable = insightType === 'aso' || insightType === 'both';

    // Calculate keyword potential
    let keywordPotential: 'high' | 'medium' | 'low';
    if (insightType === 'aso' && topic.mentions >= 10) {
      keywordPotential = 'high';
    } else if (insightType === 'aso' || (insightType === 'both' && topic.mentions >= 5)) {
      keywordPotential = 'medium';
    } else {
      keywordPotential = 'low';
    }

    // Generate suggested keywords
    const suggestedKeywords = this.generateKeywordSuggestions(topic);

    return {
      isSearchable,
      keywordPotential,
      suggestedKeywords
    };
  }

  /**
   * Generate ASO keyword suggestions from topic
   */
  private generateKeywordSuggestions(topic: SemanticTopic): string[] {
    const keywords: Set<string> = new Set();

    // Add canonical phrase
    keywords.add(topic.contextPhrase.toLowerCase());

    // Add verb + noun if available
    if (topic.verb && topic.noun) {
      keywords.add(`${topic.verb} ${topic.noun}`);
    }

    // Add all variations
    topic.variations.forEach(v => keywords.add(v.toLowerCase()));

    // Add noun alone if significant
    if (topic.noun && topic.noun.length >= 4) {
      keywords.add(topic.noun);
    }

    return Array.from(keywords).slice(0, 5);
  }

  /**
   * Calculate product relevance metrics
   */
  private calculateProductRelevance(
    topic: SemanticTopic,
    insightType: 'aso' | 'product' | 'both'
  ): InsightClassification['productRelevance'] {
    // Determine if feature request
    const isFeatureRequest = insightType === 'product' || insightType === 'both';

    // Estimate implementation complexity
    const implementationComplexity = this.estimateComplexity(topic);

    // Calculate user impact
    let userImpact: 'high' | 'medium' | 'low';
    if (topic.mentions >= 15 && Math.abs(topic.sentiment.average) > 0.5) {
      userImpact = 'high';
    } else if (topic.mentions >= 5) {
      userImpact = 'medium';
    } else {
      userImpact = 'low';
    }

    return {
      isFeatureRequest,
      implementationComplexity,
      userImpact
    };
  }

  /**
   * Estimate implementation complexity based on topic
   */
  private estimateComplexity(topic: SemanticTopic): 'low' | 'medium' | 'high' {
    const phrase = topic.contextPhrase.toLowerCase();

    // High complexity features
    const highComplexity = ['offline mode', 'sync', 'backup', 'cloud', 'ai', 'machine learning'];
    if (highComplexity.some(term => phrase.includes(term))) {
      return 'high';
    }

    // Low complexity features
    const lowComplexity = ['dark mode', 'theme', 'color', 'font', 'notification'];
    if (lowComplexity.some(term => phrase.includes(term))) {
      return 'low';
    }

    return 'medium';
  }

  /**
   * Generate human-readable reasoning
   */
  private generateReasoning(
    topic: SemanticTopic,
    matchedRule: ClassificationRule,
    insightType: 'aso' | 'product' | 'both',
    confidence: number
  ): string {
    const parts: string[] = [];

    // Rule match reasoning
    parts.push(`Matched rule: "${matchedRule.name}" (${(confidence * 100).toFixed(0)}% confidence)`);

    // Verb/noun analysis
    if (topic.verb) {
      parts.push(`Contains action verb "${topic.verb}"`);
    }
    if (topic.noun) {
      parts.push(`Targets object "${topic.noun}"`);
    }

    // Classification reasoning
    if (insightType === 'aso') {
      parts.push('Indicates user search intent → ASO keyword opportunity');
    } else if (insightType === 'product') {
      parts.push('Relates to in-app functionality → Product feature request');
    } else {
      parts.push('Relevant to both App Store discovery and product experience');
    }

    return parts.join('. ');
  }

  /**
   * Get all available categories
   */
  getCategories(): string[] {
    return [...new Set(this.rules.map(r => r.category))];
  }

  /**
   * Get all available subcategories for a category
   */
  getSubcategories(category: string): string[] {
    return [
      ...new Set(
        this.rules
          .filter(r => r.category === category && r.subcategory)
          .map(r => r.subcategory!)
      )
    ];
  }
}
