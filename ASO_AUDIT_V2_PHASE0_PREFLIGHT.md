# 🚀 ASO Audit v2.0 — Phase 0 Preflight Checklist

**Purpose:** Pre-development setup tasks before touching any code
**Status:** Ready to Execute
**Created:** 2025-01-27

---

## 🎯 OBJECTIVES

Phase 0 ensures we have:
1. ✅ Clean development environment
2. ✅ Feature flags for safe rollout
3. ✅ Test data for validation
4. ✅ Minimal data assets to unblock development
5. ✅ Team alignment on scope

**Timeline:** 3-5 days before Phase 1 development starts

---

## 📋 CHECKLIST

### **1. Git & Branch Setup**

- [ ] **Create feature branch**
  ```bash
  git checkout main
  git pull origin main
  git checkout -b feature/aso-audit-v2-foundation
  ```

- [ ] **Verify clean working directory**
  ```bash
  git status  # Should show no uncommitted changes
  ```

- [ ] **Set up branch protection** (if applicable)
  - Require PR review before merge to main
  - Enable CI/CD checks

**Owner:** Engineer
**Deadline:** Day 1

---

### **2. Feature Flags Configuration**

- [ ] **Add feature flags to environment config**

  **File:** `.env` and `.env.example`
  ```bash
  # ASO Audit v2.0 Feature Flags
  ENABLE_INTENT_V2=false
  ENABLE_DESCRIPTION_INTELLIGENCE=false
  ENABLE_GAP_ANALYSIS=false
  ENABLE_KPI_V2=false
  ENABLE_EXECUTIVE_RECOMMENDATIONS=false
  ENABLE_AUDIT_V2_UI=false
  ```

- [ ] **Create feature flag service** (if not exists)

  **File:** `src/lib/featureFlags.ts`
  ```typescript
  export const featureFlags = {
    intentV2: () => import.meta.env.VITE_ENABLE_INTENT_V2 === 'true',
    descriptionIntelligence: () => import.meta.env.VITE_ENABLE_DESCRIPTION_INTELLIGENCE === 'true',
    gapAnalysis: () => import.meta.env.VITE_ENABLE_GAP_ANALYSIS === 'true',
    kpiV2: () => import.meta.env.VITE_ENABLE_KPI_V2 === 'true',
    executiveRecommendations: () => import.meta.env.VITE_ENABLE_EXECUTIVE_RECOMMENDATIONS === 'true',
    auditV2UI: () => import.meta.env.VITE_ENABLE_AUDIT_V2_UI === 'true'
  } as const;
  ```

- [ ] **Document flag usage in README**
  - What each flag controls
  - How to enable for testing
  - Default state (all disabled)

**Owner:** Engineer
**Deadline:** Day 1

---

### **3. Test Data Preparation**

- [ ] **Select 5 test apps per vertical** (35 total)

  **Criteria:**
  - Diverse metadata quality (excellent, good, poor)
  - Known issues (high brand dependency, missing features, etc.)
  - Apps we have access to for re-testing

  **Test Suite Structure:**
  ```typescript
  // test-data/audit-v2-test-apps.ts
  export const TEST_APPS = {
    language_learning: [
      { appId: 'pimsleur', name: 'Pimsleur', issue: 'High brand dependency' },
      { appId: 'duolingo', name: 'Duolingo', issue: 'Generic intent heavy' },
      { appId: 'babbel', name: 'Babbel', issue: 'Balanced (control)' },
      { appId: 'rosetta', name: 'Rosetta Stone', issue: 'Risky transactional keywords' },
      { appId: 'busuu', name: 'Busuu', issue: 'Feature gaps' }
    ],

    finance: [
      { appId: 'mint', name: 'Mint', issue: 'Trust signal gaps' },
      { appId: 'robinhood', name: 'Robinhood', issue: 'Transactional heavy' },
      { appId: 'acorns', name: 'Acorns', issue: 'Balanced (control)' },
      { appId: 'chime', name: 'Chime', issue: 'High brand dependency' },
      { appId: 'sofi', name: 'SoFi', issue: 'Feature gaps' }
    ],

    // ... repeat for 7 verticals
  };
  ```

- [ ] **Export baseline audit results** (current system)
  - Run existing audit on all 35 apps
  - Save results to JSON for comparison
  - Document known issues with current system

- [ ] **Create validation script**
  ```typescript
  // scripts/validate-v2-audit.ts
  // Run v2 audit on test apps
  // Compare to baseline
  // Flag regressions
  ```

**Owner:** Engineer + ASO Team
**Deadline:** Day 2-3

---

### **4. Minimal Data Asset Collection**

#### **4a. Risky Transactional Keywords**

- [ ] **ASO Team provides list** (20-30 keywords)

  **Template:**
  ```typescript
  // src/engine/metadata/data/risky-transactional-keywords.ts
  export const RISKY_TRANSACTIONAL_KEYWORDS = [
    // Confirmed Apple penalties
    'free',
    'download',
    'install',
    'now',
    'today',

    // ASO team to fill in 15-25 more:
    // 'best',
    // 'top',
    // '#1',
    // 'limited time',
    // 'exclusive',
    // 'click here',
    // ... (ASO team input needed)
  ];

  export const SAFE_TRANSACTIONAL_KEYWORDS = [
    'try',
    'start',
    'get',
    'use',
    'begin',
    'access',
    'explore',
    'discover',

    // ASO team to fill in 5-10 more:
    // 'learn more',
    // 'see how',
    // 'sign up',
    // ... (ASO team input needed)
  ];
  ```

- [ ] **ASO Team reviews and approves**
- [ ] **Commit to repo**

**Owner:** ASO Team
**Deadline:** Day 2

---

#### **4b. Generic Capability Patterns**

- [ ] **Engineer creates draft patterns** (20 feature, 20 benefit, 10 trust)

  **File:** `src/engine/metadata/data/generic-capability-patterns.ts`
  ```typescript
  export const GENERIC_FEATURE_PATTERNS = [
    // Functionality
    { pattern: /\b(offline|without internet)\b/i, category: 'functionality' },
    { pattern: /\b(real-time|live|instant)\b/i, category: 'performance' },
    { pattern: /\b(voice|speech|audio)\b/i, category: 'interface' },

    // Data & Sync
    { pattern: /\b(sync|cloud|backup)\b/i, category: 'data' },
    { pattern: /\b(export|import|share)\b/i, category: 'integration' },

    // ... engineer fills in 15 more
  ];

  export const GENERIC_BENEFIT_PATTERNS = [
    // Efficiency
    { pattern: /\b(save time|faster|quick)\b/i, category: 'efficiency' },
    { pattern: /\b(easy|simple|effortless)\b/i, category: 'usability' },

    // Achievement
    { pattern: /\b(improve|boost|enhance)\b/i, category: 'achievement' },
    { pattern: /\b(master|fluent|proficient)\b/i, category: 'skill_development' },

    // ... engineer fills in 15 more
  ];

  export const GENERIC_TRUST_PATTERNS = [
    // Security
    { pattern: /\b(secure|encrypted|protected)\b/i, category: 'security' },
    { pattern: /\b(privacy|private|confidential)\b/i, category: 'privacy' },

    // Credentials
    { pattern: /\b(verified|certified|approved)\b/i, category: 'certification' },
    { pattern: /\b(award|winner|rated)\b/i, category: 'recognition' },

    // ... engineer fills in 6 more
  ];
  ```

- [ ] **ASO Team reviews patterns for accuracy**
  - Validate category assignments
  - Suggest additions/removals
  - Approve final list

- [ ] **Commit approved patterns**

**Owner:** Engineer (draft) → ASO Team (review) → Engineer (finalize)
**Deadline:** Day 3

---

#### **4c. Critical Trust Signals Per Vertical**

- [ ] **ASO Team provides 10-15 critical trust signals per vertical**

  **Template:**
  ```typescript
  // src/engine/metadata/data/vertical-trust-signals.ts
  export const VERTICAL_TRUST_SIGNALS = {
    language_learning: {
      critical: [
        'certified',
        'native speakers',
        'linguist-approved',
        'educational',
        'award-winning'
        // ASO team to fill in 5-10 more
      ]
    },

    finance: {
      critical: [
        'bank-level encryption',
        'FDIC insured',
        '256-bit security',
        'SOC 2 certified',
        'biometric authentication',
        'secure',
        'protected'
        // ASO team to fill in 3-8 more
      ]
    },

    health: {
      critical: [
        'HIPAA compliant',
        'medical-grade',
        'certified',
        'privacy protected',
        'doctor approved',
        'FDA cleared'
        // ASO team to fill in 4-9 more
      ]
    },

    // ... ASO team fills in for all 7 verticals
  };
  ```

- [ ] **ASO Team reviews and approves**
- [ ] **Commit to repo**

**Owner:** ASO Team
**Deadline:** Day 3

---

### **5. TypeScript Types & Interfaces**

- [ ] **Create new type definitions for v2.0**

  **File:** `src/types/auditV2.ts`
  ```typescript
  // Intent V2 types
  export type IntentType =
    | 'informational'
    | 'commercial'
    | 'transactional'
    | 'navigational'
    | 'category'
    | 'feature';

  export type TransactionalSafety = 'safe' | 'risky' | null;

  export interface ComboIntentClassificationV2 extends ComboIntentClassification {
    intentScores: {
      informational: number;
      commercial: number;
      transactional: number;
      navigational: number;
      category: number;
      feature: number;
    };
    transactionalSafety?: TransactionalSafety;
    riskFlags?: string[];
  }

  // Description Intelligence types
  export interface AppCapabilityMap {
    features: {
      detected: string[];
      count: number;
      categories: string[];
    };
    benefits: {
      detected: string[];
      count: number;
      categories: string[];
    };
    trust: {
      signals: string[];
      count: number;
      categories: string[];
    };
  }

  // Gap Analysis types
  export interface GapAnalysisResult {
    feature_gaps: CapabilityGap[];
    benefit_gaps: CapabilityGap[];
    trust_gaps: CapabilityGap[];
    summary: GapSummary;
  }

  export interface CapabilityGap {
    capability: string;
    category: string;
    present_in_title: boolean;
    present_in_subtitle: boolean;
    present_in_keywords: boolean;
    gap_severity: 'critical' | 'high' | 'moderate';
  }

  export interface GapSummary {
    total_feature_gaps: number;
    total_benefit_gaps: number;
    total_trust_gaps: number;
    critical_gaps: number;
    top_3_missed_opportunities: string[];
  }

  // Executive Recommendation types
  export interface ExecutiveRecommendation {
    whats_wrong: {
      issues: ExecutiveIssue[];
    };
    opportunities: {
      opportunities: ExecutiveOpportunity[];
    };
    direction: {
      strategy: string;
      rationale: string;
      action_items: string[];
    };
    next_tests?: {
      tests: ExecutiveTest[];
    };
  }

  export interface ExecutiveIssue {
    issue: string;
    severity: 'critical' | 'high' | 'moderate';
    impact: string;
    metric_context: string;
  }

  export interface ExecutiveOpportunity {
    opportunity: string;
    potential: string;
    priority: number;
    examples: string[];
  }

  export interface ExecutiveTest {
    test_name: string;
    hypothesis: string;
    test_variant: string;
    expected_improvement: string;
    priority: number;
  }

  // Extended audit result
  export interface UnifiedMetadataAuditResultV2 extends UnifiedMetadataAuditResult {
    capabilityMap?: AppCapabilityMap;
    gapAnalysis?: GapAnalysisResult;
    executiveRecommendation?: ExecutiveRecommendation;
  }
  ```

- [ ] **Verify no type conflicts with existing code**
- [ ] **Run TypeScript compiler** (`npm run typecheck`)

**Owner:** Engineer
**Deadline:** Day 1

---

### **6. Documentation Updates**

- [ ] **Update main implementation plan with Phase 0 results**
  - Link to scope split document
  - Link to wiring map
  - Link to data constraints doc
  - Link to preflight checklist

- [ ] **Create v2.0 development guide**
  - How to enable feature flags
  - How to run test suite
  - How to validate changes
  - Coding standards for v2.0

- [ ] **Update CHANGELOG**
  ```markdown
  ## [Unreleased] - v2.0 Foundation

  ### Added (Phase 0)
  - Feature flags for progressive v2.0 rollout
  - Test data suite (35 apps across 7 verticals)
  - Generic capability patterns (20 feature, 20 benefit, 10 trust)
  - Risky transactional keyword list (20-30 keywords)
  - Critical trust signals per vertical (10-15 each)
  - TypeScript types for v2.0 data structures
  ```

**Owner:** Engineer
**Deadline:** Day 4

---

### **7. Team Alignment Meeting**

- [ ] **Schedule 30-minute kickoff meeting**

  **Attendees:**
  - Engineering lead
  - ASO team lead
  - Product manager (if applicable)

  **Agenda:**
  1. Review scope split (Foundation vs Enhancement)
  2. Confirm data asset deadlines
  3. Review test app selection
  4. Clarify any open questions
  5. Agree on Phase 1 start date

  **Output:** Signed-off plan to proceed

**Owner:** Engineering Lead
**Deadline:** Day 4-5

---

### **8. Environment Setup Validation**

- [ ] **Verify all dependencies installed**
  ```bash
  npm install
  ```

- [ ] **Run existing test suite** (ensure no regressions)
  ```bash
  npm run test
  ```

- [ ] **Run build** (ensure no TypeScript errors)
  ```bash
  npm run build
  ```

- [ ] **Test feature flag integration**
  - Set `ENABLE_INTENT_V2=true` in `.env`
  - Verify flag reads correctly in code
  - Set back to `false`

- [ ] **Edge function local testing setup**
  ```bash
  npx supabase functions serve
  ```

- [ ] **Database migrations up to date**
  ```bash
  npx supabase db push
  ```

**Owner:** Engineer
**Deadline:** Day 1

---

## 🎯 SUCCESS CRITERIA

Phase 0 is complete when:

✅ **Git & Branching**
- Feature branch created and pushed
- Clean working directory

✅ **Feature Flags**
- All 6 flags defined in `.env`
- Feature flag service implemented
- Documented in README

✅ **Test Data**
- 35 test apps selected (5 per vertical)
- Baseline audit results exported
- Validation script created

✅ **Data Assets**
- Risky transactional keywords (20-30) collected and approved
- Generic capability patterns (50 total) created and reviewed
- Critical trust signals (10-15 per vertical) collected and approved

✅ **TypeScript Setup**
- All v2.0 types defined in `src/types/auditV2.ts`
- No type errors (`npm run typecheck` passes)

✅ **Documentation**
- Phase 0 checklist completed
- Development guide created
- CHANGELOG updated

✅ **Team Alignment**
- Kickoff meeting held
- All stakeholders signed off on scope
- Phase 1 start date confirmed

✅ **Environment Validation**
- All dependencies installed
- Existing tests pass
- Build succeeds
- Feature flags work
- Edge functions serve locally

---

## 📊 DEPENDENCY GRAPH

```
Day 1: Git Setup + Feature Flags + TypeScript Types + Environment Validation
       ↓
Day 2: Risky Keywords Collection (ASO Team) + Test App Selection
       ↓
Day 3: Generic Patterns Draft (Engineer) → ASO Review → Trust Signals (ASO Team)
       ↓
Day 4: Documentation Updates + Team Alignment Meeting
       ↓
Day 5: Final validation + Phase 1 kickoff
```

**Critical Path:** ASO Team data collection (Days 2-3)

---

## 🚨 BLOCKERS & MITIGATIONS

| Blocker | Risk | Mitigation |
|---------|------|------------|
| ASO team unavailable for data collection | High | Engineer creates placeholder data, ASO reviews async |
| Test app data not accessible | Medium | Use publicly available app metadata, test with subset |
| Feature flag conflicts with existing code | Low | Use unique flag names, test in isolated environment |
| TypeScript type conflicts | Low | Use separate namespace (`auditV2.ts`), extend not override |

---

## ✅ FINAL CHECKLIST

Before starting Phase 1 development:

- [ ] All Phase 0 tasks marked complete
- [ ] ASO team sign-off on data assets
- [ ] Engineering lead confirms environment ready
- [ ] Product manager approves scope (if applicable)
- [ ] Phase 1 start date communicated to team

**Sign-off:**
- Engineer: _______________  Date: _______
- ASO Team: _______________  Date: _______
- Product: ________________  Date: _______

---

## 🚀 NEXT STEP: PHASE 1 DEVELOPMENT

Once Phase 0 complete, proceed to:
**Phase 1: Intent System V2 (Week 1)**
- Expand intent types from 4 to 7
- Implement transactional safety detection
- Add 4 new KPIs
- Update intent engine with new patterns

See `ASO_AUDIT_V2_IMPLEMENTATION_PLAN.md` for Phase 1 details.
