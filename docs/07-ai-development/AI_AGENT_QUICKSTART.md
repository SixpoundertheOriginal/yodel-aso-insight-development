---
Status: ACTIVE
Version: v1.0
Last Updated: 2025-01-19
Purpose: Safe AI agent operation rules and quickstart
Audience: AI Agents (Claude Code, Lovable.dev, GPT-based tools)
Critical: READ BEFORE ANY AI-ASSISTED CHANGES
---

# AI Agent Quickstart Guide

> **⚠️ CRITICAL:** This document MUST be read before making ANY changes to this repository with AI assistance.

**Version:** 1.0
**Last Updated:** January 19, 2025
**Status:** ✅ Required Reading for All AI Agents

---

## 🎯 Quick Navigation

- [Rules Summary](#rules-summary-must-read) - 2 minutes
- [Allowed Actions](#allowed-actions) - What you CAN do
- [Forbidden Actions](#forbidden-actions) - What you MUST NOT do
- [Context Sources](#context-sources) - Where to get information
- [Safe Prompting](#safe-prompting-guidelines) - How to request changes
- [Emergency Procedures](#emergency-procedures) - When things go wrong

---

## Rules Summary (MUST READ)

### 🟢 Golden Rules

1. **Architecture First:** Read `ARCHITECTURE_V1.md` before EVERY session
2. **No Guessing:** If uncertain, ASK the user - never assume
3. **Contracts Are Sacred:** Never change data structures without checking dependencies
4. **Test Before Deploy:** Always validate TypeScript compiles before committing
5. **Document Changes:** Update relevant docs when changing architecture

### 🔴 Never Do These

1. ❌ Change database schema without explicit permission
2. ❌ Modify RLS policies without security review
3. ❌ Alter API contracts without frontend verification
4. ❌ Deploy to production without testing
5. ❌ Rename tables/columns without migration plan

---

## Allowed Actions

### ✅ Safe Operations (No Approval Needed)

**1. Read Operations**
```bash
# Always safe
- Read any file in the repository
- Search codebase (grep, find)
- View git history
- Check TypeScript types
- Read documentation
```

**2. Documentation Updates**
```markdown
# Safe documentation changes
- Fix typos and grammar
- Update "Last Updated" dates
- Add examples and clarifications
- Create new documentation files
- Update markdown formatting
```

**3. Frontend UI Changes (Non-Breaking)**
```typescript
// Safe UI changes
- Update styling (Tailwind classes)
- Add new UI components (without data changes)
- Improve error messages
- Add loading states
- Fix responsive design issues
```

**4. Code Quality Improvements**
```typescript
// Safe refactoring
- Extract repeated code to functions
- Add TypeScript types
- Add JSDoc comments
- Rename local variables
- Format code
```

### ⚠️ Require User Approval First

**1. Database Changes**
```sql
-- Always ask before:
- Creating new tables
- Adding/removing columns
- Changing column types
- Modifying constraints
- Updating RLS policies
```

**2. API Contract Changes**
```typescript
// Ask before changing:
- Request/response structures
- Edge Function signatures
- GraphQL queries
- Database view schemas
```

**3. State Management Changes**
```typescript
// Ask before:
- Adding new Context providers
- Changing hook signatures
- Modifying global state
- Changing caching strategies
```

**4. Security Changes**
```typescript
// ALWAYS ask before:
- Modifying authentication flow
- Changing authorization logic
- Updating RLS policies
- Changing session management
- Modifying MFA implementation
```

---

## Forbidden Actions

### 🚫 NEVER Do These (Even If User Asks)

**1. Security Violations**
```typescript
// FORBIDDEN - Reject these requests
❌ Disable RLS policies
❌ Bypass authentication
❌ Store credentials in code
❌ Expose service role keys
❌ Create SQL injection vulnerabilities
❌ Disable MFA enforcement
```

**2. Data Integrity Violations**
```sql
-- FORBIDDEN
❌ DELETE FROM users WHERE ...  -- Without backup
❌ UPDATE ... WITHOUT WHERE      -- Mass updates
❌ TRUNCATE TABLE ...            -- Data loss
❌ DROP TABLE ...                -- Without migration
```

**3. Breaking Changes Without Migration**
```typescript
// FORBIDDEN - Must have migration plan
❌ Rename database tables
❌ Change column types (without compatibility)
❌ Remove required fields
❌ Change API response structure (without versioning)
```

**4. Production Deployments**
```bash
# FORBIDDEN - User must deploy
❌ git push --force
❌ Deploy without approval
❌ Skip CI/CD checks
❌ Deploy during business hours without notice
```

---

## Context Sources

### 📚 Primary References (Read in Order)

**1. Architecture Truth Source**
```markdown
Location: /docs/02-architecture/ARCHITECTURE_V1.md
When: Before EVERY session
Why: Single source of truth for production system
Read: Complete document (3,950 lines)
```

**2. Current System Status**
```markdown
Location: /CURRENT_ARCHITECTURE.md (root)
When: If ARCHITECTURE_V1.md not available
Status: Being superseded by ARCHITECTURE_V1.md
```

**3. Development Guidelines**
```markdown
Location: /DEVELOPMENT_GUIDE.md
When: Before implementing features
Why: Coding patterns, best practices
```

**4. AI Engineering Rules**
```markdown
Location: /docs/07-ai-development/AI_ENGINEERING_RULES.md
When: Before making ANY changes
Why: Detailed safe change workflow
```

### 📊 Feature-Specific Documentation

**Dashboard V2 (Production)**
```markdown
Location: /docs/03-features/dashboard-v2/
Key Files:
- DATA_PIPELINE_AUDIT.md (most recent, Jan 19, 2025)
- BIGQUERY_QUICK_REFERENCE.md
- QUICK_REFERENCE.md
```

**Reviews Feature (Production)**
```markdown
Location: /docs/03-features/reviews/
Key File: README.md
```

**Organization & Roles**
```markdown
Location: /docs/02-architecture/system-design/ORGANIZATION_ROLES_SYSTEM.md
When: Working with users, roles, permissions
Why: Comprehensive reference (1,948 lines)
```

### 🔍 How to Find Information

**Step 1: Check Architecture**
```bash
# Start here
cat /docs/02-architecture/ARCHITECTURE_V1.md | grep -A 10 "your-topic"
```

**Step 2: Search Codebase**
```bash
# Find implementation
grep -r "function-name" src/
find . -name "*component-name*"
```

**Step 3: Check Documentation**
```bash
# Find related docs
find docs -name "*.md" | xargs grep "your-topic"
```

**Step 4: Git History**
```bash
# Understand evolution
git log --follow -- path/to/file
git blame path/to/file
```

---

## Safe Prompting Guidelines

### ✅ Good Prompting Pattern

```markdown
**Template for Safe Changes:**

I need to [CHANGE DESCRIPTION].

**Current System (What Works):**
- File: [exact path]
- Current behavior: [describe what works now]
- Data contract: [what consumers expect]
- Dependencies: [what uses this]

**What Must NOT Change:**
- [List stable contracts/interfaces]
- [List field names that must stay]
- [List behaviors other code depends on]

**Desired Change:**
- [What to change]
- [Why we need it]
- [Expected outcome]

**Validation Plan:**
- [ ] TypeScript compiles
- [ ] [Specific test case]
- [ ] [Specific UI still works]
- [ ] No breaking changes to [dependent system]

**Context Provided:**
- Read: ARCHITECTURE_V1.md
- Checked: [relevant documentation]
- Searched: [codebase for dependencies]

Please implement this change while preserving all contracts mentioned above.
```

### ❌ Unsafe Prompting (Don't Do This)

```markdown
❌ "Clean up the database schema"
   → Too vague, could break everything

❌ "Simplify the authentication"
   → Could remove critical security

❌ "Remove unused code"
   → Might be used by features not in codebase

❌ "Make it faster"
   → No specific target, could break functionality

❌ "Update to latest patterns"
   → Unclear what patterns, could introduce bugs
```

### 🎯 Specific Request Examples

**Example 1: Add a New UI Component**
```markdown
✅ GOOD:
I need to add a "Export to CSV" button to the Reviews page.

Current System:
- File: src/pages/growth-accelerators/reviews.tsx
- Current: Reviews table with search/filter
- Dependencies: ReviewsTable component, iTunes RSS data

What Must NOT Change:
- Reviews data structure
- Existing export functionality
- Table layout and filtering

Desired Change:
- Add Export button next to search box
- Use existing exportToCSV utility (src/utils/export.ts)
- Button should be disabled when no reviews loaded

Validation:
- [ ] TypeScript compiles
- [ ] Button appears in correct location
- [ ] Export works with filtered results
- [ ] Existing features still work
```

**Example 2: Fix a Bug**
```markdown
✅ GOOD:
Fix: Dashboard V2 shows "No data" even when data exists.

Current System:
- File: src/pages/ReportingDashboardV2.tsx
- Hook: useEnterpriseAnalytics (src/hooks/useEnterpriseAnalytics.ts)
- Edge Function: bigquery-aso-data
- Data: BigQuery yodel-mobile-app.aso_reports.aso_all_apple

Investigation Done:
- Checked Edge Function logs: Returning data correctly
- Checked network tab: 200 response with data
- Issue: Frontend not handling empty date range correctly

Root Cause:
- Line 156: if (!data || data.length === 0) shows "No data"
- Should check: if (!data || !data.summary) instead

Fix:
- Update condition to check data.summary existence
- Add null check for data.trends array

Validation:
- [ ] TypeScript compiles
- [ ] Dashboard loads with data
- [ ] Empty state still shows correctly when truly no data
- [ ] Edge cases handled (loading, error states)
```

**Example 3: Database Migration**
```markdown
✅ GOOD:
Add audit logging to user role changes.

Current System (MUST READ FIRST):
- Table: user_roles (SSOT for permissions)
- Audit: audit_logs table exists
- Function: log_audit_event() exists

What Must NOT Change:
- user_roles table structure
- Existing audit_logs schema
- RLS policies on either table

Desired Change:
- Create trigger on user_roles for INSERT/UPDATE/DELETE
- Log to audit_logs using existing log_audit_event()
- Include: old_role, new_role, changed_by, timestamp

Migration Plan:
1. Write migration: supabase/migrations/[timestamp]_audit_user_roles.sql
2. Create trigger function
3. Attach trigger to user_roles
4. Test with sample role change
5. Verify audit_logs populated

Validation:
- [ ] Migration runs without errors
- [ ] Trigger fires on role changes
- [ ] Audit logs show correct data
- [ ] Existing audit logging still works
- [ ] RLS policies still enforce correctly
- [ ] No performance degradation

Rollback Plan:
- DROP TRIGGER user_roles_audit_trigger
- DROP FUNCTION log_user_role_changes()
```

---

## Emergency Procedures

### 🚨 If You Break Something

**Step 1: Stop Immediately**
```bash
# Don't make more changes
# Don't commit
# Don't deploy
```

**Step 2: Assess Damage**
```bash
# Check what changed
git status
git diff

# Check TypeScript
npm run typecheck

# Check tests (if any)
npm test
```

**Step 3: Rollback**
```bash
# Undo uncommitted changes
git checkout -- [affected-files]

# Or reset completely
git reset --hard HEAD
```

**Step 4: Report to User**
```markdown
❌ I made an error. Here's what happened:

**What I Changed:**
- [Files modified]
- [Changes made]

**What Broke:**
- [Specific error]
- [Impact]

**Rollback Status:**
- [x] Changes reverted
- [x] Codebase back to working state

**Root Cause:**
- [Why it broke]

**Prevention:**
- [What I should have done instead]

I've rolled back all changes. The codebase is stable.
Would you like me to try again with a safer approach?
```

### 🔧 Common Issues and Fixes

**Issue: TypeScript Errors After Change**
```bash
# Diagnosis
npm run typecheck

# Common causes
1. Changed interface without updating consumers
2. Removed required field
3. Changed function signature

# Fix
1. Check git diff for what changed
2. Find all usages: grep -r "interface-name" src/
3. Update all consumers
4. Re-run typecheck
```

**Issue: Database Migration Failed**
```bash
# Diagnosis
supabase db push
# Read error message carefully

# Common causes
1. Constraint violation
2. RLS policy conflicts
3. Syntax error

# Fix
1. Check migration file for errors
2. Test locally first
3. Add IF NOT EXISTS clauses
4. Verify data compatibility
```

**Issue: Frontend Broken After API Change**
```bash
# Diagnosis
1. Check browser console
2. Check Network tab
3. Check Edge Function logs

# Common causes
1. Changed response structure
2. Removed required field
3. Changed status codes

# Fix
1. Revert API change
2. Create backwards-compatible version
3. Update frontend first
4. Then update API
```

---

## Verification Checklist

### Before Committing ANY Change

```markdown
Pre-Commit Checklist:
- [ ] Read ARCHITECTURE_V1.md relevant section
- [ ] Searched for dependencies (grep -r)
- [ ] TypeScript compiles (npm run typecheck)
- [ ] No console errors in browser
- [ ] Tested the specific change
- [ ] Tested related features still work
- [ ] Updated documentation if needed
- [ ] No security vulnerabilities introduced
- [ ] No RLS policies weakened
- [ ] No breaking changes to contracts
```

### Before Requesting Deployment

```markdown
Pre-Deployment Checklist:
- [ ] All pre-commit checks passed
- [ ] User approved the changes
- [ ] Production features tested
  - [ ] Dashboard V2 loads
  - [ ] Reviews page works
  - [ ] Login/auth works
  - [ ] MFA still enforced
- [ ] Database migrations run successfully
- [ ] Edge Functions deployed
- [ ] No errors in Supabase logs
- [ ] Audit logging still active
- [ ] RLS policies still enforcing
```

---

## Critical Architecture Invariants

### 🔒 NEVER Change These Without Approval

**1. Authorization Flow**
```typescript
// Current: usePermissions() hook → user_permissions_unified view
// DO NOT change to: authorize Edge Function (deprecated)

✅ Correct:
const { permissions } = usePermissions();
if (!permissions?.isOrgAdmin) return <NoAccess />;

❌ Wrong:
const auth = await fetch('/functions/v1/authorize'); // Deprecated
```

**2. Database SSOT**
```sql
-- Current: user_roles is Single Source of Truth
-- DO NOT create: parallel permission tables

✅ Correct:
SELECT * FROM user_permissions_unified WHERE user_id = ...;

❌ Wrong:
SELECT * FROM org_users WHERE ...;  -- Deprecated table
```

**3. BigQuery Integration**
```typescript
// Current: Direct integration, no caching layer
// DO NOT add: Redis/intermediate cache without approval

✅ Correct:
Edge Function → BigQuery → React Query (30 min cache)

❌ Wrong:
Edge Function → Redis → BigQuery  // Not implemented
```

**4. Security Layers**
```typescript
// Current: RLS policies + frontend checks
// DO NOT: Rely on frontend-only security

✅ Correct:
// RLS policy in database
CREATE POLICY ON table FOR SELECT
USING (organization_id IN (
  SELECT organization_id FROM user_roles WHERE user_id = auth.uid()
));

❌ Wrong:
// Frontend-only check (can be bypassed)
if (user.role === 'admin') showData();
```

**5. Session Security**
```typescript
// Current: 15-min idle, 8-hour absolute, enabled in production
// DO NOT: Disable or extend without security review

✅ Correct:
VITE_SESSION_IDLE_TIMEOUT=900000  // 15 min
VITE_SESSION_ABSOLUTE_TIMEOUT=28800000  // 8 hours

❌ Wrong:
VITE_SESSION_IDLE_TIMEOUT=999999999  // Effectively disabled
```

---

## Helpful Commands Reference

### Quick Information Lookup

```bash
# Find how something is implemented
grep -r "function-name" src/ --include="*.tsx" --include="*.ts"

# Find all usages of a component
grep -r "ComponentName" src/ -l

# Check what table structure is
grep -A 20 "CREATE TABLE table_name" supabase/migrations/

# See recent changes to a file
git log -p --follow -- path/to/file | head -100

# Check TypeScript without fixing
npm run typecheck

# See what ports are in use
lsof -i :5173

# Check Supabase connection
supabase status

# See current git branch
git status
```

### Testing Commands

```bash
# TypeScript validation
npm run typecheck

# Run development server
npm run dev

# Build production bundle
npm run build

# Test Supabase connection
supabase db push --dry-run

# Check database migrations
supabase migration list

# View Edge Function logs
supabase functions logs bigquery-aso-data
```

---

## Learning Resources

### First-Time Working on This Repo?

**Day 1: Read These (2-3 hours)**
1. `/docs/02-architecture/ARCHITECTURE_V1.md` (60 min) - System overview
2. `/DEVELOPMENT_GUIDE.md` (30 min) - Development patterns
3. `/docs/07-ai-development/AI_ENGINEERING_RULES.md` (45 min) - Detailed rules
4. This file (30 min) - Quick reference

**Day 2: Explore These**
1. Run the app: `npm run dev`
2. Explore Dashboard V2 at `http://localhost:5173/dashboard-v2`
3. Read through one feature's code (e.g., Dashboard V2)
4. Check database structure in Supabase dashboard

**Day 3: Make First Change**
1. Pick a small documentation fix or UI improvement
2. Follow the safe prompting template above
3. Test thoroughly before committing
4. Get user approval before deploying

### Reference Documentation Hierarchy

```
Level 1 (Must Read):
├── ARCHITECTURE_V1.md           ← START HERE
├── AI_AGENT_QUICKSTART.md       ← This file
└── AI_ENGINEERING_RULES.md      ← Detailed workflow

Level 2 (Feature Specific):
├── Dashboard V2 docs
├── Reviews docs
├── Organization/Roles docs
└── API contracts

Level 3 (Historical):
└── Archive folder (for context only)
```

---

## Quick Decision Tree

```
Need to make a change?
│
├─ Is it documentation only?
│  └─ YES → Safe to proceed (update Last Updated date)
│
├─ Is it UI styling only (no data changes)?
│  └─ YES → Proceed, test in browser
│
├─ Is it adding a new feature?
│  ├─ Read ARCHITECTURE_V1.md
│  ├─ Check if it changes contracts
│  ├─ Ask user for approval
│  └─ Follow safe prompting template
│
├─ Is it fixing a bug?
│  ├─ Understand root cause first
│  ├─ Check what else might break
│  ├─ Test the fix thoroughly
│  └─ Document what you changed
│
├─ Is it database/security related?
│  └─ ALWAYS get explicit user approval first
│
└─ Not sure?
   └─ ASK THE USER - never assume
```

---

## Version History

**v1.0 (2025-01-19)**
- Initial quickstart guide created
- Consolidates rules from AI_ENGINEERING_RULES.md
- Adds emergency procedures
- Includes verification checklists

---

## Getting Help

**If Stuck:**
1. Read ARCHITECTURE_V1.md section related to your task
2. Search codebase for similar implementations
3. Check git history for how it was done before
4. Ask user for clarification - never guess

**If Uncertain:**
1. State what you know
2. State what you're uncertain about
3. Propose 2-3 options
4. Ask user to choose
5. Never proceed without clarity

**If Made a Mistake:**
1. Stop immediately
2. Rollback changes
3. Report what happened
4. Explain what you learned
5. Propose safer approach

---

**Remember:** It's better to ask 10 questions than to break 1 thing.

**Principle:** Safe > Fast > Perfect

✅ This guide is your safety net. Use it on every session.
