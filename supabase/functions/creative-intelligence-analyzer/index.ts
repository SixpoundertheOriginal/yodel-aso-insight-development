/**
 * Creative Intelligence Analyzer Edge Function
 *
 * Server-side AI analysis for creative intelligence insights.
 * Integrates with Creative Intelligence Registry for enhanced scoring,
 * theme classification, and contextual recommendations.
 *
 * Phase 1: Registry-Driven AI Analysis
 */

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';
import OpenAI from "https://esm.sh/openai@5.11.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const openai = new OpenAI({ apiKey: openAIApiKey });

interface CreativeAnalysisRequest {
  organizationId: string;
  metadata: {
    name: string;
    appId: string;
    developer?: string;
    category?: string;
    applicationCategory?: string;
    rating?: number;
    screenshots?: string[];
  };
  analysisResults: Array<{
    screenshotUrl: string;
    colors: {
      colorCount: number;
      dominantColors: Array<{ hex: string; saturation: number; brightness: number }>;
      averageBrightness: number;
    };
    text: {
      textDensity: number;
      estimatedTextPercentage: number;
      coverage: number;
    };
    layout: {
      layoutType: string;
      layoutScore: number;
      complexity: string;
      hasCTA: boolean;
      ctaPosition?: string;
      visualHierarchy: {
        focusAreas: any[];
      };
    };
    theme: {
      primary: string;
      theme: string;
      confidence: number;
    };
    ocr?: {
      text: string;
    };
  }>;
  registryScores: {
    overallScore: number;
    performanceTier: string;
    category: string;
    metricScores: {
      visual: number;
      text: number;
      messaging: number;
      engagement: number;
    };
    validationResults: Array<{
      passed: boolean;
      message: string;
      suggestion?: string;
    }>;
    recommendedThemes: Array<{
      id: string;
      name: string;
      categoryFit: number;
    }>;
  };
}

/**
 * Build enriched AI prompt using registry context
 */
function buildCreativeIntelligencePrompt(request: CreativeAnalysisRequest): string {
  const { metadata, analysisResults, registryScores } = request;

  const category = metadata.category || metadata.applicationCategory || 'default';

  // Build screenshot analysis summary
  const avgTextDensity = analysisResults.reduce((sum, r) => sum + r.text.textDensity, 0) / analysisResults.length;
  const avgColorCount = analysisResults.reduce((sum, r) => sum + r.colors.colorCount, 0) / analysisResults.length;
  const avgLayoutScore = analysisResults.reduce((sum, r) => sum + r.layout.layoutScore, 0) / analysisResults.length;

  const themes = analysisResults.map(r => r.theme.primary);
  const themeFrequency = themes.reduce((acc, theme) => {
    acc[theme] = (acc[theme] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const dominantTheme = Object.entries(themeFrequency).sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown';

  const layouts = analysisResults.map(r => r.layout.layoutType);
  const layoutFrequency = layouts.reduce((acc, layout) => {
    acc[layout] = (acc[layout] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const dominantLayout = Object.entries(layoutFrequency).sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown';

  const ctaCount = analysisResults.filter(r => r.layout.hasCTA).length;

  // Build validation summary
  const failedValidations = registryScores.validationResults
    .filter(v => !v.passed)
    .map(v => `- ${v.message}${v.suggestion ? ` (Suggestion: ${v.suggestion})` : ''}`)
    .join('\n');

  // Build recommended themes summary
  const themesText = registryScores.recommendedThemes
    .map(t => `- ${t.name} (${t.categoryFit}% fit for ${category})`)
    .join('\n');

  return `You are an expert App Store Optimization (ASO) creative strategist analyzing app screenshots and visual assets.

**CREATIVE INTELLIGENCE REGISTRY CONTEXT**

This analysis is powered by the Creative Intelligence Registry, which provides:
- Theme classification and category benchmarks
- Scoring rubrics optimized for ${category} apps
- Best practice validators and quality checks
- Category-specific performance tiers

**APP DETAILS**
- Name: ${metadata.name}
- App ID: ${metadata.appId}
- Category: ${category}
- Developer: ${metadata.developer || 'Unknown'}
- Current Rating: ${metadata.rating?.toFixed(1) || 'N/A'}/5.0
- Screenshots Analyzed: ${analysisResults.length}

**REGISTRY-DRIVEN CREATIVE SCORE**
Overall Score: ${registryScores.overallScore}/100 (${registryScores.performanceTier.toUpperCase()} tier)

Metric Breakdown:
- Visual Quality: ${registryScores.metricScores.visual}/100
- Text Clarity: ${registryScores.metricScores.text}/100
- Messaging Consistency: ${registryScores.metricScores.messaging}/100
- Engagement/CTA: ${registryScores.metricScores.engagement}/100

**SCREENSHOT ANALYSIS SUMMARY**
- Average Text Density: ${(avgTextDensity * 100).toFixed(1)}%
- Average Color Count: ${avgColorCount.toFixed(1)} colors per screenshot
- Average Layout Score: ${avgLayoutScore.toFixed(0)}/100
- Dominant Theme: ${dominantTheme}
- Dominant Layout: ${dominantLayout}
- CTA Presence: ${ctaCount}/${analysisResults.length} screenshots
- Total Screenshots: ${analysisResults.length}

**RECOMMENDED THEMES FOR ${category.toUpperCase()} CATEGORY**
${themesText}

**VALIDATION FINDINGS**
${failedValidations || 'All quality checks passed ✓'}

**DETAILED SCREENSHOT DATA**
${analysisResults.map((result, idx) => `
Screenshot ${idx + 1}:
- Theme: ${result.theme.primary} (${result.theme.confidence.toFixed(0)}% confidence)
- Layout: ${result.layout.layoutType} (score: ${result.layout.layoutScore}/100)
- Text Coverage: ${result.text.estimatedTextPercentage.toFixed(0)}%
- Colors: ${result.colors.colorCount} (avg brightness: ${(result.colors.averageBrightness * 100).toFixed(0)}%)
- CTA Present: ${result.layout.hasCTA ? `Yes (${result.layout.ctaPosition})` : 'No'}
${result.ocr?.text ? `- Extracted Text: "${result.ocr.text.slice(0, 150).replace(/\n/g, ' ')}${result.ocr.text.length > 150 ? '...' : ''}"` : ''}
`).join('\n')}

**YOUR TASK**

Provide strategic creative intelligence insights with:

1. **opportunities** (5-8 items): Specific creative optimization opportunities
   - Focus on registry scores where performance is below category benchmarks
   - Each with: text (description), severity (minor/moderate/major/critical), category (messaging/visual/layout/theme/cta)

2. **test_plan**: A/B test recommendations
   - 2-3 variants with: name, description, changes (array of specific modifications), expected_impact
   - 3-4 hypotheses to test
   - 4-6 key metrics to track
   - duration_recommendation (e.g., "2-3 weeks")
   - confidence_level (low/medium/high)

3. **narratives**: Strategic positioning insights
   - vertical_positioning: How the app positions itself in the ${category} category
   - theme_summary: Overall creative theme and mood (2-3 sentences)
   - messaging_hierarchy: Priority and structure of messaging
   - seasonality: Time-sensitive creative considerations
   - competitive_angle: What differentiates this creative from competitors in ${category}

4. **weaknesses** (3-5 items): Areas needing improvement
   - Each with: area, severity (low/medium/high), description, recommendation
   - Prioritize based on registry validation failures

5. **screenshot_theme_summary**: High-level creative assessment
   - dominant_themes: array of 3-5 descriptive tags
   - color_strategy: 1-2 sentences about color usage and psychology
   - text_density_assessment: 1-2 sentences about text balance (consider ${(avgTextDensity * 100).toFixed(0)}% avg)
   - visual_consistency: 1-2 sentences about cohesion across screenshots
   - brand_coherence: 1-2 sentences about brand identity strength

**IMPORTANT GUIDELINES**
- Use the registry scores to identify specific weaknesses
- Reference the recommended themes for the ${category} category
- Compare performance to category benchmarks (${registryScores.performanceTier} tier)
- Address validation failures in your opportunities/weaknesses
- Be specific and actionable
- Use professional, data-driven consulting tone

Return ONLY a valid JSON object with this exact structure:
{
  "opportunities": [{"text": "...", "severity": "major", "category": "messaging"}, ...],
  "test_plan": {
    "variants": [{"name": "...", "description": "...", "changes": ["...", "..."], "expected_impact": "..."}, ...],
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
  "weaknesses": [{"area": "...", "severity": "high", "description": "...", "recommendation": "..."}, ...],
  "screenshot_theme_summary": {
    "dominant_themes": ["modern", "vibrant", "..."],
    "color_strategy": "...",
    "text_density_assessment": "...",
    "visual_consistency": "...",
    "brand_coherence": "..."
  }
}`;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authorization
    const authorization = req.headers.get('Authorization');
    if (!authorization) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authorization.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse request body
    const requestData = await req.json() as CreativeAnalysisRequest;
    const { organizationId, metadata, analysisResults, registryScores } = requestData;

    console.log('[Creative Intelligence Analyzer] Processing request:', {
      organizationId,
      appName: metadata.name,
      category: metadata.category || metadata.applicationCategory,
      screenshots: analysisResults.length,
      overallScore: registryScores.overallScore,
      tier: registryScores.performanceTier
    });

    // Validate required fields
    if (!organizationId || !metadata || !analysisResults || !registryScores) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields: organizationId, metadata, analysisResults, registryScores'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Check OpenAI API key
    if (!openAIApiKey) {
      return new Response(
        JSON.stringify({
          error: 'OpenAI API key not configured',
          insights: {
            opportunities: [{
              text: 'Configure OpenAI API key to unlock AI-powered creative insights',
              severity: 'critical',
              category: 'technical'
            }],
            test_plan: {
              variants: [],
              hypotheses: [],
              metrics: [],
              duration_recommendation: 'N/A',
              confidence_level: 'low'
            },
            narratives: {
              vertical_positioning: 'API configuration required',
              theme_summary: 'API configuration required',
              messaging_hierarchy: 'API configuration required',
              seasonality: 'API configuration required',
              competitive_angle: 'API configuration required'
            },
            weaknesses: [{
              area: 'Configuration',
              severity: 'high',
              description: 'OpenAI API key not configured',
              recommendation: 'Add OPENAI_API_KEY to environment variables'
            }],
            screenshot_theme_summary: {
              dominant_themes: [],
              color_strategy: 'API configuration required',
              text_density_assessment: 'API configuration required',
              visual_consistency: 'API configuration required',
              brand_coherence: 'API configuration required'
            }
          }
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Build AI prompt with registry context
    const prompt = buildCreativeIntelligencePrompt(requestData);

    console.log('[Creative Intelligence Analyzer] Calling OpenAI (gpt-4o-mini)...');

    // Call OpenAI
    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert ASO creative strategist with deep knowledge of app store optimization, visual design, and conversion optimization. Always return valid JSON only, no markdown formatting."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 2500,
      temperature: 0.7,
      response_format: { type: 'json_object' }
    });

    const aiContent = aiResponse.choices[0]?.message?.content;
    if (!aiContent) {
      throw new Error('Empty response from OpenAI');
    }

    console.log('[Creative Intelligence Analyzer] Parsing AI response...');

    // Parse and validate response
    const insights = JSON.parse(aiContent);

    // Add metadata
    const enrichedInsights = {
      ...insights,
      generated_at: new Date().toISOString(),
      registry_version: '1.0.0',
      model: 'gpt-4o-mini',
      app_id: metadata.appId,
      category: metadata.category || metadata.applicationCategory,
      overall_score: registryScores.overallScore,
      performance_tier: registryScores.performanceTier
    };

    console.log('[Creative Intelligence Analyzer] Success! Generated insights for:', metadata.name);

    return new Response(
      JSON.stringify({
        success: true,
        insights: enrichedInsights
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[Creative Intelligence Analyzer] Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
