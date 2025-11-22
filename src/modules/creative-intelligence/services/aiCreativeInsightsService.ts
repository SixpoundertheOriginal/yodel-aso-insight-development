/**
 * AI Creative Insights Service
 *
 * Generates structured creative intelligence insights using OpenAI.
 * Analyzes screenshot data, themes, colors, and layouts to provide
 * actionable creative strategy recommendations.
 *
 * Phase 3: AI Creative Insights Layer
 */

import OpenAI from 'openai';
import { ScrapedMetadata } from '@/types/aso';
import { ScreenshotAnalysisResult } from './screenshotAnalysisService';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
  dangerouslyAllowBrowser: true
});

export interface CreativeOpportunity {
  text: string;
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  category: 'messaging' | 'visual' | 'layout' | 'theme' | 'cta';
}

export interface TestVariant {
  name: string;
  description: string;
  changes: string[];
  expected_impact: string;
}

export interface CreativeTestPlan {
  variants: TestVariant[];
  hypotheses: string[];
  metrics: string[];
  duration_recommendation: string;
  confidence_level: 'low' | 'medium' | 'high';
}

export interface CreativeNarratives {
  vertical_positioning: string;
  theme_summary: string;
  messaging_hierarchy: string;
  seasonality: string;
  competitive_angle: string;
}

export interface CreativeWeakness {
  area: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  recommendation: string;
}

export interface ScreenshotThemeSummary {
  dominant_themes: string[];
  color_strategy: string;
  text_density_assessment: string;
  visual_consistency: string;
  brand_coherence: string;
}

export interface AiCreativeInsights {
  opportunities: CreativeOpportunity[];
  test_plan: CreativeTestPlan;
  narratives: CreativeNarratives;
  weaknesses: CreativeWeakness[];
  screenshot_theme_summary: ScreenshotThemeSummary;
  generated_at: Date;
  processing_time: number;
}

export interface CreativeAnalysisFull {
  metadata: ScrapedMetadata;
  screenshots: string[];
  analysisResults: ScreenshotAnalysisResult[];
}

class AiCreativeInsightsService {
  private readonly MODEL = 'gpt-4o-mini';
  private readonly MAX_TOKENS = 2500;

  /**
   * Generate comprehensive creative insights from screenshot analysis
   */
  async generateCreativeInsights(
    analysis: CreativeAnalysisFull
  ): Promise<AiCreativeInsights> {
    const startTime = Date.now();

    console.log('[AI Creative Insights] Starting insight generation for:', analysis.metadata.name);
    console.log('[AI Creative Insights] Analyzing', analysis.screenshots.length, 'screenshots');

    // Prepare analysis summary
    const analysisSummary = this.prepareAnalysisSummary(analysis);

    const prompt = `You are an expert App Store Optimization (ASO) creative strategist analyzing app screenshots and visual assets.

App Details:
- Name: ${analysis.metadata.name}
- Category: ${analysis.metadata.applicationCategory}
- Developer: ${analysis.metadata.developer}
- Current Rating: ${analysis.metadata.rating}/5.0

Screenshot Analysis Summary:
${analysisSummary}

Your task is to provide strategic creative intelligence with:

1. **Opportunities** (5-8 items): Specific creative optimization opportunities
   - Each with text description, severity (minor/moderate/major/critical), and category (messaging/visual/layout/theme/cta)

2. **Test Plan**: A/B test recommendations
   - 2-3 variants with names, descriptions, specific changes, and expected impact
   - 3-4 hypotheses to test
   - 4-6 key metrics to track
   - Duration recommendation (e.g., "2-3 weeks")
   - Confidence level (low/medium/high)

3. **Narratives**: Strategic positioning insights
   - Vertical positioning: How the app positions itself in its category
   - Theme summary: Overall creative theme and mood (2-3 sentences)
   - Messaging hierarchy: Priority and structure of messaging
   - Seasonality: Time-sensitive creative considerations
   - Competitive angle: What differentiates this creative from competitors

4. **Weaknesses** (3-5 items): Areas needing improvement
   - Each with area name, severity (low/medium/high), description, and specific recommendation

5. **Screenshot Theme Summary**: High-level creative assessment
   - Dominant themes (array of 3-5 descriptive tags)
   - Color strategy (1-2 sentences about color usage and psychology)
   - Text density assessment (1-2 sentences about text balance)
   - Visual consistency (1-2 sentences about cohesion across screenshots)
   - Brand coherence (1-2 sentences about brand identity strength)

Write in a professional, data-driven consulting tone. Be specific and actionable.

Return ONLY a valid JSON object with this exact structure:
{
  "opportunities": [
    {"text": "...", "severity": "major", "category": "messaging"},
    ...
  ],
  "test_plan": {
    "variants": [
      {"name": "Variant A", "description": "...", "changes": ["...", "..."], "expected_impact": "..."},
      ...
    ],
    "hypotheses": ["...", "..."],
    "metrics": ["...", "..."],
    "duration_recommendation": "2-3 weeks",
    "confidence_level": "high"
  },
  "narratives": {
    "vertical_positioning": "...",
    "theme_summary": "...",
    "messaging_hierarchy": "...",
    "seasonality": "...",
    "competitive_angle": "..."
  },
  "weaknesses": [
    {"area": "...", "severity": "high", "description": "...", "recommendation": "..."},
    ...
  ],
  "screenshot_theme_summary": {
    "dominant_themes": ["modern", "vibrant", "..."],
    "color_strategy": "...",
    "text_density_assessment": "...",
    "visual_consistency": "...",
    "brand_coherence": "..."
  }
}`;

    try {
      console.log('[AI Creative Insights] Calling OpenAI with creative analysis...');

      const response = await openai.chat.completions.create({
        model: this.MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are an expert ASO creative strategist. Always return valid JSON only, no markdown formatting.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: this.MAX_TOKENS,
        temperature: 0.7,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from OpenAI');
      }

      console.log('[AI Creative Insights] Received response, parsing JSON...');

      // Parse and validate response
      const parsed = JSON.parse(content);

      const processingTime = Date.now() - startTime;
      console.log('[AI Creative Insights] Successfully generated insights in', processingTime, 'ms');

      return {
        ...parsed,
        generated_at: new Date(),
        processing_time: processingTime
      };
    } catch (error) {
      console.error('[AI Creative Insights] Failed to generate insights:', error);
      throw new Error(`Failed to generate creative insights: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Prepare analysis summary for the AI prompt
   */
  private prepareAnalysisSummary(analysis: CreativeAnalysisFull): string {
    const results = analysis.analysisResults;

    if (results.length === 0) {
      return 'No screenshot analysis data available.';
    }

    // Aggregate statistics
    const avgTextDensity = results.reduce((sum, r) => sum + r.text.textDensity, 0) / results.length;
    const avgColorCount = results.reduce((sum, r) => sum + r.colors.colorCount, 0) / results.length;
    const avgLayoutScore = results.reduce((sum, r) => sum + r.layout.layoutScore, 0) / results.length;

    // Collect themes
    const themes = results.map(r => r.theme.primary);
    const themeFrequency = themes.reduce((acc, theme) => {
      acc[theme] = (acc[theme] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const dominantTheme = Object.entries(themeFrequency).sort((a, b) => b[1] - a[1])[0][0];

    // Collect layout types
    const layouts = results.map(r => r.layout.layoutType);
    const layoutFrequency = layouts.reduce((acc, layout) => {
      acc[layout] = (acc[layout] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const dominantLayout = Object.entries(layoutFrequency).sort((a, b) => b[1] - a[1])[0][0];

    // Collect dominant colors
    const allColors = results.flatMap(r => r.colors.dominantColors.slice(0, 3).map(c => c.hex));
    const uniqueColors = [...new Set(allColors)];

    // Collect CTAs
    const ctaCount = results.filter(r => r.layout.hasCTA).length;
    const ctaPositions = results.filter(r => r.layout.hasCTA).map(r => r.layout.ctaPosition);

    // Build summary
    let summary = `Total Screenshots: ${results.length}\n\n`;
    summary += `Visual Analysis:\n`;
    summary += `- Average Text Density: ${(avgTextDensity * 100).toFixed(1)}%\n`;
    summary += `- Average Color Count: ${avgColorCount.toFixed(1)}\n`;
    summary += `- Average Layout Score: ${avgLayoutScore.toFixed(0)}/100\n`;
    summary += `- Dominant Theme: ${dominantTheme}\n`;
    summary += `- Dominant Layout: ${dominantLayout}\n`;
    summary += `- CTA Presence: ${ctaCount}/${results.length} screenshots\n`;
    if (ctaPositions.length > 0) {
      summary += `- CTA Positions: ${ctaPositions.join(', ')}\n`;
    }
    summary += `- Color Palette: ${uniqueColors.slice(0, 10).join(', ')}\n\n`;

    summary += `Individual Screenshot Insights:\n`;
    results.forEach((result, idx) => {
      summary += `\nScreenshot ${idx + 1}:\n`;
      summary += `  - Theme: ${result.theme.primary} (${result.theme.confidence.toFixed(0)}% confidence)\n`;
      summary += `  - Layout: ${result.layout.layoutType} (score: ${result.layout.layoutScore}/100)\n`;
      summary += `  - Text Coverage: ${result.text.estimatedTextPercentage.toFixed(0)}%\n`;
      summary += `  - Colors: ${result.colors.colorCount} (brightness: ${(result.colors.averageBrightness * 100).toFixed(0)}%)\n`;
      if (result.ocr && result.ocr.text.trim().length > 0) {
        const preview = result.ocr.text.slice(0, 100).replace(/\n/g, ' ');
        summary += `  - Extracted Text: "${preview}${result.ocr.text.length > 100 ? '...' : ''}"\n`;
      }
      if (result.layout.hasCTA) {
        summary += `  - CTA Position: ${result.layout.ctaPosition}\n`;
      }
    });

    return summary;
  }
}

// Export singleton instance
export const aiCreativeInsightsService = new AiCreativeInsightsService();
