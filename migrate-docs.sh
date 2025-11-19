#!/bin/bash

# Documentation Restructuring Migration Script
# Purpose: Reorganize 278 markdown files into enterprise structure
# Date: 2025-11-19

set -e  # Exit on error

echo "🚀 Starting documentation migration..."

# ============================================================================
# PHASE 1: Move Active Feature Documentation
# ============================================================================

echo "📦 Phase 1: Moving active feature documentation..."

# Dashboard V2
mv DASHBOARD_V2_QUICK_REFERENCE.md docs/03-features/dashboard-v2/QUICK_REFERENCE.md 2>/dev/null || true
mv BIGQUERY_QUICK_REFERENCE.md docs/03-features/dashboard-v2/ 2>/dev/null || true
mv BIGQUERY_SCHEMA_AND_METRICS_MAP.md docs/03-features/dashboard-v2/BIGQUERY_SCHEMA_MAP.md 2>/dev/null || true
mv docs/DATA_PIPELINE_COMPLETE_AUDIT_2025.md docs/03-features/dashboard-v2/DATA_PIPELINE_AUDIT.md 2>/dev/null || true
mv docs/bigquery-integration.md docs/03-features/dashboard-v2/ 2>/dev/null || true
mv docs/BIGQUERY_RESEARCH_INDEX.md docs/03-features/dashboard-v2/ 2>/dev/null || true

# Reviews
mv docs/REVIEWS-SYSTEM-README.md docs/03-features/reviews/README.md 2>/dev/null || true
mv docs/ADR-reviews-system.md docs/03-features/reviews/ 2>/dev/null || true

# Admin Panel
mv docs/admin_panel_overview.md docs/03-features/admin-panel/README.md 2>/dev/null || true
mv docs/ADMIN_USERS_API.md docs/03-features/admin-panel/API_ADMIN_USERS.md 2>/dev/null || true
mv docs/ADMIN_USERS_LOGGING_EXAMPLES.md docs/03-features/admin-panel/logging-examples.md 2>/dev/null || true
mv docs/admin-users-env-check.md docs/03-features/admin-panel/env-check.md 2>/dev/null || true

# AI Chat
mv docs/AI_CHAT_QUICK_REFERENCE.md docs/03-features/ai-chat/QUICK_REFERENCE.md 2>/dev/null || true
mv docs/AI_CHAT_DATA_FLOW.md docs/03-features/ai-chat/data-flow.md 2>/dev/null || true
mv docs/AI_DASHBOARD_CHAT.md docs/03-features/ai-chat/dashboard-chat.md 2>/dev/null || true
mv docs/QUICKSTART_CHAT.md docs/03-features/ai-chat/quickstart.md 2>/dev/null || true
mv docs/ai-dashboard-chat-setup.md docs/03-features/ai-chat/setup.md 2>/dev/null || true
mv docs/ai-dashboard-chat-implementation-complete.md docs/03-features/ai-chat/implementation-complete.md 2>/dev/null || true

# ASO Intelligence
mv docs/aso-ai-hub-overview.md docs/03-features/aso-intelligence/README.md 2>/dev/null || true
mv docs/aso_platform_architecture.md docs/03-features/aso-intelligence/platform-architecture.md 2>/dev/null || true
mv docs/app-discovery-system.md docs/03-features/aso-intelligence/app-discovery.md 2>/dev/null || true

# Super Admin
mv SUPER_ADMIN_QUICK_REFERENCE.md docs/03-features/super-admin/QUICK_REFERENCE.md 2>/dev/null || true

# Design System (already in place, just move into numbered structure)
# docs/design-system/ already exists, renamed to docs/06-design-system/
mv docs/design-system docs/06-design-system 2>/dev/null || true

echo "✅ Phase 1 complete"

# ============================================================================
# PHASE 2: Move Architecture & System Design Docs
# ============================================================================

echo "📦 Phase 2: Moving architecture documentation..."

mv ORGANIZATION_ROLES_SYSTEM_DOCUMENTATION.md docs/02-architecture/system-design/ORGANIZATION_ROLES_SYSTEM.md 2>/dev/null || true
mv docs/auth_map.md docs/02-architecture/system-design/ 2>/dev/null || true
mv docs/authz_matrix.md docs/02-architecture/system-design/ 2>/dev/null || true
mv ENCRYPTION_STATUS.md docs/02-architecture/security-compliance/ 2>/dev/null || true
mv VALIDATION_STATUS.md docs/02-architecture/security-compliance/ 2>/dev/null || true

echo "✅ Phase 2 complete"

# ============================================================================
# PHASE 3: Move API Reference Docs
# ============================================================================

echo "📦 Phase 3: Moving API reference documentation..."

mv docs/USER_ORGANIZATION_API_CONTRACT.md docs/04-api-reference/USER_ORGANIZATION_CONTRACT.md 2>/dev/null || true
mv docs/whoami_contract.md docs/04-api-reference/ 2>/dev/null || true
mv docs/feature-permissions.md docs/04-api-reference/ 2>/dev/null || true
mv docs/db_rls_report.md docs/04-api-reference/ 2>/dev/null || true

echo "✅ Phase 3 complete"

# ============================================================================
# PHASE 4: Move Workflows & Operations Docs
# ============================================================================

echo "📦 Phase 4: Moving workflow documentation..."

mv USER_MANAGEMENT_GUIDE.md docs/05-workflows/ 2>/dev/null || true
mv docs/DEPLOYMENT.md docs/05-workflows/ 2>/dev/null || true
mv docs/navigation-feature-gating.md docs/05-workflows/ 2>/dev/null || true
mv YODEL_MOBILE_CORRECT_CONTEXT.md docs/05-workflows/YODEL_MOBILE_CONTEXT.md 2>/dev/null || true

echo "✅ Phase 4 complete"

# ============================================================================
# PHASE 5: Move Troubleshooting Docs
# ============================================================================

echo "📦 Phase 5: Moving troubleshooting documentation..."

mv docs/troubleshooting-app-discovery.md docs/08-troubleshooting/app-discovery.md 2>/dev/null || true

echo "✅ Phase 5 complete"

# ============================================================================
# PHASE 6: Archive Historical Documentation
# ============================================================================

echo "📦 Phase 6: Archiving historical documentation..."

# Phase A (Metadata System)
mv PHASE_A*.md docs/archive/phases/phase-a-metadata/ 2>/dev/null || true

# Phase B (Naming)
mv PHASE_B*.md docs/archive/phases/phase-b-naming/ 2>/dev/null || true

# Phase C-F
mv PHASE_C*.md PHASE_D*.md PHASE_E*.md PHASE_F*.md docs/archive/phases/phase-c-f-misc/ 2>/dev/null || true

# Phase 1-6
mv PHASE_1*.md PHASE_2*.md PHASE_3*.md PHASE_4*.md PHASE_6*.md PHASE1*.md PHASE2*.md PHASE3*.md PHASE4*.md PHASE6*.md docs/archive/phases/phase-1-6-systems/ 2>/dev/null || true

# Root-level completed fixes
mv *_COMPLETE.md *_FIX*.md *_DEPLOYED.md docs/archive/root-level-fixes/ 2>/dev/null || true
mv IMPLEMENTATION_COMPLETE.md MERGE_COMPLETE_SUMMARY.md SOFT_DELETE_DEPLOYMENT.md docs/archive/root-level-fixes/ 2>/dev/null || true

# Audits
mv DASHBOARD_V2_AUDIT.md DASHBOARD_AUDIT_ANALYSIS.md docs/archive/audits/2025-11-features/ 2>/dev/null || true
mv DATABASE_VIEWS_AND_EDGE_FUNCTIONS_AUDIT.md docs/archive/audits/2025-11-architecture/ 2>/dev/null || true
mv AUDIT_SCOPE_CLARIFICATION.md docs/archive/audits/2025-11-features/ 2>/dev/null || true
mv docs/AUDIT_SECTIONS_CLEANUP.md docs/archive/audits/2025-11-features/ 2>/dev/null || true
mv ARCHITECTURE_AUDIT_UNIFIED_ENGINE.md docs/archive/audits/2025-11-architecture/ 2>/dev/null || true
mv CONTEXT_CONTRADICTION_AUDIT.md docs/archive/audits/2025-11-architecture/ 2>/dev/null || true
mv DOCUMENTATION_AUDIT_SUMMARY.md docs/archive/audits/2025-11-features/ 2>/dev/null || true
mv ENTERPRISE_READINESS_ASSESSMENT.md docs/archive/audits/2025-11-features/ 2>/dev/null || true
mv ERROR_ANALYSIS_AND_FIX_PLAN.md docs/archive/audits/2025-11-features/ 2>/dev/null || true
mv FINAL_SYSTEM_ANALYSIS_WITH_AGENCY_CONTEXT.md docs/archive/audits/2025-11-architecture/ 2>/dev/null || true
mv ACCESS_LEVEL_ARCHITECTURE_DEEP_DIVE.md docs/archive/audits/2025-11-architecture/ 2>/dev/null || true
mv YODEL_MOBILE_AGENCY_CONTEXT_ANALYSIS.md docs/archive/audits/2025-11-architecture/ 2>/dev/null || true
mv ORGANIZATION_ACCESS_CONTROL_AUDIT.md docs/archive/audits/2025-11-security/ 2>/dev/null || true
mv ORGANIZATION_FEATURE_ACCESS_IMPLEMENTATION.md docs/archive/audits/2025-11-features/ 2>/dev/null || true
mv RLS_AUTH_SYSTEM_ENTERPRISE_AUDIT.md docs/archive/audits/2025-11-security/ 2>/dev/null || true
mv MFA_IMPLEMENTATION_AUDIT.md docs/archive/audits/2025-11-security/ 2>/dev/null || true
mv NAVIGATION_VISIBILITY_AUDIT.md docs/archive/audits/2025-11-features/ 2>/dev/null || true
mv OPTION1_SCALABILITY_SECURITY_AUDIT.md docs/archive/audits/2025-11-security/ 2>/dev/null || true
mv SYSTEM_AUDIT_CONSOLE_ANALYSIS_2025_11_09.md docs/archive/audits/2025-11-features/ 2>/dev/null || true
mv SYSTEM_LEARNINGS_AND_ENHANCEMENTS_2025_11_09.md docs/archive/audits/2025-11-features/ 2>/dev/null || true
mv UX_ENTERPRISE_AUDIT_FINDINGS.md docs/archive/audits/2025-11-features/ 2>/dev/null || true

# Already organized completed-fixes (keep structure)
# docs/completed-fixes/ stays as is

echo "✅ Phase 6 complete"

# ============================================================================
# PHASE 7: Archive Deprecated Documentation
# ============================================================================

echo "📦 Phase 7: Archiving deprecated documentation..."

# Keyword Tracking (not implemented)
mv KEYWORD_*.md INTELLIGENCE_LAYER_VALIDATION.md docs/deprecated/keyword-tracking/ 2>/dev/null || true
mv docs/DELETED_KEYWORD_COMPONENTS.md docs/deprecated/keyword-tracking/ 2>/dev/null || true
mv docs/KEYWORD_INTELLIGENCE_REMOVAL_YODEL_MOBILE.md docs/deprecated/keyword-tracking/ 2>/dev/null || true

# Google Play (not in production)
mv GOOGLE_PLAY_*.md docs/deprecated/google-play/ 2>/dev/null || true
mv docs/GOOGLE_PLAY_SCRAPER_PRODUCTION_PLAN.md docs/deprecated/google-play/ 2>/dev/null || true

# Demo Mode (being removed)
mv DEMO_*.md docs/deprecated/demo-mode/ 2>/dev/null || true
mv scripts/verify-demo-foundation.md docs/deprecated/demo-mode/ 2>/dev/null || true

# Old implementation plans
mv FINAL_IMPLEMENTATION_PLAN.md FINALIZED_IMPLEMENTATION_PLAN.md docs/deprecated/old-workflows/ 2>/dev/null || true
mv COMPETITIVE_ANALYSIS_ENHANCEMENT_BLUEPRINT.md docs/deprecated/old-workflows/ 2>/dev/null || true
mv THEME_IMPACT_SCORING_IMPLEMENTATION_PLAN.md docs/deprecated/old-workflows/ 2>/dev/null || true
mv AI_AGENT_EXECUTION_PLAN.md AI_AGENT_SECURITY_COMPLIANCE_PLAN.md docs/deprecated/old-workflows/ 2>/dev/null || true
mv docs/FEATURE_AdminUIPermissions.md docs/deprecated/old-workflows/ 2>/dev/null || true
mv docs/ARCHITECTURE.md docs/deprecated/old-workflows/OLD_ARCHITECTURE.md 2>/dev/null || true
mv DOCUMENTATION_ORGANIZATION_PLAN.md docs/deprecated/old-workflows/ 2>/dev/null || true

echo "✅ Phase 7 complete"

# ============================================================================
# PHASE 8: Delete Obsolete Files
# ============================================================================

echo "📦 Phase 8: Removing obsolete files..."

rm -f VALIDATION_INSTRUCTIONS.md 2>/dev/null || true
rm -f DEBUG-WHOAMI-INSTRUCTIONS.md 2>/dev/null || true
rm -f docs/TESTING_PROMPT.md 2>/dev/null || true
rm -f docs/routing_fixes.md 2>/dev/null || true
rm -f docs/ai-insight-card-styling.md 2>/dev/null || true
rm -f docs/DIAGNOSTIC_IMPORT_CHAIN_LOGGING.md 2>/dev/null || true
rm -f docs/NO_ACCESS_IMPLEMENTATION.md 2>/dev/null || true
rm -f docs/REVIEW_ANALYSIS_SHARED_STATE_SECURITY.md 2>/dev/null || true
rm -f docs/tests_added.md 2>/dev/null || true
rm -f docs/demo_sections.md 2>/dev/null || true
rm -f docs/Project\ Instructions.md 2>/dev/null || true
rm -f architecture-overview.md 2>/dev/null || true

# Remove old Supabase CLI README
rm -f README.md 2>/dev/null || true

# Remove old ai-context directory (now empty)
rmdir docs/ai-context/discovery 2>/dev/null || true
rmdir docs/ai-context 2>/dev/null || true

echo "✅ Phase 8 complete"

# ============================================================================
# Summary
# ============================================================================

echo ""
echo "✅ Documentation migration complete!"
echo ""
echo "📊 Summary:"
echo "  - Active docs organized in /docs/01-08 sections"
echo "  - Historical docs archived in /docs/archive/"
echo "  - Deprecated docs in /docs/deprecated/"
echo "  - 12 obsolete files deleted"
echo ""
echo "📝 Next steps:"
echo "  1. Create new README.md"
echo "  2. Update DOCUMENTATION_INDEX.md"
echo "  3. Create README files for each section"
echo "  4. Verify all files moved correctly"
echo ""
