import React from 'react';
import { UnifiedKeywordIntelligence } from '@/components/KeywordIntelligence/UnifiedKeywordIntelligence';
import { ScrapedMetadata } from '@/types/aso';

interface SearchDominationTabProps {
  scrapedAppData: ScrapedMetadata;
  organizationId: string;
}

export const SearchDominationTab: React.FC<SearchDominationTabProps> = ({
  scrapedAppData,
  organizationId
}) => {
  console.log('🔍 [SEARCH-DOMINATION] Tab initialized with app:', scrapedAppData.name);

  return (
    <div className="search-domination-tab space-y-6">
      <UnifiedKeywordIntelligence
        organizationId={organizationId}
        selectedAppId={scrapedAppData.appId}
        scrapedAppData={scrapedAppData}
      />
    </div>
  );
};