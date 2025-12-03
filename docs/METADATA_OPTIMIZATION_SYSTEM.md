# Metadata Optimization System - Architecture Documentation

## 🎯 Overview

The Metadata Optimization System enables users to test and compare metadata changes before applying them, with full audit recomputation and visual comparison.

## 📋 Workflow

```
Step 1: Initial Audit
↓ User views baseline metadata performance

Step 2: Add Keywords Field
↓ User adds App Store Connect keywords
↓ Runs audit → BASELINE AUDIT (production metadata)

Step 3: Optimize & Compare
↓ User edits Title/Subtitle/Keywords
↓ Runs draft audit → DRAFT AUDIT (proposed changes)
↓ System shows split comparison: Baseline vs Draft
```

## 🏗️ Architecture

### Three-Tier Audit System

1. **Original Audit** (Read-only)
   - Fetched from App Store metadata
   - No modifications

2. **Baseline Audit** (Production + Keywords)
   - Original metadata + user-added keywords field
   - This becomes the comparison baseline

3. **Draft Audit** (Proposed Changes)
   - User's edited Title/Subtitle/Keywords
   - Computed on-demand, never saved to database
   - Compared against Baseline Audit

### State Management

```typescript
interface MetadataAuditState {
  // Step 1: Original
  originalAudit: UnifiedMetadataAuditResult | null;

  // Step 2: Baseline (comparison target)
  baselineAudit: UnifiedMetadataAuditResult | null;
  baselineMetadata: {
    title: string;
    subtitle: string;
    keywords: string;
  };

  // Step 3: Draft (user testing)
  draftMetadata: {
    title: string | null;
    subtitle: string | null;
    keywords: string | null;
  };
  draftAudit: UnifiedMetadataAuditResult | null;

  // Comparison
  deltas: MetadataDeltas | null;
  comparisonMode: 'off' | 'baseline-vs-draft';
}
```

## 📁 File Structure

```
src/
├── components/AppAudit/
│   ├── MetadataOptimization/          (NEW)
│   │   ├── MetadataOptimizationPanel.tsx
│   │   ├── RealTimeValidator.tsx
│   │   └── index.ts
│   │
│   ├── MetadataComparison/            (NEW)
│   │   ├── MetadataComparisonView.tsx
│   │   ├── SplitViewLayout.tsx
│   │   ├── DeltaBadge.tsx
│   │   ├── TextDiffHighlighter.tsx
│   │   └── index.ts
│   │
│   └── UnifiedMetadataAuditModule/
│       ├── UnifiedMetadataAuditModule.tsx (MODIFY)
│       └── ElementDetailCard.tsx         (MODIFY)
│
├── hooks/
│   ├── useMetadataDraftAudit.ts       (NEW)
│   └── useMetadataValidation.ts       (NEW)
│
├── utils/
│   ├── metadataComparison.ts          (NEW)
│   └── textDiff.ts                    (NEW)
│
└── types/
    └── metadataOptimization.ts         (NEW)

supabase/functions/
└── metadata-audit-draft/               (NEW)
    └── index.ts
```

## 🔌 API Design

### New Edge Function: `metadata-audit-draft`

**Endpoint:** `POST /metadata-audit-draft`

**Request:**
```json
{
  "app_id": "123456789",
  "platform": "ios",
  "locale": "us",
  "draft": {
    "title": "Meditation Sleep App",
    "subtitle": "Relax Sleep Mindfulness",
    "keywords": "meditation,sleep,calm"
  },
  "baseline": {
    "title": "Meditation App",
    "subtitle": "Relax & Meditate",
    "keywords": "meditation,sleep,calm"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "draftAudit": { /* UnifiedMetadataAuditResult */ },
    "baselineAudit": { /* UnifiedMetadataAuditResult */ },
    "deltas": {
      "excellentCombos": 3,
      "goodCombos": -2,
      "coverage": 13.5,
      "duplicates": -2,
      "efficiencyScore": 8.2
    },
    "textDiff": {
      "title": [
        { "type": "keep", "text": "Meditation" },
        { "type": "add", "text": "Sleep" },
        { "type": "keep", "text": "App" }
      ],
      "subtitle": [...],
      "keywords": [...]
    }
  }
}
```

## 🛡️ Rollback Instructions

### Quick Rollback (Git)
```bash
# View backup point
git tag -l "backup-*"

# Rollback to backup
git reset --hard backup-pre-metadata-optimization

# Or view changes
git diff backup-pre-metadata-optimization
```

### Manual File Restoration
If individual files need restoration:

1. **Frontend Components (Safe to Delete):**
   - `src/components/AppAudit/MetadataOptimization/` (entire folder)
   - `src/components/AppAudit/MetadataComparison/` (entire folder)
   - `src/hooks/useMetadataDraftAudit.ts`
   - `src/hooks/useMetadataValidation.ts`
   - `src/utils/metadataComparison.ts`
   - `src/utils/textDiff.ts`
   - `src/types/metadataOptimization.ts`

2. **Modified Files (Revert Changes):**
   - `src/components/AppAudit/UnifiedMetadataAuditModule/UnifiedMetadataAuditModule.tsx`
   - `src/components/AppAudit/UnifiedMetadataAuditModule/ElementDetailCard.tsx`

3. **Backend (Safe to Delete):**
   - `supabase/functions/metadata-audit-draft/` (entire folder)

### Testing After Rollback
```bash
npm run build
npm run dev
# Test app audit page - should work like before
```

## ⚠️ Important Notes

1. **No Database Changes:** This feature does NOT modify any database tables
2. **Session-Only:** All draft edits are session-only (lost on refresh)
3. **Backward Compatible:** Original audit flow unchanged
4. **Feature Flag Ready:** Can be wrapped in feature flag if needed

## 🚀 Phase 1 Implementation Checklist

- [ ] Backend: Create `metadata-audit-draft` edge function
- [ ] Frontend: Create `useMetadataDraftAudit` hook
- [ ] Frontend: Lift state in `UnifiedMetadataAuditModule`
- [ ] Frontend: Create `MetadataOptimizationPanel`
- [ ] Frontend: Create `MetadataComparisonView`
- [ ] Frontend: Implement delta calculation utilities
- [ ] Frontend: Update `ElementDetailCard` to use lifted state
- [ ] Testing: Verify baseline audit still works
- [ ] Testing: Verify draft audit comparison
- [ ] Build: Ensure TypeScript passes
- [ ] Documentation: Update this file with learnings

## 📊 Success Metrics

- User can edit Title/Subtitle/Keywords in unified panel
- "Run Draft Audit" triggers recomputation
- Split view shows Baseline vs Draft side-by-side
- Delta badges show +/- changes for all KPIs
- No breaking changes to existing audit flow

---

**Last Updated:** 2025-12-02
**Status:** Phase 1 Planning Complete
**Backup Tag:** `backup-pre-metadata-optimization`
