/**
 * LLM Visibility Analysis Engine
 *
 * Rule-based analyzer for app description LLM discoverability.
 * Scores how well a description will perform when LLMs (ChatGPT, Claude, Perplexity)
 * retrieve and quote it in response to user queries.
 *
 * Phase 1: Pure rule-based analysis (no LLM API calls)
 * Phase 2: Add AI-powered optimization (with LLM generation)
 */

import type {
  LLMVisibilityAnalysis,
  LLMVisibilityScore,
  LLMVisibilityRules,
  LLMFinding,
  LLMSnippet,
  ClusterCoverage,
  IntentCoverage,
  StructureMetrics,
} from './llmVisibility.types';
import { createSHA256Hash } from '@/utils/hashUtils';

// ============================================================================
// Main Analysis Function
// ============================================================================

/**
 * Analyze app description for LLM visibility and discoverability
 *
 * @param description - App Store long description
 * @param options - Analysis options
 * @returns Complete analysis with scores, findings, and suggestions
 */
export async function analyzeLLMVisibility(
  description: string,
  options: {
    rules: LLMVisibilityRules;
    appId: string;
    vertical?: string;
    market?: string;
    existingIntents?: string[];  // From your intent engine
  }
): Promise<LLMVisibilityAnalysis> {
  const startTime = Date.now();

  // 1. Analyze structure and readability
  const structureMetrics = analyzeStructure(description, options.rules);

  // 2. Analyze semantic cluster coverage
  const clusterCoverage = analyzeClusterCoverage(description, options.rules);

  // 3. Analyze intent coverage
  const intentCoverage = analyzeIntentCoverage(
    description,
    options.rules,
    options.existingIntents
  );

  // 4. Extract and score snippets
  const snippets = extractSnippets(description, options.rules);

  // 5. Detect factual grounding
  const factualAnalysis = analyzeFactualGrounding(description, options.rules);

  // 6. Safety and credibility check
  const safetyAnalysis = analyzeSafetyCredibility(description, options.rules);

  // 7. Collect all findings
  const findings: LLMFinding[] = [
    ...structureMetrics.findings || [],
    ...clusterCoverage.findings || [],
    ...intentCoverage.findings || [],
    ...factualAnalysis.findings,
    ...safetyAnalysis.findings,
  ];

  // 8. Calculate composite score
  const score: LLMVisibilityScore = {
    factual_grounding: factualAnalysis.score,
    semantic_clusters: clusterCoverage.overall_coverage,
    structure_readability: structureMetrics.readability_score,
    intent_coverage: intentCoverage.overall_coverage,
    snippet_quality: calculateSnippetQualityScore(snippets),
    safety_credibility: safetyAnalysis.score,

    overall: calculateOverallScore(
      {
        factual_grounding: factualAnalysis.score,
        semantic_clusters: clusterCoverage.overall_coverage,
        structure_readability: structureMetrics.readability_score,
        intent_coverage: intentCoverage.overall_coverage,
        snippet_quality: calculateSnippetQualityScore(snippets),
        safety_credibility: safetyAnalysis.score,
      },
      options.rules.weights
    ),

    rules_version: options.rules.version,
    analyzed_at: new Date().toISOString(),
  };

  const analysis: LLMVisibilityAnalysis = {
    score,
    findings,
    snippets,
    cluster_coverage: clusterCoverage,
    intent_coverage: intentCoverage,
    structure_metrics: structureMetrics,
    metadata: {
      app_id: options.appId,
      description_length: description.length,
      description_hash: await createSHA256Hash(description),
      rules_version: options.rules.version,
      rules_scope: 'base',  // Will be overridden if using vertical/market rules
      vertical_id: options.vertical,
      market_id: options.market,
      analyzed_at: new Date().toISOString(),
      analysis_duration_ms: Date.now() - startTime,
    },
  };

  return analysis;
}

// ============================================================================
// Structure Analysis
// ============================================================================

function analyzeStructure(
  description: string,
  rules: LLMVisibilityRules
): StructureMetrics & { findings?: LLMFinding[] } {
  const findings: LLMFinding[] = [];

  // Detect sections (look for headings)
  const sectionRegex = /^([A-Z][A-Za-z\s&]+):?$/gm;
  const sections = [...description.matchAll(sectionRegex)].map((m) => m[1].trim());
  const hasSections = sections.length > 0;

  // Detect bullets
  const bulletRegex = /^[\s]*[•\-\*]\s+.+$/gm;
  const bullets = description.match(bulletRegex) || [];
  const hasBullets = bullets.length > 0;

  // Sentence analysis
  const sentences = description.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const sentenceLengths = sentences.map((s) => s.trim().split(/\s+/).length);
  const avgSentenceLength = sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length || 0;
  const maxSentenceLength = Math.max(...sentenceLengths, 0);

  // Paragraph analysis
  const paragraphs = description.split(/\n\n+/).filter((p) => p.trim().length > 0);
  const paragraphSentenceCounts = paragraphs.map(
    (p) => p.split(/[.!?]+/).filter((s) => s.trim().length > 0).length
  );
  const avgParagraphLength = paragraphSentenceCounts.reduce((a, b) => a + b, 0) / paragraphSentenceCounts.length || 0;

  // Readability score (simplified Flesch-Kincaid)
  const readabilityScore = calculateReadabilityScore(description);

  // Chunking quality (how well it chunks for LLM retrieval)
  const chunkingQuality = calculateChunkingQuality({
    hasSections,
    hasBullets,
    avgSentenceLength,
    avgParagraphLength,
  });

  // Generate findings
  if (!hasSections) {
    findings.push({
      id: 'missing_sections',
      type: 'structure_issue',
      severity: 'warning',
      category: 'structure_readability',
      message: 'No clear sections detected. LLMs prefer structured content with headings.',
      suggestion: `Add section headers like: ${rules.structure_rules.required_sections?.slice(0, 3).join(', ')}`,
      impact_score: 10,
    });
  }

  if (!hasBullets && rules.structure_rules.min_bullet_points > 0) {
    findings.push({
      id: 'missing_bullets',
      type: 'structure_issue',
      severity: 'warning',
      category: 'structure_readability',
      message: 'No bullet points found. Bullet lists improve LLM parsing and quoting.',
      suggestion: 'Convert key features into bullet points',
      impact_score: 8,
    });
  }

  if (maxSentenceLength > rules.structure_rules.max_sentence_length) {
    findings.push({
      id: 'long_sentences',
      type: 'structure_issue',
      severity: 'info',
      category: 'structure_readability',
      message: `Some sentences are very long (max: ${maxSentenceLength} words). LLMs prefer concise sentences.`,
      suggestion: `Keep sentences under ${rules.structure_rules.max_sentence_length} words`,
      impact_score: 5,
    });
  }

  return {
    has_sections: hasSections,
    section_count: sections.length,
    sections_detected: sections,

    has_bullets: hasBullets,
    bullet_count: bullets.length,

    sentence_count: sentences.length,
    avg_sentence_length: Math.round(avgSentenceLength),
    max_sentence_length: maxSentenceLength,

    paragraph_count: paragraphs.length,
    avg_paragraph_length: Math.round(avgParagraphLength * 10) / 10,

    readability_score: readabilityScore,
    chunking_quality: chunkingQuality,

    findings,
  };
}

function calculateReadabilityScore(text: string): number {
  // Simplified readability: shorter sentences + common words = higher score
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const words = text.split(/\s+/).filter((w) => w.length > 0);

  const avgSentenceLength = words.length / sentences.length || 1;
  const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / words.length || 1;

  // Ideal: avg sentence 15-20 words, avg word 4-6 chars
  const sentenceScore = Math.max(0, 100 - Math.abs(17.5 - avgSentenceLength) * 3);
  const wordScore = Math.max(0, 100 - Math.abs(5 - avgWordLength) * 10);

  return Math.round((sentenceScore + wordScore) / 2);
}

function calculateChunkingQuality(metrics: {
  hasSections: boolean;
  hasBullets: boolean;
  avgSentenceLength: number;
  avgParagraphLength: number;
}): number {
  let score = 50;  // Base score

  if (metrics.hasSections) score += 20;
  if (metrics.hasBullets) score += 15;
  if (metrics.avgSentenceLength < 25) score += 10;
  if (metrics.avgParagraphLength >= 2 && metrics.avgParagraphLength <= 5) score += 5;

  return Math.min(100, score);
}

// ============================================================================
// Cluster Coverage Analysis
// ============================================================================

function analyzeClusterCoverage(
  description: string,
  rules: LLMVisibilityRules
): ClusterCoverage & { findings?: LLMFinding[] } {
  const findings: LLMFinding[] = [];
  const descriptionLower = description.toLowerCase();

  const clusters = Object.entries(rules.clusters).map(([name, config]) => {
    // Count keyword mentions
    let mentions = 0;
    const examples: string[] = [];

    // Find sentences that match this cluster
    const sentences = description.split(/[.!?]+/).filter((s) => s.trim().length > 0);

    for (const sentence of sentences) {
      const sentenceLower = sentence.toLowerCase();
      const matchedKeywords = config.keywords.filter((kw) =>
        sentenceLower.includes(kw.toLowerCase())
      );

      if (matchedKeywords.length > 0) {
        mentions += matchedKeywords.length;
        if (examples.length < 2) {
          examples.push(sentence.trim());
        }
      }
    }

    // Calculate coverage score for this cluster
    // Based on: mention count × weight × saturation curve
    const rawScore = Math.min(mentions * 15, 100);  // Diminishing returns after ~7 mentions
    const coverageScore = Math.round(rawScore * config.weight);

    return {
      name,
      keywords: config.keywords,
      coverage_score: coverageScore,
      mentions,
      examples,
    };
  });

  // Overall coverage: weighted average of cluster scores
  const totalWeight = Object.values(rules.clusters).reduce((sum, c) => sum + c.weight, 0);
  const weightedSum = clusters.reduce((sum, c) => {
    const clusterConfig = rules.clusters[c.name];
    return sum + (c.coverage_score * clusterConfig.weight);
  }, 0);
  const overallCoverage = Math.round(weightedSum / totalWeight);

  // Generate findings for weak clusters
  clusters.forEach((cluster) => {
    if (cluster.coverage_score < 40) {
      const clusterConfig = rules.clusters[cluster.name];
      findings.push({
        id: `weak_cluster_${cluster.name}`,
        type: 'weak_cluster',
        severity: clusterConfig.weight > 0.8 ? 'warning' : 'info',
        category: 'semantic_clusters',
        message: `Weak coverage for "${cluster.name}" cluster (${cluster.coverage_score}/100)`,
        suggestion: `Add keywords like: ${clusterConfig.keywords.slice(0, 5).join(', ')}`,
        impact_score: Math.round(clusterConfig.weight * 10),
      });
    }
  });

  return {
    overall_coverage: overallCoverage,
    clusters,
    findings,
  };
}

// ============================================================================
// Intent Coverage Analysis
// ============================================================================

function analyzeIntentCoverage(
  description: string,
  rules: LLMVisibilityRules,
  existingIntents?: string[]
): IntentCoverage & { findings?: LLMFinding[] } {
  const findings: LLMFinding[] = [];
  const descriptionLower = description.toLowerCase();

  const intents = [
    {
      intent_type: 'task' as const,
      patterns: rules.intent_rules.task_intent,
    },
    {
      intent_type: 'comparison' as const,
      patterns: rules.intent_rules.comparison_intent,
    },
    {
      intent_type: 'problem' as const,
      patterns: rules.intent_rules.problem_intent,
    },
    {
      intent_type: 'feature' as const,
      patterns: rules.intent_rules.feature_intent,
    },
    {
      intent_type: 'safety' as const,
      patterns: rules.intent_rules.safety_intent,
    },
  ].map((intent) => {
    const patternsMatched: string[] = [];
    const examples: string[] = [];

    const sentences = description.split(/[.!?]+/).filter((s) => s.trim().length > 0);

    for (const pattern of intent.patterns) {
      const regex = new RegExp(pattern, 'i');
      for (const sentence of sentences) {
        if (regex.test(sentence)) {
          patternsMatched.push(pattern);
          if (examples.length < 2 && !examples.includes(sentence.trim())) {
            examples.push(sentence.trim());
          }
        }
      }
    }

    const coverageScore = Math.min(100, patternsMatched.length * 20);

    return {
      intent_type: intent.intent_type,
      coverage_score: coverageScore,
      patterns_matched: [...new Set(patternsMatched)],
      examples,
    };
  });

  const overallCoverage = Math.round(
    intents.reduce((sum, i) => sum + i.coverage_score, 0) / intents.length
  );

  // Compare with existing intent engine if available
  let comparisonWithIntentEngine: IntentCoverage['comparison_with_intent_engine'];
  if (existingIntents && existingIntents.length > 0) {
    const detectedByLLM = intents
      .filter((i) => i.coverage_score > 30)
      .map((i) => i.intent_type);

    const agreement = existingIntents.filter((ei) => detectedByLLM.includes(ei as any)).length;
    const agreementScore = Math.round(
      (agreement / Math.max(existingIntents.length, detectedByLLM.length)) * 100
    );

    comparisonWithIntentEngine = {
      detected_by_rules: existingIntents,
      detected_by_llm_visibility: detectedByLLM,
      agreement_score: agreementScore,
    };
  }

  // Generate findings for missing intents
  intents.forEach((intent) => {
    if (intent.coverage_score < 20) {
      findings.push({
        id: `missing_intent_${intent.intent_type}`,
        type: 'intent_gap',
        severity: 'info',
        category: 'intent_coverage',
        message: `Low coverage for "${intent.intent_type}" intent (${intent.coverage_score}/100)`,
        suggestion: `Add phrases that address ${intent.intent_type} queries`,
        impact_score: 5,
      });
    }
  });

  return {
    overall_coverage: overallCoverage,
    intents,
    comparison_with_intent_engine: comparisonWithIntentEngine,
    findings,
  };
}

// ============================================================================
// Snippet Extraction
// ============================================================================

function extractSnippets(
  description: string,
  rules: LLMVisibilityRules
): LLMSnippet[] {
  const snippets: LLMSnippet[] = [];
  const sentences = description.split(/[.!?]+/).filter((s) => s.trim().length > 0);

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    const length = trimmed.length;

    // Skip if too short or too long
    if (length < rules.snippet_rules.min_snippet_length ||
        length > rules.snippet_rules.max_snippet_length) {
      continue;
    }

    let qualityScore = 50;  // Base score
    let reason = 'Self-contained statement';
    const matchedPatterns: string[] = [];

    // Check against snippet patterns
    for (const pattern of rules.snippet_rules.snippet_patterns) {
      const regex = typeof pattern.pattern === 'string'
        ? new RegExp(pattern.pattern, 'i')
        : pattern.pattern;

      if (regex.test(trimmed)) {
        qualityScore += pattern.quality_boost * 100;
        matchedPatterns.push(pattern.name);
      }
    }

    // Bonus for facts/numbers
    if (/\b\d+\+?\s+(features?|users?|downloads?|activities)/.test(trimmed)) {
      qualityScore += 10;
      reason = 'Contains factual claim with numbers';
    }

    // Penalty for vague language
    if (/\b(some|many|various|several|etc)\b/i.test(trimmed)) {
      qualityScore -= 15;
    }

    qualityScore = Math.max(0, Math.min(100, qualityScore));

    if (qualityScore >= 60 && snippets.length < rules.snippet_rules.ideal_snippet_count) {
      snippets.push({
        text: trimmed,
        reason: matchedPatterns.length > 0
          ? `Matches patterns: ${matchedPatterns.join(', ')}`
          : reason,
        section: detectSection(description, trimmed),
        quality_score: Math.round(qualityScore),
      });
    }
  }

  // Sort by quality and return top N
  return snippets
    .sort((a, b) => b.quality_score - a.quality_score)
    .slice(0, rules.snippet_rules.ideal_snippet_count);
}

function detectSection(fullText: string, snippet: string): string {
  const beforeSnippet = fullText.substring(0, fullText.indexOf(snippet));
  const sectionMatch = beforeSnippet.match(/([A-Z][A-Za-z\s&]+):?\s*$/m);
  return sectionMatch ? sectionMatch[1].trim() : 'Introduction';
}

function calculateSnippetQualityScore(snippets: LLMSnippet[]): number {
  if (snippets.length === 0) return 0;

  const avgQuality = snippets.reduce((sum, s) => sum + s.quality_score, 0) / snippets.length;
  const countScore = Math.min(100, (snippets.length / 5) * 100);  // Ideal: 5 snippets

  return Math.round((avgQuality * 0.7) + (countScore * 0.3));
}

// ============================================================================
// Factual Grounding Analysis
// ============================================================================

function analyzeFactualGrounding(
  description: string,
  rules: LLMVisibilityRules
): { score: number; findings: LLMFinding[] } {
  const findings: LLMFinding[] = [];
  let score = 100;

  // Check for required facts
  const descriptionLower = description.toLowerCase();
  const missingFacts: string[] = [];

  for (const requiredFact of rules.factual_rules.required_facts) {
    const factPattern = rules.factual_rules.fact_patterns[requiredFact];
    if (factPattern) {
      const regex = new RegExp(factPattern, 'i');
      if (!regex.test(description)) {
        missingFacts.push(requiredFact);
        score -= 20;
      }
    }
  }

  if (missingFacts.length > 0) {
    findings.push({
      id: 'missing_facts',
      type: 'missing_fact',
      severity: 'warning',
      category: 'factual_grounding',
      message: `Missing key facts: ${missingFacts.join(', ')}`,
      suggestion: 'Add concrete, verifiable facts about your app',
      impact_score: missingFacts.length * 5,
    });
  }

  // Check for vague/avoid patterns
  for (const avoid of rules.factual_rules.avoid_patterns) {
    const regex = typeof avoid.pattern === 'string'
      ? new RegExp(avoid.pattern, 'i')
      : avoid.pattern;

    if (regex.test(description)) {
      score -= 10;
      findings.push({
        id: `avoid_pattern_${avoid.reason.substring(0, 20)}`,
        type: 'safety_risk',
        severity: 'info',
        category: 'factual_grounding',
        message: `Detected: "${avoid.reason}"`,
        suggestion: 'Replace with specific, verifiable claims',
        impact_score: 3,
      });
    }
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    findings,
  };
}

// ============================================================================
// Safety & Credibility Analysis
// ============================================================================

function analyzeSafetyCredibility(
  description: string,
  rules: LLMVisibilityRules
): { score: number; findings: LLMFinding[] } {
  const findings: LLMFinding[] = [];
  let score = 100;

  // Check forbidden phrases
  const descriptionLower = description.toLowerCase();
  for (const forbidden of rules.safety_rules.forbidden_phrases) {
    if (descriptionLower.includes(forbidden.toLowerCase())) {
      score -= 15;
      findings.push({
        id: `forbidden_${forbidden}`,
        type: 'safety_risk',
        severity: 'warning',
        category: 'safety_credibility',
        message: `Contains unverifiable claim: "${forbidden}"`,
        suggestion: 'Remove or replace with factual statement',
        impact_score: 10,
      });
    }
  }

  // Check risky patterns
  for (const risky of rules.safety_rules.risky_patterns) {
    const regex = typeof risky.pattern === 'string'
      ? new RegExp(risky.pattern, 'i')
      : risky.pattern;

    if (regex.test(description)) {
      const penaltyScore = risky.severity === 'critical' ? 25 : 10;
      score -= penaltyScore;

      findings.push({
        id: `risky_${risky.reason.substring(0, 20)}`,
        type: 'safety_risk',
        severity: risky.severity,
        category: 'safety_credibility',
        message: risky.reason,
        suggestion: 'Review and revise for compliance',
        impact_score: penaltyScore,
      });
    }
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    findings,
  };
}

// ============================================================================
// Overall Score Calculation
// ============================================================================

function calculateOverallScore(
  scores: Omit<LLMVisibilityScore, 'overall' | 'rules_version' | 'analyzed_at'>,
  weights: LLMVisibilityRules['weights']
): number {
  const weighted =
    scores.factual_grounding * weights.factual_grounding +
    scores.semantic_clusters * weights.semantic_clusters +
    scores.structure_readability * weights.structure_readability +
    scores.intent_coverage * weights.intent_coverage +
    scores.snippet_quality * weights.snippet_quality +
    scores.safety_credibility * weights.safety_credibility;

  return Math.round(weighted);
}
