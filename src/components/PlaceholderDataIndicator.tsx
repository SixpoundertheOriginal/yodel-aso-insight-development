import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { useMarketData } from '@/contexts/MarketContext';

const getMarketName = (countryCode: string): string => {
  const countryNames: Record<string, string> = {
    'US': 'United States',
    'GB': 'United Kingdom',
    'CA': 'Canada',
    'AU': 'Australia',
    'DE': 'Germany',
    'FR': 'France',
    'JP': 'Japan',
    'BR': 'Brazil'
  };
  return countryNames[countryCode] || countryCode;
};

export const PlaceholderDataIndicator: React.FC = () => {
  const { isPlaceholderData, selectedMarket, analyticsData } = useMarketData();
  
  if (!isPlaceholderData || !analyticsData) return null;

  const marketName = getMarketName(selectedMarket);

  return (
    <Alert className="mb-6 border-amber-200 bg-amber-50">
      <Info className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-800">Preview Data</AlertTitle>
      <AlertDescription className="text-amber-700">
        Showing sample analytics data for {marketName}. This is preview data generated for 
        demonstration purposes. Real market data will be available soon.
        <div className="mt-2 text-xs text-amber-600">
          Generated at: {new Date(analyticsData.generated_at).toLocaleString()}
        </div>
      </AlertDescription>
    </Alert>
  );
};