import React, { useEffect, useState } from 'react';
import { Activity, Server, Users, Database, Globe, Wifi } from 'lucide-react';
import { MetricStat } from '@/components/ui/design-system/MetricStat';

interface SystemMetrics {
  timestamp: string;
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  network_io: {
    incoming_mbps: number;
    outgoing_mbps: number;
  };
  active_connections: number;
  response_time_avg: number;
  requests_per_second: number;
  error_rate: number;
}

interface ServiceStatus {
  service: string;
  status: 'healthy' | 'degraded' | 'down';
  response_time: number;
  uptime_percentage: number;
  last_check: string;
}

export const RealTimeMonitor: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<SystemMetrics>({
    timestamp: new Date().toISOString(),
    cpu_usage: 0,
    memory_usage: 0,
    disk_usage: 0,
    network_io: {
      incoming_mbps: 0,
      outgoing_mbps: 0
    },
    active_connections: 0,
    response_time_avg: 0,
    requests_per_second: 0,
    error_rate: 0
  });
  
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [metricsHistory, setMetricsHistory] = useState<SystemMetrics[]>([]);

  useEffect(() => {
    loadSystemMetrics();
    const interval = setInterval(loadSystemMetrics, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const loadSystemMetrics = async () => {
    try {
      // Mock real-time metrics - in production, this would come from monitoring systems
      const newMetrics: SystemMetrics = {
        timestamp: new Date().toISOString(),
        cpu_usage: Math.random() * 30 + 15, // 15-45%
        memory_usage: Math.random() * 20 + 60, // 60-80%
        disk_usage: Math.random() * 10 + 70, // 70-80%
        network_io: {
          incoming_mbps: Math.random() * 100 + 50,
          outgoing_mbps: Math.random() * 80 + 40
        },
        active_connections: Math.floor(Math.random() * 50 + 120), // 120-170
        response_time_avg: Math.random() * 200 + 300, // 300-500ms
        requests_per_second: Math.floor(Math.random() * 100 + 200), // 200-300 RPS
        error_rate: Math.random() * 2 + 0.5 // 0.5-2.5%
      };

      const serviceStatuses: ServiceStatus[] = [
        {
          service: 'Web API',
          status: 'healthy',
          response_time: Math.random() * 100 + 200,
          uptime_percentage: 99.98,
          last_check: new Date().toISOString()
        },
        {
          service: 'Database',
          status: 'healthy', 
          response_time: Math.random() * 50 + 50,
          uptime_percentage: 99.95,
          last_check: new Date().toISOString()
        },
        {
          service: 'BigQuery Integration',
          status: Math.random() > 0.1 ? 'healthy' : 'degraded',
          response_time: Math.random() * 300 + 500,
          uptime_percentage: 99.87,
          last_check: new Date().toISOString()
        },
        {
          service: 'Auth Service',
          status: 'healthy',
          response_time: Math.random() * 80 + 120,
          uptime_percentage: 99.99,
          last_check: new Date().toISOString()
        },
        {
          service: 'File Storage',
          status: 'healthy',
          response_time: Math.random() * 150 + 100,
          uptime_percentage: 99.92,
          last_check: new Date().toISOString()
        }
      ];

      setMetrics(newMetrics);
      setServices(serviceStatuses);
      
      // Keep history for mini charts (last 20 data points)
      setMetricsHistory(prev => {
        const newHistory = [...prev, newMetrics];
        return newHistory.slice(-20);
      });
      
      setLoading(false);
    } catch (error) {
      console.error('Failed to load system metrics:', error);
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-50 dark:bg-green-900/20';
      case 'degraded': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20';
      case 'down': return 'text-red-600 bg-red-50 dark:bg-red-900/20';
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const getUsageColor = (percentage: number) => {
    if (percentage > 80) return 'text-red-500';
    if (percentage > 60) return 'text-yellow-500';
    return 'text-green-500';
  };

  if (loading) {
    return (
      <div className="bg-background border border-border rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/4"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-20 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* System Resource Metrics */}
      <div className="bg-background border border-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">System Resources</h3>
          </div>
          <div className="text-sm text-muted-foreground">
            Live • Updated {new Date(metrics.timestamp).toLocaleTimeString()}
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricStat
            label="CPU Usage"
            value={`${metrics.cpu_usage.toFixed(1)}%`}
            icon={<Activity className="w-4 h-4" />}
            description="System load"
            className={getUsageColor(metrics.cpu_usage)}
          />
          <MetricStat
            label="Memory Usage"
            value={`${metrics.memory_usage.toFixed(1)}%`}
            icon={<Database className="w-4 h-4" />}
            description="RAM utilization"
            className={getUsageColor(metrics.memory_usage)}
          />
          <MetricStat
            label="Disk Usage"
            value={`${metrics.disk_usage.toFixed(1)}%`}
            icon={<Server className="w-4 h-4" />}
            description="Storage used"
            className={getUsageColor(metrics.disk_usage)}
          />
          <MetricStat
            label="Active Connections"
            value={metrics.active_connections}
            icon={<Users className="w-4 h-4" />}
            description="Current sessions"
          />
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-background border border-border rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Performance Metrics</h3>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricStat
            label="Requests/sec"
            value={metrics.requests_per_second}
            icon={<Activity className="w-4 h-4" />}
            description="Current throughput"
          />
          <MetricStat
            label="Avg Response Time"
            value={`${metrics.response_time_avg.toFixed(0)}ms`}
            icon={<Wifi className="w-4 h-4" />}
            description="Request latency"
            className={metrics.response_time_avg > 500 ? 'text-red-500' : 'text-green-500'}
          />
          <MetricStat
            label="Error Rate"
            value={`${metrics.error_rate.toFixed(2)}%`}
            icon={<Activity className="w-4 h-4" />}
            description="Failed requests"
            className={metrics.error_rate > 2 ? 'text-red-500' : 'text-green-500'}
          />
          <MetricStat
            label="Network I/O"
            value={`${(metrics.network_io.incoming_mbps + metrics.network_io.outgoing_mbps).toFixed(1)}MB/s`}
            icon={<Globe className="w-4 h-4" />}
            description="Total bandwidth"
          />
        </div>
      </div>

      {/* Service Health Status */}
      <div className="bg-background border border-border rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Service Health Status</h3>
        </div>
        
        <div className="space-y-3">
          {services.map((service, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${
                  service.status === 'healthy' ? 'bg-green-500' :
                  service.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
                }`} />
                <div>
                  <div className="font-medium">{service.service}</div>
                  <div className="text-sm text-muted-foreground">
                    {service.uptime_percentage}% uptime
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-sm font-medium">
                    {service.response_time.toFixed(0)}ms
                  </div>
                  <div className="text-xs text-muted-foreground">
                    response time
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(service.status)}`}>
                  {service.status}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Network Traffic */}
      <div className="bg-background border border-border rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Wifi className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Network Traffic</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Incoming Traffic</span>
              <span className="font-medium">{metrics.network_io.incoming_mbps.toFixed(1)} MB/s</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(metrics.network_io.incoming_mbps / 2, 100)}%` }}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Outgoing Traffic</span>
              <span className="font-medium">{metrics.network_io.outgoing_mbps.toFixed(1)} MB/s</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(metrics.network_io.outgoing_mbps / 2, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
