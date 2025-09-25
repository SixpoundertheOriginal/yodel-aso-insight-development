# ASO AI Hub – Component Audit

## Overview
- Route `/aso-ai-hub` provides the central interface for AI-assisted app store optimization (ASO) workflows.
- Page composes shared layouts, feature gating, workflow coordination, and the `AppAuditHub` feature shell.
- Key responsibilities: enforce access control, establish organization context, surface onboarding hero, and render the multi-tab audit workspace once an app is imported.

## Route Entry Point (`src/pages/aso-ai-hub.tsx`)

| Concern | Implementation | Notes |
| --- | --- | --- |
| Layout | `MainLayout` from `@/layouts` | Wraps entire page inside standard shell.
| Access control | `featureEnabledForRole('ASO_AI_HUB', currentUserRole)` | Falls back to `<NotAuthorized />` for non-admin roles.
| Context providers | `WorkflowProvider`, `AsoAiHubProvider` | Supply workflow orchestration and copilot session state to all nested components.
| Organization scope | `useDataAccess()` + `SuperAdminOrganizationSelector` | Super admins can switch org context; others inherit profile org.
| User context fetch | `useQuery(['user-context'])` + `supabase.auth.getUser()` | Retrieves viewer’s org if not super admin.
| Primary feature shell | `<AppAuditHub organizationId={...} />` | Renders when any organization scope is resolved.
| Hero | `HeroSection` with static copy | Displayed above the audit shell for marketing context.

### Access & Context Flow
1. Resolve user permissions via `useDataAccess` (leverages `useUserProfile` / `usePermissions`).
2. Derive role (`super_admin` when `canAccessAllOrgs`) to check ASO AI Hub feature flag.
3. Optionally show `SuperAdminOrganizationSelector` to choose org-specific view.
4. Fetch authenticated user profile via Supabase to pre-select org when not super admin.
5. Pass resolved organization identifier to `AppAuditHub`.

## Providers

### `WorkflowProvider` (`src/context/WorkflowContext.tsx`)
- Manages template catalog (`workflowTemplates`) for multi-step ASO workflows.
- Tracks active workflow, step data, history, and completion status.
- Exposes `startWorkflow`, `completeStep`, `transferToCopilot`, and `getWorkflowProgress`.
- Dispatches `workflow-transfer` custom events consumed by `AsoAiHubProvider` to switch copilots automatically.

### `AsoAiHubProvider` (`src/context/AsoAiHubContext.tsx`)
- Maintains catalog of available copilots (knowledge engine, metadata copilot, growth gap finder, etc.).
- Tracks `activeCopilot`, current session log, and supports message ingestion (`addMessage`) & session resets.
- Listens for `workflow-transfer` events to orchestrate copilot hand-offs and inject transfer context messages.

## Data Access & Supabase Integration
- `useDataAccess` returns org scope metadata (platform vs organization) by combining profile info and role permissions.
- `Supabase` usage within the page:
  - `supabase.auth.getUser()` for the authenticated user.
  - `profiles` table fetch to determine default `organization_id`.
- `SuperAdminOrganizationSelector` (`src/components/SuperAdminOrganizationSelector.tsx`):
  - Fetches `organizations` via Supabase when `isSuperAdmin`.
  - Renders a card with `Select` UI allowing platform-level or specific org context.
  - Works with optional `allowAllOrgs` flag to include platform-wide aggregated view.

## Core Feature Shell – `AppAuditHub` (`src/components/AppAudit/AppAuditHub.tsx`)

### Responsibilities
- Handles onboarding (pre-import state) and the full audit workspace once metadata is imported.
- Coordinates data fetching via `useEnhancedAppAudit`, manual refresh, PDF/JSON export, and toast notifications.
- Manages internal tab state (`Tabs` from the ShadCN UI kit) to reveal specialized analyses.

### Dependencies & Services
- Hooks: `useEnhancedAppAudit` (aggregates keyword analytics, metadata scoring, competitor intel), `toast` from `sonner`.
- Services: `semanticClusteringService`, `metadataScoringService`, Supabase queries inside `useEnhancedAppAudit`.
- Utilities: `html2canvas` + `jsPDF` for PDF export; `isDebugTarget` flagging.
- UI toolkit: cards, tabs, buttons, badges from `@/components/ui` and icons from `lucide-react`.

### Onboarding State (No App Imported)
- Displays introductory copy and capability cards (Keyword Analysis, Metadata Optimization, Creative Analysis, Competitive Intelligence).
- Renders `MetadataImporter` to capture App Store URL / selection and emit `onImportSuccess` callback.

### Active Audit State (App Imported)
- Header surfaces app identity, debug label, and last-updated timestamp with refresh / export actions.
- Summary grid cards show overall, metadata, keyword, creative, competitive scores, and opportunity count.
- `Tabs` (`overview`, `search-domination`, `metadata`, `keywords`, `creative`, `competitors`, `recommendations`) switch between domain-specific panels.

### Tab Modules

| Tab | Component | Purpose | Notable Dependencies |
| --- | --- | --- | --- |
| overview | `EnhancedOverviewTab` | Runs element-by-element analysis (name, title, subtitle, description, screenshots, icon). | `AppElementAnalysisService`, UI cards, loading spinner.
| search-domination | `SearchDominationTab` | Hosts unified keyword intelligence dashboard. | `UnifiedKeywordIntelligence`, organization/app IDs.
| metadata | `MetadataWorkspace` | Hybrid AI/manual metadata editor with Supabase persistence. | `useCopilotChat`, `supabase`, mode toggle, integrity checks.
| keywords | `KeywordTrendsTable` | Shows keyword trend data from audit hook. | Accepts trends array and loading flag.
| creative | `CreativeAnalysisPanel` | Evaluates creative assets with optional competitor context. | Visual analysis utilities inside creative module.
| competitors | `CompetitiveKeywordAnalysis` | Compares competitor keywords vs user keywords. | Data from `useEnhancedAppAudit`.
| recommendations | Inline card | Displays prioritized recommendations with impact meters. | Recommendations array from audit data.

### Supporting Subsystems
- `MetadataImporter` (`src/components/AsoAiHub/MetadataCopilot/MetadataImporter.tsx`)
  - Offers multiple search modes (selector, existing, pre-launch).
  - Integrates `asoSearchService`, `strategicKeywordResearchService`, `userExperienceShieldService`, and `useDebouncedSearch` for resilient import flows.
  - Writes to toast notifications and leverages Super Admin context to determine org scope.
- `MetadataWorkspace` (`src/components/AsoAiHub/MetadataCopilot/MetadataWorkspace.tsx`)
  - Hosts AI generation vs manual editing modes for metadata fields.
  - Persists metadata to `metadata_versions` table via Supabase.
  - Invokes `useCopilotChat` for AI suggestions and displays integrity reports in development.
- `useEnhancedAppAudit` (`src/hooks/useEnhancedAppAudit.ts`)
  - Orchestrates asynchronous keyword analytics, semantic clustering, metadata scoring, and competitor queries.
  - Applies guard rails (cooldown timers, dependency memoization) to prevent redundant audits.
  - Produces `auditData` with composite scores, trends, competitor analysis, and recommendations.

### Export & Refresh Capabilities
- `handleRefresh` calls `refreshAudit` (from `useEnhancedAppAudit`) and surfaces success toast.
- `handleExportReport` generates downloadable JSON via `generateAuditReport()`.
- `handleExportPDF` captures dashboard DOM with `html2canvas`, converts to PDF using `jsPDF`, temporarily adjusts styles, and restores them afterward.

## Additional Components & Utilities
- `HeroSection` (`src/components/ui/design-system/HeroSection.tsx`): gradient hero banner with optional primary/secondary actions.
- `NotAuthorized` (`src/components/NotAuthorized`): reused access denial panel with customizable messaging.
- `Brain`, `Target` icons from `lucide-react`: `Brain` used in headers and hero; `Target` import in page is currently unused.

## Observations & Follow-ups
- `useNavigate` and the `Target` icon imported in `src/pages/aso-ai-hub.tsx` are not utilized; consider removing to reduce bundle size.
- Ensure environment variables enable `react-query` caching for `user-context` if access patterns expand.
- PDF export depends on DOM availability and may need testing in SSR / headless environments.
