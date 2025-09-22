import { supabase } from '@/integrations/supabase/client';

export interface ConnectionHealthStatus {
  isHealthy: boolean;
  responseTime: number;
  error?: string;
  timestamp: number;
}

class ConnectionHealthService {
  private lastHealthCheck: ConnectionHealthStatus | null = null;
  private readonly HEALTH_CHECK_CACHE_DURATION = 30000; // 30 seconds

  /**
   * Check the health of the edge function connection
   */
  async checkEdgeFunctionHealth(): Promise<ConnectionHealthStatus> {
    // Return cached result if recent
    if (this.lastHealthCheck && 
        Date.now() - this.lastHealthCheck.timestamp < this.HEALTH_CHECK_CACHE_DURATION) {
      return this.lastHealthCheck;
    }

    const startTime = Date.now();
    
    try {
      // Simple health check to the edge function
      const { data, error } = await supabase.functions.invoke('app-store-scraper', {
        body: { op: 'health' }
      });

      const responseTime = Date.now() - startTime;

      if (error) {
        this.lastHealthCheck = {
          isHealthy: false,
          responseTime,
          error: error.message,
          timestamp: Date.now()
        };
      } else {
        this.lastHealthCheck = {
          isHealthy: true,
          responseTime,
          timestamp: Date.now()
        };
      }

    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      this.lastHealthCheck = {
        isHealthy: false,
        responseTime,
        error: error.message || 'Connection failed',
        timestamp: Date.now()
      };
    }

    return this.lastHealthCheck;
  }

  /**
   * Get the last known connection status without making a new request
   */
  getLastKnownStatus(): ConnectionHealthStatus | null {
    return this.lastHealthCheck;
  }

  /**
   * Clear the cached health status to force a fresh check
   */
  clearCache(): void {
    this.lastHealthCheck = null;
  }

  /**
   * Get connection quality based on response time
   */
  getConnectionQuality(responseTime: number): 'excellent' | 'good' | 'fair' | 'poor' {
    if (responseTime < 500) return 'excellent';
    if (responseTime < 1000) return 'good';
    if (responseTime < 2000) return 'fair';
    return 'poor';
  }
}

export const connectionHealthService = new ConnectionHealthService();