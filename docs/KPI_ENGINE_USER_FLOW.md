# KPI Engine User Flow - Complete Integration Path

**Date:** 2025-11-22
**Status:** ✅ Complete - Live in ASO AI Hub Audit V2

## User Journey to Access KPI Engine

### Step 1: Navigate to ASO AI Hub
- **URL:** `/aso-ai-hub` or `/aso-ai-hub/audit`
- **Page Component:** `AsoAiHubPage` (src/pages/aso-ai-hub.tsx)
- **Access Control:** Requires org_admin role or higher
- **What User Sees:**
  - "ASO AI Audit" header with Brain icon
  - App import interface

### Step 2: Import an App
- **Component:** `MetadataImporter` (embedded in AppAuditHub)
- **What User Does:**
  - Enter App Store URL or App ID
  - Click "Import App"
- **Result:** App metadata is scraped and audit tabs become visible

### Step 3: Navigate to "Audit V2" Tab
- **Component:** `AppAuditHub` → Tabs → "Audit V2" tab
- **Tab Location:** AppAuditHub.tsx:581-586
- **Tab Label:** "Audit V2" with Sparkles icon ✨
- **Feature Flag:** `AUDIT_METADATA_V2_ENABLED = true`
- **What User Sees:**
  - Tab labeled "Audit V2" with emerald sparkles icon
  - Tab is enabled by default (flag is true)

### Step 4: View KPI Analysis
- **Component:** `AuditV2View` → `UnifiedMetadataAuditModule` → `MetadataKpiGrid`
- **What User Sees (in order):**

#### 4.1 Header Section
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✨ UNIFIED METADATA AUDIT V2
34 KPIs across 6 families • 15+ evaluation rules • Intent Intelligence
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### 4.2 Overall Score Card
- Hexagon badge with overall metadata score (0-100)
- Color-coded score breakdown
- Score tier label

#### 4.3 **📊 METADATA KPI ANALYSIS** Section
```
┌─────────────────────────────────────────────────────┐
│  📊 METADATA KPI ANALYSIS                           │
│                                                     │
│  ┌──────────────────┐  Overall Score: [85] ◆      │
│  │ 34 KPIs across 6 │                              │
│  │ families         │                              │
│  └──────────────────┘                              │
│                                                     │
│  ╔════════════════╗  ╔════════════════╗  ╔════════╗│
│  ║ 📐 Clarity &   ║  ║ 🏗️ Keyword     ║  ║ 🎣 Hook║
│  ║ Structure      ║  ║ Architecture   ║  ║ & Promis║
│  ║ Weight: 20%    ║  ║ Weight: 25%    ║  ║ Weight: ║
│  ║ Score: 85      ║  ║ Score: 72      ║  ║ Score: ║
│  ╚════════════════╝  ╚════════════════╝  ╚════════╝│
│                                                     │
│  ╔════════════════╗  ╔════════════════╗  ╔════════╗│
│  ║ ⚖️ Brand vs    ║  ║ 🧠 Psychology  ║  ║ 🎯 Inten║
│  ║ Generic        ║  ║ & Alignment    ║  ║ Alignmen║
│  ║ Weight: 20%    ║  ║ Weight: 10%    ║  ║ Weight: ║
│  ║ Score: 68      ║  ║ Score: 55      ║  ║ Score: ║
│  ╚════════════════╝  ╚════════════════╝  ╚════════╝│
│                                                     │
│  💡 KPI Engine: Scores are computed client-side    │
│     Hover over family cards to see detailed        │
│     KPI breakdowns.                                 │
└─────────────────────────────────────────────────────┘
```

#### 4.4 Hover Interaction - Family Card Tooltip
When user hovers over any KPI family card:
```
┌─────────────────────────────────────────┐
│ 📐 Clarity & Structure                  │
│ Aggregated score from 6 member KPIs    │
│ (Weight: 20%)                           │
├─────────────────────────────────────────┤
│ Member KPIs:                            │
│                                         │
│ • Title Character Usage                 │
│   Raw: 28.00         Score: [95] ✓     │
│                                         │
│ • Subtitle Character Usage              │
│   Raw: 22.00         Score: [78] ✓     │
│                                         │
│ • Word Count Title                      │
│   Raw: 5.00          Score: [83] ✓     │
│                                         │
│ • Word Count Subtitle                   │
│   Raw: 4.00          Score: [80] ✓     │
│                                         │
│ • Token Density Title                   │
│   Raw: 0.85          Score: [90] ✓     │
│                                         │
│ • Token Density Subtitle                │
│   Raw: 0.80          Score: [88] ✓     │
└─────────────────────────────────────────┘
```

#### 4.5 Subsequent Sections (Below KPIs)
1. **🎯 ASO RANKING RECOMMENDATIONS** - Actionable recommendations
2. **ASO RANKING ELEMENTS** - Title & Subtitle detailed analysis
3. **💰 CONVERSION INTELLIGENCE** - Description analysis
4. **COVERAGE ANALYSIS** - Keyword & Combo Coverage + Workbench
5. **Search Intent Analysis** - Intent Intelligence clusters (if enabled)

## Complete File Path

### Navigation Flow
```
User Request: /aso-ai-hub/audit
    ↓
src/pages/aso-ai-hub.tsx (AsoAiHubPage)
    ↓
src/components/AppAudit/AppAuditHub.tsx
    ↓
Tabs → "Audit V2" tab (line 581-586)
    ↓
src/components/AppAudit/AuditV2View.tsx
    ↓
src/components/AppAudit/UnifiedMetadataAuditModule/UnifiedMetadataAuditModule.tsx (line 141-150)
    ↓
src/components/AppAudit/MetadataKpi/MetadataKpiGrid.tsx
    ↓
src/components/AppAudit/MetadataKpi/KpiFamilyCard.tsx (6 cards, one per family)
```

### KPI Computation Flow
```
User imports app
    ↓
AppAuditHub receives metadata
    ↓
UnifiedMetadataAuditModule renders
    ↓
useMemo hook triggers KPI computation (line 86-102)
    ↓
KpiEngine.evaluate(input) called
    ↓
src/engine/metadata/kpi/kpiEngine.ts computes 34 KPIs
    ↓
Returns KpiEngineResult { vector, kpis, families, overallScore }
    ↓
MetadataKpiGrid renders 6 family cards
    ↓
User sees KPI analysis in real-time
```

## Key Integration Points

### 1. Feature Flag Location
**File:** `src/config/metadataFeatureFlags.ts`
**Line:** 283
**Value:** `AUDIT_METADATA_V2_ENABLED = true`
**Effect:** Enables "Audit V2" tab in AppAuditHub

### 2. Tab Registration
**File:** `src/components/AppAudit/AppAuditHub.tsx`
**Lines:** 581-586
```typescript
{AUDIT_METADATA_V2_ENABLED && isTabVisible('audit-v2') && (
  <TabsTrigger value="audit-v2" className="flex items-center space-x-1">
    <Sparkles className="h-4 w-4 text-emerald-400" />
    <span>Audit V2</span>
  </TabsTrigger>
)}
```

### 3. Tab Content
**File:** `src/components/AppAudit/AppAuditHub.tsx`
**Lines:** 626-634
```typescript
{AUDIT_METADATA_V2_ENABLED && (
  <TabsContent value="audit-v2" className="space-y-6">
    <AuditV2View
      metadata={displayMetadata}
      monitored_app_id={...}
      mode={mode}
    />
  </TabsContent>
)}
```

### 4. KPI Engine Integration
**File:** `src/components/AppAudit/UnifiedMetadataAuditModule/UnifiedMetadataAuditModule.tsx`
**Lines:** 86-102 (computation), 141-150 (rendering)
```typescript
// Computation
const kpiResult = useMemo(() => {
  if (!auditResult || !metadata) return null;

  try {
    return KpiEngine.evaluate({
      title: metadata.title || '',
      subtitle: metadata.subtitle || '',
      platform: 'ios',
      locale: metadata.locale || 'us',
      comboCoverage: auditResult.comboCoverage,
    });
  } catch (err) {
    console.error('KPI Engine evaluation failed:', err);
    return null;
  }
}, [auditResult, metadata]);

// Rendering
{kpiResult && (
  <div>
    <h3>📊 METADATA KPI ANALYSIS</h3>
    <MetadataKpiGrid kpiResult={kpiResult} />
  </div>
)}
```

### 5. KPI Engine Implementation
**File:** `src/engine/metadata/kpi/kpiEngine.ts`
**Method:** `KpiEngine.evaluate(input: KpiEngineInput): KpiEngineResult`
**Configuration:**
- `src/engine/metadata/kpi/kpi.registry.json` - 34 KPI definitions
- `src/engine/metadata/kpi/kpi.families.json` - 6 family definitions

## Visual Summary

### What User Sees (Step-by-Step)

#### Before Import
```
╔════════════════════════════════════════════════════╗
║  🧠 ASO AI AUDIT                                   ║
║  Run a complete ASO audit using real Store data   ║
╠════════════════════════════════════════════════════╣
║                                                    ║
║  [Import App]                                      ║
║  Enter App Store URL or App ID                     ║
║                                                    ║
╚════════════════════════════════════════════════════╝
```

#### After Import - Tabs Visible
```
╔════════════════════════════════════════════════════╗
║  📱 Pimsleur Language Learning                     ║
║  Learn Spanish, French, Italian & More             ║
╠════════════════════════════════════════════════════╣
║  [Slide View] [Summary] [Overview] [Audit V2] ✨   ║
╠════════════════════════════════════════════════════╣
║  ...tab content...                                 ║
╚════════════════════════════════════════════════════╝
```

#### Audit V2 Tab - KPI Section Highlighted
```
╔════════════════════════════════════════════════════╗
║  ✨ UNIFIED METADATA AUDIT V2                      ║
║  34 KPIs • 15+ rules • Intent Intelligence         ║
╠════════════════════════════════════════════════════╣
║                                                    ║
║  [Overall Score Card: 85/100]                      ║
║                                                    ║
║  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓    ║
║  ┃ 📊 METADATA KPI ANALYSIS              [85]┃    ║
║  ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫    ║
║  ┃ 34 KPIs across 6 families • Registry-driven┃   ║
║  ┃                                             ┃    ║
║  ┃ [Clarity 85] [Keywords 72] [Hook 91]       ┃    ║
║  ┃ [Brand 68]   [Psych 55]    [Intent 78]     ┃    ║
║  ┃                                             ┃    ║
║  ┃ 💡 Hover for detailed KPI breakdowns       ┃    ║
║  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛    ║
║                                                    ║
║  🎯 ASO RANKING RECOMMENDATIONS                    ║
║  ...                                               ║
║                                                    ║
╚════════════════════════════════════════════════════╝
```

## Testing the Integration

### Manual Test Steps

1. **Navigate to ASO AI Hub:**
   - Go to `/aso-ai-hub/audit`
   - Verify page loads with import interface

2. **Import a Test App:**
   - Use App ID: `1208432728` (Pimsleur - known good test app)
   - Platform: iOS
   - Region: US
   - Click "Import App"

3. **Verify Tabs Appear:**
   - Tabs should show: Slide View, Summary, Overview, **Audit V2** ✨
   - "Audit V2" tab should have emerald sparkles icon

4. **Click "Audit V2" Tab:**
   - Should show header: "UNIFIED METADATA AUDIT V2"
   - Subtitle should say: "34 KPIs across 6 families • 15+ evaluation rules • Intent Intelligence"

5. **Scroll to KPI Section:**
   - Should appear after Overall Score Card
   - Section header: "📊 METADATA KPI ANALYSIS"
   - Should show 6 family cards in a grid (3x2 layout on desktop)

6. **Hover Over Family Cards:**
   - Tooltip should appear showing detailed KPI breakdown
   - Should list all member KPIs with raw + normalized values
   - Should show color-coded scores

7. **Verify Responsive Layout:**
   - Desktop (≥1024px): 3-column grid
   - Tablet (768-1023px): 2-column grid
   - Mobile (<768px): 1-column stacked

### Automated Test Command

```bash
# TypeScript compilation
npx tsc --noEmit --pretty

# Production build
npm run build

# Development server (manual testing)
npm run dev
```

## Success Criteria

✅ KPI Engine is accessible via `/aso-ai-hub/audit` → "Audit V2" tab
✅ KPI section appears in step-by-step audit flow
✅ 6 KPI families display in responsive grid
✅ Overall KPI score shows in hexagon badge
✅ Hover tooltips show detailed KPI breakdowns
✅ Color-coded scores (green/yellow/orange/red)
✅ Client-side computation (no API latency)
✅ TypeScript compilation passes
✅ Production build succeeds

## User Documentation

### Where to Find KPI Analysis

**Path:** ASO AI Hub → Import App → "Audit V2" Tab → Scroll to "📊 METADATA KPI ANALYSIS"

### What the KPIs Show

The KPI Engine evaluates metadata quality across 6 logical families:

1. **📐 Clarity & Structure (20%)** - Character usage, word counts, token density
2. **🏗️ Keyword Architecture (25%)** - Keyword quality, distribution, noise ratios
3. **🎣 Hook & Promise Strength (15%)** - Action verbs, benefits, value propositions
4. **⚖️ Brand vs Generic Balance (20%)** - Brand visibility vs discovery keywords
5. **🧠 Psychology & Alignment (10%)** - Benefit density, specificity, urgency
6. **🎯 Intent Alignment (10%)** - Search intent patterns (navigational, commercial, etc.)

### How to Interpret Scores

- **80-100 (Green):** Excellent - Metadata quality is strong
- **60-79 (Yellow):** Good - Minor improvements recommended
- **40-59 (Orange):** Needs Improvement - Several optimization opportunities
- **0-39 (Red):** Critical - Significant metadata issues detected

### How to Use KPI Insights

1. **Review Overall Score** - Understand overall metadata quality
2. **Identify Low-Scoring Families** - Focus optimization efforts
3. **Hover for Details** - See which specific KPIs need attention
4. **Cross-Reference Recommendations** - KPIs inform the recommendations below
5. **Track Over Time** - Monitor improvements after metadata changes

---

**Integration Complete** ✅
The KPI Engine is now fully integrated into the ASO AI Hub audit workflow and accessible to all users.
