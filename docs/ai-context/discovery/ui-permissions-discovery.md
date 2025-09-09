# UI Permissions — Step 0 Discovery
**Date:** 2025-09-09T15:14:38+02:00
## Page & Components
src/pages/admin.tsx:9:import { UIPermissionManager } from '@/components/admin/ui/UIPermissionManager';
src/pages/admin.tsx:49:        return <UIPermissionManager />;
src/pages/UIPermissionDemoPage.tsx:2:import { UIPermissionDemo } from '@/components/demo/UIPermissionDemo';
src/pages/UIPermissionDemoPage.tsx:4:const UIPermissionDemoPage: React.FC = () => {
src/pages/UIPermissionDemoPage.tsx:7:      <UIPermissionDemo />
src/pages/UIPermissionDemoPage.tsx:12:export default UIPermissionDemoPage;
src/services/uiPermissions.ts:3:export interface UIPermissions {
src/services/uiPermissions.ts:8:  permissions: UIPermissions;
src/services/uiPermissions.ts:17:  static async getPermissions(userId: string): Promise<UIPermissions> {
src/services/uiPermissions.ts:35:  private static async fetchFromServer(userId: string): Promise<UIPermissions> {
src/services/uiPermissions.ts:47:      const permissions: UIPermissions = {};
src/services/uiPermissions.ts:68:export class UIPermissionService {
src/services/uiPermissions.ts:69:  async getUserPermissions(userId: string): Promise<UIPermissions> {
src/services/uiPermissions.ts:105:export const uiPermissionService = new UIPermissionService();
src/hooks/useDataAccess.ts:3:import { useUIPermissions } from '@/hooks/useUIPermissions';
src/hooks/useDataAccess.ts:14:  const { canAccessAllOrganizations } = useUIPermissions();
src/components/PermissionWrapper.tsx:2:import { useUIPermissions } from '@/hooks/useUIPermissions';
src/components/PermissionWrapper.tsx:22:  const { hasContextPermission, loading: permissionsLoading, canAccessAllOrganizations } = useUIPermissions();
src/components/admin/ui/UIPermissionManager.tsx:12:interface UIPermission {
src/components/admin/ui/UIPermissionManager.tsx:41:export const UIPermissionManager: React.FC = () => {
src/components/admin/ui/UIPermissionManager.tsx:59:      data?.forEach((perm: UIPermission) => {
src/components/admin/ui/UIPermissionManager.tsx:156:          <CardTitle>UI Permission Management</CardTitle>
src/components/admin/ui/UIPermissionManager.tsx:173:            UI Permission Management
src/hooks/useUIPermissions.ts:4:import { uiPermissionService, UIPermissions } from '@/services/uiPermissions';
src/hooks/useUIPermissions.ts:6:export const useUIPermissions = () => {
src/hooks/useUIPermissions.ts:9:  const [permissions, setPermissions] = useState<UIPermissions>({});
src/hooks/useUIPermissions.ts:154:const SUPER_ADMIN_PERMISSIONS: UIPermissions = {
src/components/AppSidebar.tsx:37:import { useUIPermissions } from "@/hooks/useUIPermissions";
src/components/AppSidebar.tsx:141:  const { hasPermission, loading: uiPermissionsLoading } = useUIPermissions();
src/components/SuperAdminBadge.tsx:3:import { useUIPermissions } from '@/hooks/useUIPermissions';
src/components/SuperAdminBadge.tsx:6:  const { canManagePlatform } = useUIPermissions();
src/components/SuperAdminOrganizationSelector.tsx:6:import { useUIPermissions } from '@/hooks/useUIPermissions';
src/components/SuperAdminOrganizationSelector.tsx:29:  const { canAccessAllOrganizations } = useUIPermissions();
src/components/demo/UIPermissionDemo.tsx:14:import { useUIPermissions } from '@/hooks/useUIPermissions';
src/components/demo/UIPermissionDemo.tsx:17:export const UIPermissionDemo: React.FC = () => {
src/components/demo/UIPermissionDemo.tsx:26:  } = useUIPermissions();
src/App.tsx:46:const UIPermissionDemoPage = lazy(() => import("./pages/UIPermissionDemoPage"));
src/App.tsx:196:                            element={<ProtectedRoute><UIPermissionDemoPage /></ProtectedRoute>}
## Hooks
src/hooks/useDataAccess.ts:3:import { useUIPermissions } from '@/hooks/useUIPermissions';
src/hooks/useDataAccess.ts:14:  const { canAccessAllOrganizations } = useUIPermissions();
src/hooks/useUIPermissions.ts:6:export const useUIPermissions = () => {
src/components/AppSidebar.tsx:37:import { useUIPermissions } from "@/hooks/useUIPermissions";
src/components/AppSidebar.tsx:141:  const { hasPermission, loading: uiPermissionsLoading } = useUIPermissions();
src/components/PermissionWrapper.tsx:2:import { useUIPermissions } from '@/hooks/useUIPermissions';
src/components/PermissionWrapper.tsx:22:  const { hasContextPermission, loading: permissionsLoading, canAccessAllOrganizations } = useUIPermissions();
src/components/SuperAdminBadge.tsx:3:import { useUIPermissions } from '@/hooks/useUIPermissions';
src/components/SuperAdminBadge.tsx:6:  const { canManagePlatform } = useUIPermissions();
src/components/SuperAdminOrganizationSelector.tsx:6:import { useUIPermissions } from '@/hooks/useUIPermissions';
src/components/SuperAdminOrganizationSelector.tsx:29:  const { canAccessAllOrganizations } = useUIPermissions();
src/components/demo/UIPermissionDemo.tsx:14:import { useUIPermissions } from '@/hooks/useUIPermissions';
src/components/demo/UIPermissionDemo.tsx:26:  } = useUIPermissions();
## API/Fetchers
src/pages/api/admin/dashboard-metrics.ts:53:      supabase.from('profiles').select('id, last_login, created_at, user_roles(role)'),
src/pages/api/admin/dashboard-metrics.ts:56:      supabase.from('organization_apps').select(`
src/pages/api/admin/dashboard-metrics.ts:67:      supabase.from('organization_client_access').select('*'),
src/pages/api/admin/dashboard-metrics.ts:76:      supabase.from('organization_partnerships').select('*').then(
src/pages/api/admin/users/index.ts:148:        await supabase.from('profiles').delete().eq('id', authUser.user.id);
src/pages/api/admin/users/[id].ts:49:        await supabase.from('user_roles').delete().eq('user_id', id);
src/pages/api/admin/organizations/[id].ts:56:        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('organization_id', id),
src/pages/api/admin/organizations/[id].ts:57:        supabase.from('organization_apps').select('*', { count: 'exact', head: true }).eq('organization_id', id),
src/services/direct-itunes.service.ts:42:      const response = await fetch(searchUrl, {
src/services/direct-itunes.service.ts:91:      const response = await fetch(searchUrl, {
src/services/webRankService.ts:55:    const res = await fetch(`${BASE}/rank`, {
src/services/uiPermissions.ts:18:    const cacheKey = `ui_permissions:${userId}`;
src/services/uiPermissions.ts:37:      const { data, error } = await supabase.rpc('get_user_ui_permissions', {
src/services/uiPermissions.ts:60:    this.cache.delete(`ui_permissions:${userId}`);
src/services/uiPermissions.ts:81:      await supabase.from('ui_access_logs').insert({
src/services/creative-analysis.service.ts:200:      const response = await fetch(searchUrl);
src/services/creative-analysis.service.ts:224:              const lookupResp = await fetch(`https://itunes.apple.com/lookup?id=${app.trackId}&entity=software&country=${country}`);
src/services/creative-analysis.service.ts:335:    const response = await fetch(`https://itunes.apple.com/lookup?id=${appIds.join(',')}&country=${country}`);
src/services/creative-analysis.service.ts:390:      const response = await fetch(searchUrl);
src/components/ConversionIntelligence/BenchmarkTab.tsx:62:    refetch(metricId);
src/hooks/useEnhancedAsoInsights.ts:102:      await refetch();
src/components/ChatGPTAudit/AuditRunManager.tsx:208:        supabase.from('chatgpt_queries').delete().in('audit_run_id', runIds),
src/components/ChatGPTAudit/AuditRunManager.tsx:209:        supabase.from('chatgpt_query_results').delete().in('audit_run_id', runIds)
src/components/admin/ui/UIPermissionManager.tsx:52:        .from('ui_permissions')
src/components/admin/ui/UIPermissionManager.tsx:119:        .from('ui_permissions')
src/lib/middleware/usage-tracking.middleware.ts:60:    await supabase.from('user_usage').insert(usageData);
src/lib/middleware/error-handler.middleware.ts:56:    await supabase.from('error_logs').insert(errorData);
src/integrations/supabase/types.ts:2138:      role_permissions: {
src/integrations/supabase/types.ts:2156:            foreignKeyName: "role_permissions_permission_name_fkey"
src/integrations/supabase/types.ts:2313:      ui_permissions: {
src/integrations/supabase/types.ts:2663:      get_user_ui_permissions: {
src/components/AsoAiHub/CreativeAnalysis/FirstImpressionPanel.tsx:229:      const response = await fetch('/api/creative-vision-analyzer', {
## Edge Functions
5:drwxr-xr-x@  3 501  staff   96 Sep  7 18:04 admin-dashboard-metrics
6:drwxr-xr-x@  3 501  staff   96 Sep  3 12:16 admin-health
7:drwxr-xr-x@  3 501  staff   96 Sep  7 18:04 admin-organizations
8:drwxr-xr-x@  3 501  staff   96 Sep  7 18:04 admin-recent-activity
9:drwxr-xr-x@  3 501  staff   96 Sep  7 18:57 admin-users
10:drwxr-xr-x@  3 501  staff   96 Sep  7 18:04 admin-whoami
20:drwxr-xr-x@  3 501  staff   96 Sep  7 18:04 create-org-admin-user
supabase/functions/bigquery-aso-data/index.ts:300:serve(async (req) => {
supabase/functions/bigquery-aso-data/index.ts:325:    const supabaseClient = createClient(
supabase/functions/app-store-scraper/index.ts:19:serve(async (req) => {
supabase/functions/app-store-scraper/index.ts:39:    const supabase = createClient(
supabase/functions/sync-bigquery-apps/index.ts:145:serve(async () => {
supabase/functions/sync-bigquery-apps/index.ts:146:  const supabaseAdmin = createClient(
supabase/functions/query-enhancer/index.ts:319:serve(async (req) => {
supabase/functions/creative-vision-analyzer/index.ts:415:serve(async (req) => {
supabase/functions/app-discovery/index.ts:37:serve(async (req) => {
supabase/functions/app-discovery/index.ts:94:    const supabaseClient = createClient(
supabase/functions/admin-users/index.ts:34:serve(async (req) => {
supabase/functions/admin-users/index.ts:101:    const supabase = createClient(
supabase/functions/admin-users/index.ts:119:    const supabaseAdmin = createClient(
supabase/functions/enhanced-app-intelligence/index.ts:9:const supabase = createClient(supabaseUrl, supabaseServiceKey);
supabase/functions/enhanced-app-intelligence/index.ts:43:serve(async (req) => {
supabase/functions/enhanced-entity-intelligence/index.ts:11:const supabase = createClient(supabaseUrl, supabaseServiceKey);
supabase/functions/enhanced-entity-intelligence/index.ts:62:serve(async (req) => {
supabase/functions/chatgpt-visibility-query/index.ts:15:const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
supabase/functions/chatgpt-visibility-query/index.ts:34:serve(async (req) => {
supabase/functions/aso-chat/index.ts:11:serve(async (req) => {
supabase/functions/admin-dashboard-metrics/index.ts:9:serve(async (req) => {
supabase/functions/admin-dashboard-metrics/index.ts:15:    const supabase = createClient(
supabase/functions/chatgpt-topic-analysis/index.ts:17:const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
supabase/functions/chatgpt-topic-analysis/index.ts:62:serve(async (req) => {
supabase/functions/competitive-intelligence/index.ts:34:serve(async (req) => {
supabase/functions/competitive-intelligence/index.ts:40:    const supabase = createClient(supabaseUrl, supabaseServiceKey);
supabase/functions/ai-feature-extractor/index.ts:25:serve(async (req) => {
supabase/functions/admin-organizations/index.ts:9:serve(async (req) => {
supabase/functions/admin-organizations/index.ts:15:    const supabase = createClient(
supabase/functions/admin-whoami/index.ts:9:serve(async (req) => {
supabase/functions/admin-whoami/index.ts:15:    const supabase = createClient(
supabase/functions/ai-insights-generator/index.ts:12:const supabase = createClient(
supabase/functions/ai-insights-generator/index.ts:107:serve(async (req) => {
supabase/functions/create-org-admin-user/index.ts:4:serve(async (req) => {
supabase/functions/create-org-admin-user/index.ts:7:  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
supabase/functions/enhanced-response-analysis/index.ts:14:const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
supabase/functions/enhanced-response-analysis/index.ts:34:serve(async (req) => {
supabase/functions/webrank/index.ts:85:const supa = createClient(
supabase/functions/webrank/index.ts:148:serve(async (req) => {
supabase/functions/admin-health/index.ts:8:serve(async (req) => {
supabase/functions/admin-recent-activity/index.ts:9:serve(async (req) => {
supabase/functions/admin-recent-activity/index.ts:15:    const supabase = createClient(
supabase/functions/entity-intelligence-scraper/index.ts:10:const supabase = createClient(
supabase/functions/entity-intelligence-scraper/index.ts:17:serve(async (req) => {
## SQL/RPC
supabase/functions/bigquery-aso-data/index.ts:370:    const effectiveOrgId = isDemo ? DEMO_ORG_ID : organizationId;
supabase/functions/bigquery-aso-data/index.ts:373:    const approvedApps = await getApprovedApps(supabaseClient, effectiveOrgId);
supabase/functions/bigquery-aso-data/index.ts:376:    console.log('🔍 DEMO AUDIT [EDGE-1]: Effective ID:', effectiveOrgId);
supabase/functions/bigquery-aso-data/index.ts:408:      response = generateSecureDemoResponse(effectiveOrgId, requestBody);
supabase/functions/bigquery-aso-data/index.ts:421:            organizationId: effectiveOrgId,
supabase/functions/bigquery-aso-data/index.ts:447:        const demoResponse = generateSecureDemoResponse(effectiveOrgId, requestBody);
supabase/migrations/20250918120000_user_roles_refactor.sql:28:DROP TABLE IF EXISTS public.role_permissions;
supabase/migrations/20250918120000_user_roles_refactor.sql:29:CREATE TABLE public.role_permissions (
supabase/migrations/20250918120000_user_roles_refactor.sql:33:INSERT INTO public.role_permissions(role, permissions) VALUES
supabase/migrations/20250908124012_c36f3aaf-ecb8-4172-8f9b-fb680a52dc18.sql:2:CREATE TABLE public.ui_permissions (
supabase/migrations/20250908124012_c36f3aaf-ecb8-4172-8f9b-fb680a52dc18.sql:15:ALTER TABLE public.ui_permissions ENABLE ROW LEVEL SECURITY;
supabase/migrations/20250908124012_c36f3aaf-ecb8-4172-8f9b-fb680a52dc18.sql:18:CREATE POLICY "Super admins can manage UI permissions" ON public.ui_permissions
supabase/migrations/20250908124012_c36f3aaf-ecb8-4172-8f9b-fb680a52dc18.sql:22:CREATE POLICY "Users can view UI permissions for their role" ON public.ui_permissions
supabase/migrations/20250908124012_c36f3aaf-ecb8-4172-8f9b-fb680a52dc18.sql:33:INSERT INTO public.ui_permissions (role, permission_key, is_granted) VALUES
supabase/migrations/20250908124012_c36f3aaf-ecb8-4172-8f9b-fb680a52dc18.sql:95:CREATE INDEX idx_ui_permissions_role ON public.ui_permissions(role);
supabase/migrations/20250908124012_c36f3aaf-ecb8-4172-8f9b-fb680a52dc18.sql:96:CREATE INDEX idx_ui_permissions_key ON public.ui_permissions(permission_key);
supabase/migrations/20250908124012_c36f3aaf-ecb8-4172-8f9b-fb680a52dc18.sql:101:CREATE OR REPLACE FUNCTION public.get_user_ui_permissions(p_user_id UUID DEFAULT auth.uid())
supabase/migrations/20250908124012_c36f3aaf-ecb8-4172-8f9b-fb680a52dc18.sql:113:  FROM public.ui_permissions up
supabase/migrations/20250622175401-b575650b-aaf2-4fee-885a-d263682b5365.sql:2:-- Phase 1: Create required admin permissions first (dependencies for role_permissions)
supabase/migrations/20250622175401-b575650b-aaf2-4fee-885a-d263682b5365.sql:20:INSERT INTO public.role_permissions (role, permission_name) VALUES
supabase/migrations/20250622175401-b575650b-aaf2-4fee-885a-d263682b5365.sql:36:-- Phase 3: Assign SUPER_ADMIN role to test@test.com user (depends on role_permissions)
supabase/migrations/20250909120000_org_navigation_permissions.sql:128:-- Helper: resolve effective nav allowed (override -> org -> NULL)
supabase/migrations/20250909120000_org_navigation_permissions.sql:129:CREATE OR REPLACE FUNCTION public.get_effective_nav_allowed(p_org UUID, p_user UUID, p_route TEXT)
supabase/functions/query-enhancer/index.ts:67:    'marketing': ['low conversion rates', 'poor brand visibility', 'ineffective campaigns'],
supabase/functions/chatgpt-topic-analysis/utils.ts:44:    'effective', 'powerful', 'comprehensive', 'complete', 'full', 'custom', 'specialized', 'dedicated', 'experienced',
supabase/functions/chatgpt-topic-analysis/index.ts:674:  const positiveWords = ['best', 'great', 'excellent', 'recommend', 'top', 'reliable', 'popular', 'effective', 'useful'];
supabase/functions/chatgpt-topic-analysis/index.ts:806:    const positiveIndicators = ['recommend', 'best', 'great', 'excellent', 'top', 'good', 'effective', 'reliable', 'leading', 'premier', 'outstanding'];
## Candidate perm keys (from UI)
src/pages/api/admin/users/[id].ts:95:      const { error: authDeleteError } = await supabase.auth.admin.deleteUser(id as string);
src/pages/api/admin/users/index.ts:52:      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
src/pages/api/admin/users/index.ts:98:      const { data: authUser, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
src/pages/api/admin/users/index.ts:129:        await supabase.auth.admin.deleteUser(authUser.user.id);
src/pages/api/admin/users/index.ts:149:        await supabase.auth.admin.deleteUser(authUser.user.id);
src/pages/dashboard.tsx:299:          <PermissionWrapper permission="ui.debug.show_test_buttons">
src/utils/navigation.ts:26:    if (isSuperAdmin && hasPermission('ui.admin.platform_settings')) {
src/components/BigQuerySmokeTest.tsx:234:    <PermissionWrapper permission="ui.debug.show_test_buttons">
src/components/admin/system/SystemDebugPanel.tsx:24:    <PermissionWrapper permission="ui.admin.show_system_info">
src/components/admin/ui/UIPermissionManager.tsx:21:    'ui.debug.show_test_buttons',
src/components/admin/ui/UIPermissionManager.tsx:22:    'ui.debug.show_metadata',
src/components/admin/ui/UIPermissionManager.tsx:23:    'ui.debug.show_live_badges',
src/components/admin/ui/UIPermissionManager.tsx:24:    'ui.debug.show_performance_metrics'
src/components/admin/ui/UIPermissionManager.tsx:27:    'ui.admin.show_user_management',
src/components/admin/ui/UIPermissionManager.tsx:28:    'ui.admin.show_system_info'
src/hooks/useUIPermissions.ts:140:    canAccessDevTools: isSuperAdmin || hasPermission('ui.debug.show_test_buttons'),
src/hooks/useUIPermissions.ts:141:    canSeeDebugInfo: isSuperAdmin || hasPermission('ui.debug.show_metadata'),
src/hooks/useUIPermissions.ts:142:    canSeeLiveBadges: isSuperAdmin || hasPermission('ui.debug.show_live_badges'),
src/hooks/useUIPermissions.ts:143:    canSeePerformanceMetrics: isSuperAdmin || hasPermission('ui.debug.show_performance_metrics'),
src/hooks/useUIPermissions.ts:144:    canAccessAdminFeatures: isSuperAdmin || hasPermission('ui.admin.show_user_management'),
src/hooks/useUIPermissions.ts:145:    canSeeSystemInfo: isSuperAdmin || hasPermission('ui.admin.show_system_info'),
src/hooks/useUIPermissions.ts:155:  'ui.debug.show_test_buttons': true,
src/hooks/useUIPermissions.ts:156:  'ui.debug.show_live_badges': true,
src/hooks/useUIPermissions.ts:157:  'ui.debug.show_metadata': true,
src/hooks/useUIPermissions.ts:158:  'ui.debug.show_performance_metrics': true,
src/hooks/useUIPermissions.ts:159:  'ui.admin.show_user_management': true,
src/hooks/useUIPermissions.ts:160:  'ui.admin.manage_organizations': true,
src/hooks/useUIPermissions.ts:161:  'ui.admin.platform_settings': true,
src/hooks/useUIPermissions.ts:162:  'ui.debug.show_all_data': true
src/hooks/usePermissions.ts:43:        permissionsList.push('admin.manage_all', 'admin.approve_apps', 'admin.manage_apps', 'admin.view_audit_logs');
src/hooks/usePermissions.ts:46:        permissionsList.push('admin.manage_apps', 'admin.approve_apps', 'admin.view_org_data');
src/components/PermissionWrapper.tsx:38:  <PermissionWrapper permission="ui.debug.show_test_buttons">
src/components/PermissionWrapper.tsx:44:  <PermissionWrapper permission="ui.admin.show_user_management">
src/components/PermissionWrapper.tsx:50:  <PermissionWrapper permission="ui.debug.show_metadata">
src/components/PermissionWrapper.tsx:56:  <PermissionWrapper permission="ui.debug.show_live_badges">
src/components/PermissionWrapper.tsx:62:  <PermissionWrapper permission="ui.debug.show_performance_metrics">
src/components/PermissionWrapper.tsx:68:  <PermissionWrapper permission="ui.admin.show_system_info">
src/components/DebugToolsWrapper.tsx:19:    <PermissionWrapper permission="ui.debug.show_test_buttons">
src/components/DebugToolsWrapper.tsx:69:  <PermissionWrapper permission="ui.debug.show_metadata">
src/components/TopBar.tsx:85:              <PermissionWrapper permission="ui.debug.show_data_source" fallback={
src/components/AppDiscovery/PendingAppsTable.tsx:63:                  <PermissionWrapper permission="ui.debug.show_metadata">
src/components/AppDiscovery/ApprovedAppsTable.tsx:56:                      <PermissionWrapper permission="ui.debug.show_metadata">
