---
Status: ACTIVE
Version: v2.0
Date: 2025-01-19
Type: Implementation Roadmap (Phase 2)
Based On: STRUCTURAL_AUDIT_REPORT_JAN2025.md, Documentation_Improvement_Plan_Jan2025.md
Purpose: High-level documentation tasks only (no code/architecture fixes)
Audience: Engineering Team, Documentation Maintainers, Leadership
---

# Documentation Improvement Roadmap (Phase 2)

**Roadmap Date:** January 19, 2025
**Scope:** Documentation structure and content tasks only
**Exclusions:** Code changes, architecture fixes, database migrations, RLS policy changes
**Approval Gate:** Required before any content rewriting begins

---

## Executive Summary

This roadmap translates audit findings from **STRUCTURAL_AUDIT_REPORT_JAN2025.md** into actionable documentation tasks. All tasks are **documentation-only** — no code changes, no schema modifications, no RLS updates.

**Critical Findings from Audit:**
- 🔴 docs/01-getting-started/ is empty (0 files)
- 🔴 28 BigQuery path errors in documentation
- 🔴 No testing documentation exists
- 🟡 11 missing READMEs across sections
- 🟡 2 deprecated files in active sections

**Roadmap Structure:**
1. **P0 Tasks** (This Week) - Blockers and critical errors
2. **P1 Tasks** (Next 2 Weeks) - High-priority structure improvements
3. **P2 Tasks** (Next Month) - Medium-priority completeness improvements
4. **Approval Gate** - Review and sign-off before content rewriting

**Total Effort Estimate:** 80-120 hours (documentation work only)

---

## Table of Contents

1. [Priority Framework](#priority-framework)
2. [P0 Tasks: Critical Blockers](#p0-tasks-critical-blockers)
3. [P1 Tasks: Structure & Discovery](#p1-tasks-structure--discovery)
4. [P2 Tasks: Completeness & Quality](#p2-tasks-completeness--quality)
5. [Getting-Started Section Plan](#getting-started-section-plan)
6. [README Creation Plan](#readme-creation-plan)
7. [Canonical Document Consolidation](#canonical-document-consolidation)
8. [Deprecated Document Plan](#deprecated-document-plan)
9. [Audience-Specific Requirements](#audience-specific-requirements)
10. [Document Structure Templates](#document-structure-templates)
11. [Approval Gate](#approval-gate)
12. [Success Metrics](#success-metrics)

---

## Priority Framework

### Priority Definitions

| Priority | Timeline | Criteria | Examples |
|----------|----------|----------|----------|
| **P0** | This Week | Production risk, blocks new developers, critical accuracy errors | BigQuery paths, empty getting-started, move deprecated files |
| **P1** | 2 Weeks | High-impact gaps, poor discoverability, enterprise readiness | Missing READMEs, auth rewrite, testing docs |
| **P2** | 1 Month | Completeness, quality improvements, audience-specific needs | Security sections, data science docs, consolidation |
| **P3** | 1 Quarter | Nice-to-have, long-term improvements | User guides, monitoring docs, data governance |

### Task Type Definitions

| Type | Description | Examples |
|------|-------------|----------|
| **CREATE** | New document from scratch | Getting-started guides, READMEs, testing docs |
| **UPDATE** | Modify existing document (find/replace, add sections) | BigQuery path fixes, add security sections |
| **MOVE** | Relocate document to correct location | Deprecated files to /deprecated/ |
| **DELETE** | Remove obsolete/empty directories | Empty development/, operational/ |
| **CONSOLIDATE** | Merge overlapping documents | Authorization docs, architecture docs |
| **OUTLINE** | Define structure only (no content yet) | Document templates, section outlines |

---

## P0 Tasks: Critical Blockers

**Timeline:** This Week (January 20-26, 2025)
**Total Effort:** 10-14 hours
**Approval Required:** Yes (before Path Fix task)

### P0.1: Fix BigQuery Path Errors (UPDATE)

**Priority:** 🔴 P0 - CRITICAL
**Effort:** 2-4 hours
**Type:** UPDATE (find/replace only)
**Risk:** Production queries may fail if developers copy wrong paths

**Scope:**
```
Find/Replace in 6 files:
  OLD: aso-reporting-1
  NEW: yodel-mobile-app

  OLD: client_reports
  NEW: aso_reports

Files to Update:
  1. docs/03-features/dashboard-v2/BIGQUERY_QUICK_REFERENCE.md
  2. docs/03-features/dashboard-v2/BIGQUERY_SCHEMA_AND_METRICS_MAP.md (767 lines)
  3. docs/03-features/dashboard-v2/BIGQUERY_RESEARCH_INDEX.md
  4. docs/03-features/dashboard-v2/bigquery-integration.md
  5. docs/03-features/dashboard-v2/DATA_PIPELINE_AUDIT.md (minor instances)
  6. docs/03-features/dashboard-v2/QUICK_REFERENCE.md (if applicable)
```

**Verification Steps:**
```bash
# After fix, verify no old paths remain:
grep -r "aso-reporting-1" docs/03-features/dashboard-v2/
grep -r "client_reports" docs/03-features/dashboard-v2/
# Expected: no output

# Verify new paths exist:
grep -r "yodel-mobile-app" docs/03-features/dashboard-v2/ | wc -l
grep -r "aso_reports" docs/03-features/dashboard-v2/ | wc -l
# Expected: multiple matches
```

**Success Criteria:**
- ✅ Zero instances of `aso-reporting-1` in dashboard-v2 docs
- ✅ Zero instances of `client_reports` in dashboard-v2 docs
- ✅ All SQL examples use correct project/dataset
- ✅ Lifecycle headers updated with `Last Updated: 2025-01-19` (or current date)

---

### P0.2: Populate docs/01-getting-started/ (CREATE)

**Priority:** 🔴 P0 - CRITICAL
**Effort:** 6-8 hours
**Type:** CREATE (4 new documents)
**Risk:** New developers cannot onboard independently

**Scope:**
Create 4 essential getting-started documents from scratch (outlines provided in [Getting-Started Section Plan](#getting-started-section-plan))

**Files to Create:**
```
1. docs/01-getting-started/README.md
   - Section overview
   - Quick navigation to quickstart, installation, local dev
   - Target audience: New developers

2. docs/01-getting-started/quickstart.md
   - 5-minute getting started guide
   - Copy-paste commands only
   - Goal: Run app locally in 5 minutes

3. docs/01-getting-started/installation.md
   - Detailed installation instructions
   - Prerequisites (Node.js, npm, git, Supabase CLI)
   - Environment variable setup
   - Troubleshooting common installation issues

4. docs/01-getting-started/local-development.md
   - Local development environment setup
   - Hot reload configuration
   - Database connection (local vs remote)
   - Running tests locally
   - Debugging setup
```

**Success Criteria:**
- ✅ All 4 files created with lifecycle headers
- ✅ Quickstart guide can be completed in ≤ 5 minutes
- ✅ Installation guide covers all dependencies
- ✅ No code changes required (documentation only)
- ✅ Cross-references to DEVELOPMENT_GUIDE.md where appropriate

---

### P0.3: Move Deprecated Files to Archive (MOVE)

**Priority:** 🔴 P0 - CRITICAL (clarity)
**Effort:** 30 minutes
**Type:** MOVE (2 files)
**Risk:** Developers implement deprecated patterns

**Scope:**
```
Move 2 deprecated files from active sections to /deprecated/:

1. docs/02-architecture/security-compliance/VALIDATION_STATUS.md
   → docs/deprecated/validation-layer/VALIDATION_STATUS.md
   Reason: Feature-specific validation not in current production

2. docs/02-architecture/system-design/authz_matrix.md
   → docs/deprecated/old-authorization/authz_matrix.md
   Reason: Documents unused 'authorize' Edge Function
```

**Additional Actions:**
```
1. Update both files' lifecycle headers:
   - Change "Superseded By" to point to correct canonical doc
   - Add "Archive Date: 2025-01-19"

2. Add deprecation notice at top of each file:
   > **⚠️ DEPRECATED:** This document describes systems no longer in use.
   > See [ARCHITECTURE_V1.md](../02-architecture/ARCHITECTURE_V1.md) for current V1 production architecture.
```

**Success Criteria:**
- ✅ Both files moved to /deprecated/ subdirectories
- ✅ Deprecation notices added
- ✅ Lifecycle headers updated
- ✅ No DEPRECATED files remain in active /02-architecture/ section

---

### P0.4: Remove Empty Directories (DELETE)

**Priority:** 🔴 P0 - LOW (cleanup)
**Effort:** 5 minutes
**Type:** DELETE
**Risk:** None (directories are empty)

**Scope:**
```bash
# Remove 2 empty unapproved directories:
rmdir docs/development/
rmdir docs/operational/
```

**Verification:**
```bash
# Verify unapproved directories removed:
ls -1d docs/*/ | grep -v -E "(01-|02-|03-|04-|05-|06-|07-|08-|archive|deprecated|backups)"
# Expected: no output
```

**Success Criteria:**
- ✅ docs/development/ removed
- ✅ docs/operational/ removed
- ✅ No other unapproved directories exist

---

## P1 Tasks: Structure & Discovery

**Timeline:** Next 2 Weeks (January 27 - February 9, 2025)
**Total Effort:** 28-38 hours
**Approval Required:** Yes (before content creation)

### P1.1: Create Missing READMEs (CREATE)

**Priority:** 🟡 P1 - HIGH
**Effort:** 8-12 hours (11 READMEs)
**Type:** CREATE
**Risk:** Poor discoverability, unclear section purposes

**Scope:**
Create 11 missing README.md files across sections (outlines provided in [README Creation Plan](#readme-creation-plan))

**Files to Create:**
```
1. docs/02-architecture/README.md
2. docs/03-features/README.md
3. docs/03-features/dashboard-v2/README.md
4. docs/03-features/ai-chat/README.md
5. docs/03-features/super-admin/README.md (if needed)
6. docs/04-api-reference/README.md
7. docs/05-workflows/README.md
8. docs/06-design-system/README.md
9. docs/08-troubleshooting/README.md
10. docs/deprecated/README.md
11. [docs/01-getting-started/README.md already created in P0.2]
```

**Success Criteria:**
- ✅ All 11 READMEs created with lifecycle headers
- ✅ Each README includes: Section overview, file index, quick links
- ✅ Cross-references to related sections
- ✅ Target audience clearly stated

---

### P1.2: Rewrite Authorization Documentation (CREATE + UPDATE)

**Priority:** 🟡 P1 - HIGH (accuracy)
**Effort:** 8-12 hours
**Type:** CREATE new docs, UPDATE existing
**Risk:** Developers implement wrong authorization patterns

**Scope:**

**Phase 1: Create New V1 Authorization Guide**
```
File: docs/02-architecture/system-design/authorization-v1.md

Outline:
1. Overview
   - Authorization SSOT: user_roles table
   - Stable API Contract: user_permissions_unified view
   - Frontend Authorization: usePermissions() hook (PRIMARY)
   - Enforcement: RLS policies at database level

2. Database Layer
   - user_roles table schema
   - user_permissions_unified view
   - RLS policies for authorization

3. Frontend Layer
   - usePermissions() hook usage
   - Permission checking examples
   - NoAccess component

4. Security Features
   - MFA enforcement (admin users, 30-day grace)
   - Session security (15-min idle, 8-hour absolute)
   - Audit logging (all critical actions)

5. Migration from Old Patterns
   - Deprecated: authorize Edge Function
   - Deprecated: profiles table
   - Why we changed

6. Code Examples
   - ✅ Correct V1 patterns
   - ❌ Wrong (deprecated) patterns
```

**Phase 2: Update auth_map.md**
```
File: docs/02-architecture/system-design/auth_map.md

Action: ADD deprecation notice at top, rewrite to describe V1 patterns
OR: Archive and replace with authorization-v1.md
```

**Success Criteria:**
- ✅ New authorization-v1.md created describing V1 patterns
- ✅ auth_map.md updated or archived
- ✅ No references to deprecated `authorize` Edge Function as primary
- ✅ No references to `profiles` table (should reference `user_roles`)
- ✅ MFA, session security, audit logging documented

---

### P1.3: Create Testing Documentation (CREATE)

**Priority:** 🟡 P1 - HIGH (enterprise compliance)
**Effort:** 8-12 hours
**Type:** CREATE (4 new documents)
**Risk:** No testing standards, quality issues

**Scope:**

**Option A: Add to docs/01-getting-started/**
```
Files to Create:
1. docs/01-getting-started/testing-overview.md
2. docs/01-getting-started/unit-testing.md
3. docs/01-getting-started/integration-testing.md
4. docs/01-getting-started/e2e-testing.md
```

**Option B: Create docs/09-testing/ section**
```
Create new section: docs/09-testing/
Files to Create:
1. docs/09-testing/README.md
2. docs/09-testing/unit-testing.md
3. docs/09-testing/integration-testing.md
4. docs/09-testing/e2e-testing.md
5. docs/09-testing/test-data.md
```

**Recommended:** Option A (add to getting-started) for now, move to /09-testing/ later if needed

**Document Outlines:** See [Document Structure Templates](#document-structure-templates) section

**Success Criteria:**
- ✅ Testing overview created
- ✅ Unit testing guide created (framework, examples, best practices)
- ✅ Integration testing guide created
- ✅ E2E testing guide created (Playwright/Cypress setup)
- ✅ All lifecycle headers included

---

### P1.4: Create Database Schema Documentation (CREATE)

**Priority:** 🟡 P1 - HIGH (AI agents)
**Effort:** 10-14 hours
**Type:** CREATE (4 new documents)
**Risk:** AI agents make incorrect schema assumptions

**Scope:**
```
Create new subdirectory: docs/02-architecture/database/

Files to Create:
1. docs/02-architecture/database/README.md
   - Overview of database documentation
   - Quick links to schema, ERD, migrations

2. docs/02-architecture/database/schema-reference.md
   - Complete schema reference (all tables)
   - Table purposes
   - Column definitions (name, type, constraints, description)
   - Indexes and foreign keys
   - DO NOT include RLS policies (see architecture docs)

3. docs/02-architecture/database/erd-diagrams.md
   - Entity-Relationship Diagrams (Mermaid or images)
   - Core tables ERD
   - Feature-specific ERDs
   - Relationships and cardinality

4. docs/02-architecture/database/migrations.md
   - Migration history overview
   - Critical migrations log
   - Rollback procedures (documentation only, no scripts)
   - Migration best practices
```

**Document Outlines:** See [Document Structure Templates](#document-structure-templates) section

**Success Criteria:**
- ✅ Complete schema reference created (all production tables)
- ✅ ERD diagrams created (at least 1 core diagram)
- ✅ Migration history documented
- ✅ All lifecycle headers included
- ✅ Cross-references to ARCHITECTURE_V1.md

---

## P2 Tasks: Completeness & Quality

**Timeline:** Next Month (February 10 - March 10, 2025)
**Total Effort:** 40-60 hours
**Approval Required:** Yes (before major rewrites)

### P2.1: Add Security Sections to Existing Docs (UPDATE)

**Priority:** 🟢 P2 - MEDIUM
**Effort:** 6-8 hours
**Type:** UPDATE (5 files)
**Risk:** Incomplete security documentation

**Scope:**
```
Add security sections (MFA, session security, audit logging) to:

1. docs/02-architecture/system-design/auth_map.md
   - Section: "Security Features"
   - MFA enforcement
   - Session timeouts
   - Audit logging

2. docs/05-workflows/DEPLOYMENT.md
   - Section: "Security Configuration"
   - MFA setup instructions
   - Session security environment variables
   - Audit logging verification

3. docs/05-workflows/USER_MANAGEMENT_GUIDE.md
   - Section: "MFA Enforcement"
   - Admin user MFA requirement
   - 30-day grace period
   - MFA setup during user creation

4. docs/03-features/dashboard-v2/QUICK_REFERENCE.md
   - Section: "Security Quick Reference"
   - Session security
   - MFA status
   - Audit logging

5. docs/03-features/dashboard-v2/bigquery-integration.md
   - Section: "Audit Logging Integration"
   - Audit logging for BigQuery access
   - Security considerations
```

**Success Criteria:**
- ✅ All 5 files updated with security sections
- ✅ MFA enforcement documented (admin users, 30-day grace)
- ✅ Session security documented (15-min idle, 8-hour absolute)
- ✅ Audit logging documented (7-year retention)
- ✅ Cross-references to ARCHITECTURE_V1.md

---

### P2.2: Clarify V1 vs V2/V3 Status (UPDATE)

**Priority:** 🟢 P2 - MEDIUM
**Effort:** 3-4 hours
**Type:** UPDATE (2 files)
**Risk:** Developers unclear what's production vs planned

**Scope:**
```
Update 2 files with clear implementation status:

1. docs/04-api-reference/feature-permissions.md
   Issue: Describes elaborate feature permission system
   Conflict: ARCHITECTURE_V1.md states "Feature Flags: None"

   Action:
   - Add lifecycle header field: "Implementation Status: V2 PLANNED"
   - OR: Add lifecycle header field: "Implementation Status: V1 PRODUCTION"
   - Add note explaining discrepancy with ARCHITECTURE_V1.md
   - If V2 PLANNED: Consider moving to /planned-features/ directory

2. docs/04-api-reference/whoami_contract.md
   Issue: Documents admin-whoami endpoint not in ARCHITECTURE_V1.md

   Action:
   - Verify if admin-whoami endpoint is in production
   - If YES: Add to ARCHITECTURE_V1.md Edge Functions section
   - If NO: Mark as DEPRECATED and move to /deprecated/
   - Update lifecycle header accordingly
```

**Success Criteria:**
- ✅ Both files have clear "Implementation Status" markers
- ✅ V1 PRODUCTION vs V2 PLANNED distinction clear
- ✅ Cross-references updated
- ✅ No conflicting information with ARCHITECTURE_V1.md

---

### P2.3: Consolidate Overlapping Documentation (CONSOLIDATE)

**Priority:** 🟢 P2 - MEDIUM
**Effort:** 10-14 hours
**Type:** CONSOLIDATE (5 consolidation projects)
**Risk:** Confusion from duplicate/conflicting docs

**Scope:**
See [Canonical Document Consolidation](#canonical-document-consolidation) section for detailed consolidation plan

**5 Consolidation Projects:**
```
1. Architecture Documentation (3 sources)
   - CURRENT_ARCHITECTURE.md (root)
   - docs/02-architecture/ARCHITECTURE_V1.md (CANONICAL)
   - docs/03-features/aso-intelligence/platform-architecture.md

2. Authorization Documentation (2 sources)
   - docs/02-architecture/system-design/auth_map.md
   - docs/02-architecture/system-design/authz_matrix.md
   - Consolidate into authorization-v1.md

3. Permissions Documentation (2 sources)
   - docs/04-api-reference/feature-permissions.md
   - docs/07-ai-development/discovery/ui-permissions-discovery.md

4. Deployment Documentation (2 sources)
   - DEPLOYMENT_CHECKLIST.md (root)
   - docs/05-workflows/DEPLOYMENT.md

5. Development Documentation (2 sources)
   - DEVELOPMENT_GUIDE.md (root)
   - QUICK_START.md (root)
```

**Success Criteria:**
- ✅ No conflicting information between overlapping docs
- ✅ Clear canonical document for each topic
- ✅ Deprecated/superseded docs marked or archived
- ✅ Cross-references updated

---

### P2.4: Create Data Science Documentation (CREATE)

**Priority:** 🟢 P2 - MEDIUM
**Effort:** 14-18 hours
**Type:** CREATE (4 new documents)
**Risk:** Data scientists/analysts misinterpret data

**Scope:**
```
Create data science documentation:

1. docs/02-architecture/data-dictionary.md
   - Complete field definitions
   - Metric calculation formulas
   - Data quality notes
   - Known data limitations
   - Dimension vs fact tables

2. docs/04-api-reference/bigquery-query-examples.md
   - Common query patterns library
   - Performance optimization examples
   - Query cost estimation guidelines
   - Best practices

3. docs/05-workflows/data-pipeline-monitoring.md
   - Data freshness SLAs
   - Pipeline failure alerting
   - Data quality checks
   - Historical data availability

4. docs/02-architecture/data-lineage.md
   - Data source to destination flow
   - Transformation steps
   - Data refresh schedules
   - Dependencies
```

**Document Outlines:** See [Audience-Specific Requirements: Data Scientists](#data-scientists--analysts)

**Success Criteria:**
- ✅ Data dictionary created with all field definitions
- ✅ Query examples library created (≥10 examples)
- ✅ Data pipeline monitoring documented
- ✅ Data lineage documented
- ✅ All lifecycle headers included

---

### P2.5: Expand Incomplete Documentation (UPDATE)

**Priority:** 🟢 P2 - MEDIUM
**Effort:** 6-8 hours
**Type:** UPDATE (3 files)
**Risk:** Incomplete guides mislead developers

**Scope:**
```
Expand 3 incomplete files:

1. docs/05-workflows/navigation-feature-gating.md
   Current: 12 lines only
   Action: Expand to full implementation guide
   - Add implementation details
   - Add code examples (TypeScript/React)
   - Add role-based navigation examples
   - Add filterNavigationByRoutes usage
   - Add getAllowedRoutes usage

2. docs/03-features/dashboard-v2/QUICK_REFERENCE.md
   Current: Outdated "Known Limitations" section
   Action: Update limitations
   - Verify delta calculations status
   - Update cache key description
   - Verify AI insights status
   - Add RLS and security quick reference

3. docs/04-api-reference/db_rls_report.md
   Current: Describes deprecated RLS patterns
   Action: Rewrite to show V1 RLS patterns
   - Update to user_roles based policies
   - Add org_app_access, audit_logs, mfa_enforcement policies
   - Remove profiles table references
   - Add actual production policy examples
```

**Success Criteria:**
- ✅ navigation-feature-gating.md expanded to ≥100 lines
- ✅ QUICK_REFERENCE.md limitations updated and accurate
- ✅ db_rls_report.md describes V1 RLS patterns only
- ✅ No deprecated patterns documented as current

---

## Getting-Started Section Plan

### Overview

**Goal:** Provide a complete onboarding path for new developers (0 → productive in 1 day)

**Current State:** Empty (0 files) ❌
**Target State:** 4 essential documents ✅

**Target Audience:**
- New developers (primary)
- Returning developers after break
- Open-source contributors (future)

---

### Document 1: README.md

**File:** `docs/01-getting-started/README.md`
**Effort:** 30 minutes
**Priority:** 🔴 P0

**Outline:**
```markdown
---
Status: ACTIVE
Version: v1.0
Last Updated: 2025-01-19
Purpose: Getting started section overview and navigation
Audience: New Developers
---

# Getting Started with Yodel ASO Insight

Welcome to the Yodel ASO Insight platform! This section will help you get up and running quickly.

## Quick Links

- **5-Minute Quickstart** → [quickstart.md](./quickstart.md)
- **Detailed Installation** → [installation.md](./installation.md)
- **Local Development** → [local-development.md](./local-development.md)
- **Testing Guide** → [testing-overview.md](./testing-overview.md)

## What You'll Learn

1. **Quickstart (5 minutes)** - Get the app running locally with copy-paste commands
2. **Installation (30 minutes)** - Detailed setup with all prerequisites
3. **Local Development (15 minutes)** - Development workflow, hot reload, debugging
4. **Testing (20 minutes)** - Run tests, write tests, test data

## Prerequisites

Before you begin, ensure you have:
- Node.js 18+ installed
- npm or yarn
- Git
- Supabase CLI (optional for local development)

## Architecture Overview

For system architecture, see:
- [ARCHITECTURE_V1.md](../02-architecture/ARCHITECTURE_V1.md) - Canonical V1 architecture
- [CURRENT_ARCHITECTURE.md](../../CURRENT_ARCHITECTURE.md) - High-level overview

## Getting Help

- **Development Guide:** [DEVELOPMENT_GUIDE.md](../../DEVELOPMENT_GUIDE.md)
- **Troubleshooting:** [TROUBLESHOOTING.md](../../TROUBLESHOOTING.md)
- **AI Agent Rules:** [AI_AGENT_QUICKSTART.md](../07-ai-development/AI_AGENT_QUICKSTART.md)

---

**Next:** Start with the [5-Minute Quickstart](./quickstart.md) →
```

---

### Document 2: quickstart.md

**File:** `docs/01-getting-started/quickstart.md`
**Effort:** 1-2 hours
**Priority:** 🔴 P0

**Outline:**
```markdown
---
Status: ACTIVE
Version: v1.0
Last Updated: 2025-01-19
Purpose: 5-minute quickstart guide with copy-paste commands
Audience: New Developers
---

# 5-Minute Quickstart

Get the Yodel ASO Insight app running locally in 5 minutes with copy-paste commands.

## Prerequisites

✅ Node.js 18+ installed
✅ npm installed
✅ Git installed

## Step 1: Clone Repository (30 seconds)

```bash
git clone [REPOSITORY_URL]
cd yodel-aso-insight
```

## Step 2: Install Dependencies (2 minutes)

```bash
npm install
```

## Step 3: Environment Setup (1 minute)

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your Supabase credentials
# SUPABASE_URL=https://[YOUR_PROJECT].supabase.co
# SUPABASE_ANON_KEY=[YOUR_ANON_KEY]
```

## Step 4: Run Development Server (30 seconds)

```bash
npm run dev
```

## Step 5: Open Browser (15 seconds)

Open http://localhost:5173 (or port shown in terminal)

## ✅ Success!

You should see the Yodel ASO Insight login page.

**Default Demo Account:**
- Email: demo@example.com (if demo mode enabled)
- OR: Use your Supabase test account

## Next Steps

- **Detailed Installation:** [installation.md](./installation.md)
- **Local Development Setup:** [local-development.md](./local-development.md)
- **Run Tests:** `npm test`

## Troubleshooting

**Port already in use?**
```bash
# Use different port
npm run dev -- --port 3000
```

**Dependencies fail?**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

**More issues?** See [Troubleshooting Guide](../../TROUBLESHOOTING.md)
```

---

### Document 3: installation.md

**File:** `docs/01-getting-started/installation.md`
**Effort:** 2-3 hours
**Priority:** 🔴 P0

**Outline:**
```markdown
---
Status: ACTIVE
Version: v1.0
Last Updated: 2025-01-19
Purpose: Detailed installation instructions for all platforms
Audience: New Developers
---

# Installation Guide

Complete installation guide for Yodel ASO Insight development environment.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [System Requirements](#system-requirements)
3. [Install Node.js](#install-nodejs)
4. [Install Git](#install-git)
5. [Install Supabase CLI](#install-supabase-cli)
6. [Clone Repository](#clone-repository)
7. [Install Dependencies](#install-dependencies)
8. [Environment Configuration](#environment-configuration)
9. [Database Setup](#database-setup)
10. [Verify Installation](#verify-installation)
11. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required
- **Node.js 18+** (includes npm)
- **Git** for version control
- **Supabase Account** (free tier okay)

### Recommended
- **VS Code** (recommended editor)
- **Supabase CLI** (for local database)
- **Docker** (for local Supabase)

## System Requirements

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| OS | macOS 10.15, Windows 10, Ubuntu 20.04 | Latest stable |
| RAM | 4 GB | 8 GB+ |
| Disk Space | 2 GB | 5 GB |
| Node.js | 18.0.0 | 20.x LTS |

## Install Node.js

### macOS
```bash
# Using Homebrew
brew install node@20

# Verify
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x
```

### Windows
```powershell
# Download from nodejs.org
# OR use nvm-windows

# Verify
node --version
npm --version
```

### Linux (Ubuntu/Debian)
```bash
# Using nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20

# Verify
node --version
npm --version
```

## Install Git

[Git installation instructions for all platforms]

## Install Supabase CLI (Optional)

```bash
# macOS
brew install supabase/tap/supabase

# Windows
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Linux
brew install supabase/tap/supabase

# Verify
supabase --version
```

## Clone Repository

[Repository cloning instructions]

## Install Dependencies

```bash
cd yodel-aso-insight
npm install
```

**Common Issues:**
- Node version mismatch → Use Node 18+
- Network timeout → Use `npm install --legacy-peer-deps`
- Permission denied → Don't use `sudo npm install`

## Environment Configuration

### 1. Create .env File

```bash
cp .env.example .env
```

### 2. Get Supabase Credentials

1. Go to https://supabase.com
2. Create project (or use existing)
3. Go to Project Settings → API
4. Copy:
   - Project URL → `SUPABASE_URL`
   - Anon/Public Key → `SUPABASE_ANON_KEY`

### 3. Configure .env

```bash
# .env file
SUPABASE_URL=https://[YOUR_PROJECT].supabase.co
SUPABASE_ANON_KEY=[YOUR_ANON_KEY]

# BigQuery (optional for local development)
BIGQUERY_PROJECT_ID=yodel-mobile-app
BIGQUERY_DATASET=aso_reports
```

## Database Setup

[Database setup instructions - link to schema docs]

## Verify Installation

```bash
# Run all verification checks
npm run verify

# Or manual checks:
npm run dev          # Should start dev server
npm test             # Should run tests
npm run build        # Should build successfully
```

## Troubleshooting

### Issue: Dependencies won't install

**Solution:**
```bash
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

### Issue: Environment variables not loading

**Solution:**
- Ensure .env file is in project root
- Restart dev server after changing .env
- Check for typos in variable names

[More troubleshooting scenarios]

## Next Steps

- **Local Development:** [local-development.md](./local-development.md)
- **Run Tests:** [testing-overview.md](./testing-overview.md)
- **Architecture:** [ARCHITECTURE_V1.md](../02-architecture/ARCHITECTURE_V1.md)
```

---

### Document 4: local-development.md

**File:** `docs/01-getting-started/local-development.md`
**Effort:** 2-3 hours
**Priority:** 🔴 P0

**Outline:**
```markdown
---
Status: ACTIVE
Version: v1.0
Last Updated: 2025-01-19
Purpose: Local development environment setup and workflow
Audience: Developers
---

# Local Development Guide

Complete guide to local development workflow for Yodel ASO Insight.

## Table of Contents

1. [Development Server](#development-server)
2. [Hot Reload Configuration](#hot-reload-configuration)
3. [Database Connection](#database-connection)
4. [Environment Modes](#environment-modes)
5. [Running Tests Locally](#running-tests-locally)
6. [Debugging Setup](#debugging-setup)
7. [Code Quality Tools](#code-quality-tools)
8. [Common Workflows](#common-workflows)

## Development Server

### Start Development Server

```bash
npm run dev
```

**Default:**
- URL: http://localhost:5173
- Hot reload: Enabled
- Source maps: Enabled

### Custom Port

```bash
npm run dev -- --port 3000
```

## Hot Reload Configuration

Hot reload is configured in `vite.config.ts`:

```typescript
// File: vite.config.ts
export default defineConfig({
  server: {
    watch: {
      usePolling: true,  // For Docker/WSL
    },
    hmr: {
      overlay: true,     // Show errors as overlay
    },
  },
});
```

**Troubleshooting Hot Reload:**
- Changes not reflecting → Clear browser cache
- Slow reload → Check for large files in src/
- Hot reload fails → Restart dev server

## Database Connection

### Option 1: Remote Supabase (Recommended for Development)

```bash
# .env
SUPABASE_URL=https://bkbcqocpjahewqjmlgvf.supabase.co
SUPABASE_ANON_KEY=[YOUR_KEY]
```

**Pros:**
- No local database setup needed
- Matches production environment
- Easy collaboration

**Cons:**
- Requires internet connection
- Shared database with team

### Option 2: Local Supabase (Advanced)

```bash
# Start local Supabase
supabase start

# Get local credentials
supabase status
```

**Pros:**
- Offline development
- Isolated database
- Fast queries

**Cons:**
- Requires Docker
- Initial setup time

## Environment Modes

### Development Mode (default)

```bash
npm run dev
```

Features:
- Hot reload enabled
- Source maps enabled
- Console logs visible
- Dev tools accessible

### Production Preview Mode

```bash
npm run build
npm run preview
```

Features:
- Production build
- No source maps
- Minified code
- Performance optimized

## Running Tests Locally

[Link to testing-overview.md for details]

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- src/components/AppSidebar.test.tsx
```

## Debugging Setup

### VS Code Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "chrome",
      "request": "launch",
      "name": "Debug Vite App",
      "url": "http://localhost:5173",
      "webRoot": "${workspaceFolder}/src"
    }
  ]
}
```

### Browser DevTools

**React DevTools:**
- Install: Chrome/Firefox extension
- Usage: Inspect component tree, props, state

**Network Tab:**
- Monitor API calls to Supabase
- Check BigQuery Edge Function calls
- Verify authentication headers

### Console Debugging

```typescript
// Debugging examples
console.log('User permissions:', permissions);
console.table(asoData);
console.group('Dashboard V2 Data Flow');
```

## Code Quality Tools

### ESLint

```bash
# Run linter
npm run lint

# Auto-fix issues
npm run lint -- --fix
```

### TypeScript Type Checking

```bash
# Check types
npm run type-check
```

### Prettier (if configured)

```bash
# Format code
npm run format
```

## Common Workflows

### Creating a New Feature

1. Create feature branch
2. Implement feature
3. Write tests
4. Run linter
5. Create PR

[Detailed workflow in DEVELOPMENT_GUIDE.md]

### Debugging BigQuery Issues

1. Check Edge Function logs in Supabase dashboard
2. Verify BigQuery credentials
3. Test query in BigQuery console
4. Check org_app_access RLS policy

### Fixing TypeScript Errors

[Common TypeScript error fixes]

## Next Steps

- **Testing:** [testing-overview.md](./testing-overview.md)
- **Development Guide:** [DEVELOPMENT_GUIDE.md](../../DEVELOPMENT_GUIDE.md)
- **Architecture:** [ARCHITECTURE_V1.md](../02-architecture/ARCHITECTURE_V1.md)
```

---

## README Creation Plan

### Overview

**Goal:** Create READMEs for all 11 sections lacking them
**Total Effort:** 8-12 hours (average 45 minutes per README)
**Priority:** 🟡 P1

**README Template Structure:**
```markdown
---
Status: ACTIVE
Version: v1.0
Last Updated: [DATE]
Purpose: [Section name] overview and navigation
Audience: [Target audience]
---

# [Section Name]

[2-3 sentence overview of section purpose]

## Contents

[Bulleted list of files in this section with 1-line descriptions]

## Quick Links

[Most commonly accessed files]

## Related Documentation

[Cross-references to related sections]

## Target Audience

[Who should read this section]
```

---

### README 1: docs/02-architecture/README.md

**Effort:** 45-60 minutes
**Priority:** 🟡 P1

**Outline:**
```markdown
# Architecture Documentation

This section contains system architecture, design decisions, and security compliance documentation for the Yodel ASO Insight platform V1 (current production).

## Contents

### Core Architecture
- **[ARCHITECTURE_V1.md](./ARCHITECTURE_V1.md)** ⭐ CANONICAL - Complete V1 production architecture (3,950 lines)

### System Design
- **[ORGANIZATION_ROLES_SYSTEM.md](./system-design/ORGANIZATION_ROLES_SYSTEM.md)** ⭐ CANONICAL - Organization roles, permissions, relationships (1,948 lines)
- **[auth_map.md](./system-design/auth_map.md)** - Authentication and RBAC map (⚠️ Needs rewrite for V1 patterns)
- **[authz_matrix.md](./system-design/authz_matrix.md)** - DEPRECATED: Old authorize function

### Security & Compliance
- **[ENCRYPTION_STATUS.md](./security-compliance/ENCRYPTION_STATUS.md)** - SOC 2/ISO 27001/GDPR compliance (Accuracy: 10/10)
- **[VALIDATION_STATUS.md](./security-compliance/VALIDATION_STATUS.md)** - DEPRECATED: ASO Intelligence validation

### Database (Planned)
- [database/schema-reference.md](./database/schema-reference.md) - Complete schema (TO BE CREATED)
- [database/erd-diagrams.md](./database/erd-diagrams.md) - ERD diagrams (TO BE CREATED)

## Quick Links

**Start Here:**
- [ARCHITECTURE_V1.md](./ARCHITECTURE_V1.md) - Single source of truth for V1

**For Developers:**
- Organization roles: [ORGANIZATION_ROLES_SYSTEM.md](./system-design/ORGANIZATION_ROLES_SYSTEM.md)
- Security compliance: [ENCRYPTION_STATUS.md](./security-compliance/ENCRYPTION_STATUS.md)

**For AI Agents:**
- Read [ARCHITECTURE_V1.md](./ARCHITECTURE_V1.md) first
- Then [AI_AGENT_QUICKSTART.md](../07-ai-development/AI_AGENT_QUICKSTART.md)

## Related Documentation

- **Features:** [docs/03-features/](../03-features/)
- **API Reference:** [docs/04-api-reference/](../04-api-reference/)
- **Workflows:** [docs/05-workflows/](../05-workflows/)

## Target Audience

- Developers (system understanding)
- Architects (design decisions)
- AI Agents (canonical reference)
- Compliance Auditors (security documentation)
```

---

### README 2: docs/03-features/README.md

**Effort:** 45-60 minutes
**Priority:** 🟡 P1

**Outline:**
```markdown
# Features Documentation

Active production features and in-development features for the Yodel ASO Insight platform.

## Production Features ✅

### Dashboard V2
**Status:** PRODUCTION
**Directory:** [dashboard-v2/](./dashboard-v2/)
**Key Docs:**
- [DATA_PIPELINE_AUDIT.md](./dashboard-v2/DATA_PIPELINE_AUDIT.md) ⭐ CANONICAL - Complete pipeline audit (1,269 lines)
- [BIGQUERY_QUICK_REFERENCE.md](./dashboard-v2/BIGQUERY_QUICK_REFERENCE.md) - BigQuery pipeline reference
- [QUICK_REFERENCE.md](./dashboard-v2/QUICK_REFERENCE.md) - Dashboard V2 components

### Reviews System
**Status:** PRODUCTION
**Directory:** [reviews/](./reviews/)
**Key Docs:**
- [README.md](./reviews/README.md) - Reviews system overview
- [ADR-reviews-system.md](./reviews/ADR-reviews-system.md) - Architecture decision record

### Super Admin
**Status:** PRODUCTION
**Directory:** [super-admin/](./super-admin/)
**Key Docs:**
- [QUICK_REFERENCE.md](./super-admin/QUICK_REFERENCE.md) - Super admin features

## In-Development Features 🚧

### Admin Panel
**Status:** IN DEVELOPMENT
**Directory:** [admin-panel/](./admin-panel/)
**Key Docs:**
- [README.md](./admin-panel/README.md) - Admin panel overview
- [API_ADMIN_USERS.md](./admin-panel/API_ADMIN_USERS.md) - Admin users API

### AI Chat
**Status:** IN DEVELOPMENT
**Directory:** [ai-chat/](./ai-chat/)
**Key Docs:**
- [QUICK_REFERENCE.md](./ai-chat/QUICK_REFERENCE.md) - AI chat quick reference
- [data-flow.md](./ai-chat/data-flow.md) - AI chat data flow

### ASO Intelligence
**Status:** IN DEVELOPMENT
**Directory:** [aso-intelligence/](./aso-intelligence/)
**Key Docs:**
- [README.md](./aso-intelligence/README.md) - ASO Intelligence overview

## Quick Start

**For Dashboard V2:**
1. Read [DATA_PIPELINE_AUDIT.md](./dashboard-v2/DATA_PIPELINE_AUDIT.md)
2. See [BIGQUERY_QUICK_REFERENCE.md](./dashboard-v2/BIGQUERY_QUICK_REFERENCE.md)

**For Reviews:**
1. Read [README.md](./reviews/README.md)

## Related Documentation

- **Architecture:** [docs/02-architecture/ARCHITECTURE_V1.md](../02-architecture/ARCHITECTURE_V1.md)
- **API Reference:** [docs/04-api-reference/](../04-api-reference/)
- **Workflows:** [docs/05-workflows/](../05-workflows/)

## Target Audience

- Product Managers (feature status)
- Developers (implementation details)
- QA Engineers (testing requirements)
```

---

### README 3: docs/03-features/dashboard-v2/README.md

**Effort:** 30-45 minutes
**Priority:** 🟡 P1

**Outline:**
```markdown
# Dashboard V2 Documentation

BigQuery-powered analytics dashboard (PRODUCTION).

## Overview

Dashboard V2 is the primary analytics interface showing ASO metrics from BigQuery data.

**Status:** ✅ PRODUCTION
**Data Source:** BigQuery (`yodel-mobile-app.aso_reports.aso_all_apple`)
**Features:**
- KPI trend charts (Search, Browse)
- Traffic source comparison
- Conversion funnel
- Delta calculations
- Agency-aware multi-tenant architecture

## Core Documentation

### ⭐ Canonical References

1. **[DATA_PIPELINE_AUDIT.md](./DATA_PIPELINE_AUDIT.md)** - Complete pipeline audit
   - **Lines:** 1,269
   - **Last Updated:** Jan 19, 2025
   - **Accuracy:** 9/10
   - **Use For:** Understanding complete data flow

### BigQuery Documentation

2. **[BIGQUERY_SCHEMA_AND_METRICS_MAP.md](./BIGQUERY_SCHEMA_AND_METRICS_MAP.md)** - Schema reference
   - **Lines:** 767
   - **Accuracy:** 6/10 (⚠️ Path errors - HIGH priority fix)
   - **Use For:** Understanding BigQuery table structure

3. **[BIGQUERY_QUICK_REFERENCE.md](./BIGQUERY_QUICK_REFERENCE.md)** - Quick reference
   - **Accuracy:** 7/10 (⚠️ Path errors - HIGH priority fix)
   - **Use For:** Quick data flow overview

4. **[BIGQUERY_RESEARCH_INDEX.md](./BIGQUERY_RESEARCH_INDEX.md)** - Documentation index
   - **Use For:** Navigation to all BigQuery docs

5. **[bigquery-integration.md](./bigquery-integration.md)** - Integration guide
   - **Accuracy:** 6/10 (⚠️ Missing security details)
   - **Use For:** BigQuery setup and integration

### Component Documentation

6. **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - Dashboard V2 quick reference
   - **Accuracy:** 8/10 (⚠️ Outdated limitations)
   - **Use For:** Component hierarchy, cache keys

## Quick Start

**Understand Dashboard V2 in 30 minutes:**
1. Read DATA_PIPELINE_AUDIT.md Executive Summary (5 min)
2. Skim BIGQUERY_SCHEMA_AND_METRICS_MAP.md (10 min)
3. Review QUICK_REFERENCE.md component hierarchy (5 min)
4. Check BIGQUERY_QUICK_REFERENCE.md data flow (10 min)

## Known Issues (Documented)

⚠️ **HIGH Priority:**
- BigQuery paths show `aso-reporting-1.client_reports` (WRONG)
- Correct: `yodel-mobile-app.aso_reports`
- See: Documentation_Improvement_Plan_Jan2025.md Phase 1

## Related Documentation

- **Architecture:** [ARCHITECTURE_V1.md](../../02-architecture/ARCHITECTURE_V1.md)
- **BigQuery Setup:** [bigquery-integration.md](./bigquery-integration.md)
- **Workflows:** [docs/05-workflows/](../../05-workflows/)

## Target Audience

- Developers (implementation)
- Data Engineers (pipeline understanding)
- Product Managers (feature understanding)
```

---

### README 4-11: Additional READMEs

**Similar structure for:**
- docs/03-features/ai-chat/README.md
- docs/03-features/super-admin/README.md
- docs/04-api-reference/README.md
- docs/05-workflows/README.md
- docs/06-design-system/README.md
- docs/08-troubleshooting/README.md
- docs/deprecated/README.md

**See [Document Structure Templates](#document-structure-templates) for additional outlines**

---

## Canonical Document Consolidation

### Overview

**Goal:** Eliminate conflicting documentation by establishing single canonical references
**Total Effort:** 10-14 hours
**Priority:** 🟢 P2

**Consolidation Principle:**
- ONE canonical document per topic
- Other docs either: (a) point to canonical, (b) cover different aspect, or (c) archived

---

### Consolidation 1: Architecture Documentation

**Issue:** 3 active architecture documents may conflict

**Current State:**
```
1. CURRENT_ARCHITECTURE.md (root, 2,000+ lines)
2. docs/02-architecture/ARCHITECTURE_V1.md (CANONICAL, 3,950+ lines)
3. docs/03-features/aso-intelligence/platform-architecture.md (feature-specific)
4. docs/deprecated/old-workflows/OLD_ARCHITECTURE.md (deprecated)
```

**Recommended Consolidation Plan:**

**Phase 1: Establish Canonical (DONE)**
- ✅ ARCHITECTURE_V1.md marked as canonical
- ✅ Comprehensive (3,950+ lines)
- ✅ Marked "Canonical: true" in lifecycle header

**Phase 2: Update CURRENT_ARCHITECTURE.md (P2 task)**
```
Option A: Convert to High-Level Overview
  - Reduce to 500-1000 lines (high-level only)
  - Add prominent link to ARCHITECTURE_V1.md for details
  - Purpose: Executive/stakeholder overview
  - Audience: Non-technical stakeholders, quick reference

Option B: Archive CURRENT_ARCHITECTURE.md
  - Move to docs/deprecated/
  - Update all references to point to ARCHITECTURE_V1.md
  - Simpler but loses high-level overview

Recommended: Option A (convert to overview)
```

**Phase 3: Update platform-architecture.md (P2 task)**
```
Action: Clarify scope
  - Add note: "This doc covers ASO Intelligence feature ONLY"
  - Add prominent link: "For system-wide architecture, see ARCHITECTURE_V1.md"
  - Ensure no system-wide architecture duplicated
  - Focus ONLY on ASO Intelligence specifics
```

**Phase 4: Verification**
```
- No conflicting information between docs
- All cross-references updated
- Clear canonical vs feature-specific distinction
```

**Success Criteria:**
- ✅ ARCHITECTURE_V1.md is clear canonical reference
- ✅ CURRENT_ARCHITECTURE.md either archived or high-level only
- ✅ platform-architecture.md clearly scoped to ASO Intelligence
- ✅ No duplicate system-wide architecture information

---

### Consolidation 2: Authorization Documentation

**Issue:** 2 authorization docs both describe deprecated patterns

**Current State:**
```
1. docs/02-architecture/system-design/auth_map.md (ACTIVE, needs rewrite)
2. docs/02-architecture/system-design/authz_matrix.md (DEPRECATED)
```

**Recommended Consolidation Plan:**

**Phase 1: Archive authz_matrix.md (P0 task - DONE in roadmap)**
```
Action: Move to docs/deprecated/old-authorization/
Reason: Entire doc describes unused 'authorize' Edge Function
```

**Phase 2: Create NEW authorization-v1.md (P1 task)**
```
File: docs/02-architecture/system-design/authorization-v1.md
Purpose: Canonical V1 authorization guide
Content:
  - user_roles as SSOT
  - user_permissions_unified view
  - usePermissions() hook
  - RLS policies
  - MFA enforcement
  - Session security
  - Audit logging
```

**Phase 3: Update or Archive auth_map.md (P1 task)**
```
Option A: Rewrite auth_map.md
  - Update to V1 patterns
  - Remove deprecated patterns
  - Add MFA, session security, audit logging

Option B: Archive auth_map.md and use authorization-v1.md
  - Simpler, cleaner
  - Single canonical reference

Recommended: Option B (create new authorization-v1.md)
```

**Success Criteria:**
- ✅ Single canonical authorization doc (authorization-v1.md)
- ✅ authz_matrix.md archived
- ✅ auth_map.md either rewritten or archived
- ✅ No references to deprecated authorize Edge Function as primary

---

### Consolidation 3: Permissions Documentation

**Issue:** Unclear relationship between 2 permission docs

**Current State:**
```
1. docs/04-api-reference/feature-permissions.md (elaborate system)
2. docs/07-ai-development/discovery/ui-permissions-discovery.md (discovery doc)
```

**Recommended Consolidation Plan:**

**Phase 1: Clarify Implementation Status (P2 task)**
```
Action for feature-permissions.md:
  - Determine if V1 PRODUCTION or V2 PLANNED
  - If V1: Cross-reference ARCHITECTURE_V1.md
  - If V2: Move to /planned-features/ or mark clearly
```

**Phase 2: Clarify Discovery Doc (P2 task)**
```
Action for ui-permissions-discovery.md:
  - Appears to be research/discovery document
  - If completed: Archive to /archive/discovery/
  - If in-progress: Mark status clearly
  - Add relationship note to feature-permissions.md
```

**Success Criteria:**
- ✅ Clear V1 vs V2 distinction
- ✅ Discovery doc clearly marked or archived
- ✅ No confusion about which to use

---

### Consolidation 4: Deployment Documentation

**Issue:** May have overlapping content

**Current State:**
```
1. DEPLOYMENT_CHECKLIST.md (root, checklist format)
2. docs/05-workflows/DEPLOYMENT.md (procedures)
```

**Recommended Consolidation Plan:**

**Phase 1: Review Content Overlap (P2 task)**
```
Action:
  - Read both files thoroughly
  - Identify duplicate vs complementary content
  - Determine if consolidation needed
```

**Phase 2: Clarify Purposes (P2 task)**
```
DEPLOYMENT_CHECKLIST.md:
  - Purpose: Pre-deployment checklist (step-by-step)
  - Format: Checkbox list
  - Audience: Deployers

DEPLOYMENT.md:
  - Purpose: Detailed deployment procedures (how-to)
  - Format: Instructional guide
  - Audience: DevOps, Developers

If purposes are distinct: Keep both, add cross-references
If purposes overlap: Consolidate into one
```

**Success Criteria:**
- ✅ Clear distinction between checklist vs procedures
- ✅ Cross-references added if both kept
- ✅ No duplicate deployment steps

---

### Consolidation 5: Development Documentation

**Issue:** Overlapping getting-started content

**Current State:**
```
1. DEVELOPMENT_GUIDE.md (root, comprehensive)
2. QUICK_START.md (root, quick guide)
3. docs/01-getting-started/ (section created in P0)
```

**Recommended Consolidation Plan:**

**Phase 1: Define Scope (P2 task)**
```
QUICK_START.md:
  - Keep at root (highly visible)
  - Purpose: 5-minute copy-paste commands
  - OR: Move to docs/01-getting-started/quickstart.md (already created)

DEVELOPMENT_GUIDE.md:
  - Keep at root (highly visible)
  - Purpose: Comprehensive development guide
  - Add cross-reference to docs/01-getting-started/

docs/01-getting-started/:
  - Purpose: Step-by-step onboarding (installation, local dev, testing)
  - Audience: New developers (0 → productive)
```

**Phase 2: Remove Duplication (P2 task)**
```
Action:
  - If QUICK_START.md duplicates docs/01-getting-started/quickstart.md:
    * Option A: Delete QUICK_START.md, keep in docs/
    * Option B: Keep QUICK_START.md as root link, point to docs/
  - Ensure DEVELOPMENT_GUIDE.md references docs/01-getting-started/
```

**Success Criteria:**
- ✅ Clear hierarchy: QUICK_START → Getting Started → DEVELOPMENT_GUIDE
- ✅ No duplicate getting-started content
- ✅ Cross-references clear

---

## Deprecated Document Plan

### Overview

**Goal:** Clear retention/removal plan for all deprecated documentation
**Total Effort:** 2-3 hours
**Priority:** 🟡 P1

**Retention Principle:**
- Keep if: Historical value, compliance requirement, learning reference
- Archive if: No longer relevant but has historical context
- Delete if: Duplicate, obsolete, no value

---

### Deprecated Files Inventory

**Current State:**
- docs/deprecated/ exists
- 25 markdown files in deprecated/ (expected ~27)
- **Missing:** docs/deprecated/README.md ❌

**Files Currently in Deprecated:**
```
docs/deprecated/
├── demo-mode/ (Demo mode being removed)
├── google-play/ (Google Play not in production)
├── keyword-tracking/ (Keyword tracking not implemented)
└── old-workflows/ (Old implementation plans)
```

**Files in Active Sections Marked DEPRECATED:**
```
1. docs/02-architecture/security-compliance/VALIDATION_STATUS.md
   - Status: DEPRECATED
   - Reason: Feature-specific validation not in production
   - Action: Move to docs/deprecated/validation-layer/

2. docs/02-architecture/system-design/authz_matrix.md
   - Status: DEPRECATED
   - Reason: Documents unused 'authorize' Edge Function
   - Action: Move to docs/deprecated/old-authorization/
```

---

### Retention Plan

#### KEEP in /deprecated/ (Historical Reference)

**Category 1: Deprecated Features (Not Implemented)**
```
Retention: PERMANENT (or 3-5 years)
Reason: Explain what was considered but not built

Files:
- docs/deprecated/keyword-tracking/* (keyword tracking feature)
- docs/deprecated/google-play/* (Google Play scraper)
- docs/deprecated/demo-mode/* (demo mode being removed)

Rationale:
  - Future developers may ask "why don't we have X?"
  - Shows what was considered and why rejected
  - Prevents re-proposing failed approaches
```

**Category 2: Old Implementation Patterns**
```
Retention: PERMANENT (or 3-5 years)
Reason: Show system evolution, prevent old patterns

Files:
- docs/deprecated/old-workflows/* (old implementation plans)
- docs/deprecated/old-authorization/authz_matrix.md (old authorize function)
- docs/deprecated/validation-layer/VALIDATION_STATUS.md (old validation)

Rationale:
  - Shows why current system evolved
  - Prevents reverting to old patterns
  - Learning reference for architecture decisions
```

#### MOVE to /archive/ (Completed Work)

**Candidates for Archive (not deprecated, completed):**
```
None currently in /deprecated/ belong in /archive/
Archive is for completed work, not deprecated features
```

#### DELETE (No Value)

**Candidates for Deletion:**
```
Criteria:
  - Duplicate of existing file
  - Completely obsolete with no historical value
  - Incorrect information with no learning value

Current Assessment: None identified yet
Recommendation: Review during cleanup, but keep most for historical reference
```

---

### Create docs/deprecated/README.md (P1 Task)

**File:** `docs/deprecated/README.md`
**Effort:** 30-45 minutes
**Priority:** 🟡 P1

**Outline:**
```markdown
---
Status: ACTIVE
Version: v1.0
Last Updated: 2025-01-19
Purpose: Deprecated features documentation overview
Audience: Developers, Historical Reference
---

# Deprecated Features Documentation

This directory contains documentation for features, systems, and patterns that are no longer in use but are kept for historical reference.

## Purpose

**Why keep deprecated documentation?**
1. **Historical Context:** Understand why features were deprecated
2. **Learning Reference:** Avoid repeating past mistakes
3. **Evolution Tracking:** See how the system evolved
4. **Future Proposals:** Check if ideas were tried before

**What NOT to use this for:**
- Current production documentation (see /docs/01-08/)
- Active feature implementation (see /docs/03-features/)

## Deprecated Categories

### 1. Keyword Tracking (Not Implemented)
**Directory:** [keyword-tracking/](./keyword-tracking/)
**Status:** Feature never implemented in production
**Reason:** Complexity vs value, de-prioritized
**Files:** ~6 files

### 2. Google Play (Not in Production)
**Directory:** [google-play/](./google-play/)
**Status:** Google Play scraper not implemented
**Reason:** iOS-only focus for V1
**Files:** ~4 files

### 3. Demo Mode (Being Removed)
**Directory:** [demo-mode/](./demo-mode/)
**Status:** Demo mode being phased out
**Reason:** Production-ready features don't need demo mode
**Files:** ~5 files

### 4. Old Workflows (Superseded)
**Directory:** [old-workflows/](./old-workflows/)
**Status:** Old implementation plans and patterns
**Reason:** Replaced by current V1 architecture
**Files:** ~8 files
**Key Files:**
  - OLD_ARCHITECTURE.md (superseded by ARCHITECTURE_V1.md)
  - FINAL_IMPLEMENTATION_PLAN.md (superseded)

### 5. Old Authorization (Superseded)
**Directory:** [old-authorization/](./old-authorization/) (NEW)
**Status:** Old authorize Edge Function pattern
**Reason:** Replaced by usePermissions() hook + RLS
**Files:** authz_matrix.md (moved from /02-architecture/)

### 6. Validation Layer (Not in Production)
**Directory:** [validation-layer/](./validation-layer/) (NEW)
**Status:** ASO Intelligence Layer validation
**Reason:** Feature-specific validation not in current production
**Files:** VALIDATION_STATUS.md (moved from /02-architecture/)

## Retention Policy

**Retention Period:** Indefinite (or 3-5 years)
**Review Frequency:** Annually
**Deletion Criteria:**
  - No historical value
  - Duplicate information
  - > 5 years old and irrelevant

## How to Use

**Before proposing a new feature:**
1. Check if similar feature was deprecated
2. Read why it was deprecated
3. Consider if circumstances changed

**When refactoring:**
1. Check if pattern was tried before
2. Read why it was deprecated
3. Avoid repeating mistakes

## Related Documentation

- **Current Architecture:** [ARCHITECTURE_V1.md](../02-architecture/ARCHITECTURE_V1.md)
- **Active Features:** [docs/03-features/](../03-features/)
- **Archive (Completed):** [docs/archive/](../archive/)

## Contributing

**When deprecating a feature:**
1. Move documentation to appropriate subdirectory here
2. Add lifecycle header with "Status: DEPRECATED"
3. Add "Superseded By" field pointing to replacement
4. Update this README with deprecation reason

---

**Last Updated:** 2025-01-19
**Maintained By:** Engineering Team
**Review Date:** 2026-01-19 (annual)
```

---

## Audience-Specific Requirements

### Developers

**Critical Gaps Identified:**
1. ❌ Empty docs/01-getting-started/ (P0 - addressed in roadmap)
2. ❌ No testing documentation (P1 - addressed in roadmap)
3. ❌ No database schema documentation (P1 - addressed in roadmap)
4. ⚠️ Incomplete API documentation (P2)

**Required Documentation:**

#### 1. Testing Documentation (P1 - CREATE)

**Files:**
```
docs/01-getting-started/testing-overview.md
docs/01-getting-started/unit-testing.md
docs/01-getting-started/integration-testing.md
docs/01-getting-started/e2e-testing.md
```

**Effort:** 8-10 hours total
**See:** [Document Structure Templates](#document-structure-templates) for detailed outlines

#### 2. Development Workflow (P2 - CREATE)

**Files Needed:**
```
docs/01-getting-started/git-workflow.md
  - Branching strategy (main, feature branches)
  - PR process (review requirements, approval)
  - Commit message conventions
  - Pre-commit hooks setup

docs/01-getting-started/code-review-checklist.md
  - Code review guidelines
  - What to check
  - When to approve vs request changes

docs/05-workflows/ci-cd-pipeline.md
  - GitHub Actions workflow
  - Build pipeline
  - Deployment pipeline
  - Environment promotion (staging → production)
```

**Effort:** 6-8 hours total

#### 3. Error Handling & Debugging (P2 - CREATE)

**Files Needed:**
```
docs/08-troubleshooting/common-errors.md
  - TypeScript errors
  - Supabase connection errors
  - BigQuery errors
  - Build errors

docs/08-troubleshooting/debugging-guide.md
  - VS Code debugging setup
  - Browser DevTools
  - React DevTools
  - Network debugging
```

**Effort:** 4-6 hours total

---

### AI Agents

**Critical Gaps Identified:**
1. ❌ No database schema documentation (P1 - addressed in roadmap)
2. ⚠️ Deprecated patterns not marked everywhere (P2)
3. ⚠️ Incomplete cross-references (P2)

**Required Documentation:**

#### 1. Database Schema Documentation (P1 - CREATE)

**Already addressed in P1.4 of roadmap**

**Files:**
```
docs/02-architecture/database/README.md
docs/02-architecture/database/schema-reference.md
docs/02-architecture/database/erd-diagrams.md
docs/02-architecture/database/migrations.md
```

**Effort:** 10-14 hours (see P1.4 task)

**Critical Requirements for AI Agents:**
- **Complete table list** with all columns
- **Column types, constraints, defaults**
- **Foreign key relationships**
- **Index information**
- **Table purposes** (1-2 sentences each)
- **DO NOT include:** RLS policies (in architecture docs), sensitive data

#### 2. API Endpoint Reference (P2 - CREATE)

**Files Needed:**
```
docs/04-api-reference/README.md (P1 - see README plan)

docs/04-api-reference/edge-functions-reference.md (P2 - NEW)
  - Complete list of all Edge Functions
  - Purpose of each function
  - Input parameters (schema)
  - Output format (schema)
  - Authentication requirements
  - Example requests/responses
  - Error codes

docs/04-api-reference/database-views-reference.md (P2 - NEW)
  - All database views
  - View purposes
  - View schemas
  - Usage examples
  - Performance considerations
```

**Effort:** 8-12 hours total

**Critical for AI Agents:**
- **Complete API surface area**
- **Request/response schemas**
- **Error code reference**
- **Authentication patterns**

#### 3. Contract Specifications (P2 - UPDATE)

**Files to Enhance:**
```
docs/04-api-reference/USER_ORGANIZATION_CONTRACT.md (already good - 9/10)
  - Add more code examples
  - Add error scenarios

docs/04-api-reference/feature-permissions.md
  - Clarify V1 vs V2 status
  - Add implementation examples if V1

NEW: docs/04-api-reference/bigquery-contract.md
  - BigQuery Edge Function contract
  - Input parameters (appId, dateRange, trafficSource)
  - Output schema
  - Error handling
  - Rate limiting
  - Cache behavior
```

**Effort:** 4-6 hours total

#### 4. Deprecation Markers Everywhere (P2 - UPDATE)

**Task:** Add lifecycle headers to remaining ~34 active files

**Files Without Lifecycle Headers:**
```
All files in docs/01-getting-started/ (NEW files will have headers)
All files in docs/06-design-system/
All files in docs/07-ai-development/ (some may have)
All files in docs/08-troubleshooting/
Root-level files (CURRENT_ARCHITECTURE.md, DEVELOPMENT_GUIDE.md, etc.)
```

**Effort:** 4-6 hours (average 5-10 minutes per file)

**Action:**
```
For each file:
1. Read file to understand status (ACTIVE/DEPRECATED/DRAFT)
2. Add lifecycle header at top
3. Include: Status, Version, Last Updated, Purpose, Audience
4. If deprecated: Add "Superseded By" field
5. Update Last Updated date
```

---

### Stakeholders / Product Managers

**Critical Gaps Identified:**
1. ❌ No product roadmap documentation (P2)
2. ❌ No metrics/analytics documentation (P2)
3. ❌ No user documentation/help center (P3 - long-term)
4. ✅ Good: YODEL_MOBILE_CONTEXT.md exists (business context)

**Required Documentation:**

#### 1. Product Roadmap (P2 - CREATE)

**Files Needed:**
```
docs/03-features/ROADMAP.md
  - V1 features (current production)
  - V2 features (next quarter)
  - V3 features (future)
  - Feature status dashboard
  - Release timeline

docs/03-features/RELEASE_NOTES.md
  - Version history
  - Feature releases
  - Bug fixes
  - Breaking changes
```

**Effort:** 4-6 hours total

**Outline for ROADMAP.md:**
```markdown
# Yodel ASO Insight - Product Roadmap

## V1 (Current Production)

### Dashboard V2 ✅ LAUNCHED
- BigQuery-powered analytics
- KPI trend charts
- Traffic source comparison
- Agency-aware architecture

### Reviews System ✅ LAUNCHED
- User review analysis
- Sentiment tracking

### Super Admin ✅ LAUNCHED
- Platform-wide administration
- User management
- Organization management

## V2 (Next 3-6 Months)

### Admin Panel APIs 🚧 IN DEVELOPMENT
- User management APIs
- Organization management APIs
- Audit logging APIs

### AI Chat 🚧 IN DEVELOPMENT
- Natural language queries
- Dashboard insights

### Dashboard V3 📋 PLANNED
- Enhanced visualizations
- Custom dashboards
- Export functionality

## V3 (Future - 6-12 Months)

### Advanced Analytics 💡 IDEA
- Predictive modeling
- Competitive intelligence
- A/B testing insights

### Mobile App 💡 IDEA
- iOS app
- Android app
- Push notifications

## Release Timeline

[Gantt chart or timeline visualization]
```

#### 2. Metrics & Analytics Guide (P2 - CREATE)

**Files Needed:**
```
docs/03-features/dashboard-v2/METRICS_GUIDE.md
  - KPI definitions (what each metric means)
  - Calculation formulas (how metrics calculated)
  - Data sources (where data comes from)
  - Update frequency (how often data refreshes)
  - Limitations (what metrics don't show)

docs/03-features/dashboard-v2/ANALYTICS_BEST_PRACTICES.md
  - How to read charts
  - Common analysis patterns
  - Interpretation guidelines
  - When to investigate anomalies
```

**Effort:** 6-8 hours total

**Critical for Stakeholders:**
- **Plain language explanations** (not technical)
- **Business impact** of each metric
- **How to use** for decision-making
- **Limitations and caveats**

#### 3. Feature Status Dashboard (P2 - CREATE)

**Files Needed:**
```
docs/03-features/FEATURE_STATUS.md
  - All features listed
  - Status: Production / In Development / Planned / Deprecated
  - Owner
  - Target launch date
  - Dependencies
```

**Effort:** 2-3 hours

**Example:**
```markdown
# Feature Status Dashboard

| Feature | Status | Owner | Target Launch | Notes |
|---------|--------|-------|---------------|-------|
| Dashboard V2 | ✅ PRODUCTION | Team A | Launched Q4 2024 | Stable |
| Reviews | ✅ PRODUCTION | Team B | Launched Q3 2024 | Stable |
| Admin Panel APIs | 🚧 IN DEV | Team C | Q1 2025 | 60% complete |
| AI Chat | 🚧 IN DEV | Team D | Q2 2025 | 30% complete |
| Dashboard V3 | 📋 PLANNED | TBD | Q2 2025 | Requirements complete |
```

---

### Data Scientists / Analysts

**Critical Gaps Identified:**
1. ❌ No data dictionary (P2 - addressed below)
2. ❌ No BigQuery query examples library (P2 - addressed below)
3. ❌ No data pipeline monitoring docs (P2 - addressed below)
4. ⚠️ BigQuery docs have path errors (P0 - addressed in roadmap)

**Required Documentation:**

#### 1. Data Dictionary (P2 - CREATE)

**File:** `docs/02-architecture/data-dictionary.md`
**Effort:** 6-8 hours
**Priority:** 🟢 P2

**Outline:**
```markdown
---
Status: ACTIVE
Version: v1.0
Last Updated: 2025-01-19
Purpose: Complete data dictionary for all fields and metrics
Audience: Data Scientists, Analysts, Product Managers
---

# Data Dictionary

Complete reference for all data fields, metrics, and calculations in Yodel ASO Insight.

## Table of Contents

1. [BigQuery Tables](#bigquery-tables)
2. [Metric Definitions](#metric-definitions)
3. [Calculated Fields](#calculated-fields)
4. [Dimensions](#dimensions)
5. [Data Quality Notes](#data-quality-notes)

## BigQuery Tables

### aso_all_apple

**Purpose:** Apple App Store ASO metrics (organic + paid traffic)

**Source:** BigQuery project: yodel-mobile-app, dataset: aso_reports

**Update Frequency:** Daily (updates at 6:00 AM UTC)

**Retention:** 2 years rolling window

**Fields:**

| Field | Type | Description | Example | Nullable | Notes |
|-------|------|-------------|---------|----------|-------|
| date | DATE | Metric reporting date | 2025-01-19 | No | Primary key component |
| app_id | STRING | Application identifier | com.example.app | No | Primary key component |
| traffic_source | STRING | Marketing channel | Search, Browse, Product Page, etc. | No | Primary key component |
| impressions | INTEGER | Product page impressions | 1234 | Yes | May be null for some traffic sources |
| product_page_views | INTEGER | Distinct product page views (PPV) | 567 | Yes | Renamed from ppv |
| downloads | INTEGER | App installations | 89 | Yes | First-time installs only |
| conversion_rate | FLOAT | Downloads / PPV | 0.156 | Yes | Calculated field |

**Primary Key:** (date, app_id, traffic_source)

## Metric Definitions

### Impressions
**Definition:** Number of times an app appears in search results or browse categories
**Calculation:** Raw count from Apple App Store Connect
**Business Meaning:** Visibility of your app
**Use For:** Brand awareness, discoverability analysis
**Limitations:**
  - Does NOT include app store home page impressions
  - May be underreported for browse traffic

### Product Page Views (PPV)
**Definition:** Number of times users view your app's product page
**Calculation:** Distinct user views (de-duplicated within 24 hours)
**Business Meaning:** Interest in your app
**Use For:** Funnel analysis, creative optimization
**Limitations:**
  - De-duplication window is 24 hours
  - Organic and paid views are combined

### Downloads
**Definition:** Number of first-time app installations
**Calculation:** Raw count from Apple App Store Connect
**Business Meaning:** Acquisition
**Use For:** Conversion optimization, ROI analysis
**Limitations:**
  - Does NOT include re-downloads
  - Does NOT include updates
  - May have 24-48 hour reporting delay

### Conversion Rate
**Definition:** Percentage of product page viewers who download
**Calculation:** `downloads / product_page_views`
**Business Meaning:** How compelling your product page is
**Use For:** Creative optimization, A/B testing
**Limitations:**
  - Null if PPV = 0
  - Does not account for time lag between view and download

## Calculated Fields

### Delta (Change)
**Definition:** Difference between current period and comparison period
**Calculation:** `current_value - comparison_value`
**Example:** Today's downloads - Yesterday's downloads
**Use For:** Trend analysis

### Delta Percentage (% Change)
**Definition:** Percentage change between periods
**Calculation:** `((current - comparison) / comparison) * 100`
**Example:** `((today_downloads - yesterday_downloads) / yesterday_downloads) * 100`
**Use For:** Relative performance comparison
**Limitations:**
  - Undefined if comparison value is 0
  - Can be misleading for small absolute values

## Dimensions

### Traffic Source
**Values:**
- **Search:** Users found app via search
- **Browse:** Users found app via browse categories
- **Product Page:** Direct traffic to product page
- **Referrers:** Traffic from external websites
- **Other:** Miscellaneous sources

**Use For:** Channel analysis, attribution

### Time Dimensions
- **Date:** Daily granularity
- **Week:** ISO week (Monday-Sunday)
- **Month:** Calendar month
- **Quarter:** Calendar quarter

## Data Quality Notes

### Known Limitations

1. **Data Freshness:** 24-48 hour delay from Apple
2. **Missing Data:** Some traffic sources may have null impressions
3. **De-duplication:** PPV de-duplicated within 24-hour windows only
4. **Attribution:** Last-touch attribution only

### Data Validation Rules

1. `conversion_rate` should be ≤ 1.0 (100%)
2. `downloads` ≤ `product_page_views` (logical constraint)
3. `impressions` ≥ `product_page_views` (funnel constraint)

### Handling Nulls

- **Impressions NULL:** Treat as 0 for aggregations
- **PPV NULL:** Cannot calculate conversion rate
- **Downloads NULL:** Treat as 0 for aggregations

## Related Documentation

- **BigQuery Schema:** [BIGQUERY_SCHEMA_AND_METRICS_MAP.md](../03-features/dashboard-v2/BIGQUERY_SCHEMA_AND_METRICS_MAP.md)
- **Data Pipeline:** [DATA_PIPELINE_AUDIT.md](../03-features/dashboard-v2/DATA_PIPELINE_AUDIT.md)
- **Query Examples:** [bigquery-query-examples.md](../04-api-reference/bigquery-query-examples.md)
```

#### 2. BigQuery Query Examples Library (P2 - CREATE)

**File:** `docs/04-api-reference/bigquery-query-examples.md`
**Effort:** 4-6 hours
**Priority:** 🟢 P2

**Outline:**
```markdown
# BigQuery Query Examples Library

Common query patterns for Yodel ASO Insight BigQuery data.

## Basic Queries

### 1. Daily Downloads by App
```sql
SELECT
  date,
  app_id,
  SUM(downloads) AS total_downloads
FROM `yodel-mobile-app.aso_reports.aso_all_apple`
WHERE date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
GROUP BY date, app_id
ORDER BY date DESC, total_downloads DESC;
```

### 2. Conversion Rate by Traffic Source
```sql
SELECT
  traffic_source,
  SUM(downloads) AS total_downloads,
  SUM(product_page_views) AS total_ppv,
  SAFE_DIVIDE(SUM(downloads), SUM(product_page_views)) AS conversion_rate
FROM `yodel-mobile-app.aso_reports.aso_all_apple`
WHERE date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
GROUP BY traffic_source
ORDER BY conversion_rate DESC;
```

## Advanced Queries

### 3. Week-over-Week Comparison
[Example query with LAG function]

### 4. Rolling 7-Day Average
[Example query with window functions]

### 5. Traffic Source Attribution
[Example query showing traffic source breakdown]

## Performance Optimization

### Tips:
1. Always include date filters (partition column)
2. Use app_id filter when possible (cluster column)
3. Avoid SELECT * (specify columns)
4. Use LIMIT for testing

### Cost Estimation
[Examples showing query cost estimation]
```

#### 3. Data Pipeline Monitoring (P2 - CREATE)

**File:** `docs/05-workflows/data-pipeline-monitoring.md`
**Effort:** 4-6 hours
**Priority:** 🟢 P2

**Outline:**
```markdown
# Data Pipeline Monitoring

How to monitor data pipeline health and freshness.

## Data Freshness SLAs

| Data Source | Update Frequency | Expected Latency | SLA |
|-------------|------------------|------------------|-----|
| BigQuery aso_all_apple | Daily | 24-48 hours | 99.5% |
| Supabase user_roles | Real-time | < 1 second | 99.9% |
| Organization settings | Real-time | < 1 second | 99.9% |

## Pipeline Failure Alerting

[How to check if pipeline is failing]

## Data Quality Checks

[Automated quality checks run on pipeline]

## Historical Data Availability

[Data retention policies, when data is available]
```

---

## Document Structure Templates

### Template 1: Testing Documentation

#### testing-overview.md

**File:** `docs/01-getting-started/testing-overview.md`
**Effort:** 2-3 hours

**Outline:**
```markdown
---
Status: ACTIVE
Version: v1.0
Last Updated: 2025-01-19
Purpose: Testing overview and philosophy
Audience: Developers
---

# Testing Overview

Testing strategy and philosophy for Yodel ASO Insight.

## Testing Philosophy

**Goals:**
- Prevent regressions
- Document expected behavior
- Enable confident refactoring
- Catch bugs early

**Principles:**
- Write tests for all new features
- Maintain > 80% code coverage
- Test behavior, not implementation
- Keep tests fast and isolated

## Test Types

### 1. Unit Tests
**Purpose:** Test individual functions and components
**Framework:** Vitest + React Testing Library
**Coverage:** 80%+ target
**Run Time:** < 10 seconds

**See:** [unit-testing.md](./unit-testing.md)

### 2. Integration Tests
**Purpose:** Test feature workflows
**Framework:** Vitest + React Testing Library
**Coverage:** Critical user flows
**Run Time:** < 30 seconds

**See:** [integration-testing.md](./integration-testing.md)

### 3. E2E Tests
**Purpose:** Test full application workflows
**Framework:** Playwright
**Coverage:** Happy paths + critical flows
**Run Time:** 2-5 minutes

**See:** [e2e-testing.md](./e2e-testing.md)

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- src/components/AppSidebar.test.tsx

# Run with coverage
npm test -- --coverage
```

## Test Structure

**Arrange-Act-Assert Pattern:**
```typescript
describe('ComponentName', () => {
  it('should do expected behavior', () => {
    // Arrange: Set up test data
    const props = { ... };

    // Act: Perform action
    render(<ComponentName {...props} />);

    // Assert: Check result
    expect(screen.getByText('Expected')).toBeInTheDocument();
  });
});
```

## Coverage Requirements

| Type | Target |
|------|--------|
| Overall | 80%+ |
| Critical Features | 90%+ |
| Utils/Helpers | 95%+ |
| UI Components | 70%+ |

## CI/CD Integration

Tests run automatically on:
- Every commit (pre-commit hook)
- Every pull request (GitHub Actions)
- Before deployment (CI pipeline)

## Next Steps

- **Unit Testing:** [unit-testing.md](./unit-testing.md)
- **Integration Testing:** [integration-testing.md](./integration-testing.md)
- **E2E Testing:** [e2e-testing.md](./e2e-testing.md)
```

#### unit-testing.md

**Outline:**
```markdown
# Unit Testing Guide

## Setup

[Vitest configuration, React Testing Library setup]

## Writing Unit Tests

### Testing React Components

```typescript
import { render, screen } from '@testing-library/react';
import { AppSidebar } from './AppSidebar';

describe('AppSidebar', () => {
  it('renders navigation links', () => {
    render(<AppSidebar />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });
});
```

### Testing Utility Functions

[Examples of testing pure functions]

### Testing Hooks

[Examples of testing custom hooks]

## Mocking

### Mocking Supabase

[Example of mocking Supabase client]

### Mocking usePermissions Hook

[Example of mocking permissions]

## Best Practices

1. Test behavior, not implementation
2. Use descriptive test names
3. Keep tests isolated
4. Avoid testing implementation details
5. Use data-testid sparingly

## Common Patterns

[Common testing patterns with examples]
```

---

### Template 2: Database Schema Documentation

#### schema-reference.md

**File:** `docs/02-architecture/database/schema-reference.md`
**Effort:** 6-8 hours

**Outline:**
```markdown
---
Status: ACTIVE
Version: v1.0
Last Updated: 2025-01-19
Purpose: Complete database schema reference
Canonical: true
Audience: Developers, AI Agents, Database Administrators
---

# Database Schema Reference

Complete PostgreSQL schema reference for Yodel ASO Insight (V1 Production).

## Overview

**Database:** PostgreSQL 15+ (Supabase)
**Total Tables:** 15+ (production tables)
**Schema Version:** V1 (current production)

**Table Categories:**
- Core Tables: users, organizations, user_roles
- Access Control: org_app_access, agency_clients
- ASO Data: (BigQuery, not in Postgres)
- Feature Tables: reviews, mfa_enforcement, audit_logs
- Metadata: app_metadata, app_screenshots

## Core Tables

### users

**Purpose:** User accounts (managed by Supabase Auth)

**Schema:**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Columns:**
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | No | uuid_generate_v4() | Primary key, user identifier |
| email | TEXT | No | - | User email address (unique) |
| created_at | TIMESTAMPTZ | No | NOW() | Account creation timestamp |
| updated_at | TIMESTAMPTZ | No | NOW() | Last update timestamp |

**Indexes:**
- PRIMARY KEY: id
- UNIQUE: email

**RLS Policies:** See [ARCHITECTURE_V1.md](../ARCHITECTURE_V1.md)

**Relationships:**
- user_roles.user_id → users.id (many-to-one)
- mfa_enforcement.user_id → users.id (one-to-one)

### organizations

**Purpose:** Organization/company accounts

**Schema:**
```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

[Continue for all tables...]

## Views

### user_permissions_unified

**Purpose:** Stable API contract for user permissions

**Schema:**
```sql
CREATE VIEW user_permissions_unified AS
SELECT
  ur.user_id,
  ur.organization_id,
  ur.role,
  o.name AS organization_name,
  -- Permission flags
  (ur.role IN ('admin', 'super_admin')) AS is_org_admin,
  (ur.role = 'super_admin') AS is_super_admin,
  -- Feature permissions
  ...
FROM user_roles ur
JOIN organizations o ON ur.organization_id = o.id;
```

**Used By:** usePermissions() hook (frontend)

[Continue for all views...]

## Data Types

### Custom Types/Enums

```sql
CREATE TYPE user_role AS ENUM ('viewer', 'analyst', 'admin', 'super_admin');
```

## Indexes

[List all non-primary-key indexes with purpose]

## Foreign Keys

[List all foreign key relationships]

## Constraints

[List all check constraints]

## Performance Notes

[Index usage, query optimization notes]

## Related Documentation

- **ERD Diagrams:** [erd-diagrams.md](./erd-diagrams.md)
- **Migrations:** [migrations.md](./migrations.md)
- **RLS Policies:** [ARCHITECTURE_V1.md](../ARCHITECTURE_V1.md)
```

---

## Approval Gate

### Overview

**Purpose:** Formal review and approval before content rewriting begins
**Required For:** All P0, P1, P2 tasks involving content creation or major updates
**Approval Authority:** Engineering Lead, Product Manager, Documentation Maintainer

---

### Approval Criteria

#### P0 Tasks (Must Approve Before Execution)

**P0.1: BigQuery Path Fixes**
- ✅ Reviewed by: Data Engineer or Engineering Lead
- ✅ Verified: Correct paths (yodel-mobile-app.aso_reports)
- ✅ Risk Assessment: Low (find/replace only)
- ✅ Rollback Plan: Git revert if issues found

**P0.2: Populate Getting-Started**
- ✅ Reviewed by: Engineering Lead
- ✅ Content Accuracy: Installation steps verified
- ✅ Tested: Quickstart guide completed in ≤ 5 minutes
- ✅ Cross-References: Links to other docs verified

**P0.3: Move Deprecated Files**
- ✅ Reviewed by: Documentation Maintainer
- ✅ Verified: Files marked DEPRECATED correctly
- ✅ Checked: Superseded By links correct
- ✅ Impact: No broken links

**P0.4: Remove Empty Directories**
- ✅ Reviewed by: Any team member
- ✅ Verified: Directories are actually empty
- ✅ Risk: None (safe to execute)

---

#### P1 Tasks (Must Approve Before Starting)

**P1.1: Create Missing READMEs**
- ✅ Reviewed by: Documentation Maintainer
- ✅ Template Approved: README structure consistent
- ✅ Cross-References: All links verified
- ✅ Content Outline: Approved for each README

**P1.2: Rewrite Authorization Documentation**
- ✅ Reviewed by: Engineering Lead + Security Lead
- ✅ Accuracy: V1 patterns verified (usePermissions() hook)
- ✅ Security: MFA, session security, audit logging verified
- ✅ Code Examples: Tested and working

**P1.3: Create Testing Documentation**
- ✅ Reviewed by: QA Lead or Engineering Lead
- ✅ Frameworks: Vitest, React Testing Library, Playwright confirmed
- ✅ Examples: Tested and working
- ✅ Coverage: Requirements defined

**P1.4: Create Database Schema Documentation**
- ✅ Reviewed by: Database Administrator or Engineering Lead
- ✅ Schema Accuracy: All tables, columns, types verified
- ✅ ERD Diagrams: Reviewed for correctness
- ✅ Migration History: Verified

---

#### P2 Tasks (Approval Before Content Creation)

**All P2 Tasks:**
- ✅ Reviewed by: Documentation Maintainer
- ✅ Priority Confirmed: Still P2 priority?
- ✅ Effort Estimate: Confirmed reasonable
- ✅ Content Outline: Approved

---

### Approval Process

#### Step 1: Pre-Approval (Before Starting Task)

**Checklist:**
- [ ] Task outlined in this roadmap
- [ ] Effort estimate confirmed
- [ ] Priority level confirmed (P0/P1/P2)
- [ ] Assigned to team member
- [ ] Dependencies identified
- [ ] Success criteria defined

**Approval:** Engineering Lead or Documentation Maintainer

---

#### Step 2: Content Review (After Draft Created)

**For CREATE tasks:**
- [ ] Draft document created
- [ ] Lifecycle header included
- [ ] Cross-references verified
- [ ] Technical accuracy reviewed
- [ ] Code examples tested (if applicable)
- [ ] Spelling/grammar checked

**For UPDATE tasks:**
- [ ] Changes identified (before/after)
- [ ] Impact assessed (what else might break)
- [ ] Cross-references updated
- [ ] Lifecycle header updated (Last Updated date)

**Approval:** Subject Matter Expert + Documentation Maintainer

---

#### Step 3: Final Approval (Before Merge/Deploy)

**Checklist:**
- [ ] All review comments addressed
- [ ] Success criteria met
- [ ] Related docs updated (cross-references)
- [ ] No broken links
- [ ] Commit message clear and descriptive
- [ ] PR created with documentation changes only

**Approval:** Engineering Lead

---

### Approval Sign-Off Template

**Use this template for each task approval:**

```markdown
## [Task ID]: [Task Name]

**Date:** [Date]
**Reviewer:** [Name]
**Status:** ✅ APPROVED / ❌ REJECTED / ⚠️ NEEDS CHANGES

### Review Checklist

- [ ] Content outline approved
- [ ] Technical accuracy verified
- [ ] Cross-references checked
- [ ] Examples tested (if applicable)
- [ ] Success criteria met
- [ ] No broken links
- [ ] Lifecycle header included

### Comments

[Reviewer comments here]

### Approval Decision

✅ APPROVED - Proceed with task
❌ REJECTED - Do not proceed, see comments
⚠️ NEEDS CHANGES - Address comments and re-submit

**Approver Signature:** [Name]
**Date:** [Date]
```

---

### Gating Criteria

**Tasks CANNOT proceed without approval if:**
- ❌ Technical inaccuracies identified
- ❌ Conflicts with canonical documentation
- ❌ Broken cross-references
- ❌ Code examples don't work
- ❌ Success criteria not met

**Tasks MAY proceed with minor issues if:**
- ⚠️ Minor typos (can fix later)
- ⚠️ Optional sections incomplete (can add later)
- ⚠️ Nice-to-have examples missing (can add later)

---

## Success Metrics

### Documentation Health Scorecard

**Current State (from audit):** 6.8/10
**Target After P0:** 7.5/10
**Target After P1:** 8.5/10
**Target After P2:** 9.0/10

**Metrics:**

| Metric | Current | After P0 | After P1 | After P2 | Target |
|--------|---------|----------|----------|----------|--------|
| **Structure** | 8/10 | 9/10 | 10/10 | 10/10 | 10/10 |
| **Organization** | 7/10 | 9/10 | 9/10 | 9/10 | 9/10 |
| **Completeness** | 5/10 | 6/10 | 8/10 | 9/10 | 9/10 |
| **Accuracy** | 6/10 | 8/10 | 9/10 | 9/10 | 9/10 |
| **Discoverability** | 4/10 | 5/10 | 8/10 | 9/10 | 9/10 |
| **Lifecycle Headers** | 10/10 | 10/10 | 10/10 | 10/10 | 10/10 |
| **Canonical Docs** | 9/10 | 9/10 | 10/10 | 10/10 | 10/10 |
| **Cross-References** | 6/10 | 6/10 | 8/10 | 9/10 | 9/10 |
| **Freshness** | 9/10 | 9/10 | 10/10 | 10/10 | 10/10 |
| **Overall** | **6.8/10** | **7.5/10** | **8.5/10** | **9.0/10** | **9.0/10** |

---

### Completion Tracking

#### P0 Tasks (This Week)

| Task | Effort | Status | Complete |
|------|--------|--------|----------|
| P0.1: Fix BigQuery Paths | 2-4h | Not Started | ☐ |
| P0.2: Populate Getting-Started | 6-8h | Not Started | ☐ |
| P0.3: Move Deprecated Files | 30m | Not Started | ☐ |
| P0.4: Remove Empty Directories | 5m | Not Started | ☐ |

**Total P0 Effort:** 10-14 hours

---

#### P1 Tasks (Next 2 Weeks)

| Task | Effort | Status | Complete |
|------|--------|--------|----------|
| P1.1: Create Missing READMEs | 8-12h | Not Started | ☐ |
| P1.2: Rewrite Authorization Docs | 8-12h | Not Started | ☐ |
| P1.3: Create Testing Docs | 8-10h | Not Started | ☐ |
| P1.4: Create Database Schema Docs | 10-14h | Not Started | ☐ |

**Total P1 Effort:** 34-48 hours

---

#### P2 Tasks (Next Month)

| Task | Effort | Status | Complete |
|------|--------|--------|----------|
| P2.1: Add Security Sections | 6-8h | Not Started | ☐ |
| P2.2: Clarify V1 vs V2/V3 | 3-4h | Not Started | ☐ |
| P2.3: Consolidate Overlapping Docs | 10-14h | Not Started | ☐ |
| P2.4: Create Data Science Docs | 14-18h | Not Started | ☐ |
| P2.5: Expand Incomplete Docs | 6-8h | Not Started | ☐ |

**Total P2 Effort:** 39-52 hours

---

**Grand Total Effort:** 83-114 hours (documentation only)

---

## Implementation Timeline

### Week 1 (Jan 20-26, 2025): P0 Tasks

**Monday-Tuesday:**
- P0.1: Fix BigQuery Paths (2-4h)
- P0.3: Move Deprecated Files (30m)
- P0.4: Remove Empty Directories (5m)

**Wednesday-Friday:**
- P0.2: Populate Getting-Started (6-8h)
  - Day 1: README.md + quickstart.md
  - Day 2: installation.md
  - Day 3: local-development.md

**Deliverables:**
- ✅ Zero BigQuery path errors
- ✅ 4 getting-started docs created
- ✅ 2 deprecated files moved
- ✅ 2 empty directories removed

---

### Weeks 2-3 (Jan 27 - Feb 9, 2025): P1 Tasks

**Week 2:**
- P1.1: Create Missing READMEs (8-12h)
  - 11 READMEs across sections

**Week 3:**
- P1.2: Rewrite Authorization Docs (8-12h)
- P1.3: Create Testing Docs (8-10h)
- P1.4: Create Database Schema Docs (10-14h)

**Deliverables:**
- ✅ 11 README files created
- ✅ New authorization-v1.md created
- ✅ 4 testing docs created
- ✅ 4 database schema docs created

---

### Weeks 4-7 (Feb 10 - Mar 10, 2025): P2 Tasks

**Week 4:**
- P2.1: Add Security Sections (6-8h)
- P2.2: Clarify V1 vs V2/V3 (3-4h)

**Week 5-6:**
- P2.3: Consolidate Overlapping Docs (10-14h)
- P2.4: Create Data Science Docs (14-18h)

**Week 7:**
- P2.5: Expand Incomplete Docs (6-8h)
- Final review and cleanup

**Deliverables:**
- ✅ 5 files updated with security sections
- ✅ 2 files clarified (V1 vs V2)
- ✅ 5 consolidation projects completed
- ✅ 4 data science docs created
- ✅ 3 incomplete docs expanded

---

## Appendix A: Quick Reference

### File Creation Priority

**P0 (This Week):**
- docs/01-getting-started/README.md
- docs/01-getting-started/quickstart.md
- docs/01-getting-started/installation.md
- docs/01-getting-started/local-development.md

**P1 (Next 2 Weeks):**
- 11 README files across sections
- docs/02-architecture/system-design/authorization-v1.md
- 4 testing documentation files
- 4 database schema documentation files

**P2 (Next Month):**
- docs/02-architecture/data-dictionary.md
- docs/04-api-reference/bigquery-query-examples.md
- docs/05-workflows/data-pipeline-monitoring.md
- docs/deprecated/README.md
- Various expansions and consolidations

---

## Appendix B: Effort Estimates Summary

| Phase | Tasks | Total Effort | Timeline |
|-------|-------|--------------|----------|
| P0 | 4 tasks | 10-14 hours | 1 week |
| P1 | 4 tasks | 34-48 hours | 2 weeks |
| P2 | 5 tasks | 39-52 hours | 1 month |
| **Total** | **13 tasks** | **83-114 hours** | **6-8 weeks** |

**Assumptions:**
- 1 full-time documentation writer
- 20 hours/week dedicated to documentation
- Includes review time
- Excludes content rewrites (future phase)

---

**Roadmap Version:** v2.0
**Last Updated:** 2025-01-19
**Next Review:** After P0 completion (January 26, 2025)
**Maintained By:** Engineering Team
**Contact:** See main [README.md](../README.md) for support

---

**End of Roadmap**
