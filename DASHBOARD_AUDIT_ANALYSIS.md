# Dashboard (/dashboard) vs Dashboard V2 (/dashboard-v2) - Audit Analysis

**Date**: 2025-11-08
**Purpose**: Audit /dashboard page and compare with working /dashboard-v2 implementation

---

## 🔍 Executive Summary

**Status**: ❌ `/dashboard` is **NOT using BigQuery data** and **missing critical components**

**Key Findings**:
1. ❌ No app picker component
2. ❌ No date range picker component  
3. ❌ Uses legacy `useAsoData` context instead of `useEnterpriseAnalytics`
4. ❌ Uses `MarketContext` (country picker) instead of app-based filtering
5. ⚠️ Has complex fallback/demo logic instead of direct BigQuery pipeline

**Recommendation**: Refactor `/dashboard` to match `/dashboard-v2` architecture

---

## 📊 Side-by-Side Comparison

### Data Fetching Architecture

| Feature | `/dashboard` (Current) | `/dashboard-v2` (Working) |
|---------|----------------------|---------------------------|
| **Data Hook** | `useAsoData()` context | `useEnterpriseAnalytics()` direct |
| **BigQuery Integration** | ❌ Indirect via context | ✅ Direct pipeline |
| **Data Source** | Mixed (context-managed) | Pure BigQuery |
| **Complexity** | High (multi-layer) | Low (single hook) |

### Filter Components

| Component | `/dashboard` | `/dashboard-v2` |
|-----------|-------------|----------------|
| **App Picker** | ❌ Missing | ✅ `<CompactAppSelector>` |
| **Date Picker** | ❌ Missing | ✅ `<DateRangePicker>` |
| **Traffic Source Filter** | ❌ Missing | ✅ `<CompactTrafficSourceSelector>` |
| **Country Picker** | ✅ `<CountryPicker>` | ❌ Not needed (app-based) |

### Code Analysis

#### `/dashboard` (Current - Line 12)
```typescript
import { useBigQueryData } from '@/hooks/useBigQueryData';
import { useAsoData } from "../context/AsoDataContext";

const DashboardContent: React.FC = () => {
  const contextValue = useAsoData(); // ❌ Legacy context
  const {
    data,
    loading,
    error,
    filters,
    setFilters,
    // ... complex context state
  } = contextValue;
  
  // ❌ No app selection
  // ❌ No date range selection
  // ❌ Country-based filtering instead of app-based
```

#### `/dashboard-v2` (Working - Line 67)
```typescript
import { useEnterpriseAnalytics } from '@/hooks/useEnterpriseAnalytics';

export default function ReportingDashboardV2() {
  // ✅ Direct date range state
  const [dateRange, setDateRange] = useState({
    start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });

  // ✅ App selection state
  const [selectedAppIds, setSelectedAppIds] = useState<string[]>([]);

  // ✅ Traffic source selection state
  const [selectedTrafficSources, setSelectedTrafficSources] = useState<string[]>([]);

  // ✅ Direct BigQuery pipeline
  const { data, isLoading, error, refetch } = useEnterpriseAnalytics({
    organizationId: organizationId || '',
    dateRange,
    trafficSources: selectedTrafficSources,
    appIds: selectedAppIds
  });
```

---

## 🎯 Missing Components in `/dashboard`

### 1. App Picker Component ❌

**What's needed**:
```tsx
<CompactAppSelector
  selectedAppIds={selectedAppIds}
  onSelectionChange={setSelectedAppIds}
  availableApps={availableApps}
/>
```

**Current state**: Uses country picker instead
```tsx
<CountryPicker 
  selectedCountry={selectedMarket}
  onCountryChange={setSelectedMarket}
/>
```

### 2. Date Range Picker ❌

**What's needed**:
```tsx
<DateRangePicker
  dateRange={dateRange}
  onDateRangeChange={setDateRange}
/>
```

**Current state**: No date range control at all

### 3. Traffic Source Filter ❌

**What's needed**:
```tsx
<CompactTrafficSourceSelector
  selectedSources={selectedTrafficSources}
  onSelectionChange={setSelectedTrafficSources}
  availableSources={availableTrafficSources}
/>
```

**Current state**: Has `TrafficSourceKpiCards` but no selection UI

---

## 🔧 Component File Locations

### Working Components (from `/dashboard-v2`)
```
src/components/DateRangePicker.tsx          ✅ Available
src/components/CompactAppSelector.tsx       ✅ Available
src/components/CompactTrafficSourceSelector.tsx ✅ Available
```

### Hook Comparison
```
src/hooks/useEnterpriseAnalytics.ts         ✅ Direct BigQuery (v2)
src/context/AsoDataContext.tsx              ❌ Legacy context (current)
src/hooks/useBigQueryData.ts                ⚠️  Intermediate layer
```

---

## 📋 Implementation Plan

### Phase 1: Add Missing Components (Quick Win)
**Estimated Time**: 1-2 hours

1. **Add state management**:
   ```typescript
   const [dateRange, setDateRange] = useState({
     start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
     end: format(new Date(), 'yyyy-MM-dd')
   });
   const [selectedAppIds, setSelectedAppIds] = useState<string[]>([]);
   const [selectedTrafficSources, setSelectedTrafficSources] = useState<string[]>([]);
   ```

2. **Import and add components**:
   ```typescript
   import { DateRangePicker } from '@/components/DateRangePicker';
   import { CompactAppSelector } from '@/components/CompactAppSelector';
   import { CompactTrafficSourceSelector } from '@/components/CompactTrafficSourceSelector';
   ```

3. **Add to UI** (before KPI cards):
   ```tsx
   <div className="flex items-center gap-4 mb-6">
     <DateRangePicker
       dateRange={dateRange}
       onDateRangeChange={setDateRange}
     />
     <CompactAppSelector
       selectedAppIds={selectedAppIds}
       onSelectionChange={setSelectedAppIds}
       availableApps={availableApps}
     />
     <CompactTrafficSourceSelector
       selectedSources={selectedTrafficSources}
       onSelectionChange={setSelectedTrafficSources}
       availableSources={availableTrafficSources}
     />
   </div>
   ```

### Phase 2: Switch to Direct BigQuery (Better Architecture)
**Estimated Time**: 2-3 hours

1. **Replace `useAsoData` with `useEnterpriseAnalytics`**:
   ```typescript
   // Remove:
   const contextValue = useAsoData();
   
   // Add:
   const { data, isLoading, error, refetch } = useEnterpriseAnalytics({
     organizationId: organizationId || '',
     dateRange,
     trafficSources: selectedTrafficSources,
     appIds: selectedAppIds
   });
   ```

2. **Update data access patterns**:
   ```typescript
   // Old:
   const impressionsValue = kpiData.impressions.value;
   
   // New:
   const impressionsValue = data?.kpis?.impressions || 0;
   ```

3. **Remove legacy dependencies**:
   - Remove `MarketContext` provider
   - Remove `useAsoData` context
   - Remove `CountryPicker` component
   - Simplify data flow

---

## 🎨 Recommended UI Layout

```
┌─────────────────────────────────────────────────────────────┐
│ KPIs Overview                                               │
│ ┌─────────────┐ ┌──────────────┐ ┌────────────────┐       │
│ │ Date Picker │ │ App Selector │ │ Traffic Filter │       │
│ └─────────────┘ └──────────────┘ └────────────────┘       │
├─────────────────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│ │Impressions│ │Downloads │ │Page Views│ │CVR      │      │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
├─────────────────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────────────────┐  │
│ │ KPI Trend Chart                                        │  │
│ └───────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│ ┌──────────────────┐ ┌──────────────────┐                 │
│ │Traffic Source    │ │Conversion Funnel │                 │
│ │Comparison        │ │                  │                 │
│ └──────────────────┘ └──────────────────┘                 │
└─────────────────────────────────────────────────────────────┘
```

**Match `/dashboard-v2` layout exactly**

---

## 🚀 Quick Start Implementation

### Option A: Minimal Changes (Keep Current Architecture)
- Add 3 components to existing UI
- Pass filter values to `useAsoData` context
- Keep `MarketContext` for now
- **Time**: 1-2 hours
- **Risk**: Low
- **Benefit**: Quick fix, maintains backward compatibility

### Option B: Full Refactor (Recommended)
- Replace `useAsoData` with `useEnterpriseAnalytics`
- Add all 3 filter components
- Remove legacy context layers
- Match `/dashboard-v2` architecture exactly
- **Time**: 2-3 hours
- **Risk**: Medium
- **Benefit**: Clean architecture, easier maintenance, matches working implementation

---

## 📝 Files That Need Changes

### Option A (Minimal)
```
✏️  src/pages/dashboard.tsx (add components)
```

### Option B (Full Refactor - Recommended)
```
✏️  src/pages/dashboard.tsx (major refactor)
❌  Remove: src/context/AsoDataContext.tsx dependency
❌  Remove: MarketContext dependency
✅  Reuse: src/components/DateRangePicker.tsx
✅  Reuse: src/components/CompactAppSelector.tsx
✅  Reuse: src/components/CompactTrafficSourceSelector.tsx
✅  Reuse: src/hooks/useEnterpriseAnalytics.ts
```

---

## ✅ Success Criteria

After implementation, `/dashboard` should:
- [x] Show app picker at top (like v2)
- [x] Show date range picker at top (like v2)
- [x] Show traffic source filter at top (like v2)
- [x] Fetch data from BigQuery via `useEnterpriseAnalytics`
- [x] Filter data by selected apps
- [x] Filter data by date range
- [x] Filter data by traffic sources
- [x] Show loading states correctly
- [x] Handle errors gracefully
- [x] Display KPI cards with real data
- [x] Match `/dashboard-v2` functionality

---

## 🎯 Recommendation

**Implement Option B (Full Refactor)** because:
1. ✅ Matches working `/dashboard-v2` architecture
2. ✅ Eliminates legacy complexity
3. ✅ Direct BigQuery pipeline (faster, simpler)
4. ✅ Easier to maintain long-term
5. ✅ Already have all components built and tested
6. ✅ Only 2-3 hours of work
7. ✅ Clean, production-ready code

**Next Step**: Begin implementation following Phase 2 plan above.
