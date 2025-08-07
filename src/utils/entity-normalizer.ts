import { EntityIntelligence } from '@/types/topic-audit.types';

export function normalizeEntityToAuditFields(entity: EntityIntelligence) {
  // Map target clients to target audience string
  const mapTargetAudience = (targetClients: string[]): string => {
    if (!targetClients || targetClients.length === 0) return 'businesses';
    
    const firstClient = targetClients[0].toLowerCase();
    if (firstClient.includes('enterprise') || firstClient.includes('large business')) return 'enterprise companies';
    if (firstClient.includes('small business') || firstClient.includes('sme')) return 'small businesses';
    if (firstClient.includes('consumer') || firstClient.includes('individual')) return 'consumers';
    if (firstClient.includes('startup')) return 'startups';
    
    return targetClients[0]; // Use the first client as-is if no mapping
  };

  return {
    contextDescription: entity.description,
    solutionsOffered: (entity.services || []).map(s => `${s} services`),
    knownPlayers: entity.competitors || [],
    industry: entity.industryFocus?.[0] || '',
    subVertical: entity.industryFocus?.[1] || undefined,
    targetAudience: mapTargetAudience(entity.targetClients || [])
  };
}
