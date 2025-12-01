# Custom Keywords Feature - Implementation Plan

**Feature:** Add Custom Keywords to All Combos Table
**Date:** 2025-12-01
**Status:** 🟡 Planning

---

## 🎯 REQUIREMENTS

### User Story:
As a user, I want to manually add custom keywords to analyze in the All Combos Table, so I can track specific search terms that aren't auto-generated from my app's metadata.

### Functional Requirements:
1. ✅ Text input at TOP of table (near filters)
2. ✅ Accept single keyword OR multiple (comma-separated)
3. ✅ Show in SAME table with all 3 columns (Competition, Popularity, App Ranking)
4. ✅ Run through combo classification (branded/generic)
5. ✅ Save to database per app (persist as long as app is monitored)
6. ✅ Include in CSV export
7. ✅ Prevent duplicates
8. ✅ Best practices validation

---

## 🏗️ ARCHITECTURE

### Data Flow:

```
User Types Keyword(s)
  ↓
Parse & Validate
  ↓
Check Duplicates (vs existing combos + custom keywords)
  ↓
Run Classification (branded/generic via comboCoverage logic)
  ↓
Add to Zustand Store (immediate UI update)
  ↓
Save to Database (custom_keywords table)
  ↓
Fetch Data (Competition, Popularity, App Ranking)
  ↓
Display in Table (marked as "Custom" source)
```

---

## 📊 DATABASE SCHEMA

### New Table: `custom_keywords`

```sql
CREATE TABLE IF NOT EXISTS custom_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'ios',
  keyword TEXT NOT NULL,
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicates per app
  UNIQUE(app_id, platform, keyword)
);

-- Index for fast lookups
CREATE INDEX idx_custom_keywords_app ON custom_keywords(app_id, platform);

-- RLS Policies
ALTER TABLE custom_keywords ENABLE ROW LEVEL SECURITY;

-- Users can read custom keywords for apps they have access to
CREATE POLICY "Users can read custom keywords for their apps"
  ON custom_keywords FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM monitored_apps
      WHERE monitored_apps.app_id = custom_keywords.app_id
      AND monitored_apps.platform = custom_keywords.platform
    )
  );

-- Users can insert custom keywords for apps they manage
CREATE POLICY "Users can add custom keywords to their apps"
  ON custom_keywords FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM monitored_apps ma
      JOIN user_roles ur ON ur.organization_id = ma.organization_id
      WHERE ma.app_id = custom_keywords.app_id
      AND ma.platform = custom_keywords.platform
      AND ur.user_id = auth.uid()
      AND ur.role IN ('ADMIN', 'EDITOR')
    )
  );

-- Users can delete custom keywords
CREATE POLICY "Users can delete custom keywords from their apps"
  ON custom_keywords FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM monitored_apps ma
      JOIN user_roles ur ON ur.organization_id = ma.organization_id
      WHERE ma.app_id = custom_keywords.app_id
      AND ma.platform = custom_keywords.platform
      AND ur.user_id = auth.uid()
      AND ur.role IN ('ADMIN', 'EDITOR')
    )
  );

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_custom_keywords_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER custom_keywords_updated_at
  BEFORE UPDATE ON custom_keywords
  FOR EACH ROW
  EXECUTE FUNCTION update_custom_keywords_updated_at();
```

---

## 🔧 IMPLEMENTATION STEPS

### Step 1: Update Zustand Store

**File:** `src/stores/useKeywordComboStore.ts`

Add custom keywords state and actions:

```typescript
interface KeywordComboState {
  // ... existing state

  // Custom keywords
  customKeywords: ClassifiedCombo[]; // User-added keywords
  addCustomKeyword: (keyword: string) => void;
  addCustomKeywords: (keywords: string[]) => void;
  removeCustomKeyword: (text: string) => void;
  setCustomKeywords: (keywords: ClassifiedCombo[]) => void;
}

// In the store implementation:
customKeywords: [],

addCustomKeyword: (keyword) =>
  set((state) => {
    // Check if already exists in combos or customKeywords
    const normalizedKeyword = keyword.trim().toLowerCase();
    const exists =
      state.combos.some(c => c.text.toLowerCase() === normalizedKeyword) ||
      state.customKeywords.some(c => c.text.toLowerCase() === normalizedKeyword);

    if (exists) {
      toast.error(`"${keyword}" already exists in the table`);
      return state;
    }

    // Create classified combo
    const newCombo: ClassifiedCombo = {
      text: keyword.trim(),
      type: 'generic', // Will be classified properly later
      relevanceScore: 0, // Custom keywords start with 0 relevance
      source: 'custom', // Mark as custom
    };

    return {
      customKeywords: [...state.customKeywords, newCombo],
    };
  }),

addCustomKeywords: (keywords) =>
  set((state) => {
    const newKeywords: ClassifiedCombo[] = [];
    const duplicates: string[] = [];

    keywords.forEach((keyword) => {
      const normalizedKeyword = keyword.trim().toLowerCase();
      const exists =
        state.combos.some(c => c.text.toLowerCase() === normalizedKeyword) ||
        state.customKeywords.some(c => c.text.toLowerCase() === normalizedKeyword) ||
        newKeywords.some(c => c.text.toLowerCase() === normalizedKeyword);

      if (!exists && keyword.trim().length > 0) {
        newKeywords.push({
          text: keyword.trim(),
          type: 'generic',
          relevanceScore: 0,
          source: 'custom',
        });
      } else if (keyword.trim().length > 0) {
        duplicates.push(keyword.trim());
      }
    });

    if (duplicates.length > 0) {
      toast.warning(`Skipped ${duplicates.length} duplicate(s): ${duplicates.slice(0, 3).join(', ')}...`);
    }

    if (newKeywords.length > 0) {
      toast.success(`Added ${newKeywords.length} custom keyword(s)`);
    }

    return {
      customKeywords: [...state.customKeywords, ...newKeywords],
    };
  }),

removeCustomKeyword: (text) =>
  set((state) => ({
    customKeywords: state.customKeywords.filter(k => k.text !== text),
  })),

setCustomKeywords: (keywords) =>
  set({ customKeywords: keywords }),
```

---

### Step 2: Update KeywordComboTable to Merge Custom Keywords

**File:** `src/components/AppAudit/KeywordComboWorkbench/KeywordComboTable.tsx`

Merge custom keywords into the displayed combos:

```typescript
export const KeywordComboTable: React.FC<KeywordComboTableProps> = ({ metadata }) => {
  const {
    getSortedCombos,
    customKeywords, // ✅ NEW
  } = useKeywordComboStore();

  const sortedCombos = getSortedCombos();

  // ✅ NEW: Merge custom keywords with auto-generated combos
  const allCombos = useMemo(() => {
    return [...sortedCombos, ...customKeywords];
  }, [sortedCombos, customKeywords]);

  // ✅ Use allCombos instead of sortedCombos for rendering
  const allUniqueComboTexts = useMemo(() => {
    return allCombos.map(c => c.text);
  }, [allCombos]);

  // Rest of the component uses allCombos
  // ...
};
```

---

### Step 3: Create Custom Keyword Input Component

**File:** `src/components/AppAudit/KeywordComboWorkbench/CustomKeywordInput.tsx`

```typescript
import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2 } from 'lucide-react';
import { useKeywordComboStore } from '@/stores/useKeywordComboStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CustomKeywordInputProps {
  appId: string;
  platform?: string;
}

export const CustomKeywordInput: React.FC<CustomKeywordInputProps> = ({
  appId,
  platform = 'ios'
}) => {
  const [input, setInput] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const { addCustomKeywords } = useKeywordComboStore();

  const handleAdd = async () => {
    if (!input.trim()) {
      toast.error('Please enter at least one keyword');
      return;
    }

    // Validate input
    const MAX_LENGTH = 100;
    const MAX_KEYWORDS = 50;

    // Parse comma-separated keywords
    const keywords = input
      .split(',')
      .map(k => k.trim())
      .filter(k => k.length > 0);

    if (keywords.length === 0) {
      toast.error('Please enter valid keywords');
      return;
    }

    if (keywords.length > MAX_KEYWORDS) {
      toast.error(`Maximum ${MAX_KEYWORDS} keywords at a time`);
      return;
    }

    // Validate each keyword
    const invalidKeywords = keywords.filter(k => k.length > MAX_LENGTH);
    if (invalidKeywords.length > 0) {
      toast.error(`Some keywords exceed ${MAX_LENGTH} characters`);
      return;
    }

    setIsAdding(true);

    try {
      // Add to store (will handle duplicates)
      addCustomKeywords(keywords);

      // Save to database
      const { data, error } = await supabase
        .from('custom_keywords')
        .insert(
          keywords.map(keyword => ({
            app_id: appId,
            platform,
            keyword,
          }))
        )
        .select();

      if (error) {
        // If duplicate constraint violation, that's okay
        if (error.code === '23505') {
          console.log('Some keywords already exist in database (expected)');
        } else {
          throw error;
        }
      }

      console.log('[CustomKeywordInput] Saved to database:', data);

      // Clear input
      setInput('');
    } catch (error: any) {
      console.error('[CustomKeywordInput] Error saving:', error);
      toast.error('Failed to save keywords: ' + error.message);
    } finally {
      setIsAdding(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAdd();
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        placeholder="Add custom keywords (comma-separated)"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyPress={handleKeyPress}
        disabled={isAdding}
        className="flex-1 bg-zinc-900/50 border-zinc-700 text-zinc-300 placeholder:text-zinc-600"
      />
      <Button
        size="sm"
        onClick={handleAdd}
        disabled={isAdding || !input.trim()}
        className="bg-violet-500 hover:bg-violet-600 text-white"
      >
        {isAdding ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Adding...
          </>
        ) : (
          <>
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Keywords
          </>
        )}
      </Button>
    </div>
  );
};
```

---

### Step 4: Add Input to Table Header

**File:** `src/components/AppAudit/KeywordComboWorkbench/KeywordComboTable.tsx`

Add the input component at the top:

```typescript
import { CustomKeywordInput } from './CustomKeywordInput';

export const KeywordComboTable: React.FC<KeywordComboTableProps> = ({ metadata }) => {
  // ... existing code

  return (
    <div className="space-y-4">
      {/* ✅ NEW: Custom Keyword Input */}
      {metadata?.appId && (
        <CustomKeywordInput
          appId={metadata.appId}
          platform="ios"
        />
      )}

      {/* Existing filters */}
      <div className="flex items-center justify-between gap-4">
        {/* ... existing filter UI */}
      </div>

      {/* Table */}
      <Table>
        {/* ... existing table code */}
      </Table>
    </div>
  );
};
```

---

### Step 5: Load Custom Keywords on Mount

**File:** `src/components/AppAudit/KeywordComboWorkbench/KeywordComboTable.tsx`

```typescript
export const KeywordComboTable: React.FC<KeywordComboTableProps> = ({ metadata }) => {
  const { setCustomKeywords } = useKeywordComboStore();

  // ✅ NEW: Load custom keywords from database
  useEffect(() => {
    const loadCustomKeywords = async () => {
      if (!metadata?.appId) return;

      try {
        const { data, error } = await supabase
          .from('custom_keywords')
          .select('*')
          .eq('app_id', metadata.appId)
          .eq('platform', 'ios');

        if (error) throw error;

        if (data && data.length > 0) {
          const customCombos: ClassifiedCombo[] = data.map(row => ({
            text: row.keyword,
            type: 'generic', // Will be classified
            relevanceScore: 0,
            source: 'custom',
          }));

          setCustomKeywords(customCombos);
          console.log(`[KeywordComboTable] Loaded ${customCombos.length} custom keywords`);
        }
      } catch (error: any) {
        console.error('[KeywordComboTable] Error loading custom keywords:', error);
      }
    };

    loadCustomKeywords();
  }, [metadata?.appId, setCustomKeywords]);

  // ... rest of component
};
```

---

### Step 6: Update CSV Export

**File:** `src/utils/comboExporter.ts`

Ensure custom keywords are included in export:

```typescript
export const exportCombosToCSV = (combos: ClassifiedCombo[]) => {
  // Combos already include custom keywords (merged in table)
  // Just need to add "source" column to CSV

  const headers = [
    'Keyword',
    'Type',
    'Source', // ✅ Add this
    'Relevance Score',
    'Length',
  ];

  const rows = combos.map(combo => [
    combo.text,
    combo.type,
    combo.source || 'auto', // ✅ Show if custom or auto
    combo.relevanceScore,
    combo.text.length,
  ]);

  // Generate CSV
  const csv = [headers, ...rows]
    .map(row => row.join(','))
    .join('\n');

  // Download
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `keyword-combos-${Date.now()}.csv`;
  a.click();
};
```

---

### Step 7: Update Source Badge Display

**File:** `src/components/AppAudit/KeywordComboWorkbench/KeywordComboRow.tsx`

Update the source badge to show "Custom" for user-added keywords:

```typescript
const getSourceBadgeColor = (source?: string): string => {
  switch (source) {
    case 'title':
      return 'border-blue-400/30 text-blue-400 bg-blue-900/10';
    case 'subtitle':
      return 'border-cyan-400/30 text-cyan-400 bg-cyan-900/10';
    case 'title+subtitle':
      return 'border-violet-400/30 text-violet-400 bg-violet-900/10';
    case 'custom': // ✅ NEW
      return 'border-orange-400/30 text-orange-400 bg-orange-900/10';
    default:
      return 'border-zinc-700 text-zinc-500';
  }
};

// In render:
{visibleColumns.source && (
  <TableCell>
    <Badge variant="outline" className={`text-[11px] ${getSourceBadgeColor(combo.source)}`}>
      {combo.source === 'custom' ? '👤 Custom' : (combo.source || 'unknown')}
    </Badge>
  </TableCell>
)}
```

---

### Step 8: Add Delete Button for Custom Keywords

**File:** `src/components/AppAudit/KeywordComboWorkbench/KeywordComboRow.tsx`

Only show delete button for custom keywords:

```typescript
{/* Actions */}
<TableCell>
  <div className="flex items-center gap-1">
    {/* ... existing buttons (Copy, Mark as Noise) */}

    {/* ✅ NEW: Delete button (only for custom keywords) */}
    {combo.source === 'custom' && (
      <Button
        size="sm"
        variant="ghost"
        onClick={async () => {
          if (confirm(`Delete custom keyword "${combo.text}"?`)) {
            // Remove from store
            useKeywordComboStore.getState().removeCustomKeyword(combo.text);

            // Remove from database
            try {
              const { error } = await supabase
                .from('custom_keywords')
                .delete()
                .eq('app_id', metadata?.appId)
                .eq('keyword', combo.text);

              if (error) throw error;

              toast.success('Custom keyword deleted');
            } catch (error: any) {
              toast.error('Failed to delete: ' + error.message);
            }
          }
        }}
        className="h-7 w-7 p-0 text-zinc-400 hover:text-red-400 hover:bg-red-500/10"
        title="Delete custom keyword"
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    )}
  </div>
</TableCell>
```

---

## ✅ VALIDATION RULES

### Input Validation:
- ✅ Non-empty strings
- ✅ Max length: 100 characters per keyword
- ✅ Max keywords per batch: 50
- ✅ Trim whitespace
- ✅ Case-insensitive duplicate detection
- ✅ Prevent adding existing auto-generated combos
- ✅ Prevent adding existing custom keywords

### Best Practices:
- ✅ Show clear error messages
- ✅ Toast notifications for success/failure
- ✅ Disable button while adding
- ✅ Clear input after successful add
- ✅ Support Enter key to submit

---

## 🧪 TESTING CHECKLIST

- [ ] Add single keyword → appears in table
- [ ] Add multiple keywords (comma-separated) → all appear
- [ ] Try to add duplicate → shows error, doesn't add
- [ ] Try to add existing auto-combo → shows error
- [ ] Add keyword, refresh page → keyword persists
- [ ] Delete custom keyword → removed from UI and DB
- [ ] Export to CSV → custom keywords included with "custom" source
- [ ] All 3 columns work for custom keywords:
  - [ ] Competition shows data
  - [ ] Popularity shows score
  - [ ] App Ranking shows position
- [ ] Sorting works with custom keywords
- [ ] Filtering works with custom keywords
- [ ] Custom keywords marked with orange badge

---

## 📋 MIGRATION STEPS

1. Create database migration file
2. Run migration in Supabase
3. Update Zustand store
4. Create CustomKeywordInput component
5. Update KeywordComboTable
6. Update KeywordComboRow (delete button)
7. Update comboExporter (include source column)
8. Test thoroughly
9. Deploy

---

**Status:** Ready for implementation
**Estimated Time:** 2-3 hours
**Risk Level:** 🟡 Medium (database changes, new UI)
