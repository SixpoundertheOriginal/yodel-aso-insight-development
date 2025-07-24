import { TopicAuditData, TopicIntelligence } from '@/types/topic-audit.types';
import { supabase } from '@/integrations/supabase/client';

export class TopicIntelligenceService {
  async analyzeTopicForAudit(input: TopicAuditData): Promise<TopicIntelligence> {
    try {
      // Use OpenAI for comprehensive topic analysis
      const analysis = await this.analyzeWithAI(input);
      
      // Enhance with user-provided known players
      analysis.key_players = [...new Set([...analysis.key_players, ...input.known_players])];
      
      return analysis;
    } catch (error) {
      console.error('Topic analysis failed:', error);
      // Fallback to basic analysis using user input
      return this.createBasicAnalysis(input);
    }
  }

  private async analyzeWithAI(input: TopicAuditData): Promise<TopicIntelligence> {
    const prompt = `
    Analyze this topic for ChatGPT visibility research:
    
    Topic: ${input.topic}
    Industry: ${input.industry}
    Target Audience: ${input.target_audience}
    Context: ${input.context_description || 'General market analysis'}
    Known Players: ${input.known_players.join(', ') || 'None provided'}
    
    Provide comprehensive analysis for generating natural search queries:
    
    1. REFINED_TOPIC: More specific, searchable topic definition
    2. TARGET_PERSONAS: Specific user types who search for this (3-5 personas)
    3. KEY_PLAYERS: Major brands, companies, services in this space (8-12 players)
    4. SEARCH_CONTEXTS: Different situations where people search for this
    5. QUERY_VARIATIONS: Different ways people phrase searches for this topic
    6. COMPETITIVE_LANDSCAPE: How the market is segmented
    
    Return JSON only:
    {
      "refined_topic": "string",
      "target_personas": [
        {
          "name": "string",
          "demographics": "string", 
          "search_intent": ["string"]
        }
      ],
      "key_players": ["string"],
      "search_contexts": ["string"],
      "query_variations": ["string"],
      "competitive_landscape": [
        {
          "category": "string",
          "players": ["string"]
        }
      ]
    }
    `;

    const { data, error } = await supabase.functions.invoke('aso-chat', {
      body: { 
        prompt,
        model: 'gpt-4o-mini',
        temperature: 0.3
      }
    });

    if (error) throw error;
    
    return JSON.parse(data.content);
  }

  private createBasicAnalysis(input: TopicAuditData): TopicIntelligence {
    // Fallback analysis using user input only
    return {
      refined_topic: input.topic,
      target_personas: [{
        name: input.target_audience,
        demographics: `${input.target_audience} in ${input.industry}`,
        search_intent: [`finding ${input.topic}`, `comparing ${input.topic}`]
      }],
      key_players: input.known_players,
      search_contexts: [
        `general ${input.topic} search`,
        `${input.topic} for ${input.target_audience}`,
        `best ${input.topic} recommendations`
      ],
      query_variations: [
        `best ${input.topic}`,
        `${input.topic} for ${input.target_audience}`,
        `top ${input.topic} recommendations`
      ],
      competitive_landscape: [{
        category: input.industry,
        players: input.known_players
      }]
    };
  }
}

export const topicIntelligenceService = new TopicIntelligenceService();