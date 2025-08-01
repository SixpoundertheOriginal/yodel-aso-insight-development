import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScreenshotAnalysisRequest {
  screenshots: Array<{
    url: string;
    appName: string;
    appId: string;
  }>;
  analysisType?: 'individual' | 'batch';
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
  confidence: number;
}

const analyzeScreenshotWithVision = async (screenshot: any): Promise<ScreenshotAnalysis> => {
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  // Validate image URL
  if (!screenshot.url || !screenshot.url.startsWith('http')) {
    throw new Error(`Invalid screenshot URL: ${screenshot.url}`);
  }

  const prompt = `Analyze this app screenshot by following these steps:

1. COLOR PALETTE: Identify the dominant colors used
2. TEXT CONTENT: Extract all visible text elements
3. IMAGERY: Describe visual elements, icons, and graphics

From this analysis, determine:
1) PRIMARY MESSAGE: What is the main message being communicated?
2) MESSAGE TYPE: Classify as one of: feature, benefit, social_proof, emotional, functional
3) VISUAL HIERARCHY: What draws attention first, second, third?

Also identify:
- Design patterns (material design, iOS guidelines, custom)
- UI elements (buttons, cards, navigation, etc.)
- Layout type (grid, list, hero, onboarding, etc.)

Return ONLY a valid JSON response with this exact structure:
{
  "colorPalette": {
    "primary": "color description",
    "secondary": "color description", 
    "accent": "color description",
    "background": "color description",
    "text": "color description"
  },
  "messageAnalysis": {
    "primaryMessage": "main message",
    "messageType": "feature|benefit|social_proof|emotional|functional",
    "confidence": 0.95,
    "keywords": ["key", "words"]
  },
  "visualHierarchy": {
    "focal_point": "what draws attention first",
    "visual_flow": ["first", "second", "third"],
    "ui_elements": ["button", "card", "etc"],
    "layout_type": "grid|list|hero|onboarding|etc"
  },
  "textContent": ["extracted", "text", "elements"],
  "designPatterns": ["pattern1", "pattern2"],
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
        model: 'gpt-4o-mini', // Using faster, cheaper model
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: screenshot.url } }
            ]
          }
        ],
        max_tokens: 1500,
        temperature: 0.1,
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

const processBatchAnalysis = async (screenshots: any[]): Promise<{
  individual: ScreenshotAnalysis[];
  patterns: any;
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { screenshots, analysisType = 'individual' }: ScreenshotAnalysisRequest = await req.json();

    if (!screenshots || screenshots.length === 0) {
      throw new Error('No screenshots provided for analysis');
    }

    let result;
    if (analysisType === 'batch' && screenshots.length > 1) {
      result = await processBatchAnalysis(screenshots);
    } else {
      const individual = await Promise.all(
        screenshots.map(screenshot => analyzeScreenshotWithVision(screenshot))
      );
      result = { individual, patterns: null };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Creative vision analyzer error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});