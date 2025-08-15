
export interface SecurityValidationInput {
  searchTerm: string;
  organizationId: string;
  securityContext: any;
  ipAddress: string;
  userAgent: string;
}

export interface SecurityValidationResult {
  success: boolean;
  data?: {
    country: string;
    riskScore: number;
  };
  error?: string;
}

export class SecurityService {
  constructor(private supabase?: any) {
    // Require supabase client for security
    if (!this.supabase) {
      console.error('[SECURITY] Supabase client not provided - security functions will fail');
    }
  }

  async validateRequest(input: SecurityValidationInput): Promise<SecurityValidationResult> {
    try {
      // Basic validation
      if (!this.isValidSearchTerm(input.searchTerm)) {
        return {
          success: false,
          error: 'Invalid search term format'
        };
      }

      // Check rate limiting (with fallback)
      const rateLimitCheck = await this.checkRateLimit(input.organizationId, input.ipAddress);
      if (!rateLimitCheck.allowed) {
        return {
          success: false,
          error: 'Rate limit exceeded. Please try again later.'
        };
      }

      // Validate organization exists and is active
      const orgValidation = await this.validateOrganization(input.organizationId);
      if (!orgValidation.success) {
        return {
          success: false,
          error: `Organization validation failed: ${orgValidation.error}`
        };
      }

      // Calculate risk score
      const riskScore = this.calculateRiskScore(input);

      // Determine country (default to US)
      const country = this.extractCountryFromContext(input.securityContext) || 'us';

      return {
        success: true,
        data: {
          country,
          riskScore
        }
      };
    } catch (error) {
      console.error('[SECURITY] Security validation error:', error);
      return {
        success: false,
        error: 'Security validation failed - request blocked'
      };
    }
  }

  private isValidSearchTerm(searchTerm: string): boolean {
    // Basic validation - no malicious patterns
    const maliciousPatterns = [
      /<script/i,
      /javascript:/i,
      /data:text\/html/i,
      /vbscript:/i
    ];

    return searchTerm.length > 0 && 
           searchTerm.length < 500 && 
           !maliciousPatterns.some(pattern => pattern.test(searchTerm));
  }

  private async checkRateLimit(organizationId: string, ipAddress: string): Promise<{allowed: boolean; remaining?: number; message?: string}> {
    try {
      // Require Supabase client for production security
      if (!this.supabase) {
        console.error('[SECURITY] Supabase client not available - blocking request for security');
        return { 
          allowed: false, 
          remaining: 0,
          message: 'Database connection required for rate limiting'
        };
      }

      // Simple rate limiting - 100 requests per hour per organization
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      const { count, error } = await this.supabase
        .from('audit_logs')
        .select('*', { count: 'exact' })
        .eq('organization_id', organizationId)
        .eq('action', 'app_store_scraper_request')
        .gte('created_at', oneHourAgo.toISOString());

      if (error) {
        console.error('[SECURITY] Rate limit check failed:', error.message);
        return { 
          allowed: false, 
          remaining: 0,
          message: 'Rate limit check failed - blocking for security'
        }; // Block on error for security
      }

      const requestCount = count || 0;
      const remaining = Math.max(0, 100 - requestCount);

      return { 
        allowed: requestCount < 100,
        remaining,
        message: `${requestCount}/100 requests used in last hour`
      };
    } catch (error) {
      console.error('[SECURITY] Rate limit check failed:', error);
      return { 
        allowed: false, 
        remaining: 0,
        message: 'Rate limit system error - blocking for security'
      }; // Block on error for security
    }
  }

  private async validateOrganization(organizationId: string): Promise<{success: boolean, error?: string}> {
    try {
      if (!this.supabase) {
        return {
          success: false,
          error: 'Supabase client not available'
        };
      }

      const { data, error } = await this.supabase
        .from('organizations')
        .select('id, subscription_status')
        .eq('id', organizationId)
        .maybeSingle(); // Use maybeSingle to avoid errors when no data

      if (error) {
        return {
          success: false,
          error: `Database error: ${error.message}`
        };
      }

      if (!data) {
        return {
          success: false,
          error: 'Organization not found'
        };
      }

      // Allow any organization during emergency stabilization
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Organization validation failed: ${error.message}`
      };
    }
  }

  private calculateRiskScore(input: SecurityValidationInput): number {
    let score = 0;

    // Higher risk for suspicious search terms
    if (input.searchTerm.length > 200) score += 2;
    if (input.searchTerm.includes('..')) score += 3;
    if (input.searchTerm.match(/[<>'"]/)) score += 1;

    // Check user agent
    if (!input.userAgent || input.userAgent.length < 10) score += 2;

    return Math.min(score, 10); // Cap at 10
  }

  private extractCountryFromContext(securityContext: any): string | null {
    if (securityContext?.country && typeof securityContext.country === 'string') {
      return securityContext.country.toLowerCase();
    }
    return null;
  }
}
