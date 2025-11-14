/**
 * Narrative Engine Service
 * Generates human-readable narrative insights for ASO audits using OpenAI
 */

import OpenAI from 'openai';
import { ScrapedMetadata } from '@/types/aso';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
  dangerouslyAllowBrowser: true // For client-side usage
});

export interface ExecutiveSummaryNarrative {
  headline: string;
  overviewParagraph: string;
  keyFindings: string[];
  priorityRecommendation: string;
  marketContext: string;
}

export interface KeywordStrategyNarrative {
  strategyOverview: string;
  clusterInsights: string[];
  opportunityAnalysis: string;
  brandDependencyWarning: string | null;
  actionableRecommendations: string[];
}

export interface RiskAssessmentNarrative {
  overallRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskSummary: string;
  vulnerabilities: Array<{
    type: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    description: string;
    mitigation: string;
  }>;
  brandDependencyAnalysis: string;
  recommendations: string[];
}

export interface CompetitorStoryNarrative {
  marketPosition: string;
  competitiveGaps: string[];
  strengthsVsCompetitors: string[];
  weaknessesVsCompetitors: string[];
  strategicRecommendations: string[];
}

class NarrativeEngineService {
  private readonly MODEL = 'gpt-4o-mini'; // Fast, cost-effective model
  private readonly MAX_TOKENS = 1500;

  /**
   * Generate executive summary narrative
   */
  async generateExecutiveSummary(
    metadata: ScrapedMetadata,
    auditScores: {
      overall: number;
      metadata: number;
      keyword: number;
      competitor: number;
    },
    opportunityCount: number,
    topRecommendations: Array<{ title: string; priority: string; impact: number }>
  ): Promise<ExecutiveSummaryNarrative> {
    console.log('📝 [NARRATIVE] Generating executive summary for', metadata.name);

    const prompt = `You are an expert App Store Optimization (ASO) analyst writing an executive summary for a comprehensive ASO audit.

App Details:
- Name: ${metadata.name}
- Category: ${metadata.applicationCategory}
- Current Rating: ${metadata.rating}/5.0 (${metadata.reviews} reviews)

Audit Scores (0-100):
- Overall Health: ${auditScores.overall}/100
- Metadata Quality: ${auditScores.metadata}/100
- Keyword Performance: ${auditScores.keyword}/100
- Competitive Position: ${auditScores.competitor}/100

Key Findings:
- ${opportunityCount} high-priority optimization opportunities identified
- Top 3 Recommendations:
${topRecommendations.slice(0, 3).map(r => `  • ${r.title} (Impact: ${r.impact}%)`).join('\n')}

Generate a professional executive summary with:
1. A compelling headline (8-12 words) that captures the overall audit result
2. An overview paragraph (100-150 words) summarizing the app's ASO health
3. 4-5 key findings as bullet points (concise, data-driven)
4. A priority recommendation (1 sentence) - the single most impactful action to take
5. Market context (2-3 sentences) about the app's category and competitive landscape

Write in a professional, data-driven tone similar to consulting reports. Focus on actionable insights.

Return ONLY a valid JSON object with this structure:
{
  "headline": "...",
  "overviewParagraph": "...",
  "keyFindings": ["...", "...", "..."],
  "priorityRecommendation": "...",
  "marketContext": "..."
}`;

    try {
      const completion = await openai.chat.completions.create({
        model: this.MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are an expert ASO analyst who writes clear, data-driven audit reports. Always return valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: this.MAX_TOKENS,
        response_format: { type: 'json_object' }
      });

      const responseText = completion.choices[0].message.content || '{}';
      const narrative = JSON.parse(responseText) as ExecutiveSummaryNarrative;

      console.log('✅ [NARRATIVE] Executive summary generated successfully');
      return narrative;

    } catch (error) {
      console.error('❌ [NARRATIVE] Failed to generate executive summary:', error);
      return this.getFallbackExecutiveSummary(metadata, auditScores, opportunityCount);
    }
  }

  /**
   * Generate keyword strategy narrative
   */
  async generateKeywordStrategy(
    metadata: ScrapedMetadata,
    clusters: Array<{
      clusterName: string;
      primaryKeyword: string;
      relatedKeywords: string[];
      totalSearchVolume: number;
      opportunityScore: number;
    }>,
    brandDependencyRatio: number,
    visibilityScore: number,
    topRankingKeywords: string[]
  ): Promise<KeywordStrategyNarrative> {
    console.log('📝 [NARRATIVE] Generating keyword strategy for', metadata.name);

    const prompt = `You are an expert ASO strategist analyzing keyword performance and opportunities.

App: ${metadata.name}
Category: ${metadata.applicationCategory}

Keyword Performance:
- Visibility Score: ${visibilityScore}/100
- Brand Keyword Dependency: ${(brandDependencyRatio * 100).toFixed(1)}%
- Top Ranking Keywords: ${topRankingKeywords.slice(0, 5).join(', ')}

Keyword Clusters Identified:
${clusters.slice(0, 5).map((c, i) => `
${i + 1}. ${c.clusterName}
   - Primary: ${c.primaryKeyword}
   - Related: ${c.relatedKeywords.slice(0, 3).join(', ')}
   - Search Volume: ${c.totalSearchVolume.toLocaleString()}
   - Opportunity Score: ${(c.opportunityScore * 100).toFixed(0)}/100
`).join('\n')}

Generate a keyword strategy narrative with:
1. Strategy overview (2-3 sentences) - overall keyword health and direction
2. Cluster insights (3-5 bullet points) - what each major cluster reveals about the app's positioning
3. Opportunity analysis (100-120 words) - specific high-value keywords to target
4. Brand dependency warning (if ratio > 30%, explain the risk; otherwise null)
5. Actionable recommendations (5-7 specific steps to improve keyword performance)

Focus on strategic insights, not just data. Explain WHY certain keywords matter.

Return ONLY a valid JSON object:
{
  "strategyOverview": "...",
  "clusterInsights": ["...", "...", "..."],
  "opportunityAnalysis": "...",
  "brandDependencyWarning": "..." or null,
  "actionableRecommendations": ["...", "...", "..."]
}`;

    try {
      const completion = await openai.chat.completions.create({
        model: this.MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are an expert ASO strategist who provides actionable keyword insights. Always return valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: this.MAX_TOKENS,
        response_format: { type: 'json_object' }
      });

      const responseText = completion.choices[0].message.content || '{}';
      const narrative = JSON.parse(responseText) as KeywordStrategyNarrative;

      console.log('✅ [NARRATIVE] Keyword strategy generated successfully');
      return narrative;

    } catch (error) {
      console.error('❌ [NARRATIVE] Failed to generate keyword strategy:', error);
      return this.getFallbackKeywordStrategy(brandDependencyRatio);
    }
  }

  /**
   * Generate risk assessment narrative
   */
  async generateRiskAssessment(
    metadata: ScrapedMetadata,
    brandDependencyRatio: number,
    keywordCount: number,
    metadataScore: number,
    competitorScore: number
  ): Promise<RiskAssessmentNarrative> {
    console.log('📝 [NARRATIVE] Generating risk assessment for', metadata.name);

    // Calculate overall risk level
    const risks: string[] = [];
    if (brandDependencyRatio > 0.5) risks.push('HIGH brand dependency');
    if (keywordCount < 30) risks.push('LIMITED keyword coverage');
    if (metadataScore < 60) risks.push('SUBOPTIMAL metadata');
    if (competitorScore < 50) risks.push('WEAK competitive position');

    const overallRiskLevel: RiskAssessmentNarrative['overallRiskLevel'] =
      risks.length >= 3 ? 'CRITICAL' :
      risks.length === 2 ? 'HIGH' :
      risks.length === 1 ? 'MEDIUM' : 'LOW';

    const prompt = `You are an ASO risk analyst evaluating vulnerabilities and risks.

App: ${metadata.name}
Overall Risk Level: ${overallRiskLevel}

Risk Indicators:
- Brand Keyword Dependency: ${(brandDependencyRatio * 100).toFixed(1)}% ${brandDependencyRatio > 0.5 ? '⚠️ HIGH RISK' : '✅ Healthy'}
- Keyword Portfolio Size: ${keywordCount} keywords ${keywordCount < 30 ? '⚠️ Too narrow' : '✅ Adequate'}
- Metadata Quality Score: ${metadataScore}/100 ${metadataScore < 60 ? '⚠️ Needs improvement' : '✅ Good'}
- Competitive Position: ${competitorScore}/100 ${competitorScore < 50 ? '⚠️ Weak' : '✅ Strong'}

Generate a risk assessment narrative with:
1. Risk summary (2-3 sentences) - overall risk picture and urgency level
2. Detailed vulnerabilities (3-5 items) - each with:
   - type: (e.g., "Brand Over-Dependency", "Keyword Concentration")
   - severity: LOW | MEDIUM | HIGH
   - description: what the risk is and why it matters
   - mitigation: specific action to reduce the risk
3. Brand dependency analysis (2-3 sentences) - explain the brand keyword situation
4. Recommendations (4-6 actionable steps) - prioritized by urgency

Be direct and honest about risks. This is a professional audit, not marketing copy.

Return ONLY a valid JSON object:
{
  "overallRiskLevel": "${overallRiskLevel}",
  "riskSummary": "...",
  "vulnerabilities": [
    {
      "type": "...",
      "severity": "HIGH",
      "description": "...",
      "mitigation": "..."
    }
  ],
  "brandDependencyAnalysis": "...",
  "recommendations": ["...", "...", "..."]
}`;

    try {
      const completion = await openai.chat.completions.create({
        model: this.MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are an expert ASO risk analyst who identifies vulnerabilities and provides clear mitigation strategies. Always return valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.6, // Lower temperature for more focused risk analysis
        max_tokens: this.MAX_TOKENS,
        response_format: { type: 'json_object' }
      });

      const responseText = completion.choices[0].message.content || '{}';
      const narrative = JSON.parse(responseText) as RiskAssessmentNarrative;

      console.log('✅ [NARRATIVE] Risk assessment generated successfully');
      return narrative;

    } catch (error) {
      console.error('❌ [NARRATIVE] Failed to generate risk assessment:', error);
      return this.getFallbackRiskAssessment(overallRiskLevel, brandDependencyRatio);
    }
  }

  /**
   * Generate competitor story narrative
   */
  async generateCompetitorStory(
    metadata: ScrapedMetadata,
    competitorCount: number,
    userKeywordCount: number,
    competitorScore: number,
    sharedKeywords: string[],
    uniqueOpportunities: string[]
  ): Promise<CompetitorStoryNarrative> {
    console.log('📝 [NARRATIVE] Generating competitor story for', metadata.name);

    const prompt = `You are an ASO competitive intelligence analyst.

App: ${metadata.name}
Category: ${metadata.applicationCategory}

Competitive Landscape:
- Tracked Competitors: ${competitorCount}
- User's Keyword Count: ${userKeywordCount}
- Competitive Position Score: ${competitorScore}/100
- Shared Keywords: ${sharedKeywords.slice(0, 10).join(', ')}
- Unique Opportunities: ${uniqueOpportunities.slice(0, 10).join(', ')}

Generate a competitive analysis narrative with:
1. Market position (2-3 sentences) - where this app stands vs competitors
2. Competitive gaps (3-5 bullet points) - keywords/areas where competitors are winning
3. Strengths vs competitors (3-5 bullet points) - where this app has advantages
4. Weaknesses vs competitors (3-5 bullet points) - where this app is vulnerable
5. Strategic recommendations (5-7 specific actions) - how to gain competitive advantage

Focus on strategic differentiation and competitive advantage.

Return ONLY a valid JSON object:
{
  "marketPosition": "...",
  "competitiveGaps": ["...", "...", "..."],
  "strengthsVsCompetitors": ["...", "...", "..."],
  "weaknessesVsCompetitors": ["...", "...", "..."],
  "strategicRecommendations": ["...", "...", "..."]
}`;

    try {
      const completion = await openai.chat.completions.create({
        model: this.MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are an expert competitive intelligence analyst for ASO. Always return valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: this.MAX_TOKENS,
        response_format: { type: 'json_object' }
      });

      const responseText = completion.choices[0].message.content || '{}';
      const narrative = JSON.parse(responseText) as CompetitorStoryNarrative;

      console.log('✅ [NARRATIVE] Competitor story generated successfully');
      return narrative;

    } catch (error) {
      console.error('❌ [NARRATIVE] Failed to generate competitor story:', error);
      return this.getFallbackCompetitorStory(competitorScore);
    }
  }

  /**
   * Fallback executive summary if OpenAI fails
   */
  private getFallbackExecutiveSummary(
    metadata: ScrapedMetadata,
    auditScores: { overall: number; metadata: number; keyword: number; competitor: number },
    opportunityCount: number
  ): ExecutiveSummaryNarrative {
    const scoreLabel =
      auditScores.overall >= 80 ? 'Excellent' :
      auditScores.overall >= 60 ? 'Good' :
      auditScores.overall >= 40 ? 'Fair' : 'Needs Improvement';

    return {
      headline: `${metadata.name} ASO Health Check: ${scoreLabel} Performance`,
      overviewParagraph: `${metadata.name} has achieved an overall ASO health score of ${auditScores.overall}/100. The audit reveals ${opportunityCount} high-priority optimization opportunities across metadata, keyword strategy, and competitive positioning. With a metadata quality score of ${auditScores.metadata}/100 and keyword performance at ${auditScores.keyword}/100, there are clear pathways to improve app store visibility and organic discovery.`,
      keyFindings: [
        `Overall ASO health score: ${auditScores.overall}/100 (${scoreLabel})`,
        `Metadata optimization potential: ${100 - auditScores.metadata} points improvement available`,
        `Keyword visibility score: ${auditScores.keyword}/100`,
        `${opportunityCount} high-impact optimization opportunities identified`,
        `Competitive positioning score: ${auditScores.competitor}/100`
      ],
      priorityRecommendation: auditScores.metadata < 70
        ? 'Focus immediately on optimizing app title and subtitle to include high-value keywords while staying within character limits.'
        : 'Expand keyword coverage by targeting identified high-opportunity, low-competition keywords.',
      marketContext: `${metadata.applicationCategory} is a competitive category in the App Store. Success requires strategic keyword targeting, compelling metadata, and continuous optimization. The current rating of ${metadata.rating}/5.0 with ${metadata.reviews} reviews provides a solid foundation for growth.`
    };
  }

  /**
   * Fallback keyword strategy if OpenAI fails
   */
  private getFallbackKeywordStrategy(brandDependencyRatio: number): KeywordStrategyNarrative {
    const hasBrandRisk = brandDependencyRatio > 0.3;

    return {
      strategyOverview: 'Keyword strategy analysis reveals opportunities for expansion and diversification. Focus on building a balanced portfolio of branded and generic keywords to maximize organic discovery.',
      clusterInsights: [
        'Primary keyword clusters indicate core product positioning',
        'Semantic groupings reveal untapped thematic opportunities',
        'Search volume distribution suggests potential for category expansion'
      ],
      opportunityAnalysis: 'Analysis of keyword clusters reveals high-opportunity targets in adjacent categories. Focus on keywords with search volumes above 5,000 monthly searches and difficulty scores below 6/10. Prioritize long-tail variations that show strong user intent signals.',
      brandDependencyWarning: hasBrandRisk
        ? `Warning: ${(brandDependencyRatio * 100).toFixed(0)}% of tracked keywords contain your brand name. This over-reliance on branded search creates vulnerability. New users searching for solutions (not your specific brand) may never discover your app. Diversify your keyword portfolio with generic, category, and problem-solving keywords.`
        : null,
      actionableRecommendations: [
        'Expand keyword portfolio to include more generic category terms',
        'Target long-tail keywords with clear user intent',
        'Optimize metadata to include identified high-opportunity keywords',
        'Monitor keyword ranking trends weekly to catch early shifts',
        'Test keyword variations through metadata A/B testing when possible'
      ]
    };
  }

  /**
   * Fallback risk assessment if OpenAI fails
   */
  private getFallbackRiskAssessment(
    overallRiskLevel: RiskAssessmentNarrative['overallRiskLevel'],
    brandDependencyRatio: number
  ): RiskAssessmentNarrative {
    const vulnerabilities: RiskAssessmentNarrative['vulnerabilities'] = [];

    if (brandDependencyRatio > 0.5) {
      vulnerabilities.push({
        type: 'Brand Over-Dependency',
        severity: 'HIGH',
        description: 'Over 50% of keywords contain your brand name, limiting discoverability to users already aware of your app.',
        mitigation: 'Expand keyword strategy to include generic problem-solving and category keywords that capture new user search intent.'
      });
    }

    return {
      overallRiskLevel,
      riskSummary: `Risk assessment indicates ${overallRiskLevel.toLowerCase()} level vulnerabilities in your ASO strategy. ${vulnerabilities.length > 0 ? 'Primary concerns include keyword diversification and metadata optimization.' : 'Your ASO health is relatively strong with minor optimization opportunities.'}`,
      vulnerabilities,
      brandDependencyAnalysis: `Brand keyword dependency is at ${(brandDependencyRatio * 100).toFixed(0)}%. ${brandDependencyRatio > 0.3 ? 'This indicates over-reliance on brand awareness for discovery. Consider expanding to category-level and problem-solving keywords.' : 'This represents a healthy balance between branded and generic keyword targeting.'}`,
      recommendations: [
        'Diversify keyword portfolio beyond brand terms',
        'Implement keyword tracking for top 50 target keywords',
        'Optimize metadata to reduce single points of failure',
        'Monitor competitor keyword strategies monthly'
      ]
    };
  }

  /**
   * Fallback competitor story if OpenAI fails
   */
  private getFallbackCompetitorStory(competitorScore: number): CompetitorStoryNarrative {
    return {
      marketPosition: `With a competitive position score of ${competitorScore}/100, there are clear opportunities to strengthen market standing through strategic keyword targeting and metadata optimization.`,
      competitiveGaps: [
        'Competitors may be targeting high-value keywords not yet in your portfolio',
        'Potential metadata optimization opportunities based on competitive analysis',
        'Category leadership keywords show room for improvement'
      ],
      strengthsVsCompetitors: [
        'Current app rating and review volume provide credibility',
        'Established brand presence in core keyword areas',
        'Foundational ASO strategy in place'
      ],
      weaknessesVsCompetitors: [
        'Keyword coverage may be narrower than category leaders',
        'Metadata optimization lags behind best-in-class competitors',
        'Competitive differentiation could be strengthened'
      ],
      strategicRecommendations: [
        'Analyze top 5 competitors monthly for keyword strategy shifts',
        'Identify and target competitor keyword gaps',
        'Differentiate metadata to highlight unique value proposition',
        'Monitor competitor app updates and iterate quickly',
        'Build keyword moats around core positioning'
      ]
    };
  }
}

export const narrativeEngineService = new NarrativeEngineService();
