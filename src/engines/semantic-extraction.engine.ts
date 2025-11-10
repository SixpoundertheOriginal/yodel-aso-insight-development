/**
 * SEMANTIC EXTRACTION ENGINE
 *
 * Transforms literal review text into contextualized, semantic insights.
 * Extracts noun-verb pairs, clusters similar phrases, and generates
 * rich context phrases instead of isolated keywords.
 *
 * Example transformation:
 * - Before: ["identify", "plant", "search"]
 * - After: [{ topicId: "plant_identification", contextPhrase: "identify plants quickly and accurately", verb: "identify", noun: "plants" }]
 */

import { EnhancedReviewItem } from '@/types/review-intelligence.types';

/**
 * Extracted semantic topic with full context
 */
export interface SemanticTopic {
  topicId: string;              // Unique identifier: "plant_identification"
  topicDisplay: string;         // Human-readable: "Plant Identification"
  contextPhrase: string;        // Full context: "identify plants quickly and accurately"
  verb: string | null;          // Primary action: "identify"
  noun: string | null;          // Primary object: "plants"
  mentions: number;             // Total occurrence count
  reviewIds: string[];          // Source review IDs
  examples: {
    text: string;               // Review excerpt
    rating: number;             // Review rating
    matchedPhrase: string;      // Exact matched phrase in review
    context: string;            // Surrounding context (±50 chars)
  }[];
  sentiment: {
    positive: number;           // Count of positive mentions
    neutral: number;            // Count of neutral mentions
    negative: number;           // Count of negative mentions
    average: number;            // Average sentiment score (-1 to 1)
  };
  firstSeen: Date;              // First occurrence
  lastSeen: Date;               // Most recent occurrence
  variations: string[];         // All detected phrase variations
}

/**
 * Configuration for semantic extraction
 */
export interface ExtractionConfig {
  minMentions?: number;         // Minimum mentions to include (default: 2)
  maxTopics?: number;           // Max topics to return (default: 50)
  includeExamples?: boolean;    // Include example reviews (default: true)
  maxExamplesPerTopic?: number; // Max examples per topic (default: 3)
  clusterSimilarity?: number;   // Similarity threshold for clustering (default: 0.7)
}

/**
 * Main Semantic Extraction Engine
 */
export class SemanticExtractionEngine {
  private readonly DEFAULT_CONFIG: Required<ExtractionConfig> = {
    minMentions: 2,
    maxTopics: 50,
    includeExamples: true,
    maxExamplesPerTopic: 3,
    clusterSimilarity: 0.7
  };

  /**
   * Extract semantic topics from review collection
   */
  async extract(
    reviews: EnhancedReviewItem[],
    config?: ExtractionConfig
  ): Promise<SemanticTopic[]> {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };

    // Step 1: Extract noun-verb pairs from all reviews
    const rawPhrases = this.extractNounVerbPairs(reviews);

    // Step 2: Cluster semantically similar phrases
    const clusters = this.clusterSimilarPhrases(rawPhrases, finalConfig.clusterSimilarity);

    // Step 3: Generate rich context phrases for each cluster
    const topics = this.generateTopicsFromClusters(clusters, reviews, finalConfig);

    // Step 4: Sort by mention count and apply limits
    return topics
      .filter(topic => topic.mentions >= finalConfig.minMentions)
      .sort((a, b) => b.mentions - a.mentions)
      .slice(0, finalConfig.maxTopics);
  }

  /**
   * Extract noun-verb pairs from reviews using pattern matching
   */
  private extractNounVerbPairs(reviews: EnhancedReviewItem[]): RawPhrase[] {
    const phrases: RawPhrase[] = [];

    reviews.forEach(review => {
      if (!review.text) return;

      const text = review.text;
      const lowerText = text.toLowerCase();
      const reviewDate = review.updated_at ? new Date(review.updated_at) : new Date();
      const rating = review.rating || 3;

      // Pattern 1: [verb] [noun/noun phrase]
      // Examples: "identify plants", "scan barcodes", "find restaurants"
      const verbNounMatches = this.matchVerbNounPattern(lowerText);

      // Pattern 2: [noun] [verb+ing]
      // Examples: "plant identification", "barcode scanning", "restaurant finding"
      const nounVerbingMatches = this.matchNounVerbingPattern(lowerText);

      // Pattern 3: [can/could/want to/need to] [verb] [noun]
      // Examples: "can identify plants", "want to scan documents"
      const modalVerbNounMatches = this.matchModalVerbNounPattern(lowerText);

      // Combine all matches
      const allMatches = [
        ...verbNounMatches,
        ...nounVerbingMatches,
        ...modalVerbNounMatches
      ];

      // Store each match with metadata
      allMatches.forEach(match => {
        phrases.push({
          phrase: match.phrase,
          verb: match.verb,
          noun: match.noun,
          reviewId: review.id || `review-${Date.now()}`,
          reviewText: text,
          reviewRating: rating,
          reviewDate,
          matchIndex: match.index,
          contextBefore: text.substring(Math.max(0, match.index - 50), match.index),
          contextAfter: text.substring(match.index + match.phrase.length, Math.min(text.length, match.index + match.phrase.length + 50))
        });
      });
    });

    return phrases;
  }

  /**
   * Match pattern: [verb] [noun phrase]
   */
  private matchVerbNounPattern(text: string): PhraseMatch[] {
    const matches: PhraseMatch[] = [];

    // Common discovery/action verbs for ASO and product features
    const verbs = [
      'identify', 'scan', 'find', 'search', 'discover', 'detect', 'recognize',
      'track', 'monitor', 'locate', 'lookup', 'check', 'view', 'see',
      'add', 'create', 'save', 'export', 'share', 'sync', 'backup',
      'edit', 'delete', 'remove', 'update', 'change', 'modify',
      'filter', 'sort', 'organize', 'manage', 'access', 'use'
    ];

    const verbPattern = verbs.join('|');

    // Match: verb + noun phrase (2-30 chars)
    const regex = new RegExp(
      `\\b(${verbPattern})\\s+([a-z][a-z\\s]{1,28}[a-z])\\b`,
      'gi'
    );

    let match;
    while ((match = regex.exec(text)) !== null) {
      const verb = match[1].toLowerCase();
      const noun = match[2].trim();

      // Filter out noise (articles, prepositions, etc.)
      if (this.isValidNoun(noun)) {
        matches.push({
          phrase: `${verb} ${noun}`,
          verb,
          noun,
          index: match.index
        });
      }
    }

    return matches;
  }

  /**
   * Match pattern: [noun] [verb+ing]
   */
  private matchNounVerbingPattern(text: string): PhraseMatch[] {
    const matches: PhraseMatch[] = [];

    // Common -ing forms
    const verbings = [
      'identification', 'scanning', 'finding', 'searching', 'discovering', 'detection',
      'tracking', 'monitoring', 'locating', 'checking', 'viewing',
      'adding', 'creating', 'saving', 'exporting', 'sharing', 'syncing', 'backing',
      'editing', 'deleting', 'removing', 'updating', 'changing',
      'filtering', 'sorting', 'organizing', 'managing', 'accessing', 'using'
    ];

    const verbingPattern = verbings.join('|');

    // Match: noun phrase + verbing form
    const regex = new RegExp(
      `\\b([a-z][a-z\\s]{1,28}[a-z])\\s+(${verbingPattern})\\b`,
      'gi'
    );

    let match;
    while ((match = regex.exec(text)) !== null) {
      const noun = match[1].trim();
      const verbing = match[2].toLowerCase();

      if (this.isValidNoun(noun)) {
        // Convert "identification" -> "identify" for verb normalization
        const verb = this.normalizeVerbFromGerund(verbing);

        matches.push({
          phrase: `${noun} ${verbing}`,
          verb,
          noun,
          index: match.index
        });
      }
    }

    return matches;
  }

  /**
   * Match pattern: [modal] [verb] [noun]
   */
  private matchModalVerbNounPattern(text: string): PhraseMatch[] {
    const matches: PhraseMatch[] = [];

    const modals = ['can', 'could', 'want to', 'need to', 'able to', 'trying to'];
    const verbs = ['identify', 'scan', 'find', 'search', 'track', 'add', 'save', 'export', 'sync'];

    const modalPattern = modals.join('|');
    const verbPattern = verbs.join('|');

    const regex = new RegExp(
      `\\b(${modalPattern})\\s+(${verbPattern})\\s+([a-z][a-z\\s]{1,28}[a-z])\\b`,
      'gi'
    );

    let match;
    while ((match = regex.exec(text)) !== null) {
      const verb = match[2].toLowerCase();
      const noun = match[3].trim();

      if (this.isValidNoun(noun)) {
        matches.push({
          phrase: `${verb} ${noun}`,
          verb,
          noun,
          index: match.index
        });
      }
    }

    return matches;
  }

  /**
   * Validate that a noun phrase is meaningful (not just articles/prepositions)
   */
  private isValidNoun(noun: string): boolean {
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from'];
    const words = noun.toLowerCase().split(/\s+/);

    // Must have at least one non-stop word
    return words.some(word => !stopWords.includes(word) && word.length >= 3);
  }

  /**
   * Convert gerund forms to base verbs
   */
  private normalizeVerbFromGerund(gerund: string): string {
    const mappings: Record<string, string> = {
      'identification': 'identify',
      'scanning': 'scan',
      'finding': 'find',
      'searching': 'search',
      'discovering': 'discover',
      'detection': 'detect',
      'tracking': 'track',
      'monitoring': 'monitor',
      'locating': 'locate',
      'checking': 'check',
      'viewing': 'view',
      'adding': 'add',
      'creating': 'create',
      'saving': 'save',
      'exporting': 'export',
      'sharing': 'share',
      'syncing': 'sync',
      'backing': 'backup',
      'editing': 'edit',
      'deleting': 'delete',
      'removing': 'remove',
      'updating': 'update',
      'changing': 'change',
      'filtering': 'filter',
      'sorting': 'sort',
      'organizing': 'organize',
      'managing': 'manage',
      'accessing': 'access',
      'using': 'use'
    };

    return mappings[gerund.toLowerCase()] || gerund;
  }

  /**
   * Cluster semantically similar phrases into topics
   */
  private clusterSimilarPhrases(
    phrases: RawPhrase[],
    similarityThreshold: number
  ): PhraseCluster[] {
    const clusters: PhraseCluster[] = [];

    phrases.forEach(phrase => {
      // Try to find existing cluster to merge into
      let merged = false;

      for (const cluster of clusters) {
        const similarity = this.calculatePhraseSimilarity(
          phrase.phrase,
          cluster.canonicalPhrase
        );

        if (similarity >= similarityThreshold) {
          // Merge into existing cluster
          cluster.phrases.push(phrase);
          cluster.variations.add(phrase.phrase);
          merged = true;
          break;
        }
      }

      if (!merged) {
        // Create new cluster
        clusters.push({
          canonicalPhrase: phrase.phrase,
          verb: phrase.verb,
          noun: phrase.noun,
          phrases: [phrase],
          variations: new Set([phrase.phrase])
        });
      }
    });

    return clusters;
  }

  /**
   * Calculate similarity between two phrases
   * Uses simple word overlap + Levenshtein-inspired approach
   */
  private calculatePhraseSimilarity(phrase1: string, phrase2: string): number {
    const words1 = new Set(phrase1.toLowerCase().split(/\s+/));
    const words2 = new Set(phrase2.toLowerCase().split(/\s+/));

    // Jaccard similarity: intersection / union
    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    const jaccardSimilarity = intersection.size / union.size;

    // Boost similarity if verbs or nouns match exactly
    const boost = this.hasMatchingVerbOrNoun(phrase1, phrase2) ? 0.2 : 0;

    return Math.min(jaccardSimilarity + boost, 1);
  }

  /**
   * Check if two phrases share the same verb or noun
   */
  private hasMatchingVerbOrNoun(phrase1: string, phrase2: string): boolean {
    const words1 = phrase1.toLowerCase().split(/\s+/);
    const words2 = phrase2.toLowerCase().split(/\s+/);

    // Check for common significant words
    return words1.some(w => words2.includes(w) && w.length >= 4);
  }

  /**
   * Generate rich semantic topics from phrase clusters
   */
  private generateTopicsFromClusters(
    clusters: PhraseCluster[],
    reviews: EnhancedReviewItem[],
    config: Required<ExtractionConfig>
  ): SemanticTopic[] {
    return clusters.map(cluster => {
      const topicId = this.generateTopicId(cluster.canonicalPhrase);
      const topicDisplay = this.generateTopicDisplay(cluster.canonicalPhrase);
      const contextPhrase = this.generateContextPhrase(cluster);

      // Calculate sentiment distribution
      const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };
      const sentimentSum = cluster.phrases.reduce((sum, phrase) => {
        const sentiment = this.classifySentiment(phrase.reviewRating);
        sentimentCounts[sentiment]++;
        return sum + this.sentimentToScore(sentiment);
      }, 0);

      const averageSentiment = sentimentSum / cluster.phrases.length;

      // Get unique review IDs
      const reviewIds = [...new Set(cluster.phrases.map(p => p.reviewId))];

      // Select best examples
      const examples = config.includeExamples
        ? this.selectBestExamples(cluster.phrases, config.maxExamplesPerTopic)
        : [];

      // Find first and last occurrences
      const dates = cluster.phrases.map(p => p.reviewDate).sort((a, b) => a.getTime() - b.getTime());
      const firstSeen = dates[0];
      const lastSeen = dates[dates.length - 1];

      return {
        topicId,
        topicDisplay,
        contextPhrase,
        verb: cluster.verb,
        noun: cluster.noun,
        mentions: cluster.phrases.length,
        reviewIds,
        examples,
        sentiment: {
          positive: sentimentCounts.positive,
          neutral: sentimentCounts.neutral,
          negative: sentimentCounts.negative,
          average: averageSentiment
        },
        firstSeen,
        lastSeen,
        variations: Array.from(cluster.variations)
      };
    });
  }

  /**
   * Generate topic ID (lowercase, underscored)
   */
  private generateTopicId(phrase: string): string {
    return phrase
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50);
  }

  /**
   * Generate human-readable topic display name
   */
  private generateTopicDisplay(phrase: string): string {
    return phrase
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Generate rich context phrase by finding most descriptive variation
   */
  private generateContextPhrase(cluster: PhraseCluster): string {
    // Find the longest, most descriptive phrase with context
    const phrasesWithContext = cluster.phrases.map(p => ({
      phrase: p.phrase,
      fullContext: `${p.contextBefore} ${p.phrase} ${p.contextAfter}`.trim(),
      length: p.contextAfter.length + p.contextBefore.length
    }));

    // Sort by context richness
    phrasesWithContext.sort((a, b) => b.length - a.length);

    // Extract a natural context phrase (up to 60 chars)
    const bestContext = phrasesWithContext[0];
    const contextPhrase = bestContext.fullContext
      .replace(/\s+/g, ' ')
      .substring(0, 60)
      .trim();

    return contextPhrase || cluster.canonicalPhrase;
  }

  /**
   * Select most representative examples for a topic
   */
  private selectBestExamples(
    phrases: RawPhrase[],
    maxExamples: number
  ): SemanticTopic['examples'] {
    // Prioritize: 1) High ratings, 2) Longer context, 3) Recent
    const scored = phrases.map(phrase => ({
      phrase,
      score:
        (phrase.reviewRating / 5) * 0.4 +
        (Math.min(phrase.reviewText.length, 500) / 500) * 0.3 +
        (phrase.reviewDate.getTime() / Date.now()) * 0.3
    }));

    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, maxExamples).map(({ phrase }) => ({
      text: phrase.reviewText.substring(0, 200),
      rating: phrase.reviewRating,
      matchedPhrase: phrase.phrase,
      context: `${phrase.contextBefore} **${phrase.phrase}** ${phrase.contextAfter}`.trim()
    }));
  }

  /**
   * Classify review rating into sentiment category
   */
  private classifySentiment(rating: number): 'positive' | 'neutral' | 'negative' {
    if (rating >= 4) return 'positive';
    if (rating <= 2) return 'negative';
    return 'neutral';
  }

  /**
   * Convert sentiment to numeric score
   */
  private sentimentToScore(sentiment: 'positive' | 'neutral' | 'negative'): number {
    return sentiment === 'positive' ? 1 : sentiment === 'neutral' ? 0 : -1;
  }
}

/**
 * Internal types
 */
interface RawPhrase {
  phrase: string;
  verb: string | null;
  noun: string | null;
  reviewId: string;
  reviewText: string;
  reviewRating: number;
  reviewDate: Date;
  matchIndex: number;
  contextBefore: string;
  contextAfter: string;
}

interface PhraseMatch {
  phrase: string;
  verb: string;
  noun: string;
  index: number;
}

interface PhraseCluster {
  canonicalPhrase: string;
  verb: string | null;
  noun: string | null;
  phrases: RawPhrase[];
  variations: Set<string>;
}
