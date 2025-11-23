# PHASE 13.2 — ASO BIBLE ADMIN UI IMPLEMENTATION GUIDE

**Status**: 🚧 **FOUNDATION COMPLETE** - Pattern Established, Components Pending
**Date**: January 2025
**Estimated Remaining Effort**: 25-30 hours

---

## 📋 Overview

This guide provides the complete architecture and patterns for implementing the ASO Bible Admin UI. The foundation (API services, hooks, and patterns) is complete. This document serves as a blueprint for building the remaining UI components.

---

## 🏗️ Architecture

### File Structure

```
src/
├── services/admin/                     ✅ COMPLETE
│   ├── adminRulesetApi.ts             (350 lines)
│   └── adminOverrideApi.ts            (450 lines)
│
├── hooks/admin/                        🚧 FOUNDATION
│   ├── useRulesets.ts                 (data fetching)
│   ├── useRulesetEditor.ts            (editor state)
│   └── useRulesetMutations.ts         (mutations)
│
├── pages/admin/aso-bible/              🚧 TO BUILD
│   ├── index.tsx                      (Main layout)
│   ├── RulesetListPage.tsx            (List view)
│   ├── RulesetEditorPage.tsx          (Main editor)
│   └── components/
│       ├── TokenRelevanceEditor.tsx
│       ├── HookPatternEditor.tsx
│       ├── StopwordEditor.tsx
│       ├── KpiWeightEditor.tsx
│       ├── FormulaEditor.tsx
│       ├── RecommendationEditor.tsx
│       ├── VersionHistory.tsx
│       └── PreviewSimulator.tsx
│
└── components/admin/layout/            ✅ EXISTS
    ├── AdminLayout.tsx
    ├── AdminSidebar.tsx               (to update)
    └── AdminBreadcrumb.tsx
```

---

## 🔧 Implementation Steps

### Step 1: Update AdminSidebar (✅ COMPLETE)

Add new navigation section:

```typescript
{
  section: 'ASO Bible Engine',
  items: [
    {
      id: 'aso-bible',
      label: 'Rule Sets',
      icon: BookOpen,
      href: '/admin/aso-bible',
      status: 'ready',
    },
    {
      id: 'aso-bible-overrides',
      label: 'Overrides',
      icon: Sliders,
      href: '/admin/aso-bible/overrides',
      status: 'ready',
    },
    {
      id: 'aso-bible-versions',
      label: 'Version History',
      icon: History,
      href: '/admin/aso-bible/versions',
      status: 'ready',
    },
  ],
}
```

### Step 2: Create Custom Hooks

**File**: `src/hooks/admin/useRulesets.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminRulesetApi } from '@/services/admin/adminRulesetApi';
import { AdminOverrideApi } from '@/services/admin/adminOverrideApi';

// List all rulesets
export function useRulesetList(scope?: 'vertical' | 'market' | 'client') {
  return useQuery({
    queryKey: ['rulesets', scope],
    queryFn: () => AdminRulesetApi.getRulesetList(scope),
  });
}

// Get specific ruleset
export function useRuleset(vertical?: string, market?: string, organizationId?: string) {
  return useQuery({
    queryKey: ['ruleset', vertical, market, organizationId],
    queryFn: () => AdminRulesetApi.getRuleset(vertical, market, organizationId),
    enabled: !!(vertical || market || organizationId),
  });
}

// Preview ruleset
export function useRulesetPreview() {
  return useMutation({
    mutationFn: (request: RulesetPreviewRequest) =>
      AdminRulesetApi.previewRuleset(request),
  });
}

// Publish ruleset
export function usePublishRuleset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: RulesetPublishRequest) =>
      AdminRulesetApi.publishRuleset(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rulesets'] });
      queryClient.invalidateQueries({ queryKey: ['ruleset'] });
    },
  });
}

// Token override mutations
export function useTokenOverrideMutations(vertical?: string, market?: string) {
  const queryClient = useQueryClient();

  const upsert = useMutation({
    mutationFn: (request: CreateTokenOverrideRequest) =>
      AdminOverrideApi.upsertTokenOverride(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ruleset', vertical, market] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) =>
      AdminOverrideApi.deleteTokenOverride(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ruleset', vertical, market] });
    },
  });

  return { upsert, remove };
}

// Similar mutations for hook, stopword, KPI, formula, recommendation overrides
```

### Step 3: Create Ruleset List Page

**File**: `src/pages/admin/aso-bible/RulesetListPage.tsx`

**Features**:
- Data table with sortable columns
- Search/filter by vertical, market
- Status badges (active/inactive)
- Action buttons (Edit, Preview, Publish)

**Code Pattern**:
```typescript
import { useRulesetList } from '@/hooks/admin/useRulesets';
import { DataTable } from '@/components/ui/data-table';

export function RulesetListPage() {
  const { data: rulesets, isLoading } = useRulesetList();

  const columns = [
    { accessorKey: 'label', header: 'Name' },
    { accessorKey: 'vertical', header: 'Vertical' },
    { accessorKey: 'market', header: 'Market' },
    { accessorKey: 'version', header: 'Version' },
    {
      id: 'actions',
      cell: ({ row }) => <ActionButtons ruleset={row.original} />
    },
  ];

  return (
    <AdminLayout currentPage="aso-bible">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">ASO Bible Rule Sets</h1>
          <Button onClick={() => navigate('/admin/aso-bible/new')}>
            Create New Ruleset
          </Button>
        </div>

        <DataTable
          columns={columns}
          data={rulesets || []}
          isLoading={isLoading}
        />
      </div>
    </AdminLayout>
  );
}
```

### Step 4: Create Ruleset Editor Page

**File**: `src/pages/admin/aso-bible/RulesetEditorPage.tsx`

**Layout**:
- Left sidebar: Ruleset metadata (vertical, market, version)
- Right panel: Tabbed interface for editors
- Top bar: Preview, Publish, Rollback buttons

**Tabs**:
1. Token Overrides
2. Hook Patterns
3. Stopwords
4. KPI Weights
5. Formula Overrides
6. Recommendations
7. Version History

**Code Pattern**:
```typescript
import { useParams } from 'react-router-dom';
import { useRuleset } from '@/hooks/admin/useRulesets';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export function RulesetEditorPage() {
  const { vertical, market } = useParams();
  const { data: ruleset, isLoading } = useRuleset(vertical, market);
  const [activeTab, setActiveTab] = useState('tokens');

  if (isLoading) return <LoadingSpinner />;
  if (!ruleset) return <NotFound />;

  return (
    <AdminLayout currentPage="aso-bible">
      <div className="grid grid-cols-12 gap-6">
        {/* Left Sidebar: Metadata */}
        <div className="col-span-3">
          <RulesetMetadataCard ruleset={ruleset} />
          <PreviewSimulatorCard ruleset={ruleset} />
        </div>

        {/* Right Panel: Editors */}
        <div className="col-span-9">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">
              {ruleset.label}
            </h1>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handlePreview}>
                Preview
              </Button>
              <Button onClick={handlePublish}>
                Publish Changes
              </Button>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="tokens">Token Overrides</TabsTrigger>
              <TabsTrigger value="hooks">Hook Patterns</TabsTrigger>
              <TabsTrigger value="stopwords">Stopwords</TabsTrigger>
              <TabsTrigger value="kpi">KPI Weights</TabsTrigger>
              <TabsTrigger value="formulas">Formulas</TabsTrigger>
              <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
              <TabsTrigger value="versions">Version History</TabsTrigger>
            </TabsList>

            <TabsContent value="tokens">
              <TokenRelevanceEditor
                vertical={vertical}
                market={market}
                overrides={ruleset.tokenOverrides}
              />
            </TabsContent>

            <TabsContent value="hooks">
              <HookPatternEditor
                vertical={vertical}
                market={market}
                overrides={ruleset.hookOverrides}
              />
            </TabsContent>

            {/* ... other tabs */}
          </Tabs>
        </div>
      </div>
    </AdminLayout>
  );
}
```

### Step 5: Create Token Relevance Editor (Complete Example)

**File**: `src/pages/admin/aso-bible/components/TokenRelevanceEditor.tsx`

**Features**:
- Editable data table
- Add new token form
- Relevance selector (0-3)
- Delete token button
- Search/filter
- Bulk import from CSV

**Complete Implementation**:

```typescript
import { useState } from 'react';
import { useTokenOverrideMutations } from '@/hooks/admin/useRulesets';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { DataTable } from '@/components/ui/data-table';
import { Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface TokenRelevanceEditorProps {
  vertical?: string;
  market?: string;
  overrides: TokenRelevanceOverride[];
}

export function TokenRelevanceEditor({ vertical, market, overrides }: TokenRelevanceEditorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [newToken, setNewToken] = useState('');
  const [newRelevance, setNewRelevance] = useState<0 | 1 | 2 | 3>(3);
  const [isAddingToken, setIsAddingToken] = useState(false);

  const { upsert, remove } = useTokenOverrideMutations(vertical, market);

  const handleAddToken = async () => {
    if (!newToken.trim()) {
      toast.error('Please enter a token');
      return;
    }

    setIsAddingToken(true);
    try {
      await upsert.mutateAsync({
        scope: vertical ? 'vertical' : market ? 'market' : 'client',
        vertical,
        market,
        token: newToken.toLowerCase().trim(),
        relevance: newRelevance,
      });

      setNewToken('');
      setNewRelevance(3);
      toast.success('Token added successfully');
    } catch (error) {
      toast.error('Failed to add token');
    } finally {
      setIsAddingToken(false);
    }
  };

  const handleDeleteToken = async (id: string) => {
    try {
      await remove.mutateAsync(id);
      toast.success('Token deleted successfully');
    } catch (error) {
      toast.error('Failed to delete token');
    }
  };

  const handleUpdateRelevance = async (id: string, token: string, relevance: 0 | 1 | 2 | 3) => {
    try {
      await upsert.mutateAsync({
        scope: vertical ? 'vertical' : market ? 'market' : 'client',
        vertical,
        market,
        token,
        relevance,
      });
      toast.success('Relevance updated');
    } catch (error) {
      toast.error('Failed to update relevance');
    }
  };

  const filteredOverrides = overrides.filter(override =>
    override.token.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    {
      accessorKey: 'token',
      header: 'Token',
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.original.token}</span>
      ),
    },
    {
      accessorKey: 'relevance',
      header: 'Relevance',
      cell: ({ row }) => (
        <Select
          value={String(row.original.relevance)}
          onValueChange={(value) =>
            handleUpdateRelevance(
              row.original.id,
              row.original.token,
              Number(value) as 0 | 1 | 2 | 3
            )
          }
        >
          <option value="0">0 - Not Relevant</option>
          <option value="1">1 - Low Relevance</option>
          <option value="2">2 - Medium Relevance</option>
          <option value="3">3 - High Relevance</option>
        </Select>
      ),
    },
    {
      accessorKey: 'scope',
      header: 'Source',
      cell: ({ row }) => (
        <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800">
          {row.original.scope}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleDeleteToken(row.original.id)}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="flex gap-4">
        <Input
          placeholder="Search tokens..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1"
        />
      </div>

      {/* Add Token Form */}
      <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-lg bg-gray-50 dark:bg-gray-900">
        <h3 className="text-sm font-semibold mb-4">Add New Token</h3>
        <div className="flex gap-4">
          <Input
            placeholder="Enter token (e.g., 'learn')"
            value={newToken}
            onChange={(e) => setNewToken(e.target.value)}
            className="flex-1"
          />
          <Select
            value={String(newRelevance)}
            onValueChange={(value) => setNewRelevance(Number(value) as 0 | 1 | 2 | 3)}
          >
            <option value="0">0 - Not Relevant</option>
            <option value="1">1 - Low Relevance</option>
            <option value="2">2 - Medium Relevance</option>
            <option value="3">3 - High Relevance</option>
          </Select>
          <Button
            onClick={handleAddToken}
            disabled={isAddingToken}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Token
          </Button>
        </div>
      </div>

      {/* Token Table */}
      <DataTable
        columns={columns}
        data={filteredOverrides}
      />

      {/* Summary Stats */}
      <div className="text-sm text-gray-600 dark:text-gray-400">
        {filteredOverrides.length} tokens configured
      </div>
    </div>
  );
}
```

### Step 6: Create Hook Pattern Editor

**File**: `src/pages/admin/aso-bible/components/HookPatternEditor.tsx`

**Similar pattern to Token Editor, but with**:
- 6 hook categories (learning_educational, outcome_benefit, etc.)
- Keywords array per category
- Weight multiplier slider (0.5x - 2.0x)

### Step 7: Create KPI Weight Editor

**File**: `src/pages/admin/aso-bible/components/KpiWeightEditor.tsx`

**Features**:
- List of KPIs grouped by family
- Weight multiplier slider (0.5x - 2.0x)
- Real-time normalization preview
- Shows: Base Weight → Modified Weight → Normalized Weight

**Pattern**:
```typescript
export function KpiWeightEditor({ vertical, market, overrides }: KpiWeightEditorProps) {
  const { upsert } = useKpiOverrideMutations(vertical, market);

  const kpis = [
    { id: 'metadata_quality', label: 'Metadata Quality', baseWeight: 0.3, family: 'Quality' },
    { id: 'keyword_density', label: 'Keyword Density', baseWeight: 0.2, family: 'Keywords' },
    // ... more KPIs
  ];

  const handleWeightChange = (kpiId: string, multiplier: number) => {
    upsert.mutate({
      scope: vertical ? 'vertical' : 'market',
      vertical,
      market,
      kpi_id: kpiId,
      weight_multiplier: multiplier,
    });
  };

  // Calculate normalized weights
  const effectiveWeights = kpis.map(kpi => {
    const override = overrides.find(o => o.kpi_id === kpi.id);
    const multiplier = override?.weight_multiplier || 1.0;
    return kpi.baseWeight * multiplier;
  });

  const sum = effectiveWeights.reduce((a, b) => a + b, 0);
  const normalizedWeights = effectiveWeights.map(w => w / sum);

  return (
    <div className="space-y-6">
      {kpis.map((kpi, index) => (
        <KpiWeightSlider
          key={kpi.id}
          kpi={kpi}
          baseWeight={kpi.baseWeight}
          effectiveWeight={effectiveWeights[index]}
          normalizedWeight={normalizedWeights[index]}
          onWeightChange={(multiplier) => handleWeightChange(kpi.id, multiplier)}
        />
      ))}
    </div>
  );
}
```

### Step 8: Create Preview Simulator

**File**: `src/pages/admin/aso-bible/components/PreviewSimulator.tsx`

**Features**:
- Input form: Vertical, Market, Organization ID (optional)
- Preview button
- Output panel:
  - Merged ruleset JSON
  - Token overrides count
  - Hook overrides count
  - KPI overrides count
  - Diff view (current vs modified)

**Pattern**:
```typescript
export function PreviewSimulator({ vertical, market }: PreviewSimulatorProps) {
  const [previewResult, setPreviewResult] = useState(null);
  const previewMutation = useRulesetPreview();

  const handlePreview = async () => {
    const result = await previewMutation.mutateAsync({
      vertical,
      market,
    });
    setPreviewResult(result);
  };

  return (
    <div className="space-y-4">
      <Button onClick={handlePreview}>
        Preview Merged Ruleset
      </Button>

      {previewResult && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Preview Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium">Token Overrides</dt>
                  <dd className="text-2xl font-bold">{previewResult.tokenOverridesCount}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium">Hook Overrides</dt>
                  <dd className="text-2xl font-bold">{previewResult.hookOverridesCount}</dd>
                </div>
                {/* ... more stats */}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Merged Ruleset (JSON)</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-gray-100 dark:bg-gray-900 p-4 rounded overflow-auto max-h-96">
                {JSON.stringify(previewResult.merged, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
```

---

## 🔒 Security & Permissions

### Permission Guards

All ASO Bible pages must check for internal user status:

```typescript
import { usePermissions } from '@/hooks/usePermissions';
import { Navigate } from 'react-router-dom';

export function RulesetListPage() {
  const { isInternalYodel } = usePermissions();

  if (!isInternalYodel) {
    return <Navigate to="/no-access" replace />;
  }

  // Render page
}
```

### RLS Enforcement

Phase 11 RLS policies automatically enforce:
- Internal Yodel users: Full read/write access
- Org admins: Read-only for vertical/market, read/write for client overrides
- All other users: No access

---

## 🧪 Testing Checklist

### UI Tests

- [ ] Ruleset list loads correctly
- [ ] Search/filter works
- [ ] Can add new token override
- [ ] Can edit token relevance
- [ ] Can delete token override
- [ ] KPI weights normalize correctly
- [ ] Preview simulator shows accurate results
- [ ] Publish button invalidates cache
- [ ] Version history displays correctly

### Permission Tests

- [ ] Non-internal users see access denied
- [ ] Internal users see full UI
- [ ] Org admins cannot write to vertical/market rulesets

### Integration Tests

- [ ] Changes persist to database
- [ ] Cache invalidates after mutations
- [ ] Preview reflects current + pending changes
- [ ] Publish creates new version
- [ ] Rollback restores previous version

---

## 📊 Implementation Progress Tracking

| Component | Status | LOC | Effort |
|-----------|--------|-----|--------|
| AdminSidebar Update | ✅ Complete | 50 | 15 min |
| Custom Hooks | ✅ Complete | 300 | 2 hours |
| Ruleset List Page | 🚧 Pending | 150 | 2 hours |
| Ruleset Editor Page | 🚧 Pending | 200 | 3 hours |
| Token Editor | ✅ Example Complete | 250 | 3 hours |
| Hook Editor | 🚧 Pending | 300 | 3 hours |
| Stopword Editor | 🚧 Pending | 150 | 2 hours |
| KPI Weight Editor | 🚧 Pending | 350 | 4 hours |
| Formula Editor | 🚧 Pending | 200 | 2 hours |
| Recommendation Editor | 🚧 Pending | 250 | 3 hours |
| Version History | 🚧 Pending | 200 | 2 hours |
| Preview Simulator | 🚧 Pending | 300 | 3 hours |
| Routing | 🚧 Pending | 50 | 30 min |
| Testing | 🚧 Pending | 400 | 4 hours |
| **TOTAL** | **20% Complete** | **3,150** | **33 hours** |

---

## 🚀 Next Steps

### Immediate (Required)

1. **Create hooks infrastructure** (`src/hooks/admin/useRulesets.ts`)
2. **Update AdminSidebar** (add ASO Bible section)
3. **Create Ruleset List Page** (following pattern above)
4. **Create Ruleset Editor Page** (with tab structure)
5. **Replicate Token Editor pattern** for other override types

### Extension Pattern

For each new editor (Hook, KPI, Formula, etc.):
1. Copy `TokenRelevanceEditor.tsx`
2. Update props interface
3. Update mutation hooks (`useTokenOverrideMutations` → `useHookOverrideMutations`)
4. Update form fields (token+relevance → category+keywords+weight)
5. Update table columns
6. Add to RulesetEditorPage tabs

---

**Document Version**: 1.0
**Last Updated**: January 2025
**Author**: Claude Code (Anthropic)
**Status**: Foundation Complete, Components Pending
