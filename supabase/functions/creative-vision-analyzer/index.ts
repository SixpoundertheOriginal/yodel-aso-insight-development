import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const openAIModel = Deno.env.get('OPENAI_MODEL') || 'gpt-4.1-2025-04-14';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScreenshotInput {
  url: string;
  appName: string;
  appId: string;
}

interface ScreenshotAnalysisRequest {
  screenshots: ScreenshotInput[];
  analysisType?: 'individual' | 'batch';
  organizationId?: string;
  sessionId?: string;
  analyzeNarrativeFlow?: boolean;
}

interface NarrativeFlowAnalysis {
  coherenceScore: number;
  storyArc:
    | 'problem-solution'
    | 'feature-showcase'
    | 'social-proof'
    | 'lifestyle'
    | 'onboarding'
    | 'mixed';
  narrativeStrength: 'excellent' | 'good' | 'weak' | 'disconnected';
  userJourneyFlow: {
    screenshot1Role: 'hook' | 'problem' | 'feature' | 'social-proof';
    screenshot2Role: 'development' | 'solution' | 'benefits' | 'proof';
    screenshot3Role: 'reinforcement' | 'cta' | 'outcome' | 'social-validation';
  };
  recommendations: {
    messaging: string[];
    visualFlow: string[];
    userExperience: string[];
  };
  confidence: number;
}

interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
}

interface MessageAnalysis {
  primaryMessage: string;
  messageType: 'feature' | 'benefit' | 'social_proof' | 'emotional' | 'functional';
  psychologicalTrigger: 'trust' | 'curiosity' | 'urgency' | 'fear' | 'desire' | 'social_validation';
  attentionScore: number;
  confidence: number;
  keywords: string[];
}

interface VisualHierarchy {
  focal_point: string;
  visual_flow: string[];
  ui_elements: string[];
  layout_type: string;
}

interface ScreenshotAnalysis {
  appId: string;
  appName: string;
  screenshotUrl: string;
  colorPalette: ColorPalette;
  messageAnalysis: MessageAnalysis;
  visualHierarchy: VisualHierarchy;
  textContent: string[];
  designPatterns: string[];
  flowRole: 'hook' | 'feature' | 'proof' | 'CTA' | 'onboarding';
  recommendations: string[];
  confidence: number;
}

const analyzeScreenshotWithVision = async (screenshot: ScreenshotInput): Promise<ScreenshotAnalysis> => {
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  // Validate image URL
  if (!screenshot.url || !screenshot.url.startsWith('http')) {
    throw new Error(`Invalid screenshot URL: ${screenshot.url}`);
  }

  const prompt = `Analyze this individual app screenshot for ASO Creative Intelligence. Focus on this specific app's messaging and optimization opportunities.

**Analysis Framework:**
1. INDIVIDUAL SCREENSHOT MESSAGE: What specific message does THIS screenshot communicate?
2. PSYCHOLOGICAL TRIGGERS: What psychological element does this leverage? (trust, curiosity, urgency, fear, desire, social_validation)
3. ASO FLOW ROLE: What role does this screenshot play in the app store sequence? (hook, feature, proof, CTA, onboarding)
4. ATTENTION OPTIMIZATION: Rate attention-grabbing power (0-100) and suggest improvements

**App Context:** ${screenshot.appName}

**Required Analysis:**
- Extract all visible text and UI elements
- Identify the primary message and psychological trigger
- Assess visual hierarchy and attention flow
- Provide specific ASO optimization recommendations
- Determine this screenshot's role in the overall app store narrative

Return ONLY valid JSON with this structure:
{
  "messageAnalysis": {
    "primaryMessage": "specific message this screenshot conveys",
    "messageType": "feature|benefit|social_proof|emotional|functional",
    "psychologicalTrigger": "trust|curiosity|urgency|fear|desire|social_validation",
    "attentionScore": 85,
    "confidence": 0.95,
    "keywords": ["key", "words", "from", "screenshot"]
  },
  "colorPalette": {
    "primary": "dominant color description",
    "secondary": "secondary color description", 
    "accent": "accent color description",
    "background": "background color description",
    "text": "text color description"
  },
  "visualHierarchy": {
    "focal_point": "what draws attention first",
    "visual_flow": ["first element seen", "second element", "third element"],
    "ui_elements": ["button", "text", "icon", "etc"],
    "layout_type": "grid|list|hero|onboarding|feature_showcase|social_proof"
  },
  "textContent": ["all", "visible", "text", "elements"],
  "designPatterns": ["iOS_guidelines", "material_design", "custom_design"],
  "flowRole": "hook|feature|proof|CTA|onboarding",
  "recommendations": [
    "Specific ASO optimization suggestion 1",
    "Specific ASO optimization suggestion 2"
  ],
  "confidence": 0.9
}`;

  console.log(`Starting analysis for ${screenshot.appName} - ${screenshot.url}`);
  
  let openAIResponse;
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: openAIModel,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: screenshot.url } }
            ]
          }
        ],
        max_tokens: 2000,
        temperature: 0.1,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenAI API error ${response.status}:`, errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    openAIResponse = await response.json();
    const content = openAIResponse.choices?.[0]?.message?.content;
    
    if (!content) {
      console.error('No content in OpenAI response:', openAIResponse);
      throw new Error('No content received from OpenAI');
    }
    
    console.log(`Raw OpenAI response for ${screenshot.appName}:`, content.substring(0, 300) + '...');
    
    // Multiple JSON cleaning patterns
    let cleanContent = content;
    
    // Remove markdown code blocks
    cleanContent = cleanContent.replace(/```json\s*|\s*```/g, '');
    
    // Remove any text before first {
    const firstBrace = cleanContent.indexOf('{');
    if (firstBrace > 0) {
      cleanContent = cleanContent.substring(firstBrace);
    }
    
    // Remove any text after last }
    const lastBrace = cleanContent.lastIndexOf('}');
    if (lastBrace > 0) {
      cleanContent = cleanContent.substring(0, lastBrace + 1);
    }
    
    cleanContent = cleanContent.trim();
    console.log(`Cleaned content for ${screenshot.appName}:`, cleanContent.substring(0, 200) + '...');
    
    let analysisResult;
    try {
      analysisResult = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Failed to parse content:', cleanContent);
      throw new Error(`Invalid JSON response from OpenAI: ${parseError.message}`);
    }
    
    // Validate required fields
    if (!analysisResult.colorPalette || !analysisResult.messageAnalysis || !analysisResult.visualHierarchy) {
      console.error('Missing required fields in analysis result:', analysisResult);
      throw new Error('Incomplete analysis result from OpenAI');
    }
    
    console.log(`Successfully analyzed ${screenshot.appName}`);
    return {
      appId: screenshot.appId,
      appName: screenshot.appName,
      screenshotUrl: screenshot.url,
      ...analysisResult
    };
    
  } catch (error) {
    console.error(`Vision analysis error for ${screenshot.appName}:`, error);
    console.error('OpenAI response:', openAIResponse);
    throw new Error(`Failed to analyze screenshot for ${screenshot.appName}: ${error.message}`);
  }
};

const processBatchAnalysis = async (screenshots: ScreenshotInput[]): Promise<{
  individual: ScreenshotAnalysis[];
  patterns: ReturnType<typeof analyzePatterns>;
}> => {
  // Process screenshots in batches to respect rate limits
  const batchSize = 3;
  const results: ScreenshotAnalysis[] = [];
  
  for (let i = 0; i < screenshots.length; i += batchSize) {
    const batch = screenshots.slice(i, i + batchSize);
    const batchPromises = batch.map(screenshot => 
      analyzeScreenshotWithVision(screenshot).catch(error => {
        console.error(`Failed to analyze ${screenshot.appName}:`, error);
        return null;
      })
    );
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults.filter(result => result !== null));
    
    // Add delay between batches to respect rate limits
    if (i + batchSize < screenshots.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Analyze patterns across all results
  const patterns = analyzePatterns(results);
  
  return {
    individual: results,
    patterns
  };
};

const analyzePatterns = (analyses: ScreenshotAnalysis[]) => {
  const messageTypes = analyses.map(a => a.messageAnalysis.messageType);
  const designPatterns = analyses.flatMap(a => a.designPatterns);
  const layoutTypes = analyses.map(a => a.visualHierarchy.layout_type);
  
  return {
    commonMessageTypes: getFrequency(messageTypes),
    commonDesignPatterns: getFrequency(designPatterns),
    commonLayoutTypes: getFrequency(layoutTypes),
    insights: generateInsights(analyses)
  };
};

const getFrequency = (items: string[]) => {
  const frequency = items.reduce((acc, item) => {
    acc[item] = (acc[item] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return Object.entries(frequency)
    .sort(([,a], [,b]) => b - a)
    .map(([item, count]) => ({ item, count, percentage: (count / items.length) * 100 }));
};

const generateInsights = (analyses: ScreenshotAnalysis[]) => {
  const insights = [];
  
  // Color palette insights
  const primaryColors = analyses.map(a => a.colorPalette.primary);
  insights.push(`Most apps use ${getFrequency(primaryColors)[0]?.item || 'varied'} as primary color`);
  
  // Message type insights
  const messageTypes = getFrequency(analyses.map(a => a.messageAnalysis.messageType));
  insights.push(`${messageTypes[0]?.percentage.toFixed(0)}% of apps focus on ${messageTypes[0]?.item} messaging`);
  
  return insights;
};

const validateNarrativeAnalysis = (analysis: any): NarrativeFlowAnalysis => {
  return {
    coherenceScore: Math.min(100, Math.max(0, analysis?.coherenceScore || 0)),
    storyArc: ['problem-solution', 'feature-showcase', 'social-proof', 'lifestyle', 'onboarding', 'mixed'].includes(
      analysis?.storyArc
    )
      ? analysis.storyArc
      : 'mixed',
    narrativeStrength: ['excellent', 'good', 'weak', 'disconnected'].includes(analysis?.narrativeStrength)
      ? analysis.narrativeStrength
      : 'disconnected',
    userJourneyFlow: {
      screenshot1Role: analysis?.userJourneyFlow?.screenshot1Role || 'hook',
      screenshot2Role: analysis?.userJourneyFlow?.screenshot2Role || 'development',
      screenshot3Role: analysis?.userJourneyFlow?.screenshot3Role || 'reinforcement',
    },
    recommendations: {
      messaging: Array.isArray(analysis?.recommendations?.messaging)
        ? analysis.recommendations.messaging.slice(0, 5)
        : [],
      visualFlow: Array.isArray(analysis?.recommendations?.visualFlow)
        ? analysis.recommendations.visualFlow.slice(0, 5)
        : [],
      userExperience: Array.isArray(analysis?.recommendations?.userExperience)
        ? analysis.recommendations.userExperience.slice(0, 5)
        : [],
    },
    confidence: Math.min(100, Math.max(0, analysis?.confidence || 0)),
  };
};

const analyzeNarrativeFlow = async (
  screenshotUrls: string[],
  apiKey: string
): Promise<NarrativeFlowAnalysis> => {
  const prompt = `Analyze these 3 app store screenshots as a narrative sequence. Consider:

1. STORY COHERENCE: How well do these screenshots tell a cohesive story?
2. USER JOURNEY: What journey does a user experience viewing these in sequence?
3. NARRATIVE ARC: What type of story structure is being used?
4. MESSAGING FLOW: How does the messaging develop from screen 1 → 2 → 3?
5. VISUAL PROGRESSION: How does the visual complexity/focus change?

Provide analysis in this exact JSON format:
{
  "coherenceScore": number,
  "storyArc": "problem-solution" | "feature-showcase" | "social-proof" | "lifestyle" | "onboarding" | "mixed",
  "narrativeStrength": "excellent" | "good" | "weak" | "disconnected",
  "userJourneyFlow": {
    "screenshot1Role": "hook" | "problem" | "feature" | "social-proof",
    "screenshot2Role": "development" | "solution" | "benefits" | "proof",
    "screenshot3Role": "reinforcement" | "cta" | "outcome" | "social-validation"
  },
  "recommendations": {
    "messaging": ["specific messaging improvement suggestions"],
    "visualFlow": ["visual design flow improvements"],
    "userExperience": ["user experience enhancement suggestions"]
  },
  "confidence": number
}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: openAIModel,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            ...screenshotUrls.map((url) => ({ type: 'image_url', image_url: { url } })),
          ],
        },
      ],
      max_tokens: 1000,
      temperature: 0.1,
    }),
  });

  const result = await response.json();

  if (!result.choices?.[0]?.message?.content) {
    throw new Error('Invalid OpenAI response structure');
  }

  const content: string = result.choices[0].message.content;
  const jsonMatch = content.match(/```json\n?(.*?)\n?```/s) || content.match(/({.*})/s);
  const jsonString = jsonMatch ? jsonMatch[1] : content;
  let analysis;
  try {
    analysis = JSON.parse(jsonString);
  } catch (error) {
    throw new Error('Failed to parse narrative analysis JSON');
  }
  return validateNarrativeAnalysis(analysis);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      screenshots,
      analysisType = 'individual',
      analyzeNarrativeFlow: shouldAnalyzeNarrativeFlow,
    }: ScreenshotAnalysisRequest = await req.json();

    if (!screenshots || screenshots.length === 0) {
      throw new Error('No screenshots provided for analysis');
    }

    let result;
    if (analysisType === 'batch' && screenshots.length > 1) {
      result = await processBatchAnalysis(screenshots);
    } else {
      const individual = await Promise.all(
        screenshots.map((screenshot) => analyzeScreenshotWithVision(screenshot))
      );
      result = { individual, patterns: null };
    }

    const responseBody: Record<string, unknown> = { success: true, ...result };

    if (shouldAnalyzeNarrativeFlow && screenshots.length >= 3 && openAIApiKey) {
      try {
        const urls = screenshots.slice(0, 3).map((s) => s.url);
        responseBody.narrativeFlow = await analyzeNarrativeFlow(urls, openAIApiKey);
      } catch (error) {
        console.error('Narrative flow analysis failed:', error);
        responseBody.narrativeFlow = {
          coherenceScore: 0,
          storyArc: 'mixed',
          narrativeStrength: 'disconnected',
          userJourneyFlow: {
            screenshot1Role: 'hook',
            screenshot2Role: 'development',
            screenshot3Role: 'reinforcement',
          },
          recommendations: { messaging: [], visualFlow: [], userExperience: [] },
          confidence: 0,
        } as NarrativeFlowAnalysis;
      }
    }

    return new Response(JSON.stringify(responseBody), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Creative vision analyzer error:', error);
    return new Response(
      JSON.stringify({
        error: (error as Error).message,
        success: false,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});