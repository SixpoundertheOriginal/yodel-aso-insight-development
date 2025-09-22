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
   * Check the health of the edge function connection with multiple methods
   */
  async checkEdgeFunctionHealth(): Promise<ConnectionHealthStatus> {
    // Return cached result if recent
    if (this.lastHealthCheck && 
        Date.now() - this.lastHealthCheck.timestamp < this.HEALTH_CHECK_CACHE_DURATION) {
      return this.lastHealthCheck;
    }

    const startTime = Date.now();
    
    // Try Supabase client method first
    try {
      console.log('[HealthCheck] Trying supabase.functions.invoke()');
      const { data, error } = await supabase.functions.invoke('app-store-scraper', {
        body: { op: 'health' }
      });

      const responseTime = Date.now() - startTime;

      if (error) {
        console.warn('[HealthCheck] Supabase invoke failed, trying direct HTTP:', error.message);
        throw new Error(error.message);
      } else {
        this.lastHealthCheck = {
          isHealthy: true,
          responseTime,
          timestamp: Date.now()
        };
        console.log('[HealthCheck] Supabase invoke successful');
        return this.lastHealthCheck;
      }

    } catch (supabaseError: any) {
      console.warn('[HealthCheck] Supabase method failed, trying direct HTTP');
      
      // Fallback to direct HTTP call
      try {
        const directStartTime = Date.now();
        const response = await fetch(`https://bkbcqocpjahewqjmlgvf.supabase.co/functions/v1/app-store-scraper`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYmNxb2NwamFoZXdxam1sZ3ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4MDcwOTgsImV4cCI6MjA2MjM4MzA5OH0.K00WoAEZNf93P-6r3dCwOZaYah51bYuBPwHtDdW82Ek`,
          },
          body: JSON.stringify({ op: 'health' }),
          signal: AbortSignal.timeout(10000)
        });
        
        const responseTime = Date.now() - directStartTime;
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        await response.json(); // Validate JSON response
        
        this.lastHealthCheck = {
          isHealthy: true,
          responseTime,
          error: 'Direct HTTP (Supabase client issue)',
          timestamp: Date.now()
        };
        
        console.log('[HealthCheck] Direct HTTP successful');
        return this.lastHealthCheck;
        
      } catch (httpError: any) {
        const responseTime = Date.now() - startTime;
        this.lastHealthCheck = {
          isHealthy: false,
          responseTime,
          error: `Both methods failed - Supabase: ${supabaseError.message}, HTTP: ${httpError.message}`,
          timestamp: Date.now()
        };
        
        console.error('[HealthCheck] Both methods failed:', {
          supabaseError: supabaseError.message,
          httpError: httpError.message
        });
        return this.lastHealthCheck;
      }
    }
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