import React, { useEffect } from 'react';
import { EntityIntelligence } from '@/types/topic-audit.types';
import { useAuditEditor } from '@/state/useAuditEditor';

interface AuditEditorStepTwoProps {
  entityIntelligence?: EntityIntelligence;
}

export const AuditEditorStepTwo: React.FC<AuditEditorStepTwoProps> = ({ entityIntelligence }) => {
  const { knownPlayers, targetAudience, setFromEntity } = useAuditEditor();

  useEffect(() => {
    if (entityIntelligence) {
      setFromEntity(entityIntelligence);
    }
  }, [entityIntelligence, setFromEntity]);

  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-medium">Known Players</h4>
        <ul className="list-disc list-inside text-sm">
          {knownPlayers.map(player => (
            <li key={player}>{player}</li>
          ))}
        </ul>
      </div>
      <div>
        <h4 className="font-medium">Target Audience</h4>
        <p className="text-sm">{targetAudience}</p>
      </div>
    </div>
  );
};
