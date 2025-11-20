---
Status: ACTIVE
Version: v1.0
Last Updated: 2025-01-20
Purpose: Architecture section overview and navigation
Audience: Developers, Architects, AI Agents, Compliance Auditors
---

# Architecture Documentation

This section contains system architecture, design decisions, and security compliance documentation for the Yodel ASO Insight platform V1 (current production).

## Contents

### Core Architecture
- **[ARCHITECTURE_V1.md](./ARCHITECTURE_V1.md)** ⭐ CANONICAL - Complete V1 production architecture (3,950 lines)

### System Design
- **[ORGANIZATION_ROLES_SYSTEM.md](./system-design/ORGANIZATION_ROLES_SYSTEM.md)** ⭐ CANONICAL - Organization roles, permissions, relationships (1,948 lines)
- **[auth_map.md](./system-design/auth_map.md)** - Authentication and RBAC map (⚠️ Needs rewrite for V1 patterns)

### Security & Compliance
- **[ENCRYPTION_STATUS.md](./security-compliance/ENCRYPTION_STATUS.md)** - SOC 2/ISO 27001/GDPR compliance (Accuracy: 10/10)

### Database (Planned - P1.4)
- [database/schema-reference.md](./database/schema-reference.md) - Complete schema reference (TO BE CREATED)
- [database/erd-diagrams.md](./database/erd-diagrams.md) - Entity-relationship diagrams (TO BE CREATED)
- [database/migrations.md](./database/migrations.md) - Migration history and procedures (TO BE CREATED)

## Quick Links

**Start Here:**
- [ARCHITECTURE_V1.md](./ARCHITECTURE_V1.md) - Single source of truth for V1 production architecture

**For Developers:**
- Organization roles: [ORGANIZATION_ROLES_SYSTEM.md](./system-design/ORGANIZATION_ROLES_SYSTEM.md)
- Security compliance: [ENCRYPTION_STATUS.md](./security-compliance/ENCRYPTION_STATUS.md)

**For AI Agents:**
- Read [ARCHITECTURE_V1.md](./ARCHITECTURE_V1.md) first
- Then [AI_AGENT_QUICKSTART.md](../07-ai-development/AI_AGENT_QUICKSTART.md)

## Related Documentation

- **Getting Started:** [docs/01-getting-started/](../01-getting-started/)
- **Features:** [docs/03-features/](../03-features/)
- **API Reference:** [docs/04-api-reference/](../04-api-reference/)
- **Workflows:** [docs/05-workflows/](../05-workflows/)

## Target Audience

- **Developers** - System understanding, implementation patterns
- **Architects** - Design decisions, system design
- **AI Agents** - Canonical reference for code generation
- **Compliance Auditors** - Security and compliance documentation
