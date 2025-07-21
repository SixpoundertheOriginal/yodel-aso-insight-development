
import React from 'react';
import { useUnifiedAso } from '@/context/UnifiedAsoContext';
import { AppImporter } from '@/components/shared/AsoShared/AppImporter';
import { useApp } from '@/context/AppContext';
import { Card, CardContent } from '@/components/ui/card';
import { Smartphone } from 'lucide-react';

export const AppInputSection: React.FC = () => {
  const { currentMode, analysis } = useUnifiedAso();
  const { selectedApp } = useApp();

  if (currentMode === 'parser') {
    return (
      <AppImporter 
        onImportSuccess={analysis.handleAppImport}
        organizationId={analysis.organizationId || ''}
      />
    );
  }

  // Tracking mode
  if (!selectedApp) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-12 text-center">
          <Smartphone className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No App Selected</h3>
          <p className="text-zinc-400 mb-4">
            Please select an app from the app selector in the top bar to view historical insights.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardContent className="p-6">
        <div className="flex items-center space-x-4">
          {selectedApp.app_icon_url && (
            <img 
              src={selectedApp.app_icon_url} 
              alt={selectedApp.app_name}
              className="w-16 h-16 rounded-xl"
            />
          )}
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-white">{selectedApp.app_name}</h3>
            <p className="text-zinc-400">{selectedApp.category}</p>
            <div className="flex items-center space-x-4 mt-2 text-sm text-zinc-500">
              <span>ID: {selectedApp.app_store_id}</span>
              <span>•</span>
              <span>Platform: {selectedApp.platform}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
