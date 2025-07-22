
export interface CppTheme {
  id: string;
  name: string;
  tagline: string;
  targetAudience: string;
  valueHook: string;
  searchTerms: string[];
  visualStyle: {
    mood: string;
    colors: string[];
    focusFeatures: string[];
  };
  deepLinkStrategy?: string;
}

export interface CppAnalysisResult {
  suggestedThemes: CppTheme[];
  screenshotAnalysis: any[];
  competitorInsights?: any[];
  recommendations: {
    primaryTheme: string;
    alternativeThemes: string[];
    keyDifferentiators: string[];
  };
}

export class CppAnalysisService {
  private openAIApiKey: string;

  constructor() {
    this.openAIApiKey = Deno.env.get('OPENAI_API_KEY') || '';
  }

  async generateCppThemes(appData: any, screenshotAnalysis: any[]): Promise<CppAnalysisResult> {
    if (!this.openAIApiKey) {
      return this.generateFallbackThemes(appData);
    }

    try {
      const themes = await this.analyzeForCppThemes(appData, screenshotAnalysis);
      const recommendations = this.generateRecommendations(themes);

      return {
        suggestedThemes: themes,
        screenshotAnalysis,
        recommendations
      };
    } catch (error) {
      console.error('❌ [CPP-ANALYSIS] Failed to generate themes:', error);
      return this.generateFallbackThemes(appData);
    }
  }

  private async analyzeForCppThemes(appData: any, screenshotAnalysis: any[]): Promise<CppTheme[]> {
    const prompt = this.buildCppAnalysisPrompt(appData, screenshotAnalysis);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a CPP (Custom Product Page) strategy expert. Generate 3-5 distinct CPP themes based on app analysis.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1500,
        temperature: 0.7
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    return this.parseCppThemesFromResponse(content, appData);
  }

  private buildCppAnalysisPrompt(appData: any, screenshotAnalysis: any[]): string {
    const appInfo = `
App: ${appData.trackName || appData.name}
Category: ${appData.primaryGenreName || 'Unknown'}
Description: ${appData.description?.substring(0, 500) || 'No description'}
`;

    const screenshotInsights = screenshotAnalysis.map((analysis, index) => 
      `Screenshot ${index + 1}: ${analysis.analysis || 'No analysis available'}`
    ).join('\n');

    return `
Analyze this app for Custom Product Page (CPP) strategy:

${appInfo}

Screenshot Analysis:
${screenshotInsights}

Generate 3-5 distinct CPP themes that could be A/B tested. Each theme should target different user segments and highlight different value propositions.

Return as JSON array with this structure:
[
  {
    "id": "theme-1",
    "name": "Feature Showcase",
    "tagline": "Compelling tagline",
    "targetAudience": "Primary user segment",
    "valueHook": "Main value proposition",
    "searchTerms": ["keyword1", "keyword2"],
    "visualStyle": {
      "mood": "professional|playful|minimalist|bold",
      "colors": ["primary", "secondary"],
      "focusFeatures": ["feature1", "feature2"]
    }
  }
]

Focus on conversion optimization and different user motivations.
`;
  }

  private parseCppThemesFromResponse(content: string, appData: any): CppTheme[] {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const themes = JSON.parse(jsonMatch[0]);
        return themes.map((theme: any, index: number) => ({
          id: theme.id || `theme-${index + 1}`,
          name: theme.name || `Theme ${index + 1}`,
          tagline: theme.tagline || 'Discover amazing features',
          targetAudience: theme.targetAudience || 'General users',
          valueHook: theme.valueHook || 'Transform your experience',
          searchTerms: theme.searchTerms || [],
          visualStyle: {
            mood: theme.visualStyle?.mood || 'professional',
            colors: theme.visualStyle?.colors || ['primary'],
            focusFeatures: theme.visualStyle?.focusFeatures || []
          }
        }));
      }
    } catch (error) {
      console.error('❌ Failed to parse CPP themes from AI response:', error);
    }

    return this.generateFallbackThemes(appData).suggestedThemes;
  }

  private generateFallbackThemes(appData: any): CppAnalysisResult {
    const appName = appData.trackName || appData.name || 'App';
    const category = appData.primaryGenreName || 'Productivity';

    const themes: CppTheme[] = [
      {
        id: 'feature-showcase',
        name: 'Feature Showcase',
        tagline: `Discover ${appName}'s powerful features`,
        targetAudience: 'Power users seeking advanced functionality',
        valueHook: 'Comprehensive tool for serious users',
        searchTerms: [category.toLowerCase(), 'features', 'advanced'],
        visualStyle: {
          mood: 'professional',
          colors: ['primary', 'secondary'],
          focusFeatures: ['core features', 'advanced tools']
        }
      },
      {
        id: 'lifestyle-focused',
        name: 'Lifestyle Integration',
        tagline: `${appName} fits perfectly into your daily routine`,
        targetAudience: 'Casual users wanting seamless integration',
        valueHook: 'Effortless part of your everyday life',
        searchTerms: [category.toLowerCase(), 'daily', 'lifestyle'],
        visualStyle: {
          mood: 'friendly',
          colors: ['warm', 'inviting'],
          focusFeatures: ['ease of use', 'daily integration']
        }
      },
      {
        id: 'results-driven',
        name: 'Results & Achievement',
        tagline: `Achieve more with ${appName}`,
        targetAudience: 'Goal-oriented users focused on outcomes',
        valueHook: 'Proven results and measurable success',
        searchTerms: [category.toLowerCase(), 'results', 'success'],
        visualStyle: {
          mood: 'bold',
          colors: ['success', 'achievement'],
          focusFeatures: ['progress tracking', 'achievements']
        }
      }
    ];

    return {
      suggestedThemes: themes,
      screenshotAnalysis: [],
      recommendations: {
        primaryTheme: themes[0].name,
        alternativeThemes: themes.slice(1).map(t => t.name),
        keyDifferentiators: ['ease of use', 'powerful features', 'proven results']
      }
    };
  }

  private generateRecommendations(themes: CppTheme[]): any {
    return {
      primaryTheme: themes[0]?.name || 'Feature Showcase',
      alternativeThemes: themes.slice(1, 3).map(t => t.name),
      keyDifferentiators: [
        'Unique visual presentation',
        'Targeted messaging',
        'Audience-specific features',
        'Conversion-optimized flow'
      ]
    };
  }
}
