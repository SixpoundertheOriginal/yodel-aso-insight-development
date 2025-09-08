import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { MarketDataService, AnalyticsData } from '@/services/marketDataService';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface MarketContextType {
  selectedMarket: string;
  setSelectedMarket: (market: string) => void;
  analyticsData: AnalyticsData | null;
  isPlaceholderData: boolean;
  loading: boolean;
  dateRange: { start: string; end: string };
  setDateRange: (range: { start: string; end: string }) => void;
}

const MarketContext = createContext<MarketContextType | undefined>(undefined);

export const MarketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedMarket, setSelectedMarket] = useState('US');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const { user } = useAuth();

  // Get organization ID from user profile
  useEffect(() => {
    const fetchOrganizationId = async () => {
      if (!user) {
        setOrganizationId(null);
        return;
      }

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Failed to fetch organization ID:', error);
          return;
        }

        setOrganizationId(profile?.organization_id || null);
      } catch (error) {
        console.error('Error fetching organization ID:', error);
      }
    };

    fetchOrganizationId();
  }, [user]);

  useEffect(() => {
    const loadAnalyticsData = async () => {
      if (!organizationId) return;
      
      setLoading(true);
      try {
        const data = await MarketDataService.getAnalyticsData(
          selectedMarket,
          dateRange,
          organizationId
        );
        setAnalyticsData(data);
      } catch (error) {
        console.error('Failed to load analytics data:', error);
        setAnalyticsData(null);
      } finally {
        setLoading(false);
      }
    };

    loadAnalyticsData();
  }, [selectedMarket, dateRange, organizationId]);

  const value = {
    selectedMarket,
    setSelectedMarket,
    analyticsData,
    isPlaceholderData: analyticsData?.is_placeholder || false,
    loading,
    dateRange,
    setDateRange
  };

  return (
    <MarketContext.Provider value={value}>
      {children}
    </MarketContext.Provider>
  );
};

export const useMarketData = () => {
  const context = useContext(MarketContext);
  if (!context) {
    throw new Error('useMarketData must be used within MarketProvider');
  }
  return context;
};