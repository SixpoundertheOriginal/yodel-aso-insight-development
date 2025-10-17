
import { MiddlewareFunction, ApiRequest, UsageData } from './types';

// DISABLED: user_usage and rate_limits tables do not exist in current schema
// This middleware is mocked to allow compilation until tables are created

export function withUsageTracking(actionType: string): MiddlewareFunction {
  return async (req, res, next) => {
    const startTime = Date.now();
    req.startTime = startTime;
    
    // Override res.json to capture response data
    const originalJson = res.json;
    let responseData: any;
    let success = true;
    
    res.json = function(data: any) {
      responseData = data;
      success = !data.error;
      return originalJson.call(this, data);
    };

    try {
      await next();
    } catch (error) {
      success = false;
      throw error;
    } finally {
      // MOCKED: Skip usage tracking until tables are created
      const processingTime = Date.now() - startTime;
      console.log(`[MOCK] Usage tracking for ${actionType}: ${processingTime}ms, success: ${success} - BYPASSED (tables do not exist)`);
    }
  };
}
