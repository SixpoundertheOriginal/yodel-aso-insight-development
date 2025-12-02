# Column Management Guide
## All Combos Table (Keyword Combo Workbench)

**Last Updated:** 2025-12-02
**Architecture Version:** 2026 Design System Integration

---

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [How to Add a Column](#how-to-add-a-column)
4. [How to Remove a Column](#how-to-remove-a-column)
5. [How to Rename a Column](#how-to-rename-a-column)
6. [Column Visibility System](#column-visibility-system)
7. [Troubleshooting](#troubleshooting)

---

## Overview

The All Combos Table uses a **modular, type-safe column management system** that allows easy addition, removal, and customization of table columns without breaking existing functionality.

### Current Columns (as of v2.3)

| Column | Sortable | Visible by Default | Data Source |
|--------|----------|-------------------|-------------|
| SELECT | ❌ | ✅ | N/A (checkbox) |
| SEARCH WORD | ✅ | ✅ | `combo.text` |
| STATUS | ❌ | ❌ | `combo.status` (V2.1) |
| TYPE | ✅ | ✅ | `combo.type` |
| SEMANTIC | ❌ | ❌ | `combo.semanticRelevance` (V2.1) |
| NOVELTY | ❌ | ❌ | `combo.noveltyScore` (V2.1) |
| NOISE | ❌ | ❌ | `combo.noiseConfidence` (V2.1) |
| SOURCE | ✅ | ✅ | `combo.source` |
| COMPETITION | ✅ | ✅ | N/A (placeholder) |
| LENGTH | ✅ | ✅ | `combo.text.length` |
| POPULARITY | ✅ | ✅ | Popularity API |
| APP RANKING | ✅ | ✅ | Ranking API |
| ACTIONS | ❌ | ✅ | N/A (buttons) |

---

## Architecture

### File Structure

```
src/
├── components/AppAudit/KeywordComboWorkbench/
│   ├── KeywordComboTable.tsx         # Main table component
│   ├── KeywordComboRow.tsx           # Row rendering logic
│   ├── EnhancedKeywordComboWorkbench.tsx # Parent component
│   └── ...
├── stores/
│   └── useKeywordComboStore.ts       # State management & sorting
└── styles/
    └── design-tokens.css             # Typography tokens
```

### Key Components

#### 1. **ColumnVisibility Interface**
**Location:** `KeywordComboTable.tsx` (line 43)

```typescript
interface ColumnVisibility {
  status: boolean;
  type: boolean;
  semantic: boolean;
  novelty: boolean;
  noise: boolean;
  source: boolean;
  length: boolean;
  competition: boolean;
}
```

#### 2. **SortColumn Type**
**Location:** `useKeywordComboStore.ts` (line 12)

```typescript
export type SortColumn =
  | 'text'
  | 'source'
  | 'type'
  | 'length'
  | 'competition'
  | 'appRanking'
  | 'popularity';
```

#### 3. **Default Visibility State**
**Location:** `KeywordComboTable.tsx` (line 106)

```typescript
const [visibleColumns, setVisibleColumns] = useState<ColumnVisibility>({
  status: false,      // V2.1 feature
  type: true,
  semantic: false,    // V2.1 feature
  novelty: false,     // V2.1 feature
  noise: false,       // V2.1 feature
  source: true,
  length: true,
  competition: true,
});
```

---

## How to Add a Column

### Step 1: Update Type Definitions

**File:** `KeywordComboTable.tsx`

```typescript
// Add to ColumnVisibility interface
interface ColumnVisibility {
  // ... existing columns
  myNewColumn: boolean;  // ← Add this
}
```

### Step 2: Set Default Visibility

**File:** `KeywordComboTable.tsx` (line 106)

```typescript
const [visibleColumns, setVisibleColumns] = useState<ColumnVisibility>({
  // ... existing columns
  myNewColumn: true,  // ← true = visible by default
});
```

### Step 3: Add Column Toggle (Optional)

**File:** `KeywordComboTable.tsx` (around line 800)

```tsx
<div className="flex items-center gap-2 p-2">
  <Checkbox
    id="col-my-new-column"
    checked={visibleColumns.myNewColumn}
    onCheckedChange={() => toggleColumn('myNewColumn')}
  />
  <label htmlFor="col-my-new-column" className="text-sm text-zinc-400 cursor-pointer">
    My New Column
  </label>
</div>
```

### Step 4: Add Table Header

**File:** `KeywordComboTable.tsx` (around line 900)

For **sortable** columns:
```tsx
{visibleColumns.myNewColumn && (
  <SortableHeader
    column="myDataField"
    onClick={() => handleSort('myDataField')}
    sortIcon={getSortIcon('myDataField')}
  >
    ▸ MY NEW COLUMN
  </SortableHeader>
)}
```

For **non-sortable** columns:
```tsx
{visibleColumns.myNewColumn && (
  <TableHead
    className="font-mono uppercase border-b-2 border-dashed border-orange-500/30"
    style={{
      fontSize: 'var(--table-header-size)',
      fontWeight: 'var(--table-header-weight)',
      color: 'var(--table-header-color)',
      letterSpacing: 'var(--table-header-tracking)',
      paddingLeft: '0.75rem',
      paddingRight: '0.75rem',
    }}
  >
    ◇ MY NEW COLUMN
  </TableHead>
)}
```

**Header Prefix Convention:**
- `▸` = Sortable column
- `◇` = Non-sortable column

### Step 5: Add Table Cell Rendering

**File:** `KeywordComboRow.tsx` (around line 320)

```tsx
{/* My New Column */}
{visibleColumns.myNewColumn && (
  <TableCell className="text-center">
    {combo.myDataField ?? 'N/A'}
  </TableCell>
)}
```

### Step 6: Add Sorting Logic (If Sortable)

**File:** `useKeywordComboStore.ts`

Add to `SortColumn` type:
```typescript
export type SortColumn =
  | 'text'
  | 'myDataField'  // ← Add this
  | ... existing columns;
```

Add sorting logic:
```typescript
switch (state.sortColumn) {
  // ... existing cases
  case 'myDataField':
    return a.myDataField - b.myDataField;  // Numeric
    // OR
    return a.myDataField.localeCompare(b.myDataField);  // String
}
```

---

## How to Remove a Column

### Checklist

- [ ] Remove from `ColumnVisibility` interface
- [ ] Remove from default state
- [ ] Remove toggle checkbox (if exists)
- [ ] Remove table header
- [ ] Remove table cell rendering
- [ ] Remove from `SortColumn` type (if sortable)
- [ ] Remove sorting logic (if sortable)

### Step-by-Step Example: Removing PRIORITY Column

#### 1. Remove from `ColumnVisibility`
**File:** `KeywordComboTable.tsx` (line 43)
```typescript
interface ColumnVisibility {
  status: boolean;
  type: boolean;
  // priority: boolean;  // ← REMOVE THIS LINE
  semantic: boolean;
  // ...
}
```

#### 2. Remove from Default State
**File:** `KeywordComboTable.tsx` (line 106)
```typescript
const [visibleColumns, setVisibleColumns] = useState<ColumnVisibility>({
  status: false,
  type: true,
  // priority: true,  // ← REMOVE THIS LINE
  semantic: false,
  // ...
});
```

#### 3. Remove Toggle Checkbox
**File:** `KeywordComboTable.tsx` (around line 800)
```tsx
// DELETE THIS ENTIRE BLOCK:
// <div className="flex items-center gap-2 p-2">
//   <Checkbox
//     id="col-priority"
//     checked={visibleColumns.priority}
//     onCheckedChange={() => toggleColumn('priority')}
//   />
//   <label htmlFor="col-priority">Priority Score</label>
// </div>
```

#### 4. Remove Table Header
**File:** `KeywordComboTable.tsx` (around line 930)
```tsx
// DELETE THIS ENTIRE BLOCK:
// {visibleColumns.priority && (
//   <SortableHeader column="relevance" ...>
//     ▸ PRIORITY
//   </SortableHeader>
// )}
```

#### 5. Remove Table Cell
**File:** `KeywordComboRow.tsx` (around line 321)
```tsx
// DELETE THE ENTIRE visibleColumns.priority BLOCK
// (approximately 50 lines)
```

#### 6. Remove from `SortColumn` Type (If Sortable)
**File:** `useKeywordComboStore.ts` (line 12)
```typescript
export type SortColumn =
  | 'text'
  | 'source'
  | 'type'
  // | 'relevance'  // ← REMOVE THIS LINE
  | 'length'
  | ...;
```

#### 7. Remove Sorting Logic
**File:** `useKeywordComboStore.ts` (around line 333)
```typescript
switch (state.sortColumn) {
  case 'type':
    return a.type.localeCompare(b.type);
  // case 'relevance':  // ← DELETE THIS CASE
  //   return a.relevanceScore - b.relevanceScore;
  case 'length':
    return a.text.length - b.text.length;
  // ...
}
```

---

## How to Rename a Column

**Example:** Change `COMBO` → `SEARCH WORD`

### Option 1: Simple Text Change (Recommended)

**File:** `KeywordComboTable.tsx` (line 908)

```tsx
<SortableHeader column="text" onClick={() => handleSort('text')} sortIcon={getSortIcon('text')}>
  ▸ SEARCH WORD  {/* ← Change from "▸ COMBO" */}
</SortableHeader>
```

**Impact:** Visual only, no breaking changes

### Option 2: Full Refactor (For Column Key Changes)

If you need to change the underlying data field name (e.g., `text` → `searchWord`):

1. Update data model/types
2. Update `SortColumn` type
3. Update sort logic
4. Update all references in row rendering
5. Update API/backend if needed

**⚠️ Warning:** This is a breaking change - use Option 1 for simple renames.

---

## Column Visibility System

### How It Works

1. **State Management:** `useState<ColumnVisibility>` controls which columns are visible
2. **Conditional Rendering:** `{visibleColumns.myColumn && <TableHead>...}`
3. **Toggle Function:** `toggleColumn(key)` flips visibility on/off
4. **Persistence:** Currently session-only (resets on page reload)

### Adding Persistence (Optional)

**Option 1: LocalStorage**
```typescript
useEffect(() => {
  localStorage.setItem('tableColumns', JSON.stringify(visibleColumns));
}, [visibleColumns]);

// On mount:
const saved = localStorage.getItem('tableColumns');
if (saved) {
  setVisibleColumns(JSON.parse(saved));
}
```

**Option 2: User Preferences API**
Save to database via `usePreferences` hook.

---

## Troubleshooting

### Column Not Appearing

**Check:**
1. ✅ Is `visibleColumns.myColumn` set to `true`?
2. ✅ Is the header wrapped in `{visibleColumns.myColumn && ...}`?
3. ✅ Is the cell wrapped in the same conditional?
4. ✅ Did you rebuild the app (`npm run build`)?

### Sorting Not Working

**Check:**
1. ✅ Is the column added to `SortColumn` type?
2. ✅ Does the switch case exist in `useKeywordComboStore.ts`?
3. ✅ Is the data field spelled correctly (`a.myField` vs `a.myFiled`)?
4. ✅ Does the data exist on the combo object?

### TypeScript Errors After Removal

**Common Fix:**
```bash
# Clear TypeScript cache
rm -rf node_modules/.cache
npm run build
```

### Column Still Visible After Removal

**Check:**
1. ✅ Did you remove ALL instances (header + cell + toggle)?
2. ✅ Did you save all files?
3. ✅ Did you hard refresh (Cmd/Ctrl + Shift + R)?

---

## Best Practices

### ✅ Do's

- **Always** use the `ColumnVisibility` interface for new columns
- **Always** wrap headers and cells in conditional rendering
- **Always** use design tokens for typography (see `design-tokens.css`)
- **Always** test with column toggled on AND off
- **Always** handle undefined/null data gracefully
- **Always** update this documentation when changing the architecture

### ❌ Don'ts

- **Don't** hardcode visibility (`<TableHead>` without `{visibleColumns...}`)
- **Don't** break backward compatibility without migration plan
- **Don't** mix inline styles with Tailwind (use design tokens instead)
- **Don't** forget to update both header AND cell rendering
- **Don't** skip TypeScript type updates

---

## Quick Reference Card

### Add Column
```
1. ColumnVisibility interface (+)
2. Default state (+)
3. Toggle checkbox (+)
4. Table header (+)
5. Table cell (+)
6. SortColumn type (+) [if sortable]
7. Sort logic (+) [if sortable]
```

### Remove Column
```
1. ColumnVisibility interface (-)
2. Default state (-)
3. Toggle checkbox (-)
4. Table header (-)
5. Table cell (-)
6. SortColumn type (-) [if sortable]
7. Sort logic (-) [if sortable]
```

### Rename Column
```
1. Find header text
2. Replace text
3. Done ✓
```

---

## Contact

Questions? Check:
- GitHub Issues: https://github.com/anthropics/claude-code/issues
- Team Docs: `/docs/`
- Ask in: #frontend-dev Slack channel

---

**Last Reviewed:** 2025-12-02
**Reviewers:** Claude Code (AI Assistant)
**Next Review:** 2025-03-02 or on architecture change
