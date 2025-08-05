import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FeatureExtractionRequest {
  appName: string;
  description: string;
  subtitle?: string;
  category?: string;
  organizationId: string;
}

interface FeatureExtractionResponse {
  features: string[];
  confidence: number;
  extractionMethod: 'ai' | 'fallback';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { appName, description, subtitle, category, organizationId }: FeatureExtractionRequest = await req.json();

    console.log(`🎯 [FEATURE-EXTRACTOR] Starting extraction for: ${appName}`);

    // Validate required fields
    if (!appName || !description || !organizationId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: appName, description, organizationId' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    let features: string[] = [];
    let confidence = 0;
    let extractionMethod: 'ai' | 'fallback' = 'fallback';

    // Try AI extraction first
    if (openAIApiKey) {
      try {
        console.log(`🧠 [FEATURE-EXTRACTOR] Using AI extraction for ${appName}`);
        
        const prompt = `You are analyzing an App Store listing to extract concise, marketing-relevant distinctive features.

App Name: ${appName}
Category: ${category || 'Unknown'}
Subtitle: ${subtitle || 'N/A'}

App Store Description:
"""
${description}
"""

Extract 6-10 distinctive features that this app promotes or emphasizes. Focus on:
- Core functionality and capabilities
- Unique selling points
- User experience features
- Content types or learning methods
- Platform capabilities
- Key benefits users get

Return ONLY a JSON array of short phrases (2-5 words each), like:
["audio-based learning", "offline mode", "progress tracking", "native speakers", "hands-free experience"]

Do not include generic features like "user-friendly interface" or "easy to use". Focus on what makes this app unique.`;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4.1-2025-04-14',
            messages: [
              { role: 'user', content: prompt }
            ],
            temperature: 0.3,
            max_tokens: 500
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const content = data.choices[0].message.content.trim();
          
          // Parse the JSON response
          try {
            const extractedFeatures = JSON.parse(content);
            if (Array.isArray(extractedFeatures) && extractedFeatures.length > 0) {
              features = extractedFeatures.slice(0, 10); // Limit to 10 features
              confidence = 0.9;
              extractionMethod = 'ai';
              console.log(`✅ [FEATURE-EXTRACTOR] AI extracted ${features.length} features`);
            } else {
              throw new Error('Invalid AI response format');
            }
          } catch (parseError) {
            console.warn(`⚠️ [FEATURE-EXTRACTOR] Failed to parse AI response, falling back to simple extraction`);
            throw parseError;
          }
        } else {
          throw new Error(`OpenAI API error: ${response.status}`);
        }
      } catch (aiError) {
        console.warn(`⚠️ [FEATURE-EXTRACTOR] AI extraction failed:`, aiError);
        // Fall through to fallback method
      }
    }

    // Fallback extraction if AI fails or no API key
    if (features.length === 0) {
      console.log(`🔄 [FEATURE-EXTRACTOR] Using fallback extraction for ${appName}`);
      features = extractFeaturesFromText(description, subtitle, appName);
      confidence = 0.6;
      extractionMethod = 'fallback';
    }

    const result: FeatureExtractionResponse = {
      features,
      confidence,
      extractionMethod
    };

    console.log(`✅ [FEATURE-EXTRACTOR] Extraction complete:`, {
      appName,
      featuresCount: features.length,
      method: extractionMethod,
      confidence
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ [FEATURE-EXTRACTOR] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Feature extraction failed',
        details: error.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Fallback feature extraction using keyword analysis
function extractFeaturesFromText(description: string, subtitle?: string, appName?: string): string[] {
  const text = `${appName || ''} ${subtitle || ''} ${description}`.toLowerCase();
  const features: string[] = [];

  // Common app feature patterns
  const patterns = [
    // Learning features
    { pattern: /(offline|download|cache).*?(mode|learning|content)/g, feature: 'offline mode' },
    { pattern: /(audio|voice|speech|listen)/g, feature: 'audio learning' },
    { pattern: /(progress|track|achievement|level)/g, feature: 'progress tracking' },
    { pattern: /(quiz|test|exercise|practice)/g, feature: 'interactive exercises' },
    { pattern: /(game|gamif|fun|play)/g, feature: 'gamified experience' },
    
    // Content types
    { pattern: /(lesson|course|curriculum|structured)/g, feature: 'structured lessons' },
    { pattern: /(video|visual|watch)/g, feature: 'video content' },
    { pattern: /(native.*?speaker|authentic.*?accent)/g, feature: 'native speakers' },
    
    // Platform features
    { pattern: /(sync|cloud|backup|device)/g, feature: 'cloud sync' },
    { pattern: /(notification|remind|alert)/g, feature: 'smart reminders' },
    { pattern: /(personalized|adaptive|custom)/g, feature: 'personalized learning' },
    
    // User experience
    { pattern: /(hands.*?free|voice.*?control)/g, feature: 'hands-free learning' },
    { pattern: /(quick|fast|speed|rapid)/g, feature: 'quick sessions' },
    { pattern: /(beginner|advanced|all.*?level)/g, feature: 'all skill levels' },
  ];

  patterns.forEach(({ pattern, feature }) => {
    if (pattern.test(text) && !features.includes(feature)) {
      features.push(feature);
    }
  });

  // Extract specific languages if mentioned
  const languages = text.match(/(spanish|french|german|italian|portuguese|chinese|japanese|korean|russian|arabic|hindi)/g);
  if (languages && languages.length > 0) {
    const uniqueLanguages = [...new Set(languages)];
    if (uniqueLanguages.length <= 3) {
      features.push(`${uniqueLanguages.join(', ')} languages`);
    } else {
      features.push('multiple languages');
    }
  }

  // If we found very few features, add some generic ones based on category
  if (features.length < 3) {
    if (text.includes('language') || text.includes('learn')) {
      features.push('language learning', 'educational content');
    }
    if (text.includes('fitness') || text.includes('health')) {
      features.push('fitness tracking', 'health monitoring');
    }
    if (text.includes('productivity') || text.includes('work')) {
      features.push('productivity tools', 'workflow optimization');
    }
  }

  return features.slice(0, 8); // Limit to 8 features for fallback
}