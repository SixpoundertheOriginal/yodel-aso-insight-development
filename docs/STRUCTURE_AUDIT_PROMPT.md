---
Status: ACTIVE
Version: v1.0
Last Updated: 2025-01-19
Purpose: Documentation structure verification and audit prompt
Type: Operational Checklist
Audience: AI Agents, Developers, Documentation Maintainers
---

# Documentation Structure Audit Prompt

**Last Structure Migration:** 2025-01-19 (Phase 1 + Phase 2 cleanup)
**Total Files Organized:** 278 markdown files
**Current Structure Version:** v1.0 (Enterprise-grade numbered sections)

---

## Quick Verification Commands

```bash
# 1. Verify root-level documentation files (should be exactly 8 files)
ls -1 *.md | wc -l
# Expected: 8 files (README.md, CURRENT_ARCHITECTURE.md, DEVELOPMENT_GUIDE.md,
#                   DOCUMENTATION_INDEX.md, API_GUIDELINES.md, SECURITY_GUIDELINES.md,
#                   CONTRIBUTING.md, CHANGELOG.md)

# 2. Verify numbered documentation sections (should be exactly 8 directories)
ls -1d docs/0* | wc -l
# Expected: 8 directories (01-getting-started through 08-troubleshooting)

# 3. Check for loose files in docs/ root (should be 0 markdown files)
find docs -maxdepth 1 -name "*.md" | wc -l
# Expected: 0 (all loose files should be in sections or archive)

# 4. Check for unapproved subdirectories in docs/ root
ls -1d docs/*/ | grep -v -E "(01-|02-|03-|04-|05-|06-|07-|08-|archive|deprecated|backups)"
# Expected: no output (only approved directories should exist)

# 5. Verify all files have lifecycle headers
grep -L "^---$" docs/02-architecture/**/*.md docs/03-features/**/*.md docs/04-api-reference/**/*.md docs/05-workflows/**/*.md
# Expected: no output (all audited files should have YAML frontmatter)
```

---

## Expected Directory Structure

### Root Level (Project Root)

```
/
├── README.md                          ✅ REQUIRED - Professional project overview
├── CURRENT_ARCHITECTURE.md            ✅ REQUIRED - System architecture overview
├── DEVELOPMENT_GUIDE.md               ✅ REQUIRED - Developer onboarding guide
├── DOCUMENTATION_INDEX.md             ✅ REQUIRED - Documentation navigation
├── API_GUIDELINES.md                  ⚠️  RECOMMENDED - API design standards
├── SECURITY_GUIDELINES.md             ⚠️  RECOMMENDED - Security best practices
├── CONTRIBUTING.md                    ⚠️  RECOMMENDED - Contribution guidelines
├── CHANGELOG.md                       ⚠️  RECOMMENDED - Version history
├── docs/                              📁 REQUIRED - All documentation
└── [other project files]
```

**Verification:**
```bash
# Check root documentation files exist
test -f README.md && echo "✅ README.md exists" || echo "❌ README.md missing"
test -f CURRENT_ARCHITECTURE.md && echo "✅ CURRENT_ARCHITECTURE.md exists" || echo "❌ CURRENT_ARCHITECTURE.md missing"
test -f DEVELOPMENT_GUIDE.md && echo "✅ DEVELOPMENT_GUIDE.md exists" || echo "❌ DEVELOPMENT_GUIDE.md missing"
test -f DOCUMENTATION_INDEX.md && echo "✅ DOCUMENTATION_INDEX.md exists" || echo "❌ DOCUMENTATION_INDEX.md missing"
```

---

### Numbered Documentation Sections (docs/)

```
docs/
├── 01-getting-started/               📁 Quickstart, setup, installation
├── 02-architecture/                  📁 System design, architecture, security
├── 03-features/                      📁 Active feature documentation
├── 04-api-reference/                 📁 API contracts, endpoints, schemas
├── 05-workflows/                     📁 Operational procedures, deployment
├── 06-design-system/                 📁 UI/UX design standards
├── 07-ai-development/                📁 AI agent workflows, safety rules
├── 08-troubleshooting/               📁 Common issues, debugging guides
├── archive/                          📁 Historical documentation (225 files)
├── deprecated/                       📁 Deprecated features (27 files)
├── backups/                          📁 Critical file backups
└── Documentation_Improvement_Plan_Jan2025.md  ✅ REQUIRED - Audit summary
```

**Verification:**
```bash
# Check all numbered sections exist
for i in $(seq -f "%02g" 1 8); do
  test -d "docs/$i-"* && echo "✅ Section $i exists" || echo "❌ Section $i missing"
done

# Check special directories exist
test -d docs/archive && echo "✅ archive/ exists" || echo "❌ archive/ missing"
test -d docs/deprecated && echo "✅ deprecated/ exists" || echo "❌ deprecated/ missing"
```

---

## Section-by-Section Audit

### 📁 docs/01-getting-started/

**Purpose:** Quickstart guides, installation, first-time setup

**Expected Files:**
- `README.md` - Section overview
- `quickstart.md` - 5-minute getting started guide
- `installation.md` - Detailed installation instructions
- `local-development.md` - Local dev environment setup

**Verification:**
```bash
ls -1 docs/01-getting-started/*.md
# Should show at least README.md and quickstart guides
```

**Success Criteria:**
- ✅ README.md exists with section overview
- ✅ Quickstart guide exists (≤ 5 minutes to complete)
- ✅ Installation guide covers all dependencies
- ✅ No historical or deprecated content

---

### 📁 docs/02-architecture/

**Purpose:** System architecture, design decisions, security

**Expected Structure:**
```
docs/02-architecture/
├── README.md                         ✅ REQUIRED - Architecture overview
├── ARCHITECTURE_V1.md                ✅ REQUIRED - Canonical V1 architecture (3,950+ lines)
├── system-design/                    📁 System design documents
│   ├── ORGANIZATION_ROLES_SYSTEM.md  ✅ REQUIRED - Roles and permissions (1,948 lines)
│   ├── auth_map.md                   ⚠️  UPDATE REQUIRED - Describes deprecated patterns
│   └── authz_matrix.md               ⚠️  DEPRECATED - Move to archive
└── security-compliance/              📁 Security and compliance
    ├── ENCRYPTION_STATUS.md          ✅ REQUIRED - SOC 2/ISO 27001 compliance
    └── VALIDATION_STATUS.md          ⚠️  DEPRECATED - Move to archive
```

**Critical Files:**
1. **ARCHITECTURE_V1.md** - MUST exist, MUST be marked `Canonical: true`
2. **ORGANIZATION_ROLES_SYSTEM.md** - MUST exist, comprehensive roles doc

**Verification:**
```bash
# Check ARCHITECTURE_V1.md exists and is marked canonical
test -f docs/02-architecture/ARCHITECTURE_V1.md && \
  grep -q "Canonical: true" docs/02-architecture/ARCHITECTURE_V1.md && \
  echo "✅ ARCHITECTURE_V1.md is canonical" || \
  echo "❌ ARCHITECTURE_V1.md missing or not canonical"

# Check for lifecycle headers
grep -L "^---$" docs/02-architecture/**/*.md
# Expected: no output (all files should have headers)
```

**Success Criteria:**
- ✅ ARCHITECTURE_V1.md exists and is canonical
- ✅ All files have lifecycle headers (Status/Version/Last Updated)
- ✅ Deprecated files marked with `Status: DEPRECATED`
- ✅ No files describing pre-V1 systems without deprecation markers

---

### 📁 docs/03-features/

**Purpose:** Active production feature documentation

**Expected Structure:**
```
docs/03-features/
├── README.md                         ✅ REQUIRED - Features overview
├── dashboard-v2/                     📁 Dashboard V2 (PRODUCTION)
│   ├── README.md
│   ├── QUICK_REFERENCE.md
│   ├── DATA_PIPELINE_AUDIT.md        ✅ REQUIRED - Canonical pipeline doc (1,269 lines)
│   ├── BIGQUERY_QUICK_REFERENCE.md   ⚠️  HIGH PRIORITY - Fix BigQuery paths
│   ├── BIGQUERY_SCHEMA_AND_METRICS_MAP.md  ⚠️  HIGH PRIORITY - 767 lines, path errors
│   ├── BIGQUERY_RESEARCH_INDEX.md
│   └── bigquery-integration.md
├── reviews/                          📁 Reviews system (PRODUCTION)
│   ├── README.md
│   └── ADR-reviews-system.md
├── admin-panel/                      📁 Admin panel (IN DEVELOPMENT)
│   ├── README.md
│   ├── API_ADMIN_USERS.md
│   └── [other admin docs]
├── ai-chat/                          📁 AI chat (IN DEVELOPMENT)
│   ├── README.md
│   ├── QUICK_REFERENCE.md
│   ├── data-flow.md
│   └── [other chat docs]
├── aso-intelligence/                 📁 ASO Intelligence (IN DEVELOPMENT)
│   ├── README.md
│   └── [other ASO docs]
└── super-admin/                      📁 Super admin features
    ├── README.md
    └── QUICK_REFERENCE.md
```

**Critical Files:**
1. **dashboard-v2/DATA_PIPELINE_AUDIT.md** - MUST exist, most current audit (Jan 19, 2025)
2. **dashboard-v2/BIGQUERY_SCHEMA_AND_METRICS_MAP.md** - MUST exist (comprehensive reference)

**Known Issues (HIGH Priority):**
- ⚠️ BIGQUERY_QUICK_REFERENCE.md: Wrong project (`aso-reporting-1` should be `yodel-mobile-app`)
- ⚠️ BIGQUERY_SCHEMA_AND_METRICS_MAP.md: Wrong dataset (`client_reports` should be `aso_reports`)
- ⚠️ bigquery-integration.md: Missing RLS, MFA, audit logging details

**Verification:**
```bash
# Check DATA_PIPELINE_AUDIT.md exists and is canonical
test -f docs/03-features/dashboard-v2/DATA_PIPELINE_AUDIT.md && \
  grep -q "Canonical: true" docs/03-features/dashboard-v2/DATA_PIPELINE_AUDIT.md && \
  echo "✅ DATA_PIPELINE_AUDIT.md is canonical" || \
  echo "❌ DATA_PIPELINE_AUDIT.md missing or not canonical"

# Check for wrong BigQuery paths (should return matches until fixed)
grep -r "aso-reporting-1" docs/03-features/dashboard-v2/
# Expected after fix: no output

# Check for lifecycle headers
find docs/03-features -name "*.md" -type f | while read f; do
  grep -q "^---$" "$f" || echo "❌ Missing header: $f"
done
```

**Success Criteria:**
- ✅ All production features have README.md
- ✅ DATA_PIPELINE_AUDIT.md is canonical and dated 2025-01-19
- ✅ All dashboard-v2 files have lifecycle headers
- ✅ No deprecated features in this directory (move to /deprecated/)
- ⚠️  HIGH PRIORITY: BigQuery paths corrected to `yodel-mobile-app.aso_reports`

---

### 📁 docs/04-api-reference/

**Purpose:** API contracts, endpoints, database schemas

**Expected Files:**
```
docs/04-api-reference/
├── README.md                         ✅ REQUIRED - API reference overview
├── USER_ORGANIZATION_CONTRACT.md     ✅ REQUIRED - Canonical API contract (357 lines)
├── feature-permissions.md            ⚠️  CLARIFY - V1 or V2/V3 planned?
├── whoami_contract.md                ⚠️  VERIFY - Production or deprecated?
└── db_rls_report.md                  ⚠️  REWRITE - Describes old RLS patterns
```

**Critical Files:**
1. **USER_ORGANIZATION_CONTRACT.md** - MUST exist, canonical API contract

**Known Issues:**
- ⚠️ db_rls_report.md: References `profiles` table (not in current architecture)
- ⚠️ feature-permissions.md: Describes elaborate system vs "no feature flags" in ARCHITECTURE_V1.md
- ⚠️ whoami_contract.md: Unclear if `admin-whoami` endpoint is in production

**Verification:**
```bash
# Check USER_ORGANIZATION_CONTRACT.md exists and is canonical
test -f docs/04-api-reference/USER_ORGANIZATION_CONTRACT.md && \
  grep -q "Canonical: true" docs/04-api-reference/USER_ORGANIZATION_CONTRACT.md && \
  echo "✅ USER_ORGANIZATION_CONTRACT.md is canonical" || \
  echo "❌ USER_ORGANIZATION_CONTRACT.md missing or not canonical"

# Check for lifecycle headers
grep -L "^---$" docs/04-api-reference/*.md
# Expected: no output
```

**Success Criteria:**
- ✅ USER_ORGANIZATION_CONTRACT.md is canonical
- ✅ All files have lifecycle headers
- ✅ No references to deprecated `profiles` table (should reference `user_roles`)
- ✅ Clear V1 vs V2/V3 markers on all files

---

### 📁 docs/05-workflows/

**Purpose:** Operational procedures, deployment, user management

**Expected Files:**
```
docs/05-workflows/
├── README.md                         ✅ REQUIRED - Workflows overview
├── USER_MANAGEMENT_GUIDE.md          ✅ REQUIRED - Canonical user management (619 lines)
├── YODEL_MOBILE_CONTEXT.md           ✅ REQUIRED - Canonical business context (414 lines)
├── DEPLOYMENT.md                     ⚠️  UPDATE - Add production config
└── navigation-feature-gating.md      ⚠️  EXPAND - Only 12 lines, incomplete
```

**Critical Files:**
1. **USER_MANAGEMENT_GUIDE.md** - MUST exist, canonical guide
2. **YODEL_MOBILE_CONTEXT.md** - MUST exist, business context

**Known Issues:**
- ⚠️ DEPLOYMENT.md: Generic config, needs production specifics (Supabase, BigQuery projects)
- ⚠️ navigation-feature-gating.md: Too brief (12 lines), needs expansion

**Verification:**
```bash
# Check canonical files exist
test -f docs/05-workflows/USER_MANAGEMENT_GUIDE.md && \
  grep -q "Canonical: true" docs/05-workflows/USER_MANAGEMENT_GUIDE.md && \
  echo "✅ USER_MANAGEMENT_GUIDE.md is canonical" || \
  echo "❌ USER_MANAGEMENT_GUIDE.md missing or not canonical"

test -f docs/05-workflows/YODEL_MOBILE_CONTEXT.md && \
  grep -q "Canonical: true" docs/05-workflows/YODEL_MOBILE_CONTEXT.md && \
  echo "✅ YODEL_MOBILE_CONTEXT.md is canonical" || \
  echo "❌ YODEL_MOBILE_CONTEXT.md missing or not canonical"
```

**Success Criteria:**
- ✅ USER_MANAGEMENT_GUIDE.md and YODEL_MOBILE_CONTEXT.md are canonical
- ✅ All files have lifecycle headers
- ✅ DEPLOYMENT.md includes production config (Supabase: bkbcqocpjahewqjmlgvf)
- ✅ No placeholder or incomplete guides

---

### 📁 docs/06-design-system/

**Purpose:** UI/UX design standards, component library

**Expected Structure:**
```
docs/06-design-system/
├── README.md                         ✅ REQUIRED - Design system overview
├── components/                       📁 Component documentation
├── patterns/                         📁 Design patterns
└── [other design docs]
```

**Known Issues:**
- ⚠️ Previously had nested `design-system/design-system/` structure (FIXED in Phase 2)

**Verification:**
```bash
# Check for nested design-system folder (should NOT exist)
test -d docs/06-design-system/design-system && \
  echo "❌ Nested design-system folder exists - run cleanup" || \
  echo "✅ No nested design-system folder"

# Check README exists
test -f docs/06-design-system/README.md && \
  echo "✅ Design system README exists" || \
  echo "❌ Design system README missing"
```

**Success Criteria:**
- ✅ No nested `design-system/design-system/` structure
- ✅ README.md exists
- ✅ All component docs in proper subdirectories

---

### 📁 docs/07-ai-development/

**Purpose:** AI agent workflows, safety rules, development standards

**Expected Files:**
```
docs/07-ai-development/
├── README.md                         ✅ REQUIRED - AI development overview
├── AI_AGENT_QUICKSTART.md            ✅ REQUIRED - AI safety rules and quickstart
├── AI_ENGINEERING_RULES.md           ✅ REQUIRED - Comprehensive engineering rules
├── LOVABLE_PROMPTING_GUIDE.md        📄 Lovable.dev specific guidance
├── CODEX_WORKFLOW_GUIDE.md           📄 Codex workflow standards
├── LINT-RULES-SUGGESTIONS.md         📄 Linting and code quality
├── proven-patterns.md                📄 Proven implementation patterns
└── failure-patterns.md               📄 Anti-patterns to avoid
```

**Critical Files:**
1. **AI_AGENT_QUICKSTART.md** - MUST exist, read before ANY AI-assisted changes
2. **AI_ENGINEERING_RULES.md** - MUST exist, comprehensive safety rules

**Verification:**
```bash
# Check critical AI development files exist
test -f docs/07-ai-development/AI_AGENT_QUICKSTART.md && \
  echo "✅ AI_AGENT_QUICKSTART.md exists" || \
  echo "❌ AI_AGENT_QUICKSTART.md CRITICAL - MISSING"

test -f docs/07-ai-development/AI_ENGINEERING_RULES.md && \
  echo "✅ AI_ENGINEERING_RULES.md exists" || \
  echo "❌ AI_ENGINEERING_RULES.md CRITICAL - MISSING"

# Check README exists
test -f docs/07-ai-development/README.md && \
  echo "✅ AI development README exists" || \
  echo "❌ AI development README missing"
```

**Success Criteria:**
- ✅ AI_AGENT_QUICKSTART.md exists with safety rules
- ✅ AI_ENGINEERING_RULES.md exists with comprehensive standards
- ✅ README.md provides clear workflow overview
- ✅ Section prominently referenced in main README.md

---

### 📁 docs/08-troubleshooting/

**Purpose:** Common issues, debugging guides, FAQ

**Expected Files:**
```
docs/08-troubleshooting/
├── README.md                         ✅ REQUIRED - Troubleshooting overview
├── app-discovery.md                  📄 App discovery issues
└── [other troubleshooting docs]
```

**Verification:**
```bash
# Check README exists
test -f docs/08-troubleshooting/README.md && \
  echo "✅ Troubleshooting README exists" || \
  echo "❌ Troubleshooting README missing"

# List troubleshooting guides
ls -1 docs/08-troubleshooting/*.md
```

**Success Criteria:**
- ✅ README.md exists
- ✅ At least 3-5 common issue guides exist
- ✅ Each guide includes symptoms, diagnosis, resolution

---

### 📁 docs/archive/

**Purpose:** Historical documentation, completed work

**Expected Structure:**
```
docs/archive/
├── README.md                         ✅ REQUIRED - Archive overview and retention policy
├── phases/                           📁 42 historical phase documents
│   ├── phase-a-metadata/             📁 20 files - Metadata system phases
│   ├── phase-b-naming/               📁 4 files - Naming conventions
│   ├── phase-c-f-misc/               📁 5 files - UX, frontend, backend
│   └── phase-1-6-systems/            📁 13 files - System-wide phases
├── completed-fixes/                  📁 144 organized fix documents
│   ├── 2025-11-access-control/       📁 10 files - RLS, permissions fixes
│   ├── agency-client-model/          📁 4 files - Multi-tenant agency
│   ├── app-picker/                   📁 6 files - App selector bugs
│   ├── competitor-analysis/          📁 10 files - Competitive features
│   ├── dashboard-v2/                 📁 5 files - Dashboard fixes
│   ├── [other fix categories]
│   └── root-level-fixes/             📁 80 files - Other completed work
└── audits/                           📁 39 comprehensive audits
    ├── 2025-11-architecture/         📁 Architecture reviews, agency model
    ├── 2025-11-security/             📁 Security audits, RLS, MFA
    └── 2025-11-features/             📁 Feature audits, UX assessments
```

**Critical Files:**
1. **README.md** - MUST exist, explains archive purpose and retention policy

**Verification:**
```bash
# Check archive README exists
test -f docs/archive/README.md && \
  echo "✅ Archive README exists" || \
  echo "❌ Archive README missing"

# Count archived files
find docs/archive -name "*.md" -type f | wc -l
# Expected: ~225 files

# Check subdirectory structure
ls -1d docs/archive/*/ | wc -l
# Expected: 3 main subdirectories (phases, completed-fixes, audits)
```

**Success Criteria:**
- ✅ README.md explains archive purpose
- ✅ All archived docs have clear dates and completion status
- ✅ No active/current documentation in archive
- ✅ ~225 total archived markdown files
- ✅ Organized into phases/ completed-fixes/ audits/

---

### 📁 docs/deprecated/

**Purpose:** Deprecated features, old implementations

**Expected Structure:**
```
docs/deprecated/
├── README.md                         ✅ REQUIRED - Deprecated features overview
├── keyword-tracking/                 📁 Keyword tracking (not implemented)
│   ├── KEYWORD_*.md
│   └── INTELLIGENCE_LAYER_VALIDATION.md
├── google-play/                      📁 Google Play (not in production)
│   └── GOOGLE_PLAY_*.md
├── demo-mode/                        📁 Demo mode (being removed)
│   └── DEMO_*.md
└── old-workflows/                    📁 Old implementation plans
    ├── FINAL_IMPLEMENTATION_PLAN.md
    └── [other old plans]
```

**Critical Files:**
1. **README.md** - MUST exist, explains what's deprecated and why

**Verification:**
```bash
# Check deprecated README exists
test -f docs/deprecated/README.md && \
  echo "✅ Deprecated README exists" || \
  echo "❌ Deprecated README missing"

# Count deprecated files
find docs/deprecated -name "*.md" -type f | wc -l
# Expected: ~27 files

# Check no ACTIVE files are in deprecated/
grep -r "Status: ACTIVE" docs/deprecated/ && \
  echo "❌ ACTIVE files found in deprecated/" || \
  echo "✅ No ACTIVE files in deprecated/"
```

**Success Criteria:**
- ✅ README.md explains deprecation reasons
- ✅ All files marked with `Status: DEPRECATED`
- ✅ Clear superseded-by references
- ✅ ~27 total deprecated markdown files
- ✅ No active/current features in deprecated/

---

## Lifecycle Header Audit

All active documentation files MUST have lifecycle headers in YAML frontmatter format:

**Required Header Format:**
```yaml
---
Status: ACTIVE | DEPRECATED | DRAFT | PLANNED | ARCHIVED
Version: v1.0
Last Updated: YYYY-MM-DD
Purpose: [Clear one-line description]
See Also: [Cross-references to related docs]
Audience: [Target readers: Developers, Architects, etc.]
---
```

**Optional Header Fields:**
```yaml
Canonical: true | false          # True if single source of truth
Superseded By: [path/to/new/doc] # If deprecated
Accuracy: N/10                   # From audit results
⚠️ Note: [Priority warnings]     # If updates needed
```

**Verification:**
```bash
# Check all audited files have lifecycle headers (19 files)
FILES=(
  "docs/02-architecture/security-compliance/ENCRYPTION_STATUS.md"
  "docs/02-architecture/security-compliance/VALIDATION_STATUS.md"
  "docs/02-architecture/system-design/auth_map.md"
  "docs/02-architecture/system-design/authz_matrix.md"
  "docs/02-architecture/system-design/ORGANIZATION_ROLES_SYSTEM.md"
  "docs/03-features/dashboard-v2/BIGQUERY_QUICK_REFERENCE.md"
  "docs/03-features/dashboard-v2/BIGQUERY_RESEARCH_INDEX.md"
  "docs/03-features/dashboard-v2/BIGQUERY_SCHEMA_AND_METRICS_MAP.md"
  "docs/03-features/dashboard-v2/bigquery-integration.md"
  "docs/03-features/dashboard-v2/DATA_PIPELINE_AUDIT.md"
  "docs/03-features/dashboard-v2/QUICK_REFERENCE.md"
  "docs/04-api-reference/db_rls_report.md"
  "docs/04-api-reference/feature-permissions.md"
  "docs/04-api-reference/USER_ORGANIZATION_CONTRACT.md"
  "docs/04-api-reference/whoami_contract.md"
  "docs/05-workflows/DEPLOYMENT.md"
  "docs/05-workflows/navigation-feature-gating.md"
  "docs/05-workflows/USER_MANAGEMENT_GUIDE.md"
  "docs/05-workflows/YODEL_MOBILE_CONTEXT.md"
)

for file in "${FILES[@]}"; do
  if grep -q "^---$" "$file"; then
    echo "✅ $file has lifecycle header"
  else
    echo "❌ $file MISSING lifecycle header"
  fi
done
```

**Success Criteria:**
- ✅ All 19 audited files have lifecycle headers
- ✅ All headers include: Status, Version, Last Updated, Purpose, Audience
- ✅ DEPRECATED files have "Superseded By" field
- ✅ Canonical files marked with "Canonical: true"
- ✅ Files needing updates have "⚠️ Note" warnings

---

## File Movement Rules

### ✅ Allowed Operations

1. **Move to Archive:** Historical/completed work → `docs/archive/`
2. **Move to Deprecated:** Obsolete features → `docs/deprecated/`
3. **Move Between Sections:** If purpose changes (e.g., feature doc → API reference)
4. **Add Lifecycle Headers:** To any existing active documentation
5. **Update Existing Content:** Fix errors, add security details, etc.

### ❌ Forbidden Operations

1. **Delete Archive:** NEVER delete `docs/archive/` (historical reference)
2. **Move Active to Archive:** Don't archive production V1 documentation
3. **Remove Lifecycle Headers:** Once added, headers should remain
4. **Create Loose Files:** All new docs must go in numbered sections
5. **Nested Sections:** No `docs/XX-section/XX-section/` nesting

---

## Common Issues and Fixes

### Issue 1: Loose Files in docs/ Root

**Symptom:**
```bash
find docs -maxdepth 1 -name "*.md" | wc -l
# Returns: > 0
```

**Diagnosis:** Files exist directly in `docs/` that should be in sections

**Resolution:**
1. Identify file purpose and content
2. Move to appropriate numbered section:
   - Architecture → `docs/02-architecture/`
   - Features → `docs/03-features/`
   - API → `docs/04-api-reference/`
   - Workflows → `docs/05-workflows/`
3. If historical/completed → `docs/archive/`
4. If deprecated feature → `docs/deprecated/`

**Prevention:** Use migration script for bulk moves

---

### Issue 2: Missing Lifecycle Headers

**Symptom:**
```bash
grep -L "^---$" docs/02-architecture/**/*.md
# Returns: file paths
```

**Diagnosis:** Active documentation files lack YAML frontmatter

**Resolution:**
1. Add lifecycle header using template from this document
2. Set Status (ACTIVE/DEPRECATED/DRAFT)
3. Set Version (usually v1.0)
4. Set Last Updated (current date)
5. Add Purpose and Audience fields

**Prevention:** Require headers in code review

---

### Issue 3: Nested Directory Structure

**Symptom:**
```bash
ls -d docs/06-design-system/design-system/
# Returns: directory exists
```

**Diagnosis:** Accidental nested folder duplication

**Resolution:**
```bash
mv docs/06-design-system/design-system/*.md docs/06-design-system/
rmdir docs/06-design-system/design-system/
```

**Prevention:** Use `tree` command to visualize structure before committing

---

### Issue 4: Wrong BigQuery Paths in Documentation

**Symptom:**
```bash
grep -r "aso-reporting-1" docs/03-features/dashboard-v2/
# Returns: multiple matches
```

**Diagnosis:** Documentation shows incorrect BigQuery project

**Resolution:**
```bash
# Find/replace in all BigQuery docs:
# OLD: aso-reporting-1
# NEW: yodel-mobile-app
# OLD: client_reports
# NEW: aso_reports
```

**Priority:** HIGH (could break production queries)

**Prevention:** Reference ARCHITECTURE_V1.md for correct paths

---

### Issue 5: Deprecated System Documentation Still Active

**Symptom:** File describes old system but marked `Status: ACTIVE`

**Diagnosis:** Authorization pattern changed but docs not updated

**Resolution:**
1. Add `Status: DEPRECATED` to lifecycle header
2. Add `Superseded By: docs/02-architecture/ARCHITECTURE_V1.md`
3. Move to `docs/deprecated/` if entirely obsolete
4. OR rewrite to match current V1 system

**Examples:**
- `authz_matrix.md` - describes unused `authorize` function
- `auth_map.md` - references `profiles` table (should be `user_roles`)

**Prevention:** Cross-reference ARCHITECTURE_V1.md when updating docs

---

## Success Criteria Summary

### ✅ Structure Requirements

- [ ] Exactly 8 root-level markdown files
- [ ] Exactly 8 numbered documentation sections (01-08)
- [ ] Zero loose markdown files in `docs/` root
- [ ] No unapproved subdirectories in `docs/` root
- [ ] `docs/archive/` exists with ~225 files
- [ ] `docs/deprecated/` exists with ~27 files
- [ ] No nested `section/section/` folder structures

### ✅ Content Requirements

- [ ] ARCHITECTURE_V1.md exists and is canonical
- [ ] DATA_PIPELINE_AUDIT.md exists and is dated 2025-01-19
- [ ] AI_AGENT_QUICKSTART.md exists with safety rules
- [ ] Documentation_Improvement_Plan_Jan2025.md exists
- [ ] All 19 audited files have lifecycle headers
- [ ] All DEPRECATED files have "Superseded By" references
- [ ] All canonical files marked with "Canonical: true"

### ✅ Accuracy Requirements

- [ ] No BigQuery references to `aso-reporting-1` (should be `yodel-mobile-app`)
- [ ] No BigQuery references to `client_reports` (should be `aso_reports`)
- [ ] No authorization docs describing `authorize` function as primary (should be `usePermissions()`)
- [ ] No RLS docs referencing `profiles` table (should be `user_roles`)
- [ ] All security docs mention MFA, session timeouts, audit logging

### ✅ Maintenance Requirements

- [ ] All files dated 2025-01-19 or later
- [ ] All files have clear cross-references to ARCHITECTURE_V1.md
- [ ] All deprecated files explain why deprecated
- [ ] All incomplete files marked with "⚠️ Note: INCOMPLETE"
- [ ] All files needing updates have priority warnings (HIGH/MEDIUM/LOW)

---

## Audit Execution Checklist

Use this checklist to perform a complete structure audit:

### Phase 1: Structure Verification (10 minutes)

```bash
# 1. Check root files
ls -1 *.md | wc -l
# Expected: 8

# 2. Check numbered sections
ls -1d docs/0* | wc -l
# Expected: 8

# 3. Check for loose files
find docs -maxdepth 1 -name "*.md" | wc -l
# Expected: 0

# 4. Check for unapproved directories
ls -1d docs/*/ | grep -v -E "(01-|02-|03-|04-|05-|06-|07-|08-|archive|deprecated|backups)"
# Expected: no output

# 5. Check archive size
find docs/archive -name "*.md" -type f | wc -l
# Expected: ~225

# 6. Check deprecated size
find docs/deprecated -name "*.md" -type f | wc -l
# Expected: ~27
```

**Pass Criteria:** All commands return expected values

---

### Phase 2: Content Verification (15 minutes)

```bash
# 1. Check canonical documents exist
test -f docs/02-architecture/ARCHITECTURE_V1.md && echo "✅" || echo "❌"
test -f docs/03-features/dashboard-v2/DATA_PIPELINE_AUDIT.md && echo "✅" || echo "❌"
test -f docs/07-ai-development/AI_AGENT_QUICKSTART.md && echo "✅" || echo "❌"
test -f docs/Documentation_Improvement_Plan_Jan2025.md && echo "✅" || echo "❌"

# 2. Check canonical markers
grep -q "Canonical: true" docs/02-architecture/ARCHITECTURE_V1.md && echo "✅" || echo "❌"
grep -q "Canonical: true" docs/03-features/dashboard-v2/DATA_PIPELINE_AUDIT.md && echo "✅" || echo "❌"

# 3. Check lifecycle headers on audited files (19 files)
find docs/02-architecture docs/03-features/dashboard-v2 docs/04-api-reference docs/05-workflows -name "*.md" -type f | \
  while read f; do grep -q "^---$" "$f" || echo "❌ Missing header: $f"; done
# Expected: no output

# 4. Check for wrong BigQuery paths
grep -r "aso-reporting-1" docs/03-features/dashboard-v2/
grep -r "client_reports" docs/03-features/dashboard-v2/
# Expected after fix: no output
```

**Pass Criteria:** All canonical documents exist and marked correctly, no missing headers

---

### Phase 3: Accuracy Verification (20 minutes)

```bash
# 1. Check BigQuery path accuracy
# Should NOT find these (errors):
grep -r "aso-reporting-1" docs/03-features/dashboard-v2/
grep -r "client_reports" docs/03-features/dashboard-v2/

# Should find these (correct):
grep -r "yodel-mobile-app" docs/03-features/dashboard-v2/ | wc -l
grep -r "aso_reports" docs/03-features/dashboard-v2/ | wc -l

# 2. Check authorization pattern accuracy
# Should NOT describe as primary:
grep -l "authorize" docs/02-architecture/system-design/*.md

# Should describe as primary:
grep -l "usePermissions" docs/02-architecture/system-design/*.md

# 3. Check for deprecated table references
# Should NOT find:
grep -r "profiles" docs/04-api-reference/db_rls_report.md

# Should find:
grep -r "user_roles" docs/04-api-reference/db_rls_report.md

# 4. Check security feature mentions
grep -r "MFA" docs/02-architecture/ | wc -l
grep -r "session timeout" docs/02-architecture/ | wc -l
grep -r "audit logging" docs/02-architecture/ | wc -l
# Expected: multiple matches for each
```

**Pass Criteria:** No critical path errors, deprecated patterns marked correctly

---

### Phase 4: Freshness Verification (10 minutes)

```bash
# 1. Check all audited files dated 2025-01-19 or later
FILES=(docs/02-architecture/**/*.md docs/03-features/dashboard-v2/*.md docs/04-api-reference/*.md docs/05-workflows/*.md)
for file in "${FILES[@]}"; do
  grep -q "Last Updated: 2025-01-19" "$file" && echo "✅ $file" || echo "⚠️ $file (older date)"
done

# 2. Check for outdated references
grep -r "2024" docs/02-architecture/ docs/03-features/ docs/04-api-reference/ docs/05-workflows/ | \
  grep -v "archive" | grep -v "deprecated" | wc -l
# Expected: minimal matches (only in historical context, not current dates)

# 3. Check README files exist in all sections
for i in $(seq -f "%02g" 1 8); do
  test -f "docs/$i"-*/README.md && echo "✅ Section $i README" || echo "❌ Section $i README missing"
done
```

**Pass Criteria:** All audited files dated 2025-01-19, all sections have READMEs

---

## Quick Reference: File Status Meanings

| Status | Meaning | Location | Example |
|--------|---------|----------|---------|
| **ACTIVE** | Current production V1 documentation | Numbered sections | ARCHITECTURE_V1.md |
| **DEPRECATED** | Obsolete but kept for reference | In place with marker, or /deprecated/ | authz_matrix.md |
| **DRAFT** | Work in progress, not final | Numbered sections | (none currently) |
| **PLANNED** | Future V2/V3 features | /planned-features/ | (if created) |
| **ARCHIVED** | Historical, completed work | /archive/ | PHASE_A7_*.md |

---

## Quick Reference: Priority Levels

| Priority | Meaning | Timeline | Example Issue |
|----------|---------|----------|---------------|
| 🔴 **HIGH** | Could break production | Fix this week | Wrong BigQuery paths |
| 🟡 **MEDIUM** | Incomplete/outdated | Fix in 2 weeks | Missing security details |
| 🟢 **LOW** | Minor improvements | Ongoing maintenance | Add cross-references |
| ⚠️ **REWRITE** | Major rewrite needed | Scheduled work | auth_map.md (deprecated patterns) |

---

## Related Documentation

- [ARCHITECTURE_V1.md](./02-architecture/ARCHITECTURE_V1.md) - Canonical V1 system architecture
- [AI_AGENT_QUICKSTART.md](./07-ai-development/AI_AGENT_QUICKSTART.md) - AI safety rules
- [Documentation_Improvement_Plan_Jan2025.md](./Documentation_Improvement_Plan_Jan2025.md) - Content audit and roadmap
- [archive/README.md](./archive/README.md) - Archive organization and retention policy
- [deprecated/README.md](./deprecated/README.md) - Deprecated features list

---

## Audit History

| Date | Auditor | Changes | Files Affected |
|------|---------|---------|----------------|
| 2025-01-19 | AI Agent | Phase 1 + Phase 2 migration, 278 files reorganized | All documentation |
| 2025-01-19 | AI Agent | Content audit of 19 active files | 02-arch, 03-features, 04-api, 05-workflows |
| 2025-01-19 | AI Agent | Lifecycle headers added to 19 files | Same as above |
| [Future] | [Name] | [Changes] | [Files] |

---

**Last Structure Audit:** 2025-01-19
**Next Scheduled Audit:** 2025-04-19 (Quarterly)
**Audit Owner:** Engineering Team
**Escalation Contact:** See main [README.md](../README.md) for support
