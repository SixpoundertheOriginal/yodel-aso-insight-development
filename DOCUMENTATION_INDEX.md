# Yodel ASO Insight - Documentation Index

**Last Updated:** November 9, 2025
**Purpose:** Quick reference to all project documentation

---

## 🚀 Start Here

### For New Developers

1. **README.md** - Project overview and quick start
2. **CURRENT_ARCHITECTURE.md** - Current system architecture ✅ **READ THIS FIRST**
3. **DEVELOPMENT_GUIDE.md** - How to develop new features ✅ **ESSENTIAL**
4. **AI_DEVELOPMENT_WORKFLOW.md** - AI prompting framework ⚠️ **CRITICAL FOR AI-ASSISTED DEVELOPMENT**

### For Understanding the System

- **CURRENT_ARCHITECTURE.md** - Complete system documentation (database, auth, security, data flow)
- **DEVELOPMENT_GUIDE.md** - Patterns, best practices, how to add features
- **PHASE2_COMPLETE_SUMMARY.md** - Security implementation details
- **PHASE2_INTEGRATION_COMPLETE.md** - Security feature integration guide
- **ENCRYPTION_STATUS.md** - Encryption compliance certification

---

## 📚 Current Documentation (Active)

### Core Documentation

| Document | Purpose | Audience |
|----------|---------|----------|
| `README.md` | Project overview, setup guide | Everyone |
| `CURRENT_ARCHITECTURE.md` | System architecture, database schema, data flow | Developers, Architects |
| `DEVELOPMENT_GUIDE.md` | Development patterns, how to add features | Developers |
| `AI_DEVELOPMENT_WORKFLOW.md` | ⚠️ **CRITICAL** AI prompting framework, safe change workflow | Everyone using AI |

### Security & Compliance

| Document | Purpose | Audience |
|----------|---------|----------|
| `PHASE2_COMPLETE_SUMMARY.md` | Security features implementation | Security team, Auditors |
| `PHASE2_INTEGRATION_COMPLETE.md` | Integration status and testing checklist | QA, DevOps |
| `ENCRYPTION_STATUS.md` | Encryption compliance (SOC 2, ISO 27001, GDPR) | Compliance, Auditors |

### Feature Documentation

| Document | Purpose | Audience |
|----------|---------|----------|
| `docs/bigquery-integration.md` | BigQuery integration guide | Backend developers |
| `docs/auth_map.md` | Authentication flow mapping | Security developers |
| `docs/authz_matrix.md` | Authorization matrix | Security team |
| `docs/feature-permissions.md` | Feature flag system | Product team |
| `docs/REVIEWS-SYSTEM-README.md` | Reviews feature documentation | Frontend developers |

### API Contracts

| Document | Purpose | Audience |
|----------|---------|----------|
| `docs/USER_ORGANIZATION_API_CONTRACT.md` | User/org API contract | Frontend/Backend devs |
| `docs/whoami_contract.md` | User info endpoint contract | Frontend developers |
| `docs/ADMIN_USERS_API.md` | Admin users API | Admin feature developers |

### Development Tools

| Document | Purpose | Audience |
|----------|---------|----------|
| `.github/PULL_REQUEST_TEMPLATE.md` | PR template | All developers |
| `docs/TESTING_PROMPT.md` | Testing guidelines | QA team |
| `docs/troubleshooting-app-discovery.md` | Troubleshooting guide | DevOps |

---

## 📦 Legacy Documentation (Archived)

**Note:** These files document historical fixes and audits. They're kept for reference but don't reflect the current system.

### Audit Files (Historical)

- `ADD_COMPETITOR_DIALOG_AUDIT.md`
- `AGENCY_CLIENT_MODEL_AUDIT.md`
- `AGENCY_FIX_COMPREHENSIVE_AUDIT.md`
- `APP_PICKER_AUDIT_ORG_APP_ACCESS.md`
- `ASO_CARDS_DEBUG_ANALYSIS.md`
- `COMPETITOR_ANALYSIS_AUDIT_2025.md`
- `DASHBOARD_V2_ROOT_CAUSE_ANALYSIS.md`
- `OPTION1_SCALABILITY_SECURITY_AUDIT.md`
- `PHASE_2_AUDIT_WILL_IT_FIX_APP_PICKER.md`
- `REVIEW_CACHING_ARCHITECTURE_AUDIT.md`
- `REVIEWS_PAGE_AUDIT.md`
- `SECURITY_ARCHITECTURE_AUDIT_2025.md`
- `TRAFFIC_SOURCE_FILTER_AUDIT.md`

### Fix/Implementation Files (Historical)

- `AGENCY_CLIENT_SOLUTION_COMPLETE.md`
- `AGENCY_IMPLEMENTATION_COMPLETE.md`
- `APP_PICKER_FIX_COMPLETE.md`
- `ASO_CARDS_FIX_COMPLETE.md`
- `COMPETITOR_ANALYSIS_FIX_PLAN.md`
- `COMPETITOR_ANALYSIS_IMPLEMENTATION_COMPLETE.md`
- `COUNTRY_FIX_COMPLETE.md`
- `CRITICAL_BUG_FIX_STATE_TIMING.md`
- `DASHBOARD_V2_FIX_SUMMARY.md`
- `DEMO_APPS_CLEANUP_COMPLETE.md`
- `DEPLOYMENT_COMPLETE.md`
- `FINAL_FIX_ASO_ALL_APPLE.md`
- `HOISTING_FIX_COMPLETE.md`
- `MIGRATION_SYNC_COMPLETE.md`
- `NUCLEAR_OPTION_COMPLETE.md`
- `ORG_APP_ACCESS_FIX_COMPLETE.md`
- `REVIEWS_APP_MONITORING_COMPLETE.md`
- `SOFT_DELETE_DEPLOYMENT.md`
- `SUPER_ADMIN_FIX.md`
- `TRAFFIC_SOURCE_FIX_DEPLOYED.md`

### Analysis Files (Historical)

- `DASHBOARD_V2_FINAL_ANALYSIS.md`
- `DASHBOARD_V2_SMOKING_GUN.md`
- `EDGE_FUNCTION_RESPONSE_ARCHITECTURE_ANALYSIS.md`
- `ROOT_CAUSE_ANALYSIS.md`
- `ROOT_CAUSE_FINAL_ANALYSIS.md`
- `SMOKING_GUN_ANALYSIS.md`
- `SYSTEMIC_ANALYSIS_AND_FUTURE_PROOFING.md`

**Recommendation:** Move these files to `docs-archive/` directory for historical reference.

---

## 🗂 Documentation Organization

### Recommended Structure

```
project-root/
├── README.md                          # ✅ Project overview
├── CURRENT_ARCHITECTURE.md            # ✅ System architecture (START HERE)
├── DEVELOPMENT_GUIDE.md               # ✅ Developer guide
├── DOCUMENTATION_INDEX.md             # ✅ This file
├── PHASE2_COMPLETE_SUMMARY.md         # Security implementation
├── PHASE2_INTEGRATION_COMPLETE.md     # Integration status
├── ENCRYPTION_STATUS.md               # Compliance certification
├── docs/                              # Active documentation
│   ├── ARCHITECTURE.md                # (Legacy - replaced by CURRENT_ARCHITECTURE.md)
│   ├── bigquery-integration.md
│   ├── auth_map.md
│   ├── authz_matrix.md
│   └── feature-permissions.md
└── docs-archive/                      # Historical documentation
    ├── audits/                        # Audit files
    └── fixes/                         # Fix documentation
```

---

## 🎯 Quick Reference by Role

### Frontend Developer

**Must Read:**
1. `CURRENT_ARCHITECTURE.md` - Frontend architecture section
2. `DEVELOPMENT_GUIDE.md` - Component patterns, data fetching
3. `AI_DEVELOPMENT_WORKFLOW.md` - ⚠️ Safe AI-assisted development
4. `docs/USER_ORGANIZATION_API_CONTRACT.md` - API contracts

**Reference:**
- `PHASE2_INTEGRATION_COMPLETE.md` - Security components integration
- `docs/REVIEWS-SYSTEM-README.md` - Reviews feature

### Backend Developer

**Must Read:**
1. `CURRENT_ARCHITECTURE.md` - Database architecture, RLS policies
2. `DEVELOPMENT_GUIDE.md` - Database changes, migration patterns
3. `AI_DEVELOPMENT_WORKFLOW.md` - ⚠️ Safe database changes with AI
4. `docs/bigquery-integration.md` - BigQuery integration

**Reference:**
- `docs/auth_map.md` - Authentication flow
- `docs/authz_matrix.md` - Authorization matrix

### DevOps / Infrastructure

**Must Read:**
1. `CURRENT_ARCHITECTURE.md` - Deployment section
2. `PHASE2_COMPLETE_SUMMARY.md` - Security infrastructure

**Reference:**
- `docs/troubleshooting-app-discovery.md` - Troubleshooting
- `DEPLOYMENT_COMPLETE.md` - Deployment history

### Security / Compliance

**Must Read:**
1. `ENCRYPTION_STATUS.md` - Encryption compliance
2. `PHASE2_COMPLETE_SUMMARY.md` - Security implementation
3. `CURRENT_ARCHITECTURE.md` - Security features section

**Reference:**
- `PHASE2_INTEGRATION_COMPLETE.md` - Integration checklist
- `docs/authz_matrix.md` - Authorization matrix

### Product Manager

**Must Read:**
1. `README.md` - Product overview
2. `CURRENT_ARCHITECTURE.md` - Feature overview
3. `docs/feature-permissions.md` - Feature flags

---

## 📖 How to Use This Index

### Finding Information

1. **"How do I add a new page?"**
   → `DEVELOPMENT_GUIDE.md` > "Adding New Pages" section

2. **"What's the database schema?"**
   → `CURRENT_ARCHITECTURE.md` > "Database Architecture" section

3. **"How does authentication work?"**
   → `CURRENT_ARCHITECTURE.md` > "Authentication & Authorization" section
   → `docs/auth_map.md` for detailed flow

4. **"What security features are implemented?"**
   → `PHASE2_COMPLETE_SUMMARY.md`
   → `ENCRYPTION_STATUS.md`

5. **"How do I create a migration?"**
   → `DEVELOPMENT_GUIDE.md` > "Database Changes" section

6. **"What's the data flow for Dashboard V2?"**
   → `CURRENT_ARCHITECTURE.md` > "Data Flow" section

### Contributing Documentation

**When to create new documentation:**

- New major feature added
- New integration added
- Architectural change made
- Security feature implemented

**Where to put it:**

- **Core system changes:** Update `CURRENT_ARCHITECTURE.md`
- **Development patterns:** Update `DEVELOPMENT_GUIDE.md`
- **Feature-specific:** Create `docs/[feature]-README.md`
- **API contracts:** Create `docs/[api]-CONTRACT.md`

**Documentation standards:**

- Use Markdown format
- Include "Last Updated" date
- Add to this index file
- Use clear section headers
- Include code examples
- Add quick reference tables

---

## 🔍 Search Tips

### Finding specific topics:

```bash
# Search all markdown files
grep -r "keyword" *.md docs/*.md

# Search for function/component
grep -r "usePermissions" src/

# Search for database table
grep -r "user_roles" supabase/migrations/

# Search for specific file type
find . -name "*.tsx" | xargs grep "pattern"
```

---

## ✅ Documentation Health

### Last Audit: November 9, 2025

| Category | Status | Action Needed |
|----------|--------|---------------|
| Core docs | ✅ Current | None - newly created |
| Security docs | ✅ Current | None - Phase 2 complete |
| Feature docs | ⚠️ Partial | Update reviews, analytics docs |
| API contracts | ⚠️ Partial | Create contracts for new APIs |
| Legacy docs | ⚠️ Cleanup | Move to docs-archive/ |

### Recommended Actions

1. **Immediate:**
   - [x] Create `CURRENT_ARCHITECTURE.md`
   - [x] Create `DEVELOPMENT_GUIDE.md`
   - [x] Create `DOCUMENTATION_INDEX.md`

2. **Short-term:**
   - [ ] Move legacy audit/fix files to `docs-archive/`
   - [ ] Update `docs/bigquery-integration.md` with current implementation
   - [ ] Create `docs/DASHBOARD_V2_API_CONTRACT.md`

3. **Long-term:**
   - [ ] Add inline JSDoc to all components
   - [ ] Create video tutorials for onboarding
   - [ ] Generate API documentation from code

---

## 📞 Documentation Contacts

**Questions about:**

- **Architecture:** Review `CURRENT_ARCHITECTURE.md`
- **Development:** Review `DEVELOPMENT_GUIDE.md`
- **Security:** Review `PHASE2_COMPLETE_SUMMARY.md`
- **Specific features:** Check `docs/[feature]-README.md`

---

**Last Updated:** November 9, 2025
**Maintained by:** Development team
**Review frequency:** Quarterly or after major changes
