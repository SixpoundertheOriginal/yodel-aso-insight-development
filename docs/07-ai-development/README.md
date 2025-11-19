# 🤖 AI-Driven Development Standards

**Purpose:** Standards and workflows for AI-assisted development (Lovable.dev, Claude Code, GPT-based tools)
**Criticality:** ⚠️ **REQUIRED READING** before making ANY AI-assisted changes
**Last Updated:** 2025-11-19

---

## 📋 Overview

This directory contains the **engineering standards and safe workflows** for AI-driven development on the Yodel ASO Insight platform.

### Why This Matters

**Without these standards:**
- ❌ AI changes break implicit contracts between backend/frontend
- ❌ Database migrations fail in production
- ❌ Hours spent debugging "working" code that broke downstream
- ❌ Regressions in production features

**With these standards:**
- ✅ AI has complete context before making changes
- ✅ Changes are validated before deployment
- ✅ Implicit contracts are documented and preserved
- ✅ Safe, incremental changes with clear rollback paths

---

## 📚 Documentation Index

### 1. **Core Engineering Rules**

| Document | Purpose | When to Read |
|----------|---------|--------------|
| [AI_ENGINEERING_RULES.md](./AI_ENGINEERING_RULES.md) | **Master workflow** - Pre-flight checklist, prompting framework, validation | Before EVERY AI-assisted change |
| [ARCHITECTURE_REVIEW_BEST_PRACTICES.md](./ARCHITECTURE_REVIEW_BEST_PRACTICES.md) | Architectural decision-making, separation of concerns, best practices | Before designing new features |

### 2. **Tool-Specific Workflows**

| Document | Purpose | Tool |
|----------|---------|------|
| [LOVABLE_PROMPTING_GUIDE.md](./LOVABLE_PROMPTING_GUIDE.md) | Lovable.dev-specific prompting templates | Lovable.dev |
| [CODEX_WORKFLOW_GUIDE.md](./CODEX_WORKFLOW_GUIDE.md) | Codex/Claude Code invariants and testing rules | Claude Code, Codex |

### 3. **Pattern Libraries**

| Document | Purpose | Usage |
|----------|---------|-------|
| [proven-patterns.md](./proven-patterns.md) | Successful coding patterns that work in this codebase | Reference when implementing features |
| [failure-patterns.md](./failure-patterns.md) | Anti-patterns and mistakes to avoid | Review before prompting AI |

### 4. **Discovery Documentation**

| Document | Purpose |
|----------|---------|
| [discovery/ui-permissions-discovery.md](./discovery/ui-permissions-discovery.md) | UI permissions system discovery and analysis |

---

## 🚦 Quick Start: Safe AI Development Workflow

### Step 1: Pre-Flight Checklist (5 min)

**Before prompting AI, answer:**

- [ ] Do I understand what currently works?
- [ ] Do I know what could break?
- [ ] Have I identified all dependencies?
- [ ] Do I have the architecture context?

**Read:** [AI_ENGINEERING_RULES.md](./AI_ENGINEERING_RULES.md) - Section: "Pre-Flight Checklist"

---

### Step 2: Use the Prompting Framework

**Template:**
```
I need to [CHANGE DESCRIPTION].

**Current System (What Works):**
- File: [path]
- Current behavior: [describe]
- Data contract: [what consumers expect]
- Dependencies: [what uses this]

**What Must NOT Change:**
- [Contracts/interfaces that must stay stable]
- [Column names, field names, API response format]

**Desired Change:**
- [What to change and why]

**Validation:**
- [ ] TypeScript compiles
- [ ] [Specific test case]
- [ ] [Specific UI still works]

Please make the change while preserving all contracts mentioned above.
```

**Read:** [AI_ENGINEERING_RULES.md](./AI_ENGINEERING_RULES.md) - Section: "AI Prompting Framework"

---

### Step 3: Reference Proven Patterns

**Before implementing:**
- ✅ Check [proven-patterns.md](./proven-patterns.md) for similar implementations
- ❌ Check [failure-patterns.md](./failure-patterns.md) for known anti-patterns

---

### Step 4: Validate Before Deploying

**Post-Change Checklist:**

- [ ] TypeScript compiles (`npm run typecheck`)
- [ ] All imports resolve
- [ ] Database migration runs successfully (`supabase db push`)
- [ ] Production features still work (Dashboard V2, Reviews)
- [ ] No console errors in browser
- [ ] RLS policies still work
- [ ] API contracts preserved

**Read:** [AI_ENGINEERING_RULES.md](./AI_ENGINEERING_RULES.md) - Section: "Validation Checklist"

---

## ⚠️ Critical Invariants (Never Break These)

### Database Architecture

- ✅ `user_roles` is Single Source of Truth for permissions
- ✅ `user_permissions_unified` view exposes stable API to frontend
- ✅ Column names in views must NOT change without frontend updates
- ✅ RLS policies must be tested after migration

**Reference:** [CURRENT_ARCHITECTURE.md](../../CURRENT_ARCHITECTURE.md)

### API Contracts

- ✅ All Edge Functions must return `Content-Type: application/json`
- ✅ No HTML fallbacks in API responses
- ✅ Server-truth only (no client heuristics for org/role)
- ✅ Organization scoping via RLS, not application logic

**Reference:** [CODEX_WORKFLOW_GUIDE.md](./CODEX_WORKFLOW_GUIDE.md)

### Frontend Dependencies

- ✅ `usePermissions()` hook expects specific field names
- ✅ Dashboard V2 depends on BigQuery data structure
- ✅ Session security requires specific auth flow
- ✅ MFA enforcement relies on `mfa_enforcement` table

**Reference:** [DEVELOPMENT_GUIDE.md](../../DEVELOPMENT_GUIDE.md)

---

## 🛑 Red Flags to Watch For

When AI suggests changes, **STOP and review** if you see:

| Red Flag | Risk | Action |
|----------|------|--------|
| "Let's simplify this view" | Contract breakage | Verify frontend expectations first |
| "Remove unused columns" | Implicit dependencies | Search codebase for usages |
| "Consolidate these functions" | Loss of separation | Check architectural patterns |
| "Change column names for clarity" | Frontend breakage | Update frontend simultaneously |
| "Modify RLS policies" | Security bypass | Test with multiple user roles |

**Read:** [AI_ENGINEERING_RULES.md](./AI_ENGINEERING_RULES.md) - Section: "Red Flags to Watch For"

---

## 📖 Tool-Specific Guides

### Lovable.dev

**Prompting Style:**
- Provide complete implementation templates
- Include success criteria checklist
- Specify CORS/JSON verification steps

**Read:** [LOVABLE_PROMPTING_GUIDE.md](./LOVABLE_PROMPTING_GUIDE.md)

### Claude Code / Codex

**Invariants:**
- Server-truth only (no client heuristics)
- JSON-only API responses
- Protected routes must call `/authorize`
- Include cURL examples for testing

**Read:** [CODEX_WORKFLOW_GUIDE.md](./CODEX_WORKFLOW_GUIDE.md)

---

## 🔄 Multi-Agent Coordination

When multiple AI agents work on the same codebase:

### Coordination Rules

1. **Single Source of Truth:** Always reference `CURRENT_ARCHITECTURE.md`
2. **Shared Context:** All agents must read this README before changes
3. **Sequential Changes:** Don't parallelize interdependent changes
4. **Cross-Reference:** Link to proven patterns and anti-patterns

### Agent Handoff Protocol

```markdown
**Handoff to Next Agent:**
- Changes made: [list files modified]
- Contracts preserved: [list stable interfaces]
- Validation completed: [checklist]
- Known issues: [any warnings]
- Next steps: [what's needed next]
```

---

## 📊 Regression Prevention

### Before Making Changes

1. **Read:** [failure-patterns.md](./failure-patterns.md)
2. **Search:** Codebase for existing usages
3. **Test:** Current behavior manually
4. **Document:** What you're about to change

### After Making Changes

1. **Compile:** TypeScript (`npm run typecheck`)
2. **Migrate:** Database (`supabase db push`)
3. **Test:** Production features (Dashboard V2, Reviews)
4. **Verify:** No console errors
5. **Document:** What changed and why

---

## 🎯 Success Metrics

**Good AI-Assisted Development:**
- ✅ Changes deployed without rollbacks
- ✅ Zero production regressions
- ✅ Clear audit trail of what changed
- ✅ Future maintainers understand why

**Bad AI-Assisted Development:**
- ❌ "It compiled so I deployed it"
- ❌ "I don't know what this code does but AI wrote it"
- ❌ "It works on my machine"
- ❌ "The frontend broke but the backend is fine"

---

## 📞 When to Escalate

**Stop and ask for human review if:**

- Changing core authentication/authorization logic
- Modifying RLS policies for sensitive tables
- Restructuring database schema (more than adding columns)
- Implementing new Edge Functions with external API calls
- Changing data contracts between backend/frontend

---

## 📚 Additional Resources

- **Architecture:** [CURRENT_ARCHITECTURE.md](../../CURRENT_ARCHITECTURE.md)
- **Development Guide:** [DEVELOPMENT_GUIDE.md](../../DEVELOPMENT_GUIDE.md)
- **Troubleshooting:** [TROUBLESHOOTING.md](../../TROUBLESHOOTING.md)
- **API Reference:** [docs/04-api-reference/](../04-api-reference/)

---

**Last Updated:** 2025-11-19
**Maintained By:** Engineering Team
**Review Frequency:** Monthly or after any AI-related incident
