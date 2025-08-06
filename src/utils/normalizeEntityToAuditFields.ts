import { EntityIntelligence } from '@/types/topic-audit.types';

export function normalizeEntityToAuditFields(entity: EntityIntelligence) {
  return {
    contextDescription: entity.description,
    solutionsOffered: (entity.services || []).map(s => `${s} services`),
    targetAudience: entity.targetClients || [],
    knownPlayers: entity.competitors || [],
    competitorDetails: entity.competitorDetails || [],
    industry: entity.industryFocus?.[0] || '',
    subVertical: entity.industryFocus?.[1] || undefined
  };
}
