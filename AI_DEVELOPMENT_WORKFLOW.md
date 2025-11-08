# AI Development Workflow & Prompting Framework

**Last Updated:** November 9, 2025
**Purpose:** Safe, effective AI-assisted development on this codebase
**Critical:** Read this before making ANY changes with AI assistance

---

## Table of Contents

1. [Overview](#overview)
2. [Pre-Flight Checklist](#pre-flight-checklist)
3. [AI Prompting Framework](#ai-prompting-framework)
4. [Critical Context to Provide](#critical-context-to-provide)
5. [Change Workflow by Type](#change-workflow-by-type)
6. [Validation Checklist](#validation-checklist)
7. [Common Mistakes & How to Avoid](#common-mistakes--how-to-avoid)
8. [Red Flags to Watch For](#red-flags-to-watch-for)
9. [Safe Prompting Examples](#safe-prompting-examples)
10. [Unsafe Prompting Examples](#unsafe-prompting-examples)

---

## Overview

### Why This Framework Exists

**Problem We Had:**
```
User: "Clean up the user_permissions_unified view"

AI: *simplified the view*
Result: ❌ organizationId became undefined
        ❌ Dashboard V2 broke
        ❌ 2 hours debugging
```

**Root Cause:**
- AI didn't know frontend expected specific column names
- No validation before deployment
- Broke implicit contract between backend/frontend

### The Solution

This framework ensures:
- ✅ AI has complete context before making changes
- ✅ Changes are validated before deployment
- ✅ Implicit contracts are documented
- ✅ Safe, incremental changes

---

## Pre-Flight Checklist

**Before asking AI to make ANY change, answer these questions:**

### 1. Do I understand what currently works?

- [ ] I know which files are involved
- [ ] I understand the current data flow
- [ ] I've tested the current behavior
- [ ] I know what depends on this code

**If NO:** Read `CURRENT_ARCHITECTURE.md` first, then locate the code

### 2. Do I know what could break?

- [ ] I've identified downstream consumers
- [ ] I know which components read this data
- [ ] I understand the data contract
- [ ] I've checked for TypeScript types

**If NO:** Search the codebase for usages before changing

### 3. Have I provided enough context?

- [ ] I've told AI what currently works
- [ ] I've specified what must NOT change
- [ ] I've mentioned all constraints
- [ ] I've referenced relevant documentation

**If NO:** Use the prompting framework below

---

## AI Prompting Framework

### Template: Safe Change Request

```
I need to [CHANGE DESCRIPTION].

**Current System (What Works):**
- File: [path/to/file]
- Current behavior: [describe]
- Data contract: [what frontend/consumers expect]
- Dependencies: [what uses this]

**What Must NOT Change:**
- [Contract/interface that must stay stable]
- [Column names/field names]
- [API response format]
- [Behavior that other code depends on]

**Desired Change:**
- [What to change]
- [Why we need it]

**Validation:**
After changes, I will verify:
- [ ] TypeScript compiles
- [ ] [Specific test case]
- [ ] [Specific UI still works]

Please make the change while preserving all contracts mentioned above.
```

### Example: Safe View Change Request

```
I need to add a new column to user_permissions_unified view.

**Current System (What Works):**
- File: supabase/migrations/[timestamp]_view.sql
- View exposes: org_id, role, is_super_admin, is_org_admin, etc.
- Frontend hook: usePermissions() renames org_id → organizationId
- Frontend expects: All current columns must remain

**What Must NOT Change:**
- Column names: org_id, role, is_super_admin, is_org_admin, etc.
- All boolean flags
- Data types
- NULL handling

**Desired Change:**
- Add new column: last_login_at (timestamptz)

**Validation:**
After changes, I will verify:
- [ ] TypeScript compiles
- [ ] usePermissions() hook still works
- [ ] Dashboard V2 loads without errors

Please add the column without changing any existing columns.
```

---

## Critical Context to Provide

### Always Tell AI About:

#### 1. **Data Contracts**

```
"The user_permissions_unified view is a contract between backend and frontend.
Frontend expects these EXACT column names:
- org_id (NOT organization_id)
- role
- is_super_admin
- is_org_admin
- is_org_scoped_role

Changing these names will break the frontend."
```

#### 2. **Current Working State**

```
"Dashboard V2 currently works with these features:
- Shows BigQuery data
- Filters by traffic source
- Filters by app
- Updates audit logs

Do not break these features."
```

#### 3. **Implicit Dependencies**

```
"The usePermissions() hook depends on user_permissions_unified view.
It renames org_id to organizationId internally.
Any view changes must preserve the org_id column name."
```

#### 4. **What You've Already Tried**

```
"I tried simplifying the view but it broke organizationId.
The frontend needs all the computed boolean flags (is_super_admin, etc.).
These cannot be moved to the frontend."
```

---

## Change Workflow by Type

### Database Schema Changes

#### **Step 1: Document Current State**

```bash
# Export current schema
pg_dump --schema-only > schema_before.sql

# Or query specific table
psql -c "\d+ user_permissions_unified"
```

#### **Step 2: Prompt AI with Context**

```
I need to modify [table/view name].

**Current Schema:**
[paste \d+ output or relevant columns]

**Frontend Contract:**
The frontend expects these columns:
- [column1]: [type] - used for [purpose]
- [column2]: [type] - used for [purpose]

**What Must Stay:**
- Column names (frontend hardcoded)
- Data types (TypeScript types)
- NULL behavior (frontend assumes NOT NULL for X)

**Change:**
[your change]

Create a migration that preserves the contract.
```

#### **Step 3: Review Migration**

```sql
-- AI generates migration
-- YOU MUST CHECK:
-- ✅ Old column names preserved
-- ✅ Data types unchanged (unless intentional)
-- ✅ Indexes still valid
-- ✅ RLS policies updated (if needed)
```

#### **Step 4: Test Migration**

```bash
# Apply to local database
supabase migration up

# Check frontend still works
npm run dev
# Navigate to affected pages
# Verify no console errors
```

#### **Step 5: Validate**

```bash
# TypeScript check
npm run typecheck

# Check specific query
psql -c "SELECT * FROM user_permissions_unified LIMIT 1;"

# Verify frontend
# Open Dashboard V2
# Check console for errors
# Verify data displays correctly
```

### Frontend Component Changes

#### **Step 1: Identify Dependencies**

```typescript
// What uses this component?
// Search for imports:
// grep -r "import.*MyComponent" src/
```

#### **Step 2: Prompt with Contract**

```
I need to modify [ComponentName].

**Current Props Interface:**
[paste TypeScript interface]

**Current Behavior:**
- Renders: [what]
- Calls: [which hooks/APIs]
- Returns: [what]

**What Must Stay:**
- Props interface (other components depend on it)
- Export name (imported in [X] places)
- Core behavior: [describe]

**Change:**
[your change]

Preserve the existing interface while adding [feature].
```

#### **Step 3: Validate**

```bash
# TypeScript check
npm run typecheck

# Visual check
npm run dev
# Navigate to component
# Verify renders correctly
```

### Hook Changes

#### **Step 1: Document Current Return Type**

```typescript
// What does this hook return?
export function useMyHook() {
  return {
    data,      // Type: X
    isLoading, // Type: boolean
    error,     // Type: Error | null
  };
}

// Who uses it?
// grep -r "useMyHook" src/
```

#### **Step 2: Prompt with Contract**

```
I need to modify useMyHook.

**Current Return Type:**
{
  data: X,
  isLoading: boolean,
  error: Error | null
}

**Current Consumers:**
- ComponentA (uses data.field1)
- ComponentB (uses isLoading)
- [X] total usages

**What Must Stay:**
- Return type shape
- Field names in returned data
- Hook name

**Change:**
[your change]

Preserve the return type while adding [feature].
```

### Edge Function Changes

#### **Step 1: Document Request/Response**

```typescript
// Current Request:
{
  organizationId: string,
  startDate: string,
  endDate: string
}

// Current Response:
{
  summary: {...},
  trends: [...],
  meta: {...}
}

// Who calls it?
// Frontend: useEnterpriseAnalytics hook
```

#### **Step 2: Prompt with API Contract**

```
I need to modify bigquery-aso-data Edge Function.

**Current Request Schema:**
[paste TypeScript type]

**Current Response Schema:**
[paste TypeScript type]

**Frontend Expects:**
- Response.summary.total_downloads (number)
- Response.trends (array)
- Response.meta.raw_rows (number)

**What Must Stay:**
- Response shape
- Field names
- Data types

**Change:**
[your change]

Add new feature while preserving the API contract.
```

---

## Validation Checklist

### After EVERY Change

#### Level 1: Compilation (Mandatory)

```bash
# Must pass before deploying
npm run typecheck
```

**If fails:**
- ❌ DO NOT DEPLOY
- Fix TypeScript errors first
- Errors indicate breaking changes

#### Level 2: Affected Features (Mandatory)

**For Database Changes:**
```bash
# Test the view/table directly
psql -c "SELECT * FROM [changed_view] LIMIT 5;"

# Check affected pages
# Open browser → affected page
# Check console for errors
# Verify data displays
```

**For Frontend Changes:**
```bash
# Run dev server
npm run dev

# Navigate to changed component
# Check browser console
# Verify rendering
# Test interactions
```

**For Hook Changes:**
```bash
# Find all usages
grep -r "useMyHook" src/

# Test each consumer
# Open each page that uses the hook
# Verify no errors
```

#### Level 3: Integration (Recommended)

```bash
# Full user flow test
# 1. Login as test user
# 2. Navigate to Dashboard V2
# 3. Apply filters
# 4. Verify data loads
# 5. Check audit logs created
```

### Validation Matrix

| Change Type | TypeScript | Unit Tests | Manual Test | Integration Test |
|-------------|-----------|------------|-------------|------------------|
| View Schema | ✅ Required | ⚠️ Optional | ✅ Required | ✅ Required |
| Component | ✅ Required | ⚠️ Optional | ✅ Required | ⚠️ Recommended |
| Hook | ✅ Required | ⚠️ Optional | ✅ Required | ✅ Required |
| Edge Function | ✅ Required | ⚠️ Optional | ✅ Required | ✅ Required |
| Migration | ✅ Required | N/A | ✅ Required | ✅ Required |

---

## Common Mistakes & How to Avoid

### Mistake 1: "Simplify" Without Understanding Consumers

**What Happened:**
```
AI: "I'll simplify the view by removing redundant columns"
Result: ❌ Frontend expected those "redundant" columns
```

**How to Avoid:**
```
BEFORE asking AI to simplify:
1. Search for ALL usages: grep -r "view_name" src/
2. Document what each consumer expects
3. Tell AI: "These consumers depend on columns X, Y, Z"
```

**Safe Prompt:**
```
"Simplify the view, but preserve these columns that the frontend uses:
- org_id (used by usePermissions hook)
- is_super_admin (used by AdminPanel component)
- is_org_admin (used by SettingsPage)
Do NOT remove or rename these."
```

### Mistake 2: Renaming Without Checking TypeScript

**What Happened:**
```
User: "Rename organization_id to org_id"
AI: *renames in database*
Result: ❌ TypeScript still expects organizationId
        ❌ Frontend breaks at runtime
```

**How to Avoid:**
```
BEFORE renaming:
1. Search TypeScript: grep -r "organizationId" src/
2. Check if types need updating
3. Tell AI: "Also update TypeScript types in [files]"
```

**Safe Prompt:**
```
"I need to rename organization_id to org_id.

Files to update:
- Database view: user_permissions_unified
- TypeScript type: src/types/User.ts
- Hook: src/hooks/usePermissions.ts

Make changes consistently across all files."
```

### Mistake 3: Changing Behavior Without Testing

**What Happened:**
```
AI: "I optimized the query"
Result: ❌ Returns different data structure
        ❌ Charts break
        ❌ No one noticed until production
```

**How to Avoid:**
```
AFTER any change:
1. Run the actual code
2. Open the UI
3. Verify data looks the same
4. Check browser console
```

**Validation:**
```bash
# Test the change locally
npm run dev

# Open affected page
# Compare before/after screenshots
# Verify data structure in console:
console.log(data);
```

### Mistake 4: Forgetting RLS Policies

**What Happened:**
```
AI: "Created new table"
User: "Great!"
Result: ❌ No RLS policies
        ❌ Users can see each other's data
```

**How to Avoid:**
```
ALWAYS include in prompt for new tables:
"Create the table with RLS policies.
Users should only see their own organization's data.
Super admins can see all data."
```

**Safe Prompt:**
```
"Create a new table for [feature].

MUST include:
1. Primary key (uuid)
2. organization_id foreign key
3. RLS enabled
4. Policy: users see own org data
5. Policy: super_admins see all
6. Indexes on foreign keys"
```

### Mistake 5: Not Documenting Breaking Changes

**What Happened:**
```
AI makes change → You deploy → Breaks in production
You: "What changed?"
Result: ❌ No record of what was modified
```

**How to Avoid:**
```
AFTER every change, update:
1. CURRENT_ARCHITECTURE.md (if architecture changed)
2. Migration file comments
3. TypeScript interface comments
4. Git commit message with details
```

**Documentation Template:**
```markdown
## Change: [What Changed]
**Date:** 2025-11-09
**Reason:** [Why]
**Files Modified:**
- [file1]
- [file2]

**Breaking Changes:**
- [None] or [List of breaking changes]

**Migration Required:**
- [Yes/No]
- [Migration file name]
```

---

## Red Flags to Watch For

### 🚩 AI Wants to Delete Code

```
AI: "This code appears unused, I'll remove it"
```

**STOP:** The code might be used indirectly
**Action:** Search for it first
```bash
grep -r "functionName" src/
```

### 🚩 AI Wants to "Simplify" a View/Interface

```
AI: "I'll simplify this view by removing redundant columns"
```

**STOP:** Those columns might be API contracts
**Action:** Check all consumers first

### 🚩 AI Changes Column Names

```
AI: "Renamed organization_id to org_id for consistency"
```

**STOP:** Frontend might hardcode the old name
**Action:** Search for usages in frontend

### 🚩 AI Changes Response Structure

```
AI: "Restructured response for better readability"
```

**STOP:** Frontend expects specific structure
**Action:** Check TypeScript types first

### 🚩 AI Removes "Duplicate" Fields

```
AI: "Removed is_super_admin since we have role field"
```

**STOP:** Frontend might use the boolean flag
**Action:** Verify frontend doesn't use it

### 🚩 AI Optimizes Without Testing

```
AI: "Optimized the query for better performance"
```

**STOP:** Might return different data
**Action:** Test the query results before deploying

---

## Safe Prompting Examples

### ✅ Example 1: Adding New Column

```
I need to add a last_login_at column to track user logins.

**Current System:**
- Table: user_roles
- View: user_permissions_unified (exposes user_roles data)
- Frontend: usePermissions() hook reads from view

**What Must NOT Change:**
- Existing columns in user_permissions_unified view
- Column names (frontend hardcoded)
- Existing queries

**Change:**
1. Add last_login_at to user_roles table
2. Expose it in user_permissions_unified view
3. Update TypeScript type in usePermissions.ts

**Validation:**
I will check:
- TypeScript compiles
- Dashboard V2 still loads
- New column appears in console.log(permissions)

Please create the migration and update TypeScript types.
```

**Why This Works:**
- ✅ Specifies what must not change
- ✅ Lists all files to update
- ✅ Includes validation plan
- ✅ Clear scope

### ✅ Example 2: Fixing a Bug

```
Bug: Dashboard V2 shows wrong date range when filtering.

**Current Behavior:**
- User selects: Jan 1 - Jan 31
- Query uses: Jan 1 - Feb 1 (off by 1 day)

**Root Cause:**
- File: src/hooks/useEnterpriseAnalytics.ts
- Line: dateRange.end is inclusive but should be exclusive

**What Must NOT Change:**
- API request format
- Response parsing
- Other date calculations

**Fix:**
Subtract 1 day from dateRange.end before sending to API.

**Validation:**
I will verify:
- Selecting Jan 1-31 queries exactly Jan 1-31
- Other date ranges still work
- No TypeScript errors

Please fix the date calculation in useEnterpriseAnalytics.ts.
```

**Why This Works:**
- ✅ Describes current behavior
- ✅ Identifies root cause
- ✅ Specifies exact fix
- ✅ Defines validation

### ✅ Example 3: Adding New Feature

```
I need to add export to CSV feature on Dashboard V2.

**Current System:**
- Page: ReportingDashboardV2.tsx
- Data: Comes from useEnterpriseAnalytics hook
- Format: {summary, trends, traffic_sources}

**What Must NOT Change:**
- Existing UI layout
- Data fetching logic
- Existing features

**New Feature:**
- Button: "Export to CSV"
- Action: Download trends data as CSV
- Format: Date, Impressions, Downloads, etc.

**Implementation:**
1. Add Button component near filters
2. Create exportToCSV() function
3. Convert trends array to CSV string
4. Trigger download

**Files to Modify:**
- src/pages/ReportingDashboardV2.tsx

**Validation:**
I will check:
- TypeScript compiles
- Button appears in UI
- Click downloads CSV file
- CSV contains correct data

Please add the export feature to ReportingDashboardV2.tsx.
```

**Why This Works:**
- ✅ Clear feature description
- ✅ Specifies what not to change
- ✅ Lists implementation steps
- ✅ Validation criteria

---

## Unsafe Prompting Examples

### ❌ Example 1: Vague Request

```
"Clean up the permissions code"
```

**Why This Fails:**
- ❌ No context about what "clean up" means
- ❌ No constraints on what to preserve
- ❌ AI might delete "unused" code
- ❌ No validation criteria

**Result:** Likely breaks something

### ❌ Example 2: Assuming AI Knows Contracts

```
"Optimize the user_permissions_unified view"
```

**Why This Fails:**
- ❌ Doesn't tell AI what frontend expects
- ❌ No list of consumers
- ❌ AI might remove "redundant" columns
- ❌ No mention of org_id vs organizationId

**Result:** Frontend breaks

### ❌ Example 3: No Validation Plan

```
"Add a new field to the response"
```

**Why This Fails:**
- ❌ Doesn't specify which response
- ❌ No TypeScript type updates mentioned
- ❌ No validation plan
- ❌ Might break existing consumers

**Result:** Runtime errors

### ❌ Example 4: Trusting AI to Find All Usages

```
"Rename this function"
```

**Why This Fails:**
- ❌ AI might miss dynamic imports
- ❌ AI might miss string references
- ❌ No verification step
- ❌ Assumes AI has perfect knowledge

**Result:** Some calls still use old name

---

## Best Practices

### 1. Context is King

**Bad:**
```
"Fix the bug in Dashboard V2"
```

**Good:**
```
"Fix bug in Dashboard V2 where organizationId is undefined.

Current: usePermissions returns {organizationId: null}
Expected: Should return actual UUID
Root cause: View returns org_id but hook expects organizationId

Files:
- View: user_permissions_unified
- Hook: usePermissions.ts

Do NOT change: Column names in view (frontend depends on them)
```

### 2. Incremental Changes

**Bad:**
```
"Refactor the entire auth system"
```

**Good:**
```
"Step 1: Add is_active column to user_roles (preserving existing columns)
[verify]
Step 2: Update usePermissions hook to return isActive
[verify]
Step 3: Add UI indicator for inactive users
[verify]"
```

### 3. Always Validate

**After EVERY change:**
```bash
# 1. TypeScript
npm run typecheck

# 2. Visual check
npm run dev
# Open affected pages

# 3. Console check
# Look for errors in browser console

# 4. Data check
# Verify data structure hasn't changed
```

### 4. Document Contracts

**In code comments:**
```typescript
/**
 * user_permissions_unified VIEW CONTRACT
 *
 * Frontend expects these EXACT column names:
 * - org_id (NOT organization_id)
 * - is_super_admin (boolean, NOT role-based check)
 * - is_org_admin (boolean, NOT role-based check)
 *
 * DO NOT rename or remove these columns without updating:
 * - src/hooks/usePermissions.ts
 * - All components using permissions
 */
CREATE VIEW user_permissions_unified AS ...
```

### 5. Git Commit Messages

**Bad:**
```
git commit -m "fix"
```

**Good:**
```
git commit -m "fix: restore org_id column in user_permissions_unified view

Root cause: View was simplified, removing org_id column
Impact: usePermissions hook returned organizationId: undefined
Fix: Restored all original columns while adding new feature

Files changed:
- supabase/migrations/[new migration]

Verified:
- TypeScript compiles
- Dashboard V2 loads
- organizationId correctly populated"
```

---

## Emergency Recovery

### If You Broke Something

#### Step 1: Don't Panic

```
✅ Code is in Git
✅ Database can rollback migration
✅ Nothing is permanent
```

#### Step 2: Identify What Broke

```bash
# Check TypeScript
npm run typecheck
# Read the errors

# Check browser console
npm run dev
# Open affected page
# Read console errors
```

#### Step 3: Rollback Options

**Option A: Git Revert**
```bash
git log --oneline  # Find last working commit
git diff HEAD~1    # See what changed
git revert HEAD    # Undo last commit
```

**Option B: Database Rollback**
```bash
# Rollback last migration
supabase migration down

# Or manually revert SQL
psql -c "DROP VIEW user_permissions_unified;"
psql -c "CREATE VIEW user_permissions_unified AS ..."
```

**Option C: Manual Fix**
```bash
# If you know the fix
# Edit the file directly
# Test locally
# Deploy fix
```

#### Step 4: Document What Happened

```markdown
## Incident: [Date]
**What Broke:** [describe]
**Root Cause:** [why it broke]
**How Fixed:** [what you did]
**Prevention:** [how to avoid next time]
```

---

## Workflow Summary

### Every Change Follows This Pattern:

```
1. UNDERSTAND
   - What currently works?
   - What depends on it?
   - What could break?

2. PLAN
   - What needs to change?
   - What must NOT change?
   - How to validate?

3. PROMPT
   - Give AI full context
   - List all constraints
   - Specify validation

4. REVIEW
   - Check generated code
   - Verify contracts preserved
   - Look for red flags

5. TEST
   - TypeScript compile
   - Run the code
   - Check affected features

6. DEPLOY
   - Git commit with details
   - Document changes
   - Monitor for issues

7. VALIDATE
   - Test in production
   - Check logs
   - Verify everything works
```

---

## Quick Reference Card

### Before Making ANY Change

```
□ Read CURRENT_ARCHITECTURE.md for context
□ Search codebase for usages
□ Identify data contracts
□ List what must NOT change
□ Plan validation steps
```

### When Prompting AI

```
□ Describe current working state
□ List all constraints
□ Specify exact files to change
□ Define validation criteria
□ Mention all dependencies
```

### After AI Makes Change

```
□ npm run typecheck
□ Review code for red flags
□ Test locally (npm run dev)
□ Check browser console
□ Verify data structure
□ Test affected features
```

### Before Deploying

```
□ All TypeScript errors fixed
□ All manual tests passed
□ Git commit with details
□ Documentation updated
□ Team notified of changes
```

---

**Remember:** Taking 5 extra minutes to provide context and validate saves hours of debugging later.

**The Golden Rule:** If you're not sure, ASK instead of assuming. Better to over-communicate than to break production.

---

**End of AI Development Workflow Guide**

Keep this document open when working with AI assistants on this codebase.
