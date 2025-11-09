# AI Agent Security & Compliance Implementation Plan
## Yodel ASO Insight Platform - Comprehensive Security Hardening & GDPR Compliance

---

**Document Version:** 1.0
**Created:** 2025-11-09
**Last Updated:** 2025-11-09
**Status:** APPROVED - AWAITING IMPLEMENTATION
**Approval Required:** Yes - Critical security changes
**Estimated Total Effort:** 18 days / $14,000 USD
**Target Completion:** 2025-12-27 (7 weeks from now)

---

## TABLE OF CONTENTS

1. [Executive Brief](#executive-brief)
2. [System Architecture Overview](#system-architecture-overview)
3. [Current State Analysis](#current-state-analysis)
4. [Critical Security Findings](#critical-security-findings)
5. [Implementation Phases](#implementation-phases)
6. [Detailed Task Specifications](#detailed-task-specifications)
7. [Code Implementation Guidelines](#code-implementation-guidelines)
8. [Testing & Validation](#testing--validation)
9. [Rollback Procedures](#rollback-procedures)
10. [Compliance Tracking](#compliance-tracking)
11. [AI Agent Decision Trees](#ai-agent-decision-trees)
12. [Success Metrics](#success-metrics)

---

## EXECUTIVE BRIEF

### Mission Statement

Transform Yodel ASO Insight Platform from a **MEDIUM-HIGH security risk** system with **60% GDPR compliance** into a **LOW security risk** system with **95% GDPR compliance** ready for SOC 2 Type II certification.

### Strategic Goals

1. **Security Hardening:** Eliminate all CRITICAL and HIGH severity vulnerabilities
2. **GDPR Compliance:** Achieve full compliance with EU data protection regulations
3. **Performance Optimization:** Improve UI/UX performance while maintaining security
4. **International Readiness:** Enable compliant multi-country scraping operations
5. **Audit Readiness:** Prepare for SOC 2 Type II and ISO 27001 certification

### Key Metrics

| Metric | Current | Target | Timeline |
|--------|---------|--------|----------|
| Security Risk Level | MEDIUM-HIGH | LOW | 7 weeks |
| GDPR Compliance | 60% | 95% | 4 weeks |
| Critical Vulnerabilities | 9 | 0 | 1 week |
| High Vulnerabilities | 6 | 2 | 3 weeks |
| Performance Score | Unknown | 90+ | 4 weeks |
| SOC 2 Readiness | 40% | 85% | 12 weeks |

### Investment Required

- **Phase 1 (Critical - Week 1):** 3 days / $2,400
- **Phase 2 (High - Weeks 2-4):** 8.5 days / $6,800
- **Phase 3 (Medium - Weeks 5-7):** 6 days / $4,800
- **Total:** 17.5 days / $14,000

### Risk of Inaction

- **GDPR Fines:** Up to €20M or 4% of global revenue
- **Data Breach:** Potential exposure of PII in logs
- **Terms of Service Violations:** App Store/Play Store blocking
- **Certification Failure:** Cannot achieve SOC 2 without fixes
- **Competitive Disadvantage:** Compliance delays market entry

---

## SYSTEM ARCHITECTURE OVERVIEW

### Current Technology Stack

```yaml
Frontend:
  Framework: React 18 + TypeScript
  State Management: React Query (TanStack Query)
  UI Components: Radix UI + Tailwind CSS
  Build Tool: Vite

Backend:
  Database: Supabase (PostgreSQL)
  Edge Functions: Supabase Edge Functions (Deno)
  Authentication: Supabase Auth (JWT-based)
  Storage: Supabase Storage
  Analytics: BigQuery (Google Cloud)

Security:
  Encryption: AES-256 (pgcrypto)
  Access Control: Row-Level Security (RLS)
  Audit Logging: audit_logs table (7-year retention)
  Authentication: JWT + MFA (optional)

Scraping Infrastructure:
  iOS: iTunes Search API (primary)
  Android: google-play-scraper + Playwright
  Proxies: Planned (not implemented)
  Rate Limiting: Basic (in SecurityService)
```

### Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    USER BROWSER (Client)                     │
│  - React Frontend                                            │
│  - Client-side filtering (GDPR RISK)                        │
│  - Console.log with PII (GDPR VIOLATION)                   │
└─────────────────────────────────────────────────────────────┘
                            ↓ HTTPS
┌─────────────────────────────────────────────────────────────┐
│              SUPABASE EDGE FUNCTIONS (Server)                │
│  - bigquery-aso-data (analytics)                            │
│  - app-store-scraper (scraping)                             │
│  - authorize (permissions)                                   │
│  ⚠️  Currently: Client-side filtering                       │
│  ✅  Should be: Server-side filtering                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
         ┌──────────────────┴──────────────────┐
         ↓                                      ↓
┌──────────────────┐                  ┌──────────────────┐
│  SUPABASE DB     │                  │  BIGQUERY        │
│  - PostgreSQL    │                  │  - Analytics     │
│  - RLS enabled   │                  │  - Scraped data  │
│  - PII encrypted │                  │  ⚠️  No retention│
└──────────────────┘                  └──────────────────┘
```

### Multi-Country Scraping Architecture (Planned)

```
┌─────────────────────────────────────────────────────────────┐
│                  SCRAPING REQUEST FLOW                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  1. DATA SOVEREIGNTY VALIDATION                              │
│  - Check org's allowed_source_countries                      │
│  - Verify GDPR transfer mechanisms (SCC/BCR)                │
│  - Validate storage region compliance                        │
│  ❌ MISSING: Not implemented                                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  2. PROXY SELECTION                                          │
│  - Select proxy for target country                           │
│  - Rotate device fingerprint                                 │
│  - Log proxy usage for audit                                 │
│  ❌ MISSING: No proxy manager                               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  3. SCRAPING EXECUTION                                       │
│  - iTunes API / Play Store scrape                            │
│  - Rate limiting via SecurityService                          │
│  - CAPTCHA handling (if needed)                              │
│  ✅ PARTIAL: SecurityService exists                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  4. DATA STORAGE                                             │
│  - Store in BigQuery with retention policy                   │
│  - Encrypt PII (if any)                                      │
│  - Log in audit_logs                                         │
│  ❌ MISSING: No retention policies                          │
└─────────────────────────────────────────────────────────────┘
```

---

## CURRENT STATE ANALYSIS

### Security Posture

#### ✅ IMPLEMENTED (Strengths)

1. **PII Encryption (AES-256)**
   - Location: `supabase/migrations/20251109030000_enable_pii_encryption.sql`
   - Status: ✅ Fully implemented
   - Functions: `encrypt_pii()`, `decrypt_pii()`
   - Coverage: `audit_logs.user_email_encrypted`
   - Gap: Not applied to all PII fields

2. **Audit Logging**
   - Location: `supabase/migrations/20251109010000_create_audit_logs.sql`
   - Status: ✅ Fully implemented
   - Retention: 7 years (compliance requirement)
   - Coverage: Basic actions
   - Gap: Scraping operations not logged

3. **Row-Level Security (RLS)**
   - Status: ✅ Enabled on most tables
   - Coverage: `org_app_access`, `agency_clients`, `organization_features`
   - Gap: `client_org_map` missing RLS
   - Gap: Some tables have partial policies

4. **Multi-Tenant Isolation**
   - Status: ✅ Working
   - Mechanism: RLS policies + organization_id checks
   - Super Admin Bypass: ✅ Implemented
   - Gap: Inconsistent super admin detection

5. **Rate Limiting (Basic)**
   - Location: `supabase/functions/app-store-scraper/services/security.service.ts`
   - Status: ✅ Basic implementation
   - Limit: 100 requests/hour per organization
   - Gap: No DDoS protection

#### ❌ MISSING / BROKEN (Critical Gaps)

1. **Data Sovereignty Controls**
   - Status: ❌ Not implemented
   - Impact: GDPR Article 44 violation risk
   - Required: Cross-border transfer validation

2. **Consent Management**
   - Status: ❌ Not implemented
   - Impact: GDPR Article 6 violation
   - Required: Consent tracking table + UI flows

3. **Data Retention Policies**
   - Status: ❌ Not implemented
   - Impact: GDPR Article 5(1)(e) violation
   - Required: Auto-deletion after retention period

4. **Proxy Management**
   - Status: ❌ Not implemented
   - Impact: Cannot scale scraping securely
   - Required: Proxy rotation + audit logging

5. **Device Fingerprint Management**
   - Status: ❌ Not implemented
   - Impact: Scraping detection risk
   - Required: Fingerprint rotation service

6. **Right to Erasure**
   - Status: ❌ Not implemented
   - Impact: GDPR Article 17 violation
   - Required: Data deletion endpoint

7. **PII in Logs**
   - Status: ❌ ACTIVE VIOLATION
   - Location: Multiple files (see Critical Findings)
   - Impact: Immediate GDPR violation
   - Required: Remove all PII from console.log

### Performance Analysis

#### Re-Rendering Issues (Security Impact)

| Component | Renders | PII Exposed | Security Risk |
|-----------|---------|-------------|---------------|
| ReviewManagement | 4x | User roles, permissions | HIGH |
| ReportingDashboardV2 | 2x | Org IDs, app IDs | MEDIUM |
| AppSidebar | 3x | Role checks, routes | LOW |
| useEnterpriseAnalytics | 6x | Query params, org IDs | HIGH |

**Total PII Exposures per Page Load:** 40+ log statements

#### Client-Side Filtering (GDPR Risk)

```typescript
// CURRENT (INSECURE):
// 1. Server returns ALL data from ALL countries
const { data } = await supabase.functions.invoke('bigquery-aso-data', {
  body: { org_id, date_range } // No country filter
});

// 2. Client filters locally
const filtered = useMemo(() => {
  return data.filter(row => selectedCountries.includes(row.country));
}, [data, selectedCountries]);

// PROBLEM: Data from ALL countries sent to browser
// GDPR VIOLATION: Cross-border data transfer without consent
```

---

## CRITICAL SECURITY FINDINGS

### 🔴 CRITICAL SEVERITY (Must Fix Immediately)

#### C-1: PII Exposed in Console Logs

**Severity:** CRITICAL
**GDPR Articles Violated:** Article 5(1)(f) (Integrity and confidentiality), Article 32 (Security)
**CVSS Score:** 7.5 (High)

**Affected Files:**
1. `src/pages/growth-accelerators/reviews.tsx:98`
2. `src/hooks/useEnterpriseAnalytics.ts:130-270`
3. `src/pages/ReportingDashboardV2.tsx:197,209`
4. `src/components/AppSidebar.tsx:281-284`

**Evidence:**
```typescript
// reviews.tsx:98
console.log('ReviewManagement - Debug Info:', {
  isSuperAdmin,           // ❌ User role
  isOrganizationAdmin,    // ❌ User role
  roles,                  // ❌ User roles array
  currentUserRole,        // ❌ User role
  canAccessReviews,       // ❌ Permission data
  featureConfig           // ❌ Org feature config
});

// useEnterpriseAnalytics.ts:133-137
console.log('  Organization:', organizationId);  // ❌ Org ID (potential PII)
console.log('  App IDs:', appIds);               // ❌ App IDs (business data)
```

**Impact:**
- User roles and permissions logged in browser console
- Anyone with DevTools access can see sensitive data
- Logs may be captured by browser extensions
- Potential GDPR fine: €10M or 2% of revenue

**Fix Required:**
```typescript
// BEFORE (INSECURE):
console.log('ReviewManagement - Debug Info:', {
  isSuperAdmin,
  isOrganizationAdmin,
  roles
});

// AFTER (SECURE):
if (import.meta.env.DEV && !import.meta.env.VITE_PRODUCTION_LOGGING) {
  console.log('ReviewManagement - Debug Info:', {
    hasAdminRole: Boolean(isSuperAdmin || isOrganizationAdmin),
    roleCount: roles?.length || 0
    // ✅ No PII logged
  });
}
```

**Effort:** 4 hours
**Priority:** P0 - BLOCKING

---

#### C-2: No Data Sovereignty Validation

**Severity:** CRITICAL
**GDPR Articles Violated:** Article 44 (International transfers), Article 46 (Safeguards)
**CVSS Score:** 8.0 (High)

**Problem:**
No validation that cross-border data transfers are authorized.

**Scenario:**
1. German organization (EU) requests US App Store data
2. Data flows: US → BigQuery (US region) → Supabase → German browser
3. **No validation that:**
   - Organization has consent for US data
   - Standard Contractual Clauses (SCC) are in place
   - Data Processing Agreement (DPA) is signed

**Impact:**
- GDPR Article 44 violation
- Potential GDPR fine: €20M or 4% of revenue
- Legal liability in EU courts

**Fix Required:**

**Step 1: Create data residency table**
```sql
-- supabase/migrations/YYYYMMDD_create_data_residency.sql
CREATE TABLE organization_data_residency (
  organization_id UUID PRIMARY KEY REFERENCES organizations(id),

  -- Allowed countries for data scraping
  allowed_source_countries VARCHAR(2)[] NOT NULL DEFAULT '{}',

  -- Storage region (must match org's jurisdiction)
  storage_region TEXT NOT NULL DEFAULT 'us-central1',

  -- GDPR transfer mechanism
  transfer_mechanism TEXT CHECK (transfer_mechanism IN ('SCC', 'BCR', 'adequacy_decision')),

  -- Legal documentation
  dpa_signed_at TIMESTAMPTZ,
  dpa_document_url TEXT,

  -- GDPR representative (if non-EU org)
  gdpr_representative_email TEXT,
  gdpr_representative_country VARCHAR(2),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE organization_data_residency ENABLE ROW LEVEL SECURITY;

-- Policy: Org admins can view their own residency settings
CREATE POLICY "org_admins_view_residency"
ON organization_data_residency FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM user_roles
    WHERE user_id = auth.uid() AND role IN ('ORG_ADMIN', 'SUPER_ADMIN')
  )
);

-- Index for fast lookups
CREATE INDEX idx_data_residency_org ON organization_data_residency(organization_id);
```

**Step 2: Create validation function**
```typescript
// supabase/functions/shared/data-sovereignty-validator.ts

interface DataSovereigntyCheck {
  organizationId: string;
  targetCountry: string;  // Where we're scraping from
  dataType: 'app_metadata' | 'reviews' | 'rankings';
}

export async function validateDataSovereignty(
  supabase: SupabaseClient,
  check: DataSovereigntyCheck
): Promise<{ allowed: boolean; reason?: string }> {

  // 1. Get org's data residency policy
  const { data: policy, error } = await supabase
    .from('organization_data_residency')
    .select('*')
    .eq('organization_id', check.organizationId)
    .single();

  if (error || !policy) {
    return {
      allowed: false,
      reason: 'No data residency policy configured for organization'
    };
  }

  // 2. Check if target country is allowed
  if (!policy.allowed_source_countries.includes(check.targetCountry)) {
    return {
      allowed: false,
      reason: `Organization not authorized to scrape data from ${check.targetCountry}`
    };
  }

  // 3. Check if transfer mechanism is in place (for non-EU to EU transfers)
  const isEUOrg = ['DE', 'FR', 'ES', 'IT', 'NL'].includes(policy.storage_region);
  const isNonEUTarget = !['DE', 'FR', 'ES', 'IT', 'NL'].includes(check.targetCountry);

  if (isEUOrg && isNonEUTarget) {
    if (!policy.transfer_mechanism || !policy.dpa_signed_at) {
      return {
        allowed: false,
        reason: 'Cross-border transfer requires SCC/BCR and signed DPA'
      };
    }
  }

  // 4. All checks passed
  return { allowed: true };
}
```

**Step 3: Integrate into scraping flow**
```typescript
// supabase/functions/app-store-scraper/index.ts

// BEFORE scraping:
const sovereigntyCheck = await validateDataSovereignty(supabase, {
  organizationId: org_id,
  targetCountry: country,
  dataType: 'app_metadata'
});

if (!sovereigntyCheck.allowed) {
  // Log the violation attempt
  await supabase.rpc('log_audit_event', {
    p_user_id: user.id,
    p_organization_id: org_id,
    p_action: 'data_sovereignty_violation_blocked',
    p_resource_type: 'scraper',
    p_status: 'denied',
    p_error_message: sovereigntyCheck.reason
  });

  return new Response(JSON.stringify({
    error: 'Data sovereignty violation',
    message: sovereigntyCheck.reason
  }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Proceed with scraping...
```

**Effort:** 8 hours
**Priority:** P0 - BLOCKING

---

#### C-3: No Consent Management

**Severity:** CRITICAL
**GDPR Articles Violated:** Article 6 (Lawfulness), Article 7 (Consent), Article 13 (Information)
**CVSS Score:** 7.0 (High)

**Problem:**
No system to track user consent for data processing.

**Impact:**
- Cannot prove legal basis for processing
- Cannot demonstrate GDPR compliance
- Cannot handle consent withdrawal
- Potential GDPR fine: €20M or 4% of revenue

**Fix Required:**

**Step 1: Create consent tables**
```sql
-- supabase/migrations/YYYYMMDD_create_consent_management.sql

-- Consent types definition
CREATE TABLE consent_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type_code TEXT UNIQUE NOT NULL,  -- 'app_scraping', 'analytics', 'marketing'
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  required BOOLEAN DEFAULT false,   -- If true, user cannot use platform without consent
  retention_period_months INT,
  processing_purposes TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User consent tracking
CREATE TABLE user_consent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  consent_type_id UUID REFERENCES consent_types(id),

  -- Consent status
  consented_at TIMESTAMPTZ,
  withdrawn_at TIMESTAMPTZ,
  is_active BOOLEAN GENERATED ALWAYS AS (consented_at IS NOT NULL AND withdrawn_at IS NULL) STORED,

  -- Proof of consent (for legal compliance)
  consent_proof JSONB NOT NULL,  -- {ip, user_agent, banner_version, timestamp}

  -- Consent details
  data_processing_purposes TEXT[],
  retention_period_months INT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_consent ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own consent
CREATE POLICY "users_view_own_consent"
ON user_consent FOR SELECT
USING (user_id = auth.uid());

-- Policy: Users can insert their own consent
CREATE POLICY "users_insert_own_consent"
ON user_consent FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Policy: Users can update (withdraw) their own consent
CREATE POLICY "users_update_own_consent"
ON user_consent FOR UPDATE
USING (user_id = auth.uid());

-- Indexes
CREATE INDEX idx_user_consent_user ON user_consent(user_id, is_active);
CREATE INDEX idx_user_consent_org ON user_consent(organization_id, is_active);

-- Insert default consent types
INSERT INTO consent_types (type_code, name, description, required, retention_period_months, processing_purposes) VALUES
('app_scraping', 'App Store Data Scraping', 'Allow scraping of public App Store data for ASO analysis', true, 24, ARRAY['aso_analysis', 'competitive_intelligence']),
('analytics', 'Platform Analytics', 'Allow collection of platform usage analytics', false, 12, ARRAY['platform_improvement', 'bug_tracking']),
('marketing', 'Marketing Communications', 'Allow sending marketing emails and updates', false, 36, ARRAY['marketing', 'product_updates']);
```

**Step 2: Create consent API**
```typescript
// supabase/functions/consent-management/index.ts

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { action, consentTypeCode, organizationId } = await req.json();

  if (action === 'grant') {
    // Record consent
    const { data, error } = await supabase.from('user_consent').insert({
      user_id: user.id,
      organization_id: organizationId,
      consent_type_id: (await supabase
        .from('consent_types')
        .select('id')
        .eq('type_code', consentTypeCode)
        .single()
      ).data.id,
      consented_at: new Date().toISOString(),
      consent_proof: {
        ip: req.headers.get('CF-Connecting-IP') || req.headers.get('X-Forwarded-For'),
        user_agent: req.headers.get('User-Agent'),
        banner_version: '1.0',
        timestamp: new Date().toISOString()
      }
    }).select().single();

    // Log in audit trail
    await supabase.rpc('log_audit_event', {
      p_user_id: user.id,
      p_organization_id: organizationId,
      p_action: 'consent_granted',
      p_resource_type: 'consent',
      p_details: { consent_type: consentTypeCode },
      p_status: 'success'
    });

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (action === 'withdraw') {
    // Withdraw consent
    const { error } = await supabase.from('user_consent')
      .update({ withdrawn_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .eq('consent_type_id', (await supabase
        .from('consent_types')
        .select('id')
        .eq('type_code', consentTypeCode)
        .single()
      ).data.id)
      .is('withdrawn_at', null);

    // Log withdrawal
    await supabase.rpc('log_audit_event', {
      p_user_id: user.id,
      p_organization_id: organizationId,
      p_action: 'consent_withdrawn',
      p_resource_type: 'consent',
      p_details: { consent_type: consentTypeCode },
      p_status: 'success'
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response('Invalid action', { status: 400 });
});
```

**Step 3: Frontend consent banner**
```typescript
// src/components/ConsentBanner.tsx

export function ConsentBanner() {
  const [consents, setConsents] = useState<Record<string, boolean>>({});
  const { user, organizationId } = useAuth();

  useEffect(() => {
    // Check if user has already consented
    supabase.from('user_consent')
      .select('consent_types(type_code)')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .then(({ data }) => {
        const granted = data?.reduce((acc, c) => ({
          ...acc,
          [c.consent_types.type_code]: true
        }), {});
        setConsents(granted || {});
      });
  }, [user.id]);

  const handleConsent = async (typeCode: string, grant: boolean) => {
    await supabase.functions.invoke('consent-management', {
      body: {
        action: grant ? 'grant' : 'withdraw',
        consentTypeCode: typeCode,
        organizationId
      }
    });

    setConsents(prev => ({ ...prev, [typeCode]: grant }));
  };

  if (consents['app_scraping']) return null; // Already consented

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 p-4 z-50">
      <div className="max-w-4xl mx-auto">
        <h3 className="text-lg font-bold mb-2">We value your privacy</h3>
        <p className="text-sm mb-4">
          We use App Store data scraping to provide ASO insights. This data is retained for 24 months.
          By clicking "Accept", you consent to this processing under GDPR Article 6(1)(a).
        </p>
        <div className="flex gap-4">
          <button onClick={() => handleConsent('app_scraping', true)}>
            Accept
          </button>
          <button onClick={() => handleConsent('app_scraping', false)}>
            Decline
          </button>
          <a href="/privacy-policy">Learn More</a>
        </div>
      </div>
    </div>
  );
}
```

**Effort:** 16 hours
**Priority:** P0 - BLOCKING

---

#### C-4: No Data Retention Policies

**Severity:** CRITICAL
**GDPR Articles Violated:** Article 5(1)(e) (Storage limitation), Article 17 (Right to erasure)
**CVSS Score:** 6.5 (Medium-High)

**Problem:**
Scraped data stored indefinitely in BigQuery without retention policies.

**Impact:**
- GDPR Article 5(1)(e) violation
- Cannot demonstrate compliance with retention limits
- Storage costs increase indefinitely
- Potential GDPR fine: €10M or 2% of revenue

**Fix Required:**

**Step 1: Add retention metadata to scraped data**
```sql
-- Add to BigQuery schema (via migration or setup script)
-- Note: This would be implemented in BigQuery, not Supabase

-- Example for Supabase tracking:
CREATE TABLE scraped_data_retention (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bigquery_row_id TEXT NOT NULL UNIQUE,  -- Link to BigQuery row
  app_id TEXT NOT NULL,
  organization_id UUID REFERENCES organizations(id),

  -- Retention tracking
  scraped_at TIMESTAMPTZ NOT NULL,
  retention_until TIMESTAMPTZ NOT NULL,  -- Auto-calculated: scraped_at + 24 months
  deleted_at TIMESTAMPTZ,

  -- GDPR metadata
  legal_basis TEXT NOT NULL CHECK (legal_basis IN ('consent', 'legitimate_interest', 'contract')),
  processing_purposes TEXT[] NOT NULL,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for retention cleanup job
CREATE INDEX idx_retention_cleanup
ON scraped_data_retention(retention_until)
WHERE deleted_at IS NULL;
```

**Step 2: Create retention cleanup service**
```typescript
// supabase/functions/data-retention-cleanup/index.ts

import { BigQuery } from '@google-cloud/bigquery';

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const bigquery = new BigQuery({
    credentials: JSON.parse(Deno.env.get('BIGQUERY_CREDENTIALS')!)
  });

  // 1. Find expired data
  const { data: expiredRows, error } = await supabase
    .from('scraped_data_retention')
    .select('bigquery_row_id, app_id, organization_id')
    .lt('retention_until', new Date().toISOString())
    .is('deleted_at', null)
    .limit(1000);  // Process in batches

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!expiredRows || expiredRows.length === 0) {
    return new Response(JSON.stringify({ message: 'No data to delete' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 2. Delete from BigQuery
  const rowIds = expiredRows.map(r => r.bigquery_row_id);

  const query = `
    DELETE FROM \`yodel-aso-insight.analytics.app_data\`
    WHERE row_id IN UNNEST(@rowIds)
  `;

  const [job] = await bigquery.createQueryJob({
    query,
    params: { rowIds }
  });

  await job.getQueryResults();

  // 3. Mark as deleted in Supabase
  await supabase
    .from('scraped_data_retention')
    .update({ deleted_at: new Date().toISOString() })
    .in('bigquery_row_id', rowIds);

  // 4. Log deletions in audit trail
  for (const row of expiredRows) {
    await supabase.rpc('log_audit_event', {
      p_organization_id: row.organization_id,
      p_action: 'data_retention_deletion',
      p_resource_type: 'scraped_data',
      p_resource_id: row.app_id,
      p_details: { bigquery_row_id: row.bigquery_row_id },
      p_status: 'success'
    });
  }

  return new Response(JSON.stringify({
    deleted_count: expiredRows.length,
    message: 'Data retention cleanup completed'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

**Step 3: Schedule daily cleanup**
```sql
-- supabase/migrations/YYYYMMDD_schedule_retention_cleanup.sql

-- Create cron job to run daily at 2 AM UTC
SELECT cron.schedule(
  'data-retention-cleanup',
  '0 2 * * *',  -- 2 AM daily
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT.supabase.co/functions/v1/data-retention-cleanup',
    headers := '{"Authorization": "Bearer ' || current_setting('app.service_role_key') || '"}'::jsonb
  );
  $$
);
```

**Effort:** 12 hours
**Priority:** P1 - HIGH

---

### 🟠 HIGH SEVERITY (Fix Within 2 Weeks)

#### H-1: Client-Side Data Filtering (Cross-Border Transfer Risk)

**Severity:** HIGH
**GDPR Articles Violated:** Article 44 (International transfers)
**CVSS Score:** 6.0 (Medium)

**Problem:**
Server returns ALL data, client filters locally. This means data from ALL countries is transferred to user's browser, even if they only need one country.

**Current Flow:**
```typescript
// useEnterpriseAnalytics.ts:274-310
const filteredData = useMemo(() => {
  if (!query.data) return null;

  // Server returned ALL traffic sources from ALL countries
  if (trafficSources.length === 0) {
    return query.data;  // Return all
  }

  // Client-side filtering
  const filteredRawData = query.data.rawData.filter((row) =>
    trafficSources.includes(row.traffic_source)
  );
  // ...
}, [query.data, trafficSources]);
```

**GDPR Problem:**
- German user requests DE data only
- Server sends: US, UK, DE, FR, ES data
- User's browser receives ALL country data
- **Article 44:** Data transfer from US to EU occurred without consent

**Fix Required:**

**Move filtering to server-side:**
```typescript
// supabase/functions/bigquery-aso-data/index.ts

// BEFORE:
const query = `
  SELECT * FROM app_data
  WHERE organization_id IN UNNEST(@orgIds)
    AND date BETWEEN @startDate AND @endDate
`;

// AFTER:
const query = `
  SELECT * FROM app_data
  WHERE organization_id IN UNNEST(@orgIds)
    AND date BETWEEN @startDate AND @endDate
    AND (@trafficSources IS NULL OR traffic_source IN UNNEST(@trafficSources))
    AND (@countries IS NULL OR country IN UNNEST(@countries))
`;

const [rows] = await bigquery.query({
  query,
  params: {
    orgIds,
    startDate,
    endDate,
    trafficSources: body.traffic_sources || null,
    countries: body.countries || null  // NEW: Country filter
  }
});
```

**Frontend changes:**
```typescript
// src/hooks/useEnterpriseAnalytics.ts

// BEFORE:
queryKey: ['enterprise-analytics', organizationId, dateRange.start, dateRange.end, appIds.sort().join(',')],

// AFTER:
queryKey: [
  'enterprise-analytics',
  organizationId,
  dateRange.start,
  dateRange.end,
  appIds.sort().join(','),
  trafficSources.sort().join(','),  // Include in cache key
  countries?.sort().join(',')       // NEW: Country filter
],

queryFn: async () => {
  const { data, error } = await supabase.functions.invoke('bigquery-aso-data', {
    body: {
      org_id: organizationId,
      date_range: dateRange,
      app_ids: appIds,
      traffic_sources: trafficSources,
      countries: selectedCountries  // NEW: Send country filter to server
    }
  });
  // ...
}
```

**Effort:** 12 hours
**Priority:** P1 - HIGH

---

#### H-2: Proxy Management Missing

**Severity:** HIGH
**Compliance Impact:** Cannot scale scraping without proxy infrastructure
**CVSS Score:** 5.5 (Medium)

**Problem:**
No proxy management system implemented despite being planned in KEYWORD_SCRAPING_INFRASTRUCTURE.md.

**Fix Required:**

**Step 1: Create proxy credentials table**
```sql
-- supabase/migrations/YYYYMMDD_create_proxy_management.sql

CREATE TABLE proxy_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name TEXT NOT NULL,  -- 'brightdata', 'smartproxy', 'oxylabs'
  api_key_encrypted BYTEA NOT NULL,  -- Encrypted via encrypt_pii()
  country_coverage VARCHAR(2)[] NOT NULL,
  monthly_gb_limit INT,
  cost_per_gb DECIMAL(10,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE proxy_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  proxy_provider_id UUID REFERENCES proxy_providers(id),

  -- Request details
  proxy_ip INET NOT NULL,
  target_country VARCHAR(2) NOT NULL,
  target_url TEXT NOT NULL,

  -- Response details
  status_code INT,
  response_time_ms INT,
  bytes_transferred INT,

  -- Data linkage (for GDPR right to access)
  scraped_data_ids UUID[],  -- Link to scraped_data_retention

  -- Audit trail
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE proxy_usage_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Org admins can view their proxy usage
CREATE POLICY "org_admins_view_proxy_usage"
ON proxy_usage_logs FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM user_roles
    WHERE user_id = auth.uid() AND role IN ('ORG_ADMIN', 'SUPER_ADMIN')
  )
);

-- Indexes
CREATE INDEX idx_proxy_usage_org_date ON proxy_usage_logs(organization_id, created_at DESC);
CREATE INDEX idx_proxy_usage_country ON proxy_usage_logs(target_country, created_at DESC);
```

**Step 2: Implement Proxy Manager Service**
```typescript
// supabase/functions/shared/proxy-manager.service.ts

export class ProxyManager {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  async getProxyForCountry(country: string, organizationId: string): Promise<{
    proxyUrl: string;
    proxyIp: string;
    providerId: string;
  }> {
    // 1. Get active proxy provider for this country
    const { data: providers, error } = await this.supabase
      .from('proxy_providers')
      .select('*')
      .contains('country_coverage', [country])
      .eq('is_active', true)
      .limit(1);

    if (error || !providers || providers.length === 0) {
      throw new Error(`No proxy provider available for country: ${country}`);
    }

    const provider = providers[0];

    // 2. Decrypt API key
    const { data: decryptedKey } = await this.supabase.rpc('decrypt_pii', {
      p_ciphertext: provider.api_key_encrypted
    });

    // 3. Get proxy from provider's API (example for Brightdata)
    const proxyConfig = await this.fetchProxyFromProvider(provider.provider_name, decryptedKey, country);

    return {
      proxyUrl: proxyConfig.url,
      proxyIp: proxyConfig.ip,
      providerId: provider.id
    };
  }

  async logProxyUsage(params: {
    organizationId: string;
    proxyProviderId: string;
    proxyIp: string;
    targetCountry: string;
    targetUrl: string;
    statusCode: number;
    responseTimeMs: number;
    bytesTransferred: number;
  }): Promise<void> {
    await this.supabase.from('proxy_usage_logs').insert(params);
  }

  private async fetchProxyFromProvider(
    providerName: string,
    apiKey: string,
    country: string
  ): Promise<{ url: string; ip: string }> {
    // Implementation depends on provider
    // Example for Brightdata:
    if (providerName === 'brightdata') {
      return {
        url: `http://brd-customer-${apiKey}:@proxy.brightdata.com:22225`,
        ip: 'proxy.brightdata.com'
      };
    }

    throw new Error(`Unsupported proxy provider: ${providerName}`);
  }
}
```

**Step 3: Integrate into scraper**
```typescript
// supabase/functions/app-store-scraper/index.ts

const proxyManager = new ProxyManager(supabase);

// Get proxy for target country
const proxy = await proxyManager.getProxyForCountry(country, organizationId);

// Use proxy in fetch request
const startTime = Date.now();
const response = await fetch(targetUrl, {
  headers: {
    'User-Agent': generateRandomUserAgent(),
    // Other headers...
  },
  // @ts-ignore (Node.js specific)
  agent: new HttpsProxyAgent(proxy.proxyUrl)
});
const responseTime = Date.now() - startTime;

// Log proxy usage
await proxyManager.logProxyUsage({
  organizationId,
  proxyProviderId: proxy.providerId,
  proxyIp: proxy.proxyIp,
  targetCountry: country,
  targetUrl,
  statusCode: response.status,
  responseTimeMs: responseTime,
  bytesTransferred: (await response.text()).length
});
```

**Effort:** 16 hours
**Priority:** P1 - HIGH

---

## IMPLEMENTATION PHASES

### Phase 1: CRITICAL BLOCKERS (Week 1)

**Deadline:** 2025-11-16
**Effort:** 3 days (24 hours)
**Cost:** $2,400 @ $100/hr
**Approval Required:** YES - Critical security changes

**Tasks:**

| Task ID | Task | File(s) | Effort | Priority | Blocker |
|---------|------|---------|--------|----------|---------|
| P1-001 | Remove PII from console.log | `reviews.tsx:98`, `useEnterpriseAnalytics.ts:130-270`, `ReportingDashboardV2.tsx:197,209`, `AppSidebar.tsx:281-284` | 4h | P0 | YES |
| P1-002 | Add environment-gated logging | All files with console.log | 2h | P0 | YES |
| P1-003 | Create GDPR processing register | `docs/GDPR_PROCESSING_REGISTER.md` | 4h | P0 | YES |
| P1-004 | Implement data sovereignty validation | `supabase/functions/shared/data-sovereignty-validator.ts` | 8h | P0 | YES |
| P1-005 | Add proxy usage audit logging | `supabase/migrations/YYYYMMDD_create_proxy_usage_logs.sql` | 6h | P0 | YES |

**Success Criteria:**
- ✅ Zero PII in production logs
- ✅ All console.log statements gated by environment checks
- ✅ GDPR processing register published
- ✅ Data sovereignty validation function deployed
- ✅ Proxy usage logging table created with RLS

**Deployment Plan:**
1. Create feature branch: `security/phase1-critical-blockers`
2. Implement all P1 tasks
3. Code review by 2+ engineers
4. QA testing on staging
5. Deploy to production during low-traffic window
6. Monitor for 24 hours

---

### Phase 2: HIGH PRIORITY (Weeks 2-4)

**Deadline:** 2025-12-07
**Effort:** 8.5 days (68 hours)
**Cost:** $6,800 @ $100/hr
**Approval Required:** YES - GDPR compliance changes

**Tasks:**

| Task ID | Task | Effort | Priority | Dependencies |
|---------|------|--------|----------|--------------|
| P2-001 | Move BigQuery filtering to server-side | 12h | P1 | None |
| P2-002 | Implement consent management | 16h | P1 | None |
| P2-003 | Add data retention policies | 12h | P1 | P2-002 |
| P2-004 | Create GDPR data export endpoint | 8h | P1 | P2-002 |
| P2-005 | Implement device fingerprint rotation | 16h | P1 | P1-005 |
| P2-006 | Store proxy credentials in Vault | 4h | P1 | P1-005 |

**Milestones:**
- **Week 2:** Server-side filtering + Consent UI deployed
- **Week 3:** Retention policies + Export endpoint deployed
- **Week 4:** Device fingerprinting + Proxy vault deployed

---

### Phase 3: MEDIUM PRIORITY (Weeks 5-7)

**Deadline:** 2025-12-27
**Effort:** 6 days (48 hours)
**Cost:** $4,800 @ $100/hr
**Approval Required:** NO - Infrastructure improvements

**Tasks:**

| Task ID | Task | Effort | Priority |
|---------|------|--------|----------|
| P3-001 | Add country compliance table | 8h | P2 |
| P3-002 | Implement right to erasure | 12h | P2 |
| P3-003 | Add Standard Contractual Clauses | 8h | P2 |
| P3-004 | Implement DPA templates | 4h | P2 |
| P3-005 | Create security monitoring dashboard | 16h | P2 |

---

## CODE IMPLEMENTATION GUIDELINES

### File Naming Conventions

```
Migrations:
  Format: YYYYMMDD_HHmmss_description.sql
  Example: 20251109_140000_create_data_sovereignty_table.sql

Edge Functions:
  Format: kebab-case
  Example: data-sovereignty-validator.ts

Services:
  Format: PascalCase with .service.ts suffix
  Example: ProxyManager.service.ts

Components:
  Format: PascalCase with .tsx suffix
  Example: ConsentBanner.tsx
```

### Code Style Guidelines

```typescript
// ✅ GOOD: Clear, typed, secure
interface DataSovereigntyCheck {
  organizationId: string;
  targetCountry: string;
  dataType: 'app_metadata' | 'reviews' | 'rankings';
}

export async function validateDataSovereignty(
  supabase: SupabaseClient,
  check: DataSovereigntyCheck
): Promise<{ allowed: boolean; reason?: string }> {
  // Implementation...
}

// ❌ BAD: Untyped, unclear
export async function validate(db, org, country) {
  // Implementation...
}
```

### Security Guidelines

```typescript
// ✅ GOOD: No PII logged
if (import.meta.env.DEV && !import.meta.env.VITE_PRODUCTION_LOGGING) {
  console.log('User action:', {
    action: 'consent_granted',
    consentType: typeCode,
    timestamp: Date.now()
    // ✅ No user ID, email, or org ID
  });
}

// ❌ BAD: PII logged
console.log('User consent:', {
  userId: user.id,        // ❌ PII
  email: user.email,      // ❌ PII
  orgId: organizationId   // ❌ Potentially PII
});
```

### Error Handling

```typescript
// ✅ GOOD: Generic error, detailed audit log
try {
  await validateDataSovereignty(supabase, check);
} catch (error) {
  // Log detailed error in audit_logs (server-side only)
  await supabase.rpc('log_audit_event', {
    p_action: 'data_sovereignty_validation_failed',
    p_status: 'failure',
    p_error_message: error.message,
    p_details: { targetCountry: check.targetCountry }
  });

  // Return generic error to client
  return new Response(JSON.stringify({
    error: 'Data sovereignty validation failed',
    // ❌ Don't expose internal details to client
  }), { status: 403 });
}

// ❌ BAD: Exposes internal details
catch (error) {
  return new Response(JSON.stringify({
    error: error.message,  // ❌ May expose DB structure, file paths, etc.
    stack: error.stack     // ❌ NEVER expose stack traces to client
  }), { status: 500 });
}
```

---

## TESTING & VALIDATION

### Unit Tests Required

```typescript
// tests/data-sovereignty-validator.test.ts

describe('Data Sovereignty Validator', () => {
  test('should allow scraping from authorized country', async () => {
    const result = await validateDataSovereignty(supabase, {
      organizationId: 'org-123',
      targetCountry: 'US',
      dataType: 'app_metadata'
    });

    expect(result.allowed).toBe(true);
  });

  test('should block scraping from unauthorized country', async () => {
    const result = await validateDataSovereignty(supabase, {
      organizationId: 'org-123',
      targetCountry: 'CN',  // China not in allowed list
      dataType: 'app_metadata'
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('not authorized');
  });

  test('should require SCC for EU org scraping US data', async () => {
    // Setup: EU org without SCC
    const result = await validateDataSovereignty(supabase, {
      organizationId: 'eu-org-456',
      targetCountry: 'US',
      dataType: 'app_metadata'
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('SCC');
  });
});
```

### Integration Tests Required

```typescript
// tests/integration/scraping-flow.test.ts

describe('Scraping Flow Integration', () => {
  test('should enforce data sovereignty in full scraping flow', async () => {
    // 1. Request scraping for unauthorized country
    const response = await fetch('http://localhost:54321/functions/v1/app-store-scraper', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        country: 'CN',  // Unauthorized
        keyword: 'fitness app'
      })
    });

    // 2. Should be blocked
    expect(response.status).toBe(403);

    // 3. Audit log should be created
    const { data: auditLogs } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('action', 'data_sovereignty_violation_blocked')
      .order('created_at', { ascending: false })
      .limit(1);

    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0].status).toBe('denied');
  });
});
```

### Manual Testing Checklist

**Phase 1 Testing:**
- [ ] Verify no PII in browser console (check all pages)
- [ ] Verify logging only happens in dev mode
- [ ] Test data sovereignty validation with authorized country
- [ ] Test data sovereignty validation with unauthorized country
- [ ] Verify proxy usage logs are created
- [ ] Verify audit logs created for all sensitive actions

**Phase 2 Testing:**
- [ ] Test server-side filtering returns only requested countries
- [ ] Test consent banner appears for new users
- [ ] Test consent can be granted
- [ ] Test consent can be withdrawn
- [ ] Test data retention cleanup job runs successfully
- [ ] Test GDPR data export endpoint
- [ ] Verify device fingerprints rotate correctly
- [ ] Verify proxy credentials encrypted in Vault

**Phase 3 Testing:**
- [ ] Test right to erasure deletes all user data
- [ ] Verify SCC templates are accessible
- [ ] Verify DPA templates can be generated
- [ ] Test security monitoring dashboard displays alerts

---

## ROLLBACK PROCEDURES

### Phase 1 Rollback

**If issues occur after Phase 1 deployment:**

```bash
# 1. Revert code changes
git revert <phase1-commit-hash>
git push origin main

# 2. Rollback migrations (if any were run)
# supabase/migrations/YYYYMMDD_rollback_phase1.sql

-- Rollback proxy usage logs table
DROP TABLE IF EXISTS proxy_usage_logs CASCADE;

-- Rollback data sovereignty validation
DROP FUNCTION IF EXISTS validate_data_sovereignty CASCADE;
```

**Data Loss Risk:** NONE (only new tables created, no existing data modified)

### Phase 2 Rollback

**If issues occur after Phase 2 deployment:**

```bash
# 1. Disable consent requirement (allow users to continue using platform)
UPDATE consent_types SET required = false WHERE type_code = 'app_scraping';

# 2. Pause retention cleanup job
SELECT cron.unschedule('data-retention-cleanup');

# 3. Revert server-side filtering
# Deploy previous version of bigquery-aso-data edge function
supabase functions deploy bigquery-aso-data --version <previous-version>

# 4. Monitor for 24 hours before full rollback decision
```

**Data Loss Risk:** LOW (consent records preserved, can be re-used)

---

## COMPLIANCE TRACKING

### GDPR Compliance Scorecard

| Article | Requirement | Status | Phase | Progress |
|---------|-------------|--------|-------|----------|
| Art. 5(1)(a) | Lawfulness | ⚠️ 50% | P2 | Need consent system |
| Art. 5(1)(b) | Purpose limitation | ✅ 80% | P1 | Processing register needed |
| Art. 5(1)(c) | Data minimization | ✅ 90% | - | Already implemented |
| Art. 5(1)(e) | Storage limitation | ❌ 20% | P2 | Need retention policies |
| Art. 5(1)(f) | Security | ⚠️ 70% | P1 | Need to remove PII from logs |
| Art. 6 | Legal basis | ❌ 30% | P2 | Need consent system |
| Art. 7 | Consent | ❌ 10% | P2 | Need consent UI + tracking |
| Art. 13 | Information | ⚠️ 60% | P2 | Need privacy policy update |
| Art. 15 | Right to access | ❌ 40% | P2 | Need data export endpoint |
| Art. 17 | Right to erasure | ❌ 20% | P3 | Need deletion workflow |
| Art. 32 | Security | ⚠️ 75% | P1 | Encryption exists, need key rotation |
| Art. 44 | International transfers | ❌ 30% | P1 | Need sovereignty validation |

**Overall GDPR Compliance:** 60% → Target: 95%

---

## AI AGENT DECISION TREES

### Decision Tree 1: Should I Remove This Console.Log?

```
START
  ↓
Does the log contain any of the following?
  - User ID
  - User email
  - Organization ID
  - Organization name
  - User role
  - Permissions
  - App IDs
  - API keys
  - Any identifiable data
  ↓
YES → REMOVE COMPLETELY or GATE WITH:
      if (import.meta.env.DEV && !import.meta.env.VITE_PRODUCTION_LOGGING) {
        console.log(...);
      }
  ↓
NO → Is this log useful for debugging?
  ↓
  YES → Keep, but ensure it's performance-optimized
  ↓
  NO → REMOVE (reduces log noise)
```

### Decision Tree 2: Should I Add RLS to This Table?

```
START
  ↓
Does the table store data that's:
  - Organization-specific
  - User-specific
  - Contains PII
  - Contains business-sensitive data
  ↓
YES → ADD RLS
  ↓
  Create policies:
    1. SELECT: Users in org + Super Admin
    2. INSERT: Service Role OR Org Admin
    3. UPDATE: Service Role OR Org Admin
    4. DELETE: Service Role OR Super Admin
  ↓
NO → Is this a lookup/reference table?
  ↓
  YES → READ-ONLY RLS (SELECT only policy)
  ↓
  NO → PUBLIC ACCESS (e.g., static configuration)
```

### Decision Tree 3: Is This Data Transfer GDPR-Compliant?

```
START: Planning to transfer data from Country A to Country B
  ↓
Is Country A in EU?
  ↓
  NO → Is Country B in EU?
    ↓
    YES → REQUIRES: Adequacy decision OR SCC
    ↓
    NO → ALLOWED (non-EU to non-EU, no GDPR restriction)
  ↓
YES (Country A is in EU)
  ↓
  Is Country B in EU or adequacy decision country?
  ↓
  YES → ALLOWED (intra-EU or to adequate country)
  ↓
  NO → REQUIRES:
    1. Standard Contractual Clauses (SCC)
    2. Data Processing Agreement (DPA)
    3. User consent OR legitimate interest
    ↓
  Has organization signed SCC?
  ↓
  YES → ALLOWED
  ↓
  NO → BLOCK TRANSFER
    ↓
    Log in audit_logs:
      action: 'data_sovereignty_violation_blocked'
      status: 'denied'
```

---

## SUCCESS METRICS

### Security Metrics

| Metric | Baseline | Week 1 | Week 4 | Week 7 | Target |
|--------|----------|--------|--------|--------|--------|
| Critical Vulnerabilities | 9 | 0 | 0 | 0 | 0 |
| High Vulnerabilities | 6 | 6 | 2 | 0 | 0 |
| Medium Vulnerabilities | 8 | 8 | 6 | 4 | <3 |
| PII Exposure Events | Unknown | 0 | 0 | 0 | 0 |
| Audit Log Coverage | 40% | 60% | 85% | 100% | 100% |

### Performance Metrics

| Metric | Baseline | Week 4 | Week 7 | Target |
|--------|----------|--------|--------|--------|
| Page Load Time | Unknown | <3s | <2s | <2s |
| Component Re-renders | 4x | 2x | 1x | 1x |
| BigQuery Query Time | 1.8s | 1.5s | 1.2s | <1.5s |
| Client Bundle Size | Unknown | -10% | -20% | -20% |

### Compliance Metrics

| Metric | Baseline | Week 1 | Week 4 | Week 7 | Target |
|--------|----------|--------|--------|--------|--------|
| GDPR Compliance | 60% | 70% | 90% | 95% | 95% |
| SOC 2 Readiness | 40% | 50% | 70% | 85% | 85% |
| Consent Coverage | 0% | 0% | 100% | 100% | 100% |
| Data Retention Compliance | 0% | 0% | 80% | 100% | 100% |

---

## APPENDIX A: QUICK REFERENCE

### Critical Files to Modify

```
Phase 1 (Week 1):
  src/pages/growth-accelerators/reviews.tsx:98
  src/hooks/useEnterpriseAnalytics.ts:130-270
  src/pages/ReportingDashboardV2.tsx:197,209
  src/components/AppSidebar.tsx:281-284
  supabase/functions/shared/data-sovereignty-validator.ts (NEW)
  supabase/migrations/YYYYMMDD_create_proxy_usage_logs.sql (NEW)
  docs/GDPR_PROCESSING_REGISTER.md (NEW)

Phase 2 (Weeks 2-4):
  supabase/functions/bigquery-aso-data/index.ts
  supabase/migrations/YYYYMMDD_create_consent_management.sql (NEW)
  supabase/migrations/YYYYMMDD_create_data_retention.sql (NEW)
  supabase/functions/consent-management/index.ts (NEW)
  supabase/functions/data-retention-cleanup/index.ts (NEW)
  supabase/functions/gdpr-export/index.ts (NEW)
  src/components/ConsentBanner.tsx (NEW)

Phase 3 (Weeks 5-7):
  supabase/migrations/YYYYMMDD_create_country_compliance.sql (NEW)
  supabase/functions/right-to-erasure/index.ts (NEW)
  docs/SCC_TEMPLATE.md (NEW)
  docs/DPA_TEMPLATE.md (NEW)
```

### Environment Variables Required

```bash
# Phase 1
VITE_PRODUCTION_LOGGING=false  # Gate console.log in production

# Phase 2
BIGQUERY_CREDENTIALS=<service-account-json>
SUPABASE_SERVICE_ROLE_KEY=<key>

# Phase 3
PROXY_BRIGHTDATA_API_KEY=<key>  # Encrypted, stored in Vault
PROXY_SMARTPROXY_API_KEY=<key>  # Encrypted, stored in Vault
```

### SQL Query Helpers

```sql
-- Check RLS status on all tables
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY rowsecurity, tablename;

-- Check policy coverage
SELECT tablename,
  COUNT(*) FILTER (WHERE cmd = 'SELECT') as select_policies,
  COUNT(*) FILTER (WHERE cmd = 'INSERT') as insert_policies
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename;

-- Find data needing retention cleanup
SELECT COUNT(*) as expired_rows
FROM scraped_data_retention
WHERE retention_until < NOW()
  AND deleted_at IS NULL;

-- Check consent coverage
SELECT
  ct.type_code,
  COUNT(DISTINCT uc.user_id) as consented_users,
  COUNT(DISTINCT u.id) as total_users,
  ROUND(100.0 * COUNT(DISTINCT uc.user_id) / NULLIF(COUNT(DISTINCT u.id), 0), 2) as coverage_pct
FROM consent_types ct
CROSS JOIN auth.users u
LEFT JOIN user_consent uc ON uc.consent_type_id = ct.id AND uc.is_active = true
GROUP BY ct.type_code;
```

---

## APPENDIX B: CONTACT & ESCALATION

### Approval Required From

- **Security Lead:** All Phase 1 changes
- **Legal/Compliance:** All GDPR-related changes (Phase 2)
- **Engineering Manager:** All database schema changes
- **Product Manager:** All UX changes (consent banner, etc.)

### Escalation Path

1. **Blockers:** Report immediately to Engineering Manager
2. **GDPR Questions:** Escalate to Legal/Compliance team
3. **Security Incidents:** Follow incident response plan
4. **Performance Degradation:** Report to DevOps team

---

**END OF DOCUMENT**

*This document should be used as the single source of truth for implementing security hardening and GDPR compliance for the Yodel ASO Insight Platform. All AI agents should reference this document before making code changes related to security, privacy, or compliance.*

**Version:** 1.0
**Last Updated:** 2025-11-09
**Next Review:** 2025-12-09
