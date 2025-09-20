import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel, SelectSeparator } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MarketDataService, Market } from '@/services/marketDataService';

interface CountryPickerProps {
  selectedCountry: string;
  onCountryChange: (countryCode: string) => void;
  className?: string;
}

export const CountryPicker: React.FC<CountryPickerProps> = ({
  selectedCountry,
  onCountryChange,
  className = ''
}) => {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMarkets = async () => {
      try {
        const allMarkets = await MarketDataService.getAllMarkets();
        setMarkets(allMarkets);
      } catch (error) {
        console.error('Failed to load markets:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMarkets();
  }, []);

  if (loading) {
    return <Skeleton className="w-48 h-10" />;
  }

  const availableMarkets = markets.filter(m => m.is_available);
  const comingSoonMarkets = markets.filter(m => !m.is_available);

  return (
    <Select value={selectedCountry} onValueChange={onCountryChange}>
      <SelectTrigger className={`w-48 ${className}`}>
        <SelectValue>
          <div className="flex items-center">
            <span className="mr-2">{getFlagEmoji(selectedCountry)}</span>
            {getCountryName(selectedCountry, markets)}
          </div>
        </SelectValue>
      </SelectTrigger>
      
      <SelectContent className="bg-background border-border">
        {/* Available markets */}
        {availableMarkets.length > 0 && (
          <SelectGroup>
            <SelectLabel>Available Markets</SelectLabel>
            {availableMarkets.map(market => (
              <SelectItem key={market.country_code} value={market.country_code}>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center">
                    <span className="mr-2">{getFlagEmoji(market.country_code)}</span>
                    {market.country_name}
                  </div>
                  <Badge variant="secondary" className="ml-2 text-xs bg-green-50 text-green-700 border-green-200">
                    Live
                  </Badge>
                </div>
              </SelectItem>
            ))}
          </SelectGroup>
        )}
        
        {/* Coming soon markets */}
        {comingSoonMarkets.length > 0 && (
          <>
            <SelectSeparator />
            <SelectGroup>
              <SelectLabel>Preview Available</SelectLabel>
              {comingSoonMarkets.map(market => (
                <SelectItem key={market.country_code} value={market.country_code}>
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center">
                      <span className="mr-2">{getFlagEmoji(market.country_code)}</span>
                      {market.country_name}
                    </div>
                    <Badge variant="outline" className="ml-2 text-xs text-amber-700 border-amber-300">
                      Preview
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectGroup>
          </>
        )}
      </SelectContent>
    </Select>
  );
};

// Utility functions
const getFlagEmoji = (countryCode: string): string => {
  const code = (countryCode || '').toUpperCase();
  const flags: Record<string, string> = {
    'US': '🇺🇸', 'GB': '🇬🇧', 'CA': '🇨🇦', 'AU': '🇦🇺',
    'DE': '🇩🇪', 'FR': '🇫🇷', 'IT': '🇮🇹', 'ES': '🇪🇸',
    'NL': '🇳🇱', 'SE': '🇸🇪', 'NO': '🇳🇴', 'DK': '🇩🇰',
    'CH': '🇨🇭', 'IE': '🇮🇪', 'PL': '🇵🇱', 'JP': '🇯🇵',
    'KR': '🇰🇷', 'BR': '🇧🇷', 'IN': '🇮🇳', 'MX': '🇲🇽'
  };
  return flags[code] || '🌍';
};

const getCountryName = (countryCode: string, markets: Market[]): string => {
  const market = markets.find(m => m.country_code === countryCode);
  return market?.country_name || countryCode;
};
