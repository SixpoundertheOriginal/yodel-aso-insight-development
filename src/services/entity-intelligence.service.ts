import { supabase } from '@/integrations/supabase/client';
import { EntityIntelligence } from '@/types/topic-audit.types';

export class EntityIntelligenceService {
  static async getEntityIntelligence(entityName: string, organizationId: string): Promise<EntityIntelligence | null> {
    try {
      console.log('🔍 EntityIntelligenceService: Fetching intelligence for entity:', entityName);
      
      // Check cache first
      const cachedIntelligence = await this.getCachedIntelligence(entityName, organizationId);
      if (cachedIntelligence) {
        console.log('✅ Found cached entity intelligence');
        return cachedIntelligence;
      }

      // Call the entity intelligence scraper edge function
      const { data, error } = await supabase.functions.invoke('entity-intelligence-scraper', {
        body: {
          entityName,
          organizationId
        }
      });

      if (error) {
        console.error('❌ Error fetching entity intelligence:', error);
        return null;
      }

      if (data?.intelligence) {
        // Cache the result
        await this.cacheIntelligence(entityName, data.intelligence, organizationId);
        return data.intelligence;
      }

      return null;
    } catch (error) {
      console.error('EntityIntelligenceService error:', error);
      return null;
    }
  }

  private static async getCachedIntelligence(entityName: string, organizationId: string): Promise<EntityIntelligence | null> {
    try {
      const cacheKey = `entity_intelligence_${organizationId}_${entityName.toLowerCase().replace(/\s+/g, '_')}`;
      
      const { data, error } = await supabase
        .from('data_cache')
        .select('data')
        .eq('cache_key', cacheKey)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !data) {
        return null;
      }

      return data.data as any as EntityIntelligence;
    } catch (error) {
      console.error('Error fetching cached intelligence:', error);
      return null;
    }
  }

  private static async cacheIntelligence(entityName: string, intelligence: EntityIntelligence, organizationId: string): Promise<void> {
    try {
      const cacheKey = `entity_intelligence_${organizationId}_${entityName.toLowerCase().replace(/\s+/g, '_')}`;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Cache for 7 days

      await supabase
        .from('data_cache')
        .upsert({
          cache_key: cacheKey,
          data: intelligence as any,
          expires_at: expiresAt.toISOString()
        });
    } catch (error) {
      console.error('Error caching intelligence:', error);
    }
  }

  static generateEnhancedQueries(entityIntelligence: EntityIntelligence, topicData: any): string[] {
    const queries: string[] = [];
    
    // Service-specific queries based on what the entity offers
    entityIntelligence.services.forEach(service => {
      queries.push(`Best ${service} providers for ${topicData.target_audience}`);
      queries.push(`${service} comparison for ${topicData.target_audience}`);
      queries.push(`Who offers the best ${service}?`);
    });

    // Client-specific queries based on target clients
    entityIntelligence.targetClients.forEach(clientType => {
      queries.push(`${topicData.topic} for ${clientType}`);
      queries.push(`Best ${topicData.topic} serving ${clientType}`);
    });

    // Competitive landscape queries
    entityIntelligence.competitors.forEach(competitor => {
      queries.push(`${entityIntelligence.entityName} vs ${competitor}`);
      queries.push(`${competitor} alternatives`);
    });

    // Industry-specific queries
    entityIntelligence.industryFocus.forEach(industry => {
      queries.push(`Top ${industry} ${topicData.topic}`);
      queries.push(`Leading ${topicData.topic} in ${industry}`);
    });

    // Market position queries
    queries.push(`${entityIntelligence.marketPosition} ${topicData.topic}`);
    queries.push(`Who are the ${entityIntelligence.marketPosition} players in ${topicData.topic}?`);

    return queries.slice(0, 15); // Return top 15 enhanced queries
  }
}