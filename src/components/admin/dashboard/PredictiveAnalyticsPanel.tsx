import React, { useEffect, useState } from 'react';
import { Brain, TrendingDown, AlertTriangle, Target, Users, DollarSign } from 'lucide-react';
import { MetricStat } from '@/components/ui/design-system/MetricStat';

interface ChurnPrediction {
  organization_id: string;
  organization_name: string;
  churn_probability: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  key_factors: string[];
  recommended_actions: string[];
  days_to_predicted_churn: number;
}

interface UsageForecast {
  metric: string;
  current_value: number;
  predicted_30d: number;
  predicted_90d: number;
  confidence: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

interface CapacityPlanning {
  resource: string;
  current_usage: number;
  capacity_limit: number;
  utilization_percentage: number;
  days_until_limit: number;
  recommended_action: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export const PredictiveAnalyticsPanel: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [churnPredictions, setChurnPredictions] = useState<ChurnPrediction[]>([]);
  const [usageForecasts, setUsageForecasts] = useState<UsageForecast[]>([]);
  const [capacityPlanning, setCapacityPlanning] = useState<CapacityPlanning[]>([]);

  useEffect(() => {
    loadPredictiveAnalytics();
    const interval = setInterval(loadPredictiveAnalytics, 1800000); // Update every 30 minutes
    return () => clearInterval(interval);
  }, []);

  const loadPredictiveAnalytics = async () => {
    try {
      // Mock data - in real implementation, these would be ML model predictions
      setChurnPredictions([
        {
          organization_id: '3',
          organization_name: 'MobileFirst Inc',
          churn_probability: 78,
          risk_level: 'high',
          key_factors: ['Declining engagement', 'Reduced API usage', 'Multiple support tickets'],
          recommended_actions: ['Schedule customer success call', 'Offer feature training', 'Provide premium support'],
          days_to_predicted_churn: 14
        },
        {
          organization_id: '4',
          organization_name: 'StartupApp Co',
          churn_probability: 92,
          risk_level: 'critical',
          key_factors: ['No recent logins', 'Zero API usage', 'Payment issues'],
          recommended_actions: ['Immediate intervention required', 'Executive outreach', 'Custom retention offer'],
          days_to_predicted_churn: 7
        },
        {
          organization_id: '2',
          organization_name: 'AppStorm Studios',
          churn_probability: 35,
          risk_level: 'medium',
          key_factors: ['Stable usage but no growth', 'Limited feature adoption'],
          recommended_actions: ['Feature discovery session', 'Usage optimization review'],
          days_to_predicted_churn: 45
        }
      ]);

      setUsageForecasts([
        {
          metric: 'API Calls',
          current_value: 125400,
          predicted_30d: 142300,
          predicted_90d: 168900,
          confidence: 87,
          trend: 'increasing'
        },
        {
          metric: 'Active Users',
          current_value: 163,
          predicted_30d: 178,
          predicted_90d: 195,
          confidence: 82,
          trend: 'increasing'
        },
        {
          metric: 'Data Volume (GB)',
          current_value: 45.2,
          predicted_30d: 52.8,
          predicted_90d: 67.1,
          confidence: 91,
          trend: 'increasing'
        },
        {
          metric: 'Support Tickets',
          current_value: 37,
          predicted_30d: 42,
          predicted_90d: 48,
          confidence: 76,
          trend: 'increasing'
        }
      ]);

      setCapacityPlanning([
        {
          resource: 'Database Storage',
          current_usage: 78.5,
          capacity_limit: 100,
          utilization_percentage: 78.5,
          days_until_limit: 45,
          recommended_action: 'Plan storage upgrade',
          priority: 'medium'
        },
        {
          resource: 'API Rate Limits',
          current_usage: 85.2,
          capacity_limit: 100,
          utilization_percentage: 85.2,
          days_until_limit: 23,
          recommended_action: 'Increase rate limits',
          priority: 'high'
        },
        {
          resource: 'Concurrent Users',
          current_usage: 45.3,
          capacity_limit: 100,
          utilization_percentage: 45.3,
          days_until_limit: 120,
          recommended_action: 'Monitor growth',
          priority: 'low'
        }
      ]);

      setLoading(false);
    } catch (error) {
      console.error('Failed to load predictive analytics:', error);
      setLoading(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-600 bg-green-50 dark:bg-green-900/20';
      case 'medium': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20';
      case 'high': return 'text-orange-600 bg-orange-50 dark:bg-orange-900/20';
      case 'critical': return 'text-red-600 bg-red-50 dark:bg-red-900/20';
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-orange-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="bg-background border border-border rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/3"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Churn Prediction */}
      <div className="bg-background border border-border rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingDown className="w-5 h-5 text-red-500" />
          <h3 className="text-lg font-semibold">Churn Risk Predictions</h3>
          <div className="ml-auto text-sm text-muted-foreground">
            AI-powered predictions updated every 30min
          </div>
        </div>
        
        <div className="space-y-4">
          {churnPredictions.map((prediction, index) => (
            <div key={index} className="border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <h4 className="font-medium">{prediction.organization_name}</h4>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(prediction.risk_level)}`}>
                    {prediction.churn_probability}% risk
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  Predicted churn in {prediction.days_to_predicted_churn} days
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h5 className="font-medium text-sm mb-2">Key Risk Factors</h5>
                  <ul className="space-y-1">
                    {prediction.key_factors.map((factor, idx) => (
                      <li key={idx} className="text-sm text-muted-foreground flex items-center gap-2">
                        <AlertTriangle className="w-3 h-3 text-red-500" />
                        {factor}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h5 className="font-medium text-sm mb-2">Recommended Actions</h5>
                  <ul className="space-y-1">
                    {prediction.recommended_actions.map((action, idx) => (
                      <li key={idx} className="text-sm text-muted-foreground flex items-center gap-2">
                        <Target className="w-3 h-3 text-blue-500" />
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Usage Forecasting */}
      <div className="bg-background border border-border rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Usage Forecasting</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {usageForecasts.map((forecast, index) => (
            <div key={index} className="border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium">{forecast.metric}</h4>
                <div className="text-sm text-muted-foreground">
                  {forecast.confidence}% confidence
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Current</span>
                  <span className="font-medium">{forecast.current_value.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">30-day forecast</span>
                  <span className="font-medium text-blue-600">
                    {forecast.predicted_30d.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">90-day forecast</span>
                  <span className="font-medium text-purple-600">
                    {forecast.predicted_90d.toLocaleString()}
                  </span>
                </div>
              </div>
              
              <div className="mt-3 pt-3 border-t border-border">
                <div className={`text-sm flex items-center gap-2 ${
                  forecast.trend === 'increasing' ? 'text-green-600' : 
                  forecast.trend === 'decreasing' ? 'text-red-600' : 'text-gray-600'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    forecast.trend === 'increasing' ? 'bg-green-500' : 
                    forecast.trend === 'decreasing' ? 'bg-red-500' : 'bg-gray-500'
                  }`} />
                  {forecast.trend.charAt(0).toUpperCase() + forecast.trend.slice(1)} trend
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Capacity Planning */}
      <div className="bg-background border border-border rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Capacity Planning</h3>
        </div>
        
        <div className="space-y-4">
          {capacityPlanning.map((capacity, index) => (
            <div key={index} className="border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium">{capacity.resource}</h4>
                <div className={`text-sm font-medium ${getPriorityColor(capacity.priority)}`}>
                  {capacity.priority.charAt(0).toUpperCase() + capacity.priority.slice(1)} Priority
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Utilization</span>
                    <span>{capacity.utilization_percentage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        capacity.utilization_percentage > 80 ? 'bg-red-500' :
                        capacity.utilization_percentage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${capacity.utilization_percentage}%` }}
                    />
                  </div>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Time until limit</span>
                  <span className="font-medium">{capacity.days_until_limit} days</span>
                </div>
                
                <div className="bg-muted/50 rounded p-2">
                  <div className="text-sm font-medium text-primary mb-1">Recommended Action</div>
                  <div className="text-sm text-muted-foreground">{capacity.recommended_action}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};