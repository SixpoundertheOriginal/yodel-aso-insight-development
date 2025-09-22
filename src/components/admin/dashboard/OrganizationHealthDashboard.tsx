import React, { useEffect, useState } from 'react';
import { Building2, TrendingUp, AlertTriangle, Users, Activity, DollarSign } from 'lucide-react';
import { MetricStat } from '@/components/ui/design-system/MetricStat';

interface OrganizationHealth {
  id: string;
  name: string;
  health_score: number;
  health_status: 'excellent' | 'good' | 'warning' | 'critical';
  metrics: {
    user_engagement: number;
    feature_adoption: number;
    api_usage: number;
    support_tickets: number;
    retention_rate: number;
    revenue_trend: 'up' | 'down' | 'stable';
  };
  users: {
    total: number;
    active_30d: number;
    new_this_month: number;
  };
  risk_factors: string[];
  growth_indicators: string[];
}

interface HealthTrends {
  excellent: number;
  good: number;
  warning: number;
  critical: number;
}

export const OrganizationHealthDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [organizations, setOrganizations] = useState<OrganizationHealth[]>([]);
  const [healthTrends, setHealthTrends] = useState<HealthTrends>({
    excellent: 0,
    good: 0,
    warning: 0,
    critical: 0
  });

  useEffect(() => {
    loadOrganizationHealth();
    const interval = setInterval(loadOrganizationHealth, 300000); // Update every 5 minutes
    return () => clearInterval(interval);
  }, []);

  const loadOrganizationHealth = async () => {
    try {
      // Mock data - in real implementation, this would be an API call
      const mockOrgs: OrganizationHealth[] = [
        {
          id: '1',
          name: 'YodelMobile',
          health_score: 92,
          health_status: 'excellent',
          metrics: {
            user_engagement: 88,
            feature_adoption: 94,
            api_usage: 856,
            support_tickets: 2,
            retention_rate: 96,
            revenue_trend: 'up'
          },
          users: { total: 45, active_30d: 43, new_this_month: 8 },
          risk_factors: [],
          growth_indicators: ['High feature adoption', 'Low churn rate', 'Increasing API usage']
        },
        {
          id: '2',
          name: 'AppStorm Studios',
          health_score: 78,
          health_status: 'good',
          metrics: {
            user_engagement: 72,
            feature_adoption: 81,
            api_usage: 423,
            support_tickets: 5,
            retention_rate: 84,
            revenue_trend: 'stable'
          },
          users: { total: 23, active_30d: 19, new_this_month: 3 },
          risk_factors: ['Declining engagement'],
          growth_indicators: ['Steady usage', 'Good adoption rates']
        },
        {
          id: '3',
          name: 'MobileFirst Inc',
          health_score: 65,
          health_status: 'warning',
          metrics: {
            user_engagement: 58,
            feature_adoption: 45,
            api_usage: 234,
            support_tickets: 12,
            retention_rate: 67,
            revenue_trend: 'down'
          },
          users: { total: 18, active_30d: 12, new_this_month: 1 },
          risk_factors: ['Low engagement', 'High support load', 'Declining revenue'],
          growth_indicators: []
        },
        {
          id: '4',
          name: 'StartupApp Co',
          health_score: 45,
          health_status: 'critical',
          metrics: {
            user_engagement: 32,
            feature_adoption: 28,
            api_usage: 89,
            support_tickets: 18,
            retention_rate: 42,
            revenue_trend: 'down'
          },
          users: { total: 12, active_30d: 5, new_this_month: 0 },
          risk_factors: ['Very low engagement', 'High churn', 'Support overwhelm', 'No new users'],
          growth_indicators: []
        }
      ];

      setOrganizations(mockOrgs);
      
      // Calculate health trends
      const trends = mockOrgs.reduce((acc, org) => {
        acc[org.health_status]++;
        return acc;
      }, { excellent: 0, good: 0, warning: 0, critical: 0 });
      
      setHealthTrends(trends);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load organization health:', error);
      setLoading(false);
    }
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-500 bg-green-50 dark:bg-green-900/20';
      case 'good': return 'text-blue-500 bg-blue-50 dark:bg-blue-900/20';
      case 'warning': return 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
      case 'critical': return 'text-red-500 bg-red-50 dark:bg-red-900/20';
      default: return 'text-gray-500 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  if (loading) {
    return (
      <div className="bg-background border border-border rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/3"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Health Overview */}
      <div className="bg-background border border-border rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Organization Health Overview</h3>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricStat
            label="Excellent Health"
            value={healthTrends.excellent}
            icon={<TrendingUp className="w-4 h-4" />}
            description="90-100 score"
            className="text-green-600"
          />
          <MetricStat
            label="Good Health"
            value={healthTrends.good}
            icon={<Activity className="w-4 h-4" />}
            description="70-89 score"
            className="text-blue-600"
          />
          <MetricStat
            label="Needs Attention"
            value={healthTrends.warning}
            icon={<AlertTriangle className="w-4 h-4" />}
            description="50-69 score"
            className="text-yellow-600"
          />
          <MetricStat
            label="Critical Risk"
            value={healthTrends.critical}
            icon={<AlertTriangle className="w-4 h-4" />}
            description="Below 50 score"
            className="text-red-600"
          />
        </div>
      </div>

      {/* Organization Details */}
      <div className="bg-background border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Organization Health Details</h3>
        
        <div className="space-y-4">
          {organizations.map((org) => (
            <div key={org.id} className="border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <h4 className="font-medium text-lg">{org.name}</h4>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${getHealthColor(org.health_status)}`}>
                    {org.health_score}/100
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="w-4 h-4" />
                  {org.users.active_30d}/{org.users.total} active users
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-lg font-semibold">{org.metrics.user_engagement}%</div>
                  <div className="text-xs text-muted-foreground">User Engagement</div>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-lg font-semibold">{org.metrics.feature_adoption}%</div>
                  <div className="text-xs text-muted-foreground">Feature Adoption</div>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-lg font-semibold">{org.metrics.api_usage.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">API Calls (30d)</div>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-lg font-semibold">{org.metrics.retention_rate}%</div>
                  <div className="text-xs text-muted-foreground">Retention Rate</div>
                </div>
              </div>

              {/* Risk Factors and Growth Indicators */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {org.risk_factors.length > 0 && (
                  <div>
                    <h5 className="font-medium text-red-600 mb-2">Risk Factors</h5>
                    <ul className="space-y-1">
                      {org.risk_factors.map((risk, index) => (
                        <li key={index} className="text-sm text-red-600 flex items-center gap-2">
                          <AlertTriangle className="w-3 h-3" />
                          {risk}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {org.growth_indicators.length > 0 && (
                  <div>
                    <h5 className="font-medium text-green-600 mb-2">Growth Indicators</h5>
                    <ul className="space-y-1">
                      {org.growth_indicators.map((indicator, index) => (
                        <li key={index} className="text-sm text-green-600 flex items-center gap-2">
                          <TrendingUp className="w-3 h-3" />
                          {indicator}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};