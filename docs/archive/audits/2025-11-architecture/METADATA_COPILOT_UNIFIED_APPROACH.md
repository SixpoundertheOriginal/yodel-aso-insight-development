# Metadata Co-Pilot - Unified Workflow Design

**Date:** 2025-01-18
**Status:** 🎯 Design Proposal - Unifying AI Generation + Manual Editing
**Goal:** Create a seamless, hybrid workflow that combines AI power with manual control

---

## Current State Analysis

### Current Problems

#### 1. **Siloed Workflows**
- **AI Generation Mode**: Generate → Review → Switch to Manual to Edit
- **Manual Editor Mode**: Type from scratch or get per-field AI suggestions
- **Issue**: Requires mode switching, context loss, friction

#### 2. **Duplicate Functionality**
- AI Generation has "Edit Results" button → switches to Manual mode
- Manual Editor has "AI Suggest" per field
- Both do similar things but in different contexts

#### 3. **Lost Context When Switching**
- Generate metadata in AI mode
- Switch to Manual mode to edit
- Lose the AI reasoning/context
- Can't easily refine the AI prompt

#### 4. **Unclear Mental Model**
Users ask: "Should I use AI or Manual?"
Answer should be: "Use BOTH together"

---

## Proposed Solution: Unified AI-Assisted Editor

### Core Concept
**"Manual editor with AI superpowers"** - ONE unified interface where:
- Manual editing is the default
- AI assists inline whenever needed
- No mode switching required
- Context preserved throughout

---

## Design Vision

### Single Unified Editor with 3 AI Assistance Levels

```
┌─────────────────────────────────────────────────────────┐
│  📝 Metadata Editor                                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  [Generate All with AI] ← Full generation               │
│                                                          │
│  ┌────────────────────────────────────────────┐        │
│  │ App Title                    [✨ AI Help]  │ ← Per-field AI
│  │ [Duolingo: Language Learning              ]│        │
│  │ 30/30 characters                           │        │
│  │ ✅ Perfect! Maximum indexing               │        │
│  └────────────────────────────────────────────┘        │
│                                                          │
│  ┌────────────────────────────────────────────┐        │
│  │ Subtitle                     [✨ AI Help]  │        │
│  │ [Spanish French German Tutor              ]│        │
│  │ 28/30 - Add 2 more chars                   │        │
│  └────────────────────────────────────────────┘        │
│                                                          │
│  ┌────────────────────────────────────────────┐        │
│  │ Keywords                     [✨ AI Help]  │        │
│  │ [learn,education,study,practice,fluent... ]│        │
│  │ 95/100 - Add 5 more chars                  │        │
│  └────────────────────────────────────────────┘        │
│                                                          │
│  💡 AI Suggestions Panel (collapsible)                  │
│  ┌────────────────────────────────────────────┐        │
│  │ Alternative titles:                        │ ← Inline suggestions
│  │ • "Duolingo: Learn Languages Fast"         │        │
│  │ • "Language Learning: Duolingo"            │        │
│  │   [Use This]                               │        │
│  └────────────────────────────────────────────┘        │
│                                                          │
│  [💾 Save Metadata]                                     │
└─────────────────────────────────────────────────────────┘
```

---

## Feature Breakdown

### 1. **Generate All with AI** (Top-level action)

**What it does:**
- Generates all 3 fields at once
- Uses competitive intelligence
- Applies App Store rules automatically
- **Populates the editor fields** (not a separate view)

**User flow:**
1. Click "Generate All with AI"
2. Loading state shows in all 3 fields
3. AI-generated content appears IN the editable fields
4. User can immediately start editing
5. AI suggestions remain visible below for alternatives

**Advantages:**
- ✅ No mode switching
- ✅ Can edit AI results immediately
- ✅ Can regenerate specific fields
- ✅ Context preserved

---

### 2. **Per-Field AI Help** (Field-level action)

**Enhanced "AI Help" button behavior:**

When user clicks "✨ AI Help" on a field:

```
┌────────────────────────────────────────────┐
│ App Title                    [✨ AI Help]  │
│ [Duolingo: Language Learning              ]│
│                                             │
│ 💡 AI Suggestions:                          │
│ ┌─────────────────────────────────────────┐│
│ │ Based on App Store rules:               ││
│ │                                          ││
│ │ ✨ "Duolingo: Learn Languages Fast"     ││
│ │    [Use This] [Refine]                  ││
│ │    30 chars • Brand + Keywords          ││
│ │                                          ││
│ │ ✨ "Language Learning: Duolingo App"    ││
│ │    [Use This] [Refine]                  ││
│ │    30 chars • Keywords + Brand          ││
│ │                                          ││
│ │ 🎯 Custom prompt:                        ││
│ │    [Make it more professional________]  ││
│ │    [Generate →]                          ││
│ └─────────────────────────────────────────┘│
└────────────────────────────────────────────┘
```

**Features:**
- Multiple suggestions (not just one)
- Each suggestion shows character count + reason
- Quick "Use This" buttons
- Custom prompt for refinement
- **Suggestions appear inline, not in separate panel**

---

### 3. **Smart Context-Aware Suggestions**

AI automatically considers:
- **Current field values** - Don't duplicate keywords
- **App Store rules** - 30/30/100 character targets
- **Brand + Keyword formula** - Structure guidance
- **Competitive keywords** - From competitive analysis
- **Auto-combination awareness** - Don't waste keywords

**Example prompt enhancement:**
```typescript
const generateFieldPrompt = (field: 'title' | 'subtitle' | 'keywords', context: {
  currentTitle: string;
  currentSubtitle: string;
  currentKeywords: string;
  competitorKeywords: string[];
  appName: string;
  category: string;
}) => {
  const usedKeywords = [
    ...extractKeywords(context.currentTitle),
    ...extractKeywords(context.currentSubtitle),
    ...context.currentKeywords.split(',').map(k => k.trim())
  ];

  if (field === 'title') {
    return `Generate an optimized App Store title following these STRICT rules:

App Name: ${context.appName}
Category: ${context.category}
Competitor Keywords: ${context.competitorKeywords.join(', ')}

CRITICAL RULES:
1. Structure: Brand + Keyword + Keyword
2. EXACTLY 30 characters (not 29, not 31)
3. Use compelling, search-friendly keywords
4. Example: "Duolingo: Language Learning" (exactly 30 chars)

Current subtitle keywords (DO NOT duplicate): ${context.currentSubtitle ? extractKeywords(context.currentSubtitle).join(', ') : 'none'}

Generate 3 alternative titles, each EXACTLY 30 characters.
Format: One per line, no explanation.`;
  }

  // Similar for subtitle and keywords...
};
```

---

### 4. **Real-Time Keyword Duplication Detection**

As user types, show warnings:

```
┌────────────────────────────────────────────┐
│ Keywords                     [✨ AI Help]  │
│ [learn,education,language,study,practice] │
│ 45/100 characters                          │
│                                             │
│ ⚠️ Duplicate detected: "language"          │
│    Already in: Title                       │
│    [Remove "language"] [Keep Anyway]       │
└────────────────────────────────────────────┘
```

---

### 5. **Auto-Generated Combinations Preview**

Show what App Store will create automatically:

```
┌──────────────────────────────────────────────┐
│ ✨ App Store Auto-Generated Keywords         │
├──────────────────────────────────────────────┤
│ Based on your title + subtitle:              │
│                                               │
│ • "language learning spanish"                │
│ • "duolingo french tutor"                    │
│ • "german language learning"                 │
│ • "learn spanish duolingo"                   │
│                                               │
│ 💡 These are FREE - no need to add manually! │
└──────────────────────────────────────────────┘
```

**Trigger:** Real-time as user types in title/subtitle
**Location:** Below the keywords field (context-aware)

---

## Implementation Plan

### Phase 1: Unify the Interface (Remove Mode Toggle)

#### Step 1.1: Remove Mode Toggle
- Delete `ModeToggle.tsx` component
- Remove `WorkspaceMode` type
- Single editor interface

#### Step 1.2: Merge AI Generation into Editor
- Move "Generate All" button to top of ManualMetadataEditor
- AI generation populates the editable fields directly
- No separate "SuggestedMetadataPanel"

#### Step 1.3: Enhanced Per-Field AI
- Replace simple "AI Suggest" with expandable suggestions panel
- Show 3 alternatives per field
- Add custom prompt input

---

### Phase 2: Smart Context-Aware AI

#### Step 2.1: Context Provider
```typescript
interface MetadataContext {
  currentTitle: string;
  currentSubtitle: string;
  currentKeywords: string;
  usedKeywords: string[];
  competitorKeywords: string[];
  appData: ScrapedMetadata;
}

const useMetadataContext = () => {
  // Track all fields
  // Extract used keywords
  // Provide to AI prompts
};
```

#### Step 2.2: Enhanced AI Prompts
- Use context in all AI requests
- Enforce App Store rules
- Prevent keyword duplication
- Character count validation

---

### Phase 3: Real-Time Features

#### Step 3.1: Duplication Detection
```typescript
const useDuplicationDetection = (metadata: MetadataField) => {
  const titleKeywords = extractKeywords(metadata.title);
  const subtitleKeywords = extractKeywords(metadata.subtitle);
  const keywordsList = metadata.keywords.split(',').map(k => k.trim());

  return {
    titleDuplicatesInSubtitle: subtitleKeywords.filter(k => titleKeywords.includes(k)),
    titleDuplicatesInKeywords: keywordsList.filter(k => titleKeywords.includes(k)),
    subtitleDuplicatesInKeywords: keywordsList.filter(k => subtitleKeywords.includes(k))
  };
};
```

#### Step 3.2: Auto-Combination Preview
```typescript
const useAutoCombinations = (title: string, subtitle: string) => {
  const titleKeywords = extractKeywords(title);
  const subtitleKeywords = extractKeywords(subtitle);

  // Generate all possible combinations
  const combinations = titleKeywords.flatMap(tk =>
    subtitleKeywords.map(sk => `${tk} ${sk}`)
  );

  return combinations.slice(0, 10); // Show top 10
};
```

---

## New Component Structure

### Unified Editor Component

```typescript
// UnifiedMetadataEditor.tsx
export const UnifiedMetadataEditor: React.FC<Props> = ({
  initialData,
  organizationId
}) => {
  const [metadata, setMetadata] = useState<MetadataField>({
    title: initialData.title || '',
    subtitle: initialData.subtitle || '',
    keywords: initialData.keywords || ''
  });

  const [aiSuggestions, setAiSuggestions] = useState<{
    title: string[];
    subtitle: string[];
    keywords: string[];
  }>({ title: [], subtitle: [], keywords: [] });

  const [expandedField, setExpandedField] = useState<keyof MetadataField | null>(null);

  return (
    <div className="space-y-6">
      {/* Generate All Button */}
      <Button onClick={handleGenerateAll}>
        <Sparkles /> Generate All with AI
      </Button>

      {/* Title Field with Inline AI */}
      <FieldWithAI
        label="App Title"
        value={metadata.title}
        onChange={(v) => setMetadata(prev => ({ ...prev, title: v }))}
        limit={30}
        suggestions={aiSuggestions.title}
        expanded={expandedField === 'title'}
        onExpand={() => setExpandedField('title')}
        onRequestSuggestions={() => generateFieldSuggestions('title')}
        tooltip={<AppTitleTooltip />}
      />

      {/* Subtitle Field with Inline AI */}
      <FieldWithAI
        label="Subtitle"
        value={metadata.subtitle}
        onChange={(v) => setMetadata(prev => ({ ...prev, subtitle: v }))}
        limit={30}
        suggestions={aiSuggestions.subtitle}
        expanded={expandedField === 'subtitle'}
        onExpand={() => setExpandedField('subtitle')}
        onRequestSuggestions={() => generateFieldSuggestions('subtitle')}
        tooltip={<SubtitleTooltip />}
      />

      {/* Keywords Field with Inline AI */}
      <FieldWithAI
        label="Keywords"
        value={metadata.keywords}
        onChange={(v) => setMetadata(prev => ({ ...prev, keywords: v }))}
        limit={100}
        suggestions={aiSuggestions.keywords}
        expanded={expandedField === 'keywords'}
        onExpand={() => setExpandedField('keywords')}
        onRequestSuggestions={() => generateFieldSuggestions('keywords')}
        tooltip={<KeywordsTooltip />}
        multiline
      />

      {/* Duplication Warnings */}
      <DuplicationWarnings metadata={metadata} />

      {/* Auto-Generated Combinations Preview */}
      <AutoCombinationsPreview
        title={metadata.title}
        subtitle={metadata.subtitle}
      />

      {/* Save Button */}
      <Button onClick={handleSave}>
        <Save /> Save Metadata
      </Button>
    </div>
  );
};
```

---

## FieldWithAI Component (Reusable)

```typescript
interface FieldWithAIProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  limit: number;
  suggestions: string[];
  expanded: boolean;
  onExpand: () => void;
  onRequestSuggestions: () => void;
  tooltip?: React.ReactNode;
  multiline?: boolean;
}

export const FieldWithAI: React.FC<FieldWithAIProps> = ({
  label,
  value,
  onChange,
  limit,
  suggestions,
  expanded,
  onExpand,
  onRequestSuggestions,
  tooltip,
  multiline = false
}) => {
  return (
    <div className="space-y-2">
      {/* Label with Tooltip */}
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          {label}
          {tooltip}
        </Label>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRequestSuggestions}
          className="text-yodel-orange"
        >
          <Sparkles className="w-3 h-3 mr-1" />
          AI Help
        </Button>
      </div>

      {/* Input Field */}
      {multiline ? (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-zinc-800 border-zinc-700"
        />
      ) : (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-zinc-800 border-zinc-700"
        />
      )}

      {/* Character Counter */}
      <CharacterCounter current={value.length} limit={limit} />

      {/* AI Suggestions Panel (Expandable) */}
      {expanded && suggestions.length > 0 && (
        <Card className="bg-zinc-900/50 border-blue-700/30">
          <CardHeader>
            <CardTitle className="text-sm">AI Suggestions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {suggestions.map((suggestion, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between bg-zinc-800 p-2 rounded"
              >
                <span className="text-sm">{suggestion}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {suggestion.length}/{limit}
                  </Badge>
                  <Button
                    size="sm"
                    onClick={() => onChange(suggestion)}
                    className="text-xs"
                  >
                    Use This
                  </Button>
                </div>
              </div>
            ))}

            {/* Custom Prompt */}
            <div className="pt-2 border-t border-zinc-700">
              <Label className="text-xs text-zinc-400">Custom refinement:</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  placeholder="e.g., Make it more professional"
                  className="text-sm"
                />
                <Button size="sm">
                  Generate
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
```

---

## User Benefits

### Before (Separate Modes)
- ❌ Generate metadata → Switch modes → Edit → Lose context
- ❌ Manual typing → Request AI help per field → Slow
- ❌ Unclear which mode to use
- ❌ Friction in workflow

### After (Unified)
- ✅ One interface for everything
- ✅ AI assistance always available inline
- ✅ Edit AI results immediately
- ✅ Context preserved throughout
- ✅ Real-time duplication warnings
- ✅ See auto-generated combinations live
- ✅ No mode switching friction

---

## Migration Strategy

### Option A: Complete Replacement
1. Build new UnifiedMetadataEditor
2. Replace MetadataWorkspace completely
3. Delete ModeToggle, SuggestedMetadataPanel
4. One big PR

**Pros**: Clean break, better UX immediately
**Cons**: Riskier, more testing needed

### Option B: Gradual Enhancement
1. Keep existing modes initially
2. Add new "Smart Editor" mode
3. Deprecate old modes gradually
4. Remove after user adoption

**Pros**: Lower risk, easier rollback
**Cons**: Temporary complexity, slower adoption

---

## Recommendation

**Implement Option A (Complete Replacement)** because:
1. Current modes are already confusing users
2. Unified approach is clearer mental model
3. Less code to maintain long-term
4. Better user experience from day 1

---

## Files to Create

### New Components
1. `UnifiedMetadataEditor.tsx` - Main editor component
2. `FieldWithAI.tsx` - Reusable field with inline AI
3. `DuplicationWarnings.tsx` - Real-time duplicate detection
4. `AutoCombinationsPreview.tsx` - Show auto-generated keywords
5. `AIFieldSuggestions.tsx` - Inline suggestions panel

### Files to Modify
6. `MetadataWorkspace.tsx` - Use UnifiedMetadataEditor instead of modes
7. `CharacterCounter.tsx` - Already enhanced ✅
8. `MetadataOptimizationHints.tsx` - Already created ✅

### Files to Delete
9. `ModeToggle.tsx` - No longer needed
10. `SuggestedMetadataPanel.tsx` - Merged into unified editor

---

**Author:** Claude Code
**Date:** 2025-01-18
**Status:** 🎯 Design Ready - Awaiting Implementation Decision
