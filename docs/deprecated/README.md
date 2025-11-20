---
Status: ACTIVE
Version: v1.0
Last Updated: 2025-01-20
Purpose: Deprecated documentation index
Audience: Developers, Historians
---

# Deprecated Documentation

Historical documentation for deprecated features and superseded architecture patterns.

## Overview

This section contains documentation for features and systems that are no longer in active use but are preserved for historical reference and migration guidance.

**Warning:** Do not implement patterns from this section. See [ARCHITECTURE_V1.md](../02-architecture/ARCHITECTURE_V1.md) for current production architecture.

## Contents

### Deprecated Features

#### Demo Mode
**Directory:** [demo-mode/](./demo-mode/)
**Status:** DEPRECATED
**Superseded By:** Production data only
**Contents:**
- [DEMO_MODE_REMOVAL_PLAN.md](./demo-mode/DEMO_MODE_REMOVAL_PLAN.md) - Removal plan
- [DEMO_INSTRUCTIONS.md](./demo-mode/DEMO_INSTRUCTIONS.md) - Historical demo instructions

#### Google Play
**Directory:** [google-play/](./google-play/)
**Status:** DEPRECATED (Not implemented)
**Superseded By:** Apple App Store only (V1)
**Contents:**
- [GOOGLE_PLAY_IMPLEMENTATION_PLAN.md](./google-play/GOOGLE_PLAY_IMPLEMENTATION_PLAN.md)
- [GOOGLE_PLAY_SCRAPER_PRODUCTION_PLAN.md](./google-play/GOOGLE_PLAY_SCRAPER_PRODUCTION_PLAN.md)

#### Keyword Tracking
**Directory:** [keyword-tracking/](./keyword-tracking/)
**Status:** DEPRECATED
**Superseded By:** BigQuery-only metrics (Dashboard V2)
**Contents:**
- [KEYWORD_TRACKING_TECHNICAL_SPEC.md](./keyword-tracking/KEYWORD_TRACKING_TECHNICAL_SPEC.md)
- [KEYWORD_CAPABILITIES_ASSESSMENT.md](./keyword-tracking/KEYWORD_CAPABILITIES_ASSESSMENT.md)
- [KEYWORD_INTELLIGENCE_REMOVAL_YODEL_MOBILE.md](./keyword-tracking/KEYWORD_INTELLIGENCE_REMOVAL_YODEL_MOBILE.md) - Removal documentation

### Deprecated Architecture Patterns

#### Old Authorization
**Directory:** [old-authorization/](./old-authorization/)
**Status:** DEPRECATED
**Superseded By:** [ARCHITECTURE_V1.md](../02-architecture/ARCHITECTURE_V1.md)
**Contents:**
- [authz_matrix.md](./old-authorization/authz_matrix.md) - Old `authorize` Edge Function (unused)

**Migration:** Use `usePermissions()` hook + `user_permissions_unified` view (see ARCHITECTURE_V1.md)

#### Validation Layer
**Directory:** [validation-layer/](./validation-layer/)
**Status:** DEPRECATED
**Superseded By:** [ARCHITECTURE_V1.md](../02-architecture/ARCHITECTURE_V1.md)
**Contents:**
- [VALIDATION_STATUS.md](./validation-layer/VALIDATION_STATUS.md) - ASO Intelligence validation (feature not in production)

#### Old Workflows
**Directory:** [old-workflows/](./old-workflows/)
**Status:** DEPRECATED
**Superseded By:** [docs/05-workflows/](../05-workflows/)
**Contents:**
- Historical workflow documentation
- Superseded deployment procedures

## Migration Guidelines

**If you find yourself implementing patterns from this section:**

1. ❌ **STOP** - Do not implement deprecated patterns
2. ✅ **Check V1 Architecture:** [ARCHITECTURE_V1.md](../02-architecture/ARCHITECTURE_V1.md)
3. ✅ **Ask Team:** Verify current implementation approach
4. ✅ **Update References:** If you found a link to deprecated docs, update it

## Why We Keep Deprecated Docs

**Historical Context:**
- Understanding why patterns were changed
- Migration reference for legacy code
- Decision record preservation

**Not For:**
- ❌ New implementations
- ❌ Feature reference
- ❌ API documentation

## Related Documentation

- **Current Architecture:** [ARCHITECTURE_V1.md](../02-architecture/ARCHITECTURE_V1.md)
- **Current Features:** [docs/03-features/](../03-features/)
- **Current Workflows:** [docs/05-workflows/](../05-workflows/)

## Target Audience

- **Developers** - Understanding historical context, avoiding deprecated patterns
- **Historians** - Feature evolution, architectural decisions
- **Migration Teams** - Reference for legacy code updates
