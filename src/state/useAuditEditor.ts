import { useState, useCallback } from 'react';
import { EntityIntelligence } from '@/types/topic-audit.types';
import { normalizeEntityToAuditFields } from '@/utils/normalizeEntityToAuditFields';

export function useAuditEditor() {
  const [knownPlayers, setKnownPlayers] = useState<string[]>([]);
  const [targetAudience, setTargetAudience] = useState<string>('consumers');
  const [competitorDetails, setCompetitorDetails] = useState<EntityIntelligence['competitors']>([]);

  const setFromEntity = useCallback((entity: EntityIntelligence) => {
    const normalized = normalizeEntityToAuditFields(entity);
    setKnownPlayers(normalized.knownPlayers);
    setTargetAudience(normalized.targetAudience);
    setCompetitorDetails(normalized.competitorDetails);
  }, []);

  return {
    knownPlayers,
    targetAudience,
    competitorDetails,
    setFromEntity,
  };
}
