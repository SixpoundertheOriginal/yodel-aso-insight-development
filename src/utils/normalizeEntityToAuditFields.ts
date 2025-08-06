import { EntityIntelligence } from '@/types/topic-audit.types';

export function normalizeEntityToAuditFields(entity: EntityIntelligence) {
  return {
    contextDescription: entity.description,
    solutionsOffered: (entity.services || []).map(s => `${s} services`),
    knownPlayers: entity.competitors?.map(c => typeof c === 'string' ? c : c.name) || [],
    competitorDetails: entity.competitors || [],
    targetAudience: entity.targetClients?.[0] || 'consumers',
    targetClients: entity.targetClients || [],
    targetPersonas: entity.target_personas || [],
    industry: entity.industryFocus?.[0] || '',
    subVertical: entity.industryFocus?.[1] || undefined
  };
}
