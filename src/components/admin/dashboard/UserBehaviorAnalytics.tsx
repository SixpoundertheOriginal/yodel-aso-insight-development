import React, { useEffect, useState } from 'react';
import { Activity, Users, MousePointer, Clock, Target, TrendingUp } from 'lucide-react';
import { MetricStat } from '@/components/ui/design-system/MetricStat';

interface UserSession {
  session_id: string;
  user_id: string;
  duration_minutes: number;
  page_views: number;
  feature_interactions: string[];
  last_activity: string;
}

interface FeatureAdoption {
  feature_name: string;
  adoption_rate: number;
  users_adopted: number;
  total_users: number;
  trend: 'up' | 'down' | 'stable';
}

interface UserJourney {
  step: string;
  completion_rate: number;
  avg_time_minutes: number;
  drop_off_rate: number;
}

export const UserBehaviorAnalytics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [sessionData, setSessionData] = useState<{
    active_sessions: number;
    avg_session_duration: number;
    bounce_rate: number;
    engagement_score: number;
  }>({
    active_sessions: 0,
    avg_session_duration: 0,
    bounce_rate: 0,
    engagement_score: 0
  });
  
  const [featureAdoption, setFeatureAdoption] = useState<FeatureAdoption[]>([]);
  const [userJourney, setUserJourney] = useState<UserJourney[]>([]);

  useEffect(() => {
    loadBehaviorAnalytics();
    const interval = setInterval(loadBehaviorAnalytics, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const loadBehaviorAnalytics = async () => {
    try {
      // Mock data - in real implementation, these would be API calls
      setSessionData({
        active_sessions: 127,
        avg_session_duration: 23.5,
        bounce_rate: 28.3,
        engagement_score: 85.2
      });

      setFeatureAdoption([
        { feature_name: 'ASO Audit', adoption_rate: 89.2, users_adopted: 145, total_users: 163, trend: 'up' },
        { feature_name: 'Keyword Intelligence', adoption_rate: 67.8, users_adopted: 110, total_users: 163, trend: 'up' },
        { feature_name: 'Creative Review', adoption_rate: 45.3, users_adopted: 74, total_users: 163, trend: 'stable' },
        { feature_name: 'Competitive Analysis', adoption_rate: 34.7, users_adopted: 57, total_users: 163, trend: 'down' }
      ]);

      setUserJourney([
        { step: 'Registration', completion_rate: 100, avg_time_minutes: 2.5, drop_off_rate: 0 },
        { step: 'Email Verification', completion_rate: 87.3, avg_time_minutes: 15.2, drop_off_rate: 12.7 },
        { step: 'Organization Setup', completion_rate: 78.9, avg_time_minutes: 8.3, drop_off_rate: 8.4 },
        { step: 'First App Added', completion_rate: 65.2, avg_time_minutes: 12.8, drop_off_rate: 13.7 },
        { step: 'First Feature Used', completion_rate: 52.1, avg_time_minutes: 25.4, drop_off_rate: 13.1 }
      ]);

      setLoading(false);
    } catch (error) {
      console.error('Failed to load behavior analytics:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-background border border-border rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/4"></div>
          <div className="space-y-2">
            <div className="h-3 bg-muted rounded"></div>
            <div className="h-3 bg-muted rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Real-Time Session Metrics */}
      <div className="bg-background border border-border rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Real-Time User Activity</h3>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricStat
            label="Active Sessions"
            value={sessionData.active_sessions}
            icon={<Users className="w-4 h-4" />}
            description="Currently online"
          />
          <MetricStat
            label="Avg Session Duration"
            value={`${sessionData.avg_session_duration}m`}
            icon={<Clock className="w-4 h-4" />}
            description="Per user session"
          />
          <MetricStat
            label="Engagement Score"
            value={`${sessionData.engagement_score}%`}
            icon={<Target className="w-4 h-4" />}
            description="Overall platform engagement"
          />
          <MetricStat
            label="Bounce Rate"
            value={`${sessionData.bounce_rate}%`}
            icon={<MousePointer className="w-4 h-4" />}
            description="Single page visits"
          />
        </div>
      </div>

      {/* Feature Adoption Rates */}
      <div className="bg-background border border-border rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Feature Adoption Analytics</h3>
        </div>
        
        <div className="space-y-4">
          {featureAdoption.map((feature, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{feature.feature_name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {feature.users_adopted}/{feature.total_users} users
                    </span>
                    <div className={`w-2 h-2 rounded-full ${
                      feature.trend === 'up' ? 'bg-green-500' : 
                      feature.trend === 'down' ? 'bg-red-500' : 'bg-yellow-500'
                    }`} />
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${feature.adoption_rate}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>0%</span>
                  <span className="font-medium">{feature.adoption_rate.toFixed(1)}%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* User Journey Funnel */}
      <div className="bg-background border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">User Onboarding Journey</h3>
        
        <div className="space-y-3">
          {userJourney.map((step, index) => (
            <div key={index} className="relative">
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step.completion_rate > 80 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                    step.completion_rate > 60 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                    'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium">{step.step}</div>
                    <div className="text-sm text-muted-foreground">
                      Avg time: {step.avg_time_minutes}m
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">{step.completion_rate.toFixed(1)}%</div>
                  <div className="text-sm text-red-500">
                    -{step.drop_off_rate.toFixed(1)}% drop-off
                  </div>
                </div>
              </div>
              
              {index < userJourney.length - 1 && (
                <div className="absolute left-4 top-full w-0.5 h-3 bg-border transform translate-x-3.5" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};