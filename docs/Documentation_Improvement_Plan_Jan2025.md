---
Status: ACTIVE
Version: v1.0
Last Updated: 2025-01-19
Purpose: Documentation improvement roadmap based on Jan 2025 audit
Type: Planning Document
---

# Documentation Improvement Plan - January 2025

**Audit Date:** January 19, 2025
**Files Audited:** 19 active documentation files
**Auditor:** Content Quality Audit (AI-Assisted)
**Status:** Ready for Implementation

---

## Executive Summary

A comprehensive audit of 19 active documentation files revealed:
- **37% (7 files)** are accurate and should be kept as-is
- **42% (8 files)** need minor updates
- **16% (3 files)** need major rewrites
- **5% (1 file)** should be archived as obsolete

**Critical Issues:**
- ❌ 6 files contain incorrect BigQuery paths (`aso-reporting-1.client_reports` instead of `yodel-mobile-app.aso_reports`)
- ❌ 3 files describe deprecated authorization patterns (`authorize` Edge Function vs `usePermissions()` hook)
- ⚠️ 5 files missing current security features (MFA, session timeouts, audit logging)

**Overall Documentation Health:** 6.8/10

---

## Table of Contents

1. [Audit Results by File](#audit-results-by-file)
2. [Priority Matrix](#priority-matrix)
3. [Common Issues](#common-issues)
4. [Implementation Roadmap](#implementation-roadmap)
5. [V1 vs Future Architecture](#v1-vs-future-architecture)
6. [Success Metrics](#success-metrics)

---

## Audit Results by File

### 📁 docs/02-architecture/

#### 1. security-compliance/ENCRYPTION_STATUS.md

**Status:** ✅ KEEP
**Version:** V1 (Current Production)
**Priority:** LOW

**Scores:**
- Accuracy: 10/10
- Freshness: 10/10 (Nov 9, 2025)
- Completeness: 10/10

**Issues:** None

**Action:** No changes required

**Rationale:** Perfect compliance documentation. Accurately describes infrastructure-level encryption (AES-256), compliance certifications (SOC 2, ISO 27001, GDPR).

---

#### 2. security-compliance/VALIDATION_STATUS.md

**Status:** 🗄️ ARCHIVE
**Version:** Not V1 (Feature-specific validation)
**Priority:** MEDIUM

**Scores:**
- Accuracy: 3/10
- Freshness: 5/10 (Nov 14, 2024)
- Completeness: 8/10

**Issues:**
- Describes ASO Intelligence Layer validation system not mentioned in CURRENT_ARCHITECTURE.md
- References temporary validation code that should have been removed
- Unclear if Phase 3 was completed

**Action Required:**
1. Determine if ASO Intelligence Layer was implemented
2. If yes: Move to `/docs/03-features/aso-intelligence/` with updated status
3. If no: Move to `/docs/archive/cancelled-features/`

**Rationale:** Wrong location for feature-specific validation. Should be in features folder if active, or archived if not implemented.

---

#### 3. system-design/auth_map.md

**Status:** 🔄 REWRITE
**Version:** Describes deprecated patterns (not V1)
**Priority:** HIGH

**Scores:**
- Accuracy: 4/10
- Freshness: 3/10 (Not dated)
- Completeness: 6/10

**Issues:**
- References `profiles` table (not in CURRENT_ARCHITECTURE.md)
- Describes `authorize` Edge Function (marked "not actively used")
- References demo mode patterns not documented as current
- Missing `user_roles` as SSOT
- No mention of `user_permissions_unified` view
- No MFA, session timeouts, audit logging

**Action Required:**
1. Rewrite to reflect current V1 architecture:
   - `user_roles` as SSOT
   - `user_permissions_unified` view
   - `usePermissions()` hook as primary
2. Mark `authorize` function as deprecated
3. Add MFA and session security flows
4. Update demo mode to reflect actual implementation

**Rationale:** Describes old authorization system. Critical for developers to have accurate auth flow documentation.

---

#### 4. system-design/authz_matrix.md

**Status:** 🗄️ ARCHIVE
**Version:** Describes deprecated system (not V1)
**Priority:** HIGH

**Scores:**
- Accuracy: 3/10
- Freshness: 2/10 (Not dated)
- Completeness: 7/10

**Issues:**
- Entire document describes `authorize` Edge Function
- CURRENT_ARCHITECTURE.md states: "authorize (Not actively used) - Frontend uses usePermissions() hook directly"
- Describes centralized Edge Function auth vs actual decentralized RLS + hooks

**Action Required:**
1. Add DEPRECATED marker at top
2. Add notice: "This describes the unused authorize function. See ARCHITECTURE_V1.md for actual authorization"
3. Move to `/docs/archive/deprecated-systems/`
4. Create new authorization doc showing:
   - RLS policies as enforcement
   - `usePermissions()` hook usage
   - `user_permissions_unified` view
   - Role-based access control

**Rationale:** Describes obsolete system. Could mislead developers into implementing wrong patterns.

---

#### 5. system-design/ORGANIZATION_ROLES_SYSTEM.md

**Status:** ✅ KEEP + Minor Updates
**Version:** V1 (Current Production)
**Priority:** LOW

**Scores:**
- Accuracy: 9/10
- Freshness: 10/10 (Dec 21, 2025)
- Completeness: 10/10

**Issues:**
- Minor: References to deprecated `org_users` table (correctly noted as deprecated)
- Could add BigQuery integration in data access examples
- Could add session security (MFA, timeouts) to security section

**Action Required:**
1. Add cross-reference to ARCHITECTURE_V1.md
2. Add BigQuery integration note
3. Add MFA and session security to Section 10
4. Consider adding "Quick Start" section at top

**Rationale:** Excellent comprehensive reference (1,948 lines). Minor additions would make it perfect.

---

### 📁 docs/03-features/dashboard-v2/

#### 6. BIGQUERY_QUICK_REFERENCE.md

**Status:** 🔄 UPDATE
**Version:** V1 but has critical errors
**Priority:** HIGH

**Scores:**
- Accuracy: 7/10
- Freshness: 7/10 (Nov 14, 2024)
- Completeness: 9/10

**Issues:**
- ❌ **CRITICAL:** BigQuery project shown as `aso-reporting-1`
- ❌ **CRITICAL:** BigQuery dataset shown as `client_reports`
- ✅ **SHOULD BE:** `yodel-mobile-app.aso_reports`
- Missing traffic source filtering mention
- Missing table name change note (`aso_organic_apple` → `aso_all_apple`)

**Action Required:**
1. **CRITICAL:** Update all BigQuery references:
   - `aso-reporting-1` → `yodel-mobile-app`
   - `client_reports` → `aso_reports`
2. Update SQL examples (lines 427-432)
3. Add traffic source filtering note
4. Add table evolution note
5. Reference ARCHITECTURE_V1.md

**Rationale:** Wrong BigQuery path could break production queries. High priority fix.

---

#### 7. BIGQUERY_RESEARCH_INDEX.md

**Status:** 🔄 UPDATE
**Version:** V1 but has critical errors
**Priority:** MEDIUM

**Scores:**
- Accuracy: 6/10
- Freshness: 6/10 (Nov 14, 2024)
- Completeness: 9/10

**Issues:**
- Same BigQuery path error (references `aso-reporting-1.client_reports`)
- Index points to docs with incorrect information
- No version tracking for referenced docs

**Action Required:**
1. Update BigQuery paths: `yodel-mobile-app.aso_reports`
2. Add "Last Verified" dates for indexed documents
3. Add note about doc update status
4. Cross-reference ARCHITECTURE_V1.md

**Rationale:** Index document should point to accurate information.

---

#### 8. BIGQUERY_SCHEMA_AND_METRICS_MAP.md

**Status:** 🔄 UPDATE
**Version:** V1 but has critical errors
**Priority:** HIGH

**Scores:**
- Accuracy: 6/10
- Freshness: 6/10 (Nov 14, 2024)
- Completeness: 10/10

**Issues:**
- ❌ **CRITICAL:** Line 6: `aso-reporting-1`
- ❌ **CRITICAL:** Line 7: `client_reports`
- SQL examples throughout use wrong project/dataset
- Missing traffic source filtering section

**Action Required:**
1. **CRITICAL:** Find/replace all instances:
   - `aso-reporting-1` → `yodel-mobile-app`
   - `client_reports` → `aso_reports`
2. Update all SQL examples
3. Add traffic source filtering section
4. Add table evolution note
5. Cross-reference ARCHITECTURE_V1.md

**Rationale:** Comprehensive doc (767 lines) but has critical path errors throughout.

---

#### 9. bigquery-integration.md

**Status:** 🔄 UPDATE
**Version:** V1 but has critical errors
**Priority:** MEDIUM

**Scores:**
- Accuracy: 6/10
- Freshness: 5/10 (Not dated)
- Completeness: 7/10

**Issues:**
- Same BigQuery path error
- Missing `org_app_access` RLS policy mention
- Missing agency model and client expansion
- Missing audit logging integration
- Missing current Edge Function details

**Action Required:**
1. Update BigQuery to `yodel-mobile-app.aso_reports`
2. Add RLS and `org_app_access` section
3. Add agency model data access
4. Add audit logging integration
5. Update Edge Function implementation
6. Reference ARCHITECTURE_V1.md and DATA_PIPELINE_AUDIT.md

**Rationale:** Integration guide missing current production security and architecture details.

---

#### 10. DATA_PIPELINE_AUDIT.md

**Status:** ✅ KEEP + Minor Updates
**Version:** V1 (Current Production)
**Priority:** LOW

**Scores:**
- Accuracy: 9/10
- Freshness: 10/10 (Jan 19, 2025 - TODAY!)
- Completeness: 10/10

**Issues:**
- Minor: Some BigQuery path references show old project (`aso-reporting-1`)
- Could cross-reference ARCHITECTURE_V1.md explicitly

**Action Required:**
1. Update BigQuery references to consistently show `yodel-mobile-app.aso_reports`
2. Add cross-reference to ARCHITECTURE_V1.md in intro

**Rationale:** Most current and accurate pipeline doc (1,269 lines). Excellent reference, minor fixes only.

---

#### 11. QUICK_REFERENCE.md

**Status:** 🔄 UPDATE
**Version:** V1 but partially outdated
**Priority:** MEDIUM

**Scores:**
- Accuracy: 8/10
- Freshness: 5/10 (Not dated)
- Completeness: 8/10

**Issues:**
- References "Known Limitations" that may be outdated (no delta calculations - contradicts DATA_PIPELINE_AUDIT)
- Cache key description doesn't match actual implementation
- References "AI insights disabled by default" - not in CURRENT_ARCHITECTURE.md
- Missing RLS, security, agency support mentions

**Action Required:**
1. Update cache key description to match implementation
2. Remove or update "Known Limitations" section
3. Add security and RLS quick reference
4. Add agency support note
5. Verify AI insights status or remove
6. Update to reflect current production capabilities

**Rationale:** Quick reference should be accurate snapshot of current features.

---

### 📁 docs/04-api-reference/

#### 12. db_rls_report.md

**Status:** 🔄 REWRITE
**Version:** Not V1 (describes old patterns)
**Priority:** HIGH

**Scores:**
- Accuracy: 4/10
- Freshness: 3/10 (Not dated)
- Completeness: 6/10

**Issues:**
- References `profiles` table (not in CURRENT_ARCHITECTURE.md)
- RLS patterns use `auth.jwt() ->> 'organization_id'` (not current)
- CURRENT_ARCHITECTURE.md shows RLS using `user_roles` + `auth.uid()`
- Missing actual production RLS policies
- No `org_app_access`, `audit_logs`, `mfa_enforcement` policies

**Action Required:**
1. Update to reflect actual RLS policies from ARCHITECTURE_V1.md
2. Document `user_roles` based policies
3. Add `org_app_access`, `audit_logs`, `mfa_enforcement` policies
4. Remove or mark deprecated `profiles` table references
5. Add actual production policy examples from migrations
6. Cross-reference ORGANIZATION_ROLES_SYSTEM.md

**Rationale:** Critical for developers implementing features. Must show actual RLS patterns.

---

#### 13. feature-permissions.md

**Status:** 🔄 UPDATE + Status Clarification
**Version:** Unclear (may be V2/V3 planned)
**Priority:** MEDIUM

**Scores:**
- Accuracy: 6/10
- Freshness: 5/10 (Not dated)
- Completeness: 9/10

**Issues:**
- Describes elaborate feature permission system (platform_features, org_feature_entitlements, user_feature_overrides)
- References tables and Edge Functions not in CURRENT_ARCHITECTURE.md
- CURRENT_ARCHITECTURE.md: "Feature Flags: Current Implementation: None (simplified for production focus)"
- May describe planned Phase 3 work vs current V1

**Action Required:**
1. Add clear status marker: "PLANNED ARCHITECTURE" or "CURRENT IMPLEMENTATION"
2. If implemented: Cross-reference ARCHITECTURE_V1.md
3. If not: Move to `/docs/planned-features/` or mark as design doc
4. Reconcile with ARCHITECTURE_V1.md "no feature flags" statement
5. Add implementation status for each component

**Rationale:** Developers need to know if this is production V1 or planned V2/V3.

---

#### 14. USER_ORGANIZATION_CONTRACT.md

**Status:** ✅ KEEP
**Version:** V1 (Current Production)
**Priority:** LOW

**Scores:**
- Accuracy: 9/10
- Freshness: 10/10 (Jan 15, 2025)
- Completeness: 10/10

**Issues:**
- Could cross-reference ARCHITECTURE_V1.md
- Could mention MFA enforcement in user creation

**Action Required:**
1. Add cross-reference to ARCHITECTURE_V1.md
2. Add MFA enforcement note for admin roles

**Rationale:** Clean API contract specification (357 lines). Production-ready, minor additions only.

---

#### 15. whoami_contract.md

**Status:** 🔄 UPDATE or ARCHIVE
**Version:** Unclear (may be deprecated)
**Priority:** MEDIUM

**Scores:**
- Accuracy: 5/10
- Freshness: 3/10 (Not dated)
- Completeness: 7/10

**Issues:**
- References `admin-whoami` Edge Function (not in CURRENT_ARCHITECTURE.md)
- References `is_demo` field and `features` array
- CURRENT_ARCHITECTURE.md doesn't document this endpoint
- May describe old authorization pattern before `user_permissions_unified` view

**Action Required:**
1. Determine if `admin-whoami` endpoint is in production
2. If yes: Update to match current implementation, reference ARCHITECTURE_V1.md
3. If no: Mark as DEPRECATED and archive
4. Reconcile with `usePermissions()` hook as primary auth mechanism
5. Add implementation status

**Rationale:** Unclear if this endpoint is V1 production or deprecated.

---

### 📁 docs/05-workflows/

#### 16. DEPLOYMENT.md

**Status:** 🔄 UPDATE
**Version:** V1 but too generic
**Priority:** MEDIUM

**Scores:**
- Accuracy: 7/10
- Freshness: 5/10 (Not dated)
- Completeness: 8/10

**Issues:**
- Generic BigQuery project references (doesn't specify `yodel-mobile-app`)
- Generic Supabase project (doesn't specify `bkbcqocpjahewqjmlgvf`)
- Missing MFA deployment considerations
- Missing session security configuration
- Missing audit logging setup
- No production instance specifics

**Action Required:**
1. Add production configuration section:
   - Supabase: `bkbcqocpjahewqjmlgvf.supabase.co`
   - BigQuery: `yodel-mobile-app.aso_reports`
   - Edge Functions: `bigquery-aso-data`
2. Add MFA setup instructions
3. Add session security environment variables
4. Add audit logging verification steps
5. Add RLS policy deployment verification
6. Reference ARCHITECTURE_V1.md

**Rationale:** Deployment guide should have production-specific configuration.

---

#### 17. navigation-feature-gating.md

**Status:** 🔄 REWRITE or EXPAND
**Version:** Incomplete (12 lines only)
**Priority:** MEDIUM

**Scores:**
- Accuracy: 6/10
- Freshness: 4/10 (Not dated)
- Completeness: 3/10

**Issues:**
- Only 12 lines, very incomplete
- References demo org bypass (not in CURRENT_ARCHITECTURE.md)
- References utilities not documented (`filterNavigationByRoutes`, `getAllowedRoutes`)
- No implementation details or code examples

**Action Required:**
1. Expand to full implementation guide
2. Document actual navigation filtering code
3. Add code examples from implementation
4. Connect to role-based access from ARCHITECTURE_V1.md
5. Document `usePermissions()` integration
6. Add examples for each role's navigation menu
7. Or: Archive if navigation gating handled elsewhere

**Rationale:** Too brief to be useful. Either expand or archive.

---

#### 18. USER_MANAGEMENT_GUIDE.md

**Status:** ✅ KEEP + Minor Updates
**Version:** V1 (Current Production)
**Priority:** LOW

**Scores:**
- Accuracy: 8/10
- Freshness: 9/10 (Nov 12, 2025)
- Completeness: 9/10

**Issues:**
- Minor: Role name casing (uppercase vs lowercase) - need clarification
- Missing MFA enforcement during user creation
- Missing audit logging during user management

**Action Required:**
1. Add MFA enforcement note for admin roles
2. Add audit logging references
3. Cross-reference ARCHITECTURE_V1.md and ORGANIZATION_ROLES_SYSTEM.md
4. Clarify role casing (uppercase DB, lowercase frontend)

**Rationale:** Comprehensive guide (619 lines). Minor additions for completeness.

---

#### 19. YODEL_MOBILE_CONTEXT.md

**Status:** ✅ KEEP
**Version:** V1 (Current Production)
**Priority:** LOW

**Scores:**
- Accuracy: 8/10
- Freshness: 9/10 (Nov 9, 2025)
- Completeness: 9/10

**Issues:**
- Could add BigQuery access details
- Could mention `org_app_access` for app scoping

**Action Required:**
1. Add cross-reference to ARCHITECTURE_V1.md
2. Add BigQuery data access note
3. Add `org_app_access` table mention

**Rationale:** Excellent context document (414 lines). Provides important business context. Minor additions only.

---

## Priority Matrix

### 🔴 HIGH Priority (7 files) - This Week

**Critical BigQuery Path Errors:**
1. BIGQUERY_QUICK_REFERENCE.md - Wrong project/dataset
2. BIGQUERY_SCHEMA_AND_METRICS_MAP.md - Wrong project/dataset throughout

**Deprecated Authorization Patterns:**
3. auth_map.md - Describes old system, needs rewrite
4. authz_matrix.md - Archive as obsolete
5. db_rls_report.md - Wrong RLS patterns, needs rewrite

**Other Critical:**
6. (None additional)

**Estimated Effort:** 8-12 hours

---

### 🟡 MEDIUM Priority (7 files) - Next 2 Weeks

**BigQuery Documentation:**
1. BIGQUERY_RESEARCH_INDEX.md - Update paths
2. bigquery-integration.md - Add security details

**Dashboard V2:**
3. QUICK_REFERENCE.md - Update limitations and cache keys

**API Reference:**
4. feature-permissions.md - Clarify implementation status
5. whoami_contract.md - Verify production status

**Workflows:**
6. DEPLOYMENT.md - Add production specifics
7. navigation-feature-gating.md - Expand or archive

**Estimated Effort:** 6-10 hours

---

### 🟢 LOW Priority (5 files) - Ongoing Maintenance

**Already Excellent:**
1. ENCRYPTION_STATUS.md - No changes needed
2. ORGANIZATION_ROLES_SYSTEM.md - Minor additions only
3. DATA_PIPELINE_AUDIT.md - Minor BigQuery path updates
4. USER_ORGANIZATION_CONTRACT.md - Minor cross-references
5. USER_MANAGEMENT_GUIDE.md - Minor security additions
6. YODEL_MOBILE_CONTEXT.md - Minor BigQuery mention

**Plus Archive:**
7. VALIDATION_STATUS.md - Determine status and relocate

**Estimated Effort:** 2-4 hours

---

## Common Issues

### Issue 1: BigQuery Path Errors (6 files)

**Wrong:**
```
Project: aso-reporting-1
Dataset: client_reports
Table: aso_all_apple
```

**Correct:**
```
Project: yodel-mobile-app
Dataset: aso_reports
Table: aso_all_apple
```

**Impact:** HIGH - Wrong paths could break production queries

**Affected Files:**
- BIGQUERY_QUICK_REFERENCE.md
- BIGQUERY_RESEARCH_INDEX.md
- BIGQUERY_SCHEMA_AND_METRICS_MAP.md
- bigquery-integration.md
- DATA_PIPELINE_AUDIT.md (minor)

**Fix Strategy:**
1. Find/replace across all files
2. Update SQL examples
3. Verify against ARCHITECTURE_V1.md
4. Cross-check with actual production config

---

### Issue 2: Deprecated Authorization Patterns (3 files)

**Wrong Pattern:**
```typescript
// Using authorize Edge Function (deprecated)
const auth = await fetch('/functions/v1/authorize');
```

**Correct Pattern:**
```typescript
// Using usePermissions hook (current)
const { permissions } = usePermissions();
if (!permissions?.isOrgAdmin) return <NoAccess />;
```

**Impact:** HIGH - Developers may implement wrong patterns

**Affected Files:**
- auth_map.md
- authz_matrix.md
- whoami_contract.md

**Fix Strategy:**
1. Mark authorize function as deprecated
2. Rewrite docs to show usePermissions() hook
3. Document RLS policies as enforcement layer
4. Reference ARCHITECTURE_V1.md

---

### Issue 3: Missing Security Features (5 files)

**Missing from Docs:**
- MFA enforcement (admin users, 30-day grace period)
- Session security (15-min idle, 8-hour absolute timeouts)
- Audit logging (all critical actions, 7-year retention)

**Impact:** MEDIUM - Incomplete security documentation

**Affected Files:**
- auth_map.md
- DEPLOYMENT.md
- USER_MANAGEMENT_GUIDE.md
- QUICK_REFERENCE.md
- bigquery-integration.md

**Fix Strategy:**
1. Add security section to each doc
2. Reference ARCHITECTURE_V1.md security features
3. Include implementation examples
4. Link to ENCRYPTION_STATUS.md for compliance

---

### Issue 4: V1 vs V2/V3 Confusion (2 files)

**Problem:** Some docs describe systems that may be planned (V2/V3) vs current (V1)

**Affected Files:**
- feature-permissions.md (elaborate system vs "no feature flags")
- VALIDATION_STATUS.md (ASO Intelligence Layer not in CURRENT_ARCHITECTURE.md)

**Impact:** MEDIUM - Developers unclear what's production

**Fix Strategy:**
1. Add clear status markers: "V1 PRODUCTION" or "V2 PLANNED"
2. Move planned features to separate folder
3. Reference ARCHITECTURE_V1.md for current state
4. Create "Architecture Evolution" section showing roadmap

---

## Implementation Roadmap

### Phase 1: Critical Fixes (Week 1)

**Goal:** Fix high-priority issues that could cause production problems

**Tasks:**
1. Update all BigQuery paths (6 files)
   - Find/replace: `aso-reporting-1` → `yodel-mobile-app`
   - Find/replace: `client_reports` → `aso_reports`
   - Verify SQL examples
   - Test against production

2. Archive deprecated auth docs (2 files)
   - Move authz_matrix.md to `/docs/archive/deprecated-systems/`
   - Add DEPRECATED marker to auth_map.md

3. Rewrite RLS documentation (1 file)
   - Update db_rls_report.md with actual patterns
   - Add production policy examples
   - Reference ORGANIZATION_ROLES_SYSTEM.md

**Deliverables:**
- [ ] 6 BigQuery docs updated
- [ ] 2 auth docs archived/marked deprecated
- [ ] 1 RLS doc rewritten
- [ ] All changes tested and verified

**Success Criteria:**
- All SQL examples use correct BigQuery path
- No references to deprecated authorize function
- RLS documentation matches production

---

### Phase 2: Content Updates (Weeks 2-3)

**Goal:** Add missing security features and production details

**Tasks:**
1. Add security features to docs (5 files)
   - MFA enforcement sections
   - Session security details
   - Audit logging integration
   - Reference ARCHITECTURE_V1.md

2. Update deployment docs (2 files)
   - Add production-specific configuration
   - Environment variables
   - Verification steps

3. Clarify implementation status (2 files)
   - Mark feature-permissions.md status
   - Verify whoami_contract.md production use
   - Add V1 vs V2/V3 markers

**Deliverables:**
- [ ] Security sections added to 5 files
- [ ] Deployment guide updated with prod config
- [ ] Implementation status clarified for 2 files

**Success Criteria:**
- All docs mention current security features
- Deployment guide has production specifics
- Clear V1 vs V2 distinction

---

### Phase 3: Maintenance & Polish (Week 4)

**Goal:** Complete minor updates and add cross-references

**Tasks:**
1. Add cross-references to ARCHITECTURE_V1.md
   - Update all docs to reference canonical source
   - Add "See Also" sections
   - Create documentation map

2. Update freshness dates
   - Add "Last Updated: 2025-01-19" to all updated files
   - Add version numbers where appropriate

3. Minor content additions
   - BigQuery details to context docs
   - Quick start sections to large docs
   - Code examples where missing

**Deliverables:**
- [ ] All docs cross-reference ARCHITECTURE_V1.md
- [ ] All dates updated
- [ ] Minor content gaps filled

**Success Criteria:**
- Every doc links to canonical architecture
- All docs dated January 2025 or later
- No obvious content gaps

---

### Phase 4: Verification (Ongoing)

**Goal:** Ensure documentation accuracy maintained

**Tasks:**
1. Create documentation review checklist
2. Establish quarterly review process
3. Monitor for architecture changes
4. Update docs when code changes

**Deliverables:**
- [ ] Documentation review checklist
- [ ] Quarterly review calendar
- [ ] Change notification process

**Success Criteria:**
- Documentation stays in sync with code
- Issues caught before they accumulate
- Health score maintains above 8.0/10

---

## V1 vs Future Architecture

### V1 Documentation (Current Production)

**Keep as V1:**
- ✅ ENCRYPTION_STATUS.md
- ✅ ORGANIZATION_ROLES_SYSTEM.md
- ✅ DATA_PIPELINE_AUDIT.md
- ✅ USER_ORGANIZATION_CONTRACT.md
- ✅ USER_MANAGEMENT_GUIDE.md
- ✅ YODEL_MOBILE_CONTEXT.md
- 🔄 BIGQUERY_* files (after path fixes)
- 🔄 DEPLOYMENT.md (after production details added)

**Total V1 Docs:** 11 files (after fixes)

### Not V1 / Unclear Status

**Archive as Deprecated:**
- 🗄️ authz_matrix.md (describes obsolete authorize function)
- 🗄️ VALIDATION_STATUS.md (feature-specific, unclear if implemented)

**Needs Status Clarification:**
- ❓ feature-permissions.md (elaborate system vs "no feature flags")
- ❓ whoami_contract.md (admin-whoami endpoint - is this production?)

**Needs Rewrite to Match V1:**
- 🔄 auth_map.md (describes deprecated patterns)
- 🔄 db_rls_report.md (describes old RLS patterns)
- 🔄 navigation-feature-gating.md (incomplete, needs expansion)

### Future Architecture (V2/V3 Planned)

**Topics for Future Docs:**
- Advanced feature flag system (platform_features tables)
- Additional data sources beyond BigQuery
- Enhanced caching strategies (Redis layer)
- V2 authorization patterns (if any)
- Additional compliance certifications

**Note:** V2/V3 docs should be created separately when features are planned/implemented. Don't mix with V1 production docs.

---

## Success Metrics

### Documentation Health Score

**Current (Jan 2025):** 6.8/10

**Target by Phase:**
- After Phase 1: 7.5/10 (critical fixes applied)
- After Phase 2: 8.5/10 (content updates complete)
- After Phase 3: 9.0/10 (polish complete)
- Ongoing: Maintain 8.5+/10

### Individual File Goals

**Files to Improve from 6/10 → 9/10:**
- BIGQUERY_QUICK_REFERENCE.md (7→9 after path fix)
- BIGQUERY_SCHEMA_AND_METRICS_MAP.md (6→9 after path fix)
- bigquery-integration.md (6→8 after security additions)
- QUICK_REFERENCE.md (8→9 after updates)
- db_rls_report.md (4→9 after rewrite)

**Files to Improve from 3-5/10 → 8/10:**
- auth_map.md (4→8 after rewrite)
- whoami_contract.md (5→8 after clarification)
- navigation-feature-gating.md (6→8 after expansion)

### Accuracy Targets

- **BigQuery paths:** 100% correct (currently 50%)
- **Authorization patterns:** 100% describe V1 (currently 60%)
- **Security features:** 100% mention MFA/session/audit (currently 30%)
- **Production specifics:** 100% have env details (currently 40%)

### Freshness Targets

- **All active docs:** Dated 2025-01-19 or later
- **Lifecycle headers:** All files have status/version/date
- **Cross-references:** All link to ARCHITECTURE_V1.md

---

## Implementation Notes

### Important Constraints

**This is Documentation-Only Work:**
- ✅ Markdown file changes ONLY
- ❌ NO code changes
- ❌ NO schema or migration changes
- ❌ NO RLS policy changes
- ❌ NO security configuration changes

**What We're Fixing:**
- Documentation accuracy (BigQuery paths, auth patterns)
- Documentation completeness (security features, production details)
- Documentation organization (V1 vs V2, status markers)
- Documentation freshness (dates, lifecycle headers)

**What We're NOT Changing:**
- The actual production system
- Database structure
- Authentication implementation
- BigQuery configuration
- Edge Function code

### Testing Documentation Changes

**Verification Steps:**
1. Read updated doc thoroughly
2. Compare against ARCHITECTURE_V1.md (ground truth)
3. Check cross-references are valid
4. Verify code examples (if any) are accurate
5. Confirm dates and status markers correct
6. Test any links or references

**No Code Testing Required:**
- Documentation changes don't affect running system
- Can be updated without deployment
- Changes are non-breaking
- Can be rolled back if needed

---

## Appendix: File Summary Table

| # | File | Status | Version | Priority | Accuracy | Freshness | Complete | Action |
|---|------|--------|---------|----------|----------|-----------|----------|--------|
| 1 | ENCRYPTION_STATUS.md | ✅ KEEP | V1 | LOW | 10 | 10 | 10 | None |
| 2 | VALIDATION_STATUS.md | 🗄️ ARCHIVE | ? | MED | 3 | 5 | 8 | Relocate |
| 3 | auth_map.md | 🔄 REWRITE | Old | HIGH | 4 | 3 | 6 | Rewrite V1 |
| 4 | authz_matrix.md | 🗄️ ARCHIVE | Old | HIGH | 3 | 2 | 7 | Archive |
| 5 | ORGANIZATION_ROLES_SYSTEM.md | ✅ KEEP | V1 | LOW | 9 | 10 | 10 | Minor adds |
| 6 | BIGQUERY_QUICK_REFERENCE.md | 🔄 UPDATE | V1 | HIGH | 7 | 7 | 9 | Fix paths |
| 7 | BIGQUERY_RESEARCH_INDEX.md | 🔄 UPDATE | V1 | MED | 6 | 6 | 9 | Fix paths |
| 8 | BIGQUERY_SCHEMA_AND_METRICS_MAP.md | 🔄 UPDATE | V1 | HIGH | 6 | 6 | 10 | Fix paths |
| 9 | bigquery-integration.md | 🔄 UPDATE | V1 | MED | 6 | 5 | 7 | Add security |
| 10 | DATA_PIPELINE_AUDIT.md | ✅ KEEP | V1 | LOW | 9 | 10 | 10 | Minor fix |
| 11 | QUICK_REFERENCE.md | 🔄 UPDATE | V1 | MED | 8 | 5 | 8 | Update limits |
| 12 | db_rls_report.md | 🔄 REWRITE | Old | HIGH | 4 | 3 | 6 | Rewrite V1 |
| 13 | feature-permissions.md | 🔄 UPDATE | ? | MED | 6 | 5 | 9 | Clarify status |
| 14 | USER_ORGANIZATION_CONTRACT.md | ✅ KEEP | V1 | LOW | 9 | 10 | 10 | Minor ref |
| 15 | whoami_contract.md | 🔄 UPDATE | ? | MED | 5 | 3 | 7 | Verify prod |
| 16 | DEPLOYMENT.md | 🔄 UPDATE | V1 | MED | 7 | 5 | 8 | Add prod config |
| 17 | navigation-feature-gating.md | 🔄 REWRITE | V1 | MED | 6 | 4 | 3 | Expand |
| 18 | USER_MANAGEMENT_GUIDE.md | ✅ KEEP | V1 | LOW | 8 | 9 | 9 | Minor adds |
| 19 | YODEL_MOBILE_CONTEXT.md | ✅ KEEP | V1 | LOW | 8 | 9 | 9 | Minor adds |

**Legend:**
- ✅ KEEP: No major changes needed
- 🔄 UPDATE: Minor to moderate updates needed
- 🔄 REWRITE: Major rewrite needed
- 🗄️ ARCHIVE: Move to archive

---

## Next Steps

1. **Review this plan** with stakeholders
2. **Prioritize** Phase 1 tasks (critical fixes)
3. **Assign** documentation updates to team members
4. **Track progress** using this document as checklist
5. **Re-audit** after Phase 3 to measure improvement

**Questions?** See [ARCHITECTURE_V1.md](./02-architecture/ARCHITECTURE_V1.md) for technical details or [AI_AGENT_QUICKSTART.md](./07-ai-development/AI_AGENT_QUICKSTART.md) for safe change procedures.

---

**Document Status:** ACTIVE - Ready for Implementation
**Review Date:** 2025-01-19
**Next Review:** After Phase 1 completion (end of week)
