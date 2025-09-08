import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MarketDataService, Market } from '@/services/marketDataService';

const getFlagEmoji = (countryCode: string): string => {
  const flags: Record<string, string> = {
    'US': '🇺🇸', 'GB': '🇬🇧', 'CA': '🇨🇦', 'AU': '🇦🇺',
    'DE': '🇩🇪', 'FR': '🇫🇷', 'JP': '🇯🇵', 'BR': '🇧🇷'
  };
  return flags[countryCode] || '🌍';
};

export const MarketManagement: React.FC = () => {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingMarket, setUpdatingMarket] = useState<string | null>(null);

  useEffect(() => {
    loadMarkets();
  }, []);

  const loadMarkets = async () => {
    try {
      const allMarkets = await MarketDataService.getAllMarkets();
      setMarkets(allMarkets);
    } catch (error) {
      console.error('Failed to load markets:', error);
    }
  };

  const enableMarket = async (countryCode: string) => {
    setUpdatingMarket(countryCode);
    try {
      await MarketDataService.enableMarket(countryCode);
      await loadMarkets(); // Refresh the list
    } catch (error) {
      console.error('Failed to enable market:', error);
    } finally {
      setUpdatingMarket(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Market Configuration</CardTitle>
        <CardDescription>
          Manage available markets and data sources for analytics
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Market</TableHead>
              <TableHead>Region</TableHead>
              <TableHead>Data Source</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {markets.map(market => (
              <TableRow key={market.country_code}>
                <TableCell>
                  <div className="flex items-center">
                    <span className="mr-2">{getFlagEmoji(market.country_code)}</span>
                    {market.country_name}
                    <span className="ml-2 text-xs text-muted-foreground">({market.country_code})</span>
                  </div>
                </TableCell>
                <TableCell>{market.region}</TableCell>
                <TableCell>
                  <Badge variant={market.data_source === 'bigquery' ? 'default' : 'secondary'}>
                    {market.data_source}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={market.is_available ? 'default' : 'outline'}>
                    {market.is_available ? 'Live' : 'Preview Only'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {!market.is_available && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => enableMarket(market.country_code)}
                      disabled={updatingMarket === market.country_code}
                    >
                      {updatingMarket === market.country_code ? 'Enabling...' : 'Enable'}
                    </Button>
                  )}
                  {market.is_available && market.data_source === 'bigquery' && (
                    <Badge variant="secondary" className="bg-green-50 text-green-700">
                      Active
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="mt-4 p-4 bg-muted rounded-lg">
          <h4 className="font-semibold mb-2">Market Status Guide</h4>
          <div className="space-y-1 text-sm text-muted-foreground">
            <div><strong>Live:</strong> Real data available from BigQuery</div>
            <div><strong>Preview Only:</strong> Sample data for demonstration</div>
            <div><strong>Enable:</strong> Activate real data when BigQuery support is ready</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};