import React, { useEffect, useState } from 'react';
import { AlertTriangle, Shield, Activity, Zap, Clock, CheckCircle } from 'lucide-react';

interface Anomaly {
  id: string;
  type: 'security' | 'performance' | 'usage' | 'error';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  detected_at: string;
  affected_resource: string;
  current_value: number;
  expected_value: number;
  deviation_percentage: number;
  status: 'active' | 'acknowledged' | 'resolved';
  auto_resolution?: string;
  recommended_actions: string[];
}

interface SystemAlert {
  id: string;
  type: 'threshold' | 'pattern' | 'prediction';
  message: string;
  timestamp: string;
  data: Record<string, any>;
}

export const AnomalyDetectionAlerts: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [systemAlerts, setSystemAlerts] = useState<SystemAlert[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    loadAnomalies();
    const interval = setInterval(loadAnomalies, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadAnomalies = async () => {
    try {
      // Mock data - in real implementation, this would be ML-based anomaly detection
      const mockAnomalies: Anomaly[] = [
        {
          id: '1',
          type: 'security',
          severity: 'high',
          title: 'Unusual Login Pattern Detected',
          description: 'Multiple failed login attempts from different IP addresses for organization "StartupApp Co"',
          detected_at: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
          affected_resource: 'Authentication System',
          current_value: 47,
          expected_value: 5,
          deviation_percentage: 840,
          status: 'active',
          recommended_actions: [
            'Review IP addresses and block suspicious ones',
            'Contact organization admin',
            'Enable additional security measures'
          ]
        },
        {
          id: '2',
          type: 'performance',
          severity: 'medium',
          title: 'API Response Time Spike',
          description: 'Average response time increased by 340% in the last hour',
          detected_at: new Date(Date.now() - 900000).toISOString(), // 15 minutes ago
          affected_resource: 'ASO Metrics API',
          current_value: 2.8,
          expected_value: 0.8,
          deviation_percentage: 250,
          status: 'acknowledged',
          auto_resolution: 'Auto-scaling triggered, additional servers provisioned',
          recommended_actions: [
            'Monitor server resources',
            'Check database performance',
            'Review recent deployments'
          ]
        },
        {
          id: '3',
          type: 'usage',
          severity: 'critical',
          title: 'Sudden Drop in API Usage',
          description: 'API calls dropped by 78% compared to usual pattern for this time',
          detected_at: new Date(Date.now() - 600000).toISOString(), // 10 minutes ago
          affected_resource: 'Platform API',
          current_value: 234,
          expected_value: 1067,
          deviation_percentage: -78,
          status: 'active',
          recommended_actions: [
            'Check for service outages',
            'Verify API endpoints availability',
            'Contact major client organizations',
            'Review recent configuration changes'
          ]
        },
        {
          id: '4',
          type: 'error',
          severity: 'low',
          title: 'Elevated Error Rate',
          description: 'Error rate increased to 2.3% from usual 0.5%',
          detected_at: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
          affected_resource: 'Keyword Intelligence Service',
          current_value: 2.3,
          expected_value: 0.5,
          deviation_percentage: 360,
          status: 'resolved',
          auto_resolution: 'Service automatically restarted, error rate normalized',
          recommended_actions: []
        }
      ];

      const mockSystemAlerts: SystemAlert[] = [
        {
          id: '1',
          type: 'threshold',
          message: 'Database connections approaching limit (85%)',
          timestamp: new Date(Date.now() - 120000).toISOString(),
          data: { current: 170, limit: 200 }
        },
        {
          id: '2',
          type: 'pattern',
          message: 'Unusual traffic pattern: 45% increase in requests from mobile clients',
          timestamp: new Date(Date.now() - 480000).toISOString(),
          data: { mobile_requests: 145, desktop_requests: 89 }
        },
        {
          id: '3',
          type: 'prediction',
          message: 'Storage capacity predicted to reach 90% within 3 days',
          timestamp: new Date(Date.now() - 720000).toISOString(),
          data: { current_usage: '78.5%', predicted_date: '2024-01-15' }
        }
      ];

      setAnomalies(mockAnomalies);
      setSystemAlerts(mockSystemAlerts);
      setLastUpdate(new Date());
      setLoading(false);
    } catch (error) {
      console.error('Failed to load anomalies:', error);
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 border-blue-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200';
      case 'high': return 'text-orange-600 bg-orange-50 dark:bg-orange-900/20 border-orange-200';
      case 'critical': return 'text-red-600 bg-red-50 dark:bg-red-900/20 border-red-200';
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'security': return <Shield className="w-4 h-4" />;
      case 'performance': return <Zap className="w-4 h-4" />;
      case 'usage': return <Activity className="w-4 h-4" />;
      case 'error': return <AlertTriangle className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'acknowledged': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'active': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default: return <AlertTriangle className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
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

  const activeAnomalies = anomalies.filter(a => a.status === 'active');
  const acknowledgedAnomalies = anomalies.filter(a => a.status === 'acknowledged');
  const resolvedAnomalies = anomalies.filter(a => a.status === 'resolved');

  return (
    <div className="space-y-6">
      {/* Alert Summary */}
      <div className="bg-background border border-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Real-Time Anomaly Detection</h3>
          </div>
          <div className="text-sm text-muted-foreground">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{activeAnomalies.length}</div>
            <div className="text-sm text-red-600">Active Alerts</div>
          </div>
          <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{acknowledgedAnomalies.length}</div>
            <div className="text-sm text-yellow-600">Acknowledged</div>
          </div>
          <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{resolvedAnomalies.length}</div>
            <div className="text-sm text-green-600">Auto-Resolved</div>
          </div>
        </div>
      </div>

      {/* Active Anomalies */}
      {activeAnomalies.length > 0 && (
        <div className="bg-background border border-border rounded-lg p-6">
          <h4 className="text-md font-semibold mb-4 text-red-600">🚨 Active Anomalies Requiring Attention</h4>
          <div className="space-y-4">
            {activeAnomalies.map((anomaly) => (
              <div key={anomaly.id} className={`border rounded-lg p-4 ${getSeverityColor(anomaly.severity)}`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getTypeIcon(anomaly.type)}
                    <h5 className="font-medium">{anomaly.title}</h5>
                    <div className="text-xs px-2 py-1 rounded-full bg-background/50">
                      {anomaly.severity.toUpperCase()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {getStatusIcon(anomaly.status)}
                    {formatTimestamp(anomaly.detected_at)}
                  </div>
                </div>
                
                <p className="text-sm mb-3">{anomaly.description}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Resource:</span>
                    <div className="font-medium">{anomaly.affected_resource}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Current vs Expected:</span>
                    <div className="font-medium">
                      {anomaly.current_value} vs {anomaly.expected_value}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Deviation:</span>
                    <div className={`font-medium ${anomaly.deviation_percentage > 0 ? 'text-red-600' : 'text-blue-600'}`}>
                      {anomaly.deviation_percentage > 0 ? '+' : ''}{anomaly.deviation_percentage}%
                    </div>
                  </div>
                </div>
                
                {anomaly.recommended_actions.length > 0 && (
                  <div>
                    <h6 className="font-medium text-sm mb-2">Recommended Actions:</h6>
                    <ul className="text-sm space-y-1">
                      {anomaly.recommended_actions.map((action, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <div className="w-1 h-1 bg-current rounded-full" />
                          {action}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* System Alerts Stream */}
      <div className="bg-background border border-border rounded-lg p-6">
        <h4 className="text-md font-semibold mb-4">System Alerts Stream</h4>
        <div className="space-y-3">
          {systemAlerts.map((alert) => (
            <div key={alert.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
              <Activity className="w-4 h-4 text-blue-500" />
              <div className="flex-1">
                <div className="font-medium text-sm">{alert.message}</div>
                <div className="text-xs text-muted-foreground">
                  {formatTimestamp(alert.timestamp)} • {alert.type}
                </div>
              </div>
              {Object.keys(alert.data).length > 0 && (
                <div className="text-xs text-muted-foreground font-mono">
                  {JSON.stringify(alert.data)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Recently Resolved */}
      {resolvedAnomalies.length > 0 && (
        <div className="bg-background border border-border rounded-lg p-6">
          <h4 className="text-md font-semibold mb-4 text-green-600">✅ Recently Auto-Resolved</h4>
          <div className="space-y-3">
            {resolvedAnomalies.map((anomaly) => (
              <div key={anomaly.id} className="border border-green-200 rounded-lg p-3 bg-green-50 dark:bg-green-900/20">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getTypeIcon(anomaly.type)}
                    <span className="font-medium text-sm">{anomaly.title}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatTimestamp(anomaly.detected_at)}
                  </span>
                </div>
                {anomaly.auto_resolution && (
                  <div className="text-sm text-green-700 dark:text-green-300">
                    {anomaly.auto_resolution}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};