
import { MiddlewareFunction, RateLimitConfig } from './types';

// DISABLED: rate_limits table does not exist in current schema
// This middleware is mocked to allow compilation until the table is created

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  free: {
    tier: 'free',
    limits: { hourly: 10, daily: 50, monthly: 100 }
  },
  pro: {
    tier: 'pro', 
    limits: { hourly: 100, daily: 500, monthly: 2000 }
  },
  enterprise: {
    tier: 'enterprise',
    limits: { hourly: 1000, daily: 5000, monthly: 20000 }
  }
};

export function withRateLimit(actionType: string): MiddlewareFunction {
  return async (req, res, next) => {
    // MOCKED: Skip rate limiting until rate_limits table is created
    console.log(`[MOCK] Rate limit check for ${actionType} - BYPASSED (table does not exist)`);
    
    // Attach mock rate limit info to request
    req.rateLimitInfo = {
      remaining: 1000,
      resetTime: new Date(Date.now() + 60 * 60 * 1000),
      tier: 'free'
    };

    await next();
  };
}
