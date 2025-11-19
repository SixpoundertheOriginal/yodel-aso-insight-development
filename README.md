# 🎯 Yodel ASO Insight Platform

> Enterprise App Store Optimization analytics platform for digital marketing agencies managing client mobile app portfolios.

[![Production Status](https://img.shields.io/badge/status-production-success)]()
[![Documentation](https://img.shields.io/badge/docs-up--to--date-blue)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)]()
[![React](https://img.shields.io/badge/React-18.3-blue)]()
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)]()

---

## 📋 Table of Contents

- [Quick Start](#-quick-start)
- [Documentation](#-documentation)
- [Features](#-features)
- [Technology Stack](#-technology-stack)
- [Architecture](#-architecture)
- [Security & Compliance](#-security--compliance)
- [Development](#-development)
- [Deployment](#-deployment)
- [Support](#-support)

---

## 🚀 Quick Start

### For Developers

```bash
# Clone repository
git clone <repo-url>
cd yodel-aso-insight

# Install dependencies
npm install

# Start development server
npm run dev
```

**👉 Complete Setup Guide:** [QUICK_START.md](QUICK_START.md)

### For AI-Assisted Development

**⚠️ CRITICAL:** Before making ANY AI-assisted changes, read:
- [docs/07-ai-development/AI_ENGINEERING_RULES.md](docs/07-ai-development/AI_ENGINEERING_RULES.md)
- [docs/07-ai-development/README.md](docs/07-ai-development/README.md)

---

## 📚 Documentation

### Essential Reading

| Document | Purpose | Audience | Time |
|----------|---------|----------|------|
| [Quick Start](QUICK_START.md) | 15-minute setup guide | All developers | 15 min |
| [Current Architecture](CURRENT_ARCHITECTURE.md) | System design, data flow, database schema | Developers, architects | 45 min |
| [Development Guide](DEVELOPMENT_GUIDE.md) | Patterns, workflows, best practices | Active contributors | 30 min |
| [AI Development Standards](docs/07-ai-development/) | **AI-assisted development workflows** | Everyone using AI tools | 20 min |
| [Troubleshooting](TROUBLESHOOTING.md) | Common issues & solutions | Everyone | As needed |

### Documentation Index by Topic

| Section | Description | Location |
|---------|-------------|----------|
| **🎓 Getting Started** | Onboarding, setup, system status | [docs/01-getting-started/](docs/01-getting-started/) |
| **🏗️ Architecture** | System design, security, compliance | [docs/02-architecture/](docs/02-architecture/) |
| **✨ Features** | Production & in-development features | [docs/03-features/](docs/03-features/) |
| **🔌 API Reference** | API contracts, RLS policies | [docs/04-api-reference/](docs/04-api-reference/) |
| **⚙️ Workflows** | Deployment, user management | [docs/05-workflows/](docs/05-workflows/) |
| **🎨 Design System** | Component patterns, standards | [docs/06-design-system/](docs/06-design-system/) |
| **🤖 AI Development** | **AI-assisted workflows & standards** | [docs/07-ai-development/](docs/07-ai-development/) |
| **🔧 Troubleshooting** | Common issues, debugging | [docs/08-troubleshooting/](docs/08-troubleshooting/) |
| **📦 Archive** | Historical phases, fixes, audits | [docs/archive/](docs/archive/) |

**📖 Complete Index:** [DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md)

---

## 🎯 Features

### ✅ Production-Ready

| Feature | Description | Documentation |
|---------|-------------|---------------|
| **Dashboard V2** | BigQuery-powered analytics with real-time ASO metrics, traffic source filtering, conversion funnels | [docs/03-features/dashboard-v2/](docs/03-features/dashboard-v2/) |
| **Reviews Intelligence** | iTunes RSS review monitoring, sentiment analysis, competitor tracking, CSV/JSON export | [docs/03-features/reviews/](docs/03-features/reviews/) |
| **Super Admin** | Multi-organization management, platform-wide access control | [docs/03-features/super-admin/](docs/03-features/super-admin/) |
| **Security Suite** | MFA (TOTP), session timeouts (15-min idle), audit logging, RLS policies | [docs/02-architecture/security-compliance/](docs/02-architecture/security-compliance/) |

### 🚧 In Development

| Feature | Description | Status | Documentation |
|---------|-------------|--------|---------------|
| **Admin Panel APIs** | User & organization management backend | Alpha | [docs/03-features/admin-panel/](docs/03-features/admin-panel/) |
| **AI Chat Module** | Conversational ASO insights | Beta | [docs/03-features/ai-chat/](docs/03-features/ai-chat/) |
| **ASO Intelligence** | Advanced app discovery, keyword intelligence | Planning | [docs/03-features/aso-intelligence/](docs/03-features/aso-intelligence/) |

---

## 🛠️ Technology Stack

### Frontend
- **Framework:** React 18.3 + TypeScript 5.6
- **Build Tool:** Vite 5.4
- **UI Library:** shadcn/ui (Radix primitives) + Tailwind CSS 3.4
- **State Management:** TanStack Query v4 + React Context
- **Routing:** React Router DOM v6
- **Forms:** React Hook Form + Zod validation
- **Charts:** Recharts 2.x

### Backend
- **Platform:** Supabase
- **Database:** PostgreSQL 15+ with Row-Level Security (RLS)
- **Auth:** Supabase Auth (JWT + MFA)
- **Edge Functions:** Deno runtime (TypeScript)
- **Storage:** Supabase Storage with RLS

### Data Sources
- **Analytics:** Google BigQuery (`aso_all_apple` dataset)
- **Reviews:** iTunes RSS feeds
- **Metadata:** App Store Connect API (planned)

### Security
- **Encryption:** AES-256 (infrastructure-level)
- **Authentication:** JWT + TOTP-based MFA
- **Session Security:** 15-min idle timeout, 8-hour absolute
- **Audit Logging:** SOC 2 compliant (7-year retention)
- **Access Control:** Row-Level Security (RLS) policies

---

## 🏗️ Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (React)                         │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ Dashboard V2│  │   Reviews    │  │   Super Admin    │   │
│  └──────┬──────┘  └───────┬──────┘  └────────┬─────────┘   │
│         │                 │                   │              │
│         └─────────────────┴───────────────────┘              │
│                           ↓                                  │
│              ┌───────────────────────────┐                   │
│              │  usePermissions() Hook    │                   │
│              │  (Authorization Context)  │                   │
│              └────────────┬──────────────┘                   │
└───────────────────────────┼──────────────────────────────────┘
                            │ JWT Auth
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  SUPABASE BACKEND                            │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Edge Functions (Deno)                  │    │
│  │  • bigquery-aso-data (Dashboard V2 data)           │    │
│  │  • authorize (Permission validation)                │    │
│  └─────────────────────────────────────────────────────┘    │
│                            ↓                                 │
│  ┌─────────────────────────────────────────────────────┐    │
│  │         PostgreSQL Database (RLS Enabled)           │    │
│  │  • user_roles (SSOT for permissions)               │    │
│  │  • organizations (Multi-tenant)                     │    │
│  │  • org_app_access (App scoping)                    │    │
│  │  • audit_logs (SOC 2 compliance)                   │    │
│  │  • mfa_enforcement (Security)                       │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   EXTERNAL DATA SOURCES                      │
│  ┌──────────────────┐         ┌─────────────────────┐       │
│  │  Google BigQuery │         │   iTunes RSS Feeds  │       │
│  │  (ASO Metrics)   │         │   (App Reviews)     │       │
│  └──────────────────┘         └─────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

**📖 Detailed Architecture:** [CURRENT_ARCHITECTURE.md](CURRENT_ARCHITECTURE.md)

### Key Design Decisions

1. **Single Source of Truth:** `user_roles` table for all permissions
2. **Stable API Contract:** `user_permissions_unified` view (frontend/backend decoupling)
3. **Direct BigQuery Integration:** No caching layer (real-time data requirements)
4. **Row-Level Security:** Database-enforced access control (not application logic)
5. **Agency-Aware Multi-Tenancy:** Built-in support for agency-client relationships

---

## 🔐 Security & Compliance

### Current Status

| Standard | Readiness | Details |
|----------|-----------|---------|
| **SOC 2 Type II** | 95% | Session security, audit logging, encryption at rest |
| **ISO 27001** | 90% | Access control, MFA, security monitoring |
| **GDPR** | 85% | Data encryption, audit trails, user management |

### Security Features

- ✅ **Multi-Factor Authentication (MFA):** TOTP-based for all admin users
- ✅ **Session Security:** 15-minute idle timeout, 8-hour absolute timeout
- ✅ **Audit Logging:** All critical actions logged (7-year retention)
- ✅ **Row-Level Security (RLS):** Database-enforced access control
- ✅ **Encryption:** AES-256 at rest (Supabase/AWS infrastructure)
- ✅ **JWT Authentication:** Secure token-based auth
- ✅ **Security Monitoring:** Dashboard for failed logins, MFA status, session activity

**📖 Compliance Details:** [docs/02-architecture/security-compliance/ENCRYPTION_STATUS.md](docs/02-architecture/security-compliance/ENCRYPTION_STATUS.md)

---

## 👨‍💻 Development

### Prerequisites

- **Node.js:** 18+ (LTS recommended)
- **npm:** 9+
- **Supabase CLI:** Latest version
- **Git:** Version control

### Local Development

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:5173)
npm run dev

# TypeScript validation
npm run typecheck

# Production build
npm run build
```

### Database Migrations

```bash
# Link to Supabase project
supabase link --project-ref bkbcqocpjahewqjmlgvf

# Push migrations
supabase db push
```

### Edge Functions Deployment

```bash
# Deploy all functions
supabase functions deploy

# Deploy specific function
supabase functions deploy bigquery-aso-data
```

### AI-Assisted Development

**Before using AI tools (Lovable.dev, Claude Code, GPT):**

1. **Read:** [docs/07-ai-development/AI_ENGINEERING_RULES.md](docs/07-ai-development/AI_ENGINEERING_RULES.md)
2. **Follow:** Pre-flight checklist and prompting framework
3. **Validate:** All changes before deploying

**Why this matters:**
- ❌ Without standards: Broken contracts, hours of debugging
- ✅ With standards: Safe changes, zero regressions

**📖 Complete Guide:** [docs/07-ai-development/](docs/07-ai-development/)

---

## 🚢 Deployment

### Environments

- **Production:** `bkbcqocpjahewqjmlgvf.supabase.co`

### Deployment Checklist

- [ ] All migrations applied (`supabase db push`)
- [ ] Edge Functions deployed (`supabase functions deploy`)
- [ ] Environment variables configured
- [ ] Frontend build successful (`npm run build`)
- [ ] TypeScript compiles (`npm run typecheck`)
- [ ] Production features tested (Dashboard V2, Reviews)
- [ ] MFA enforcement verified
- [ ] Audit logging active

**📖 Full Checklist:** [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)

---

## 🏢 Platform Overview

### Target Users

**Primary:** Digital marketing agencies managing 10-100+ client mobile apps

**User Roles:**
- **Super Admin:** Platform-wide access (Yodel Mobile internal)
- **Org Admin:** Organization-level management (agency admins)
- **Viewer:** Read-only access (client stakeholders)

### Key Capabilities

- Multi-tenant organization management
- Agency-client hierarchy support (managed clients)
- BigQuery data warehouse integration
- Real-time ASO performance metrics
- Competitive intelligence
- Review sentiment analysis
- Conversion funnel optimization
- Traffic source attribution

### Business Model

**Agency-Centric:**
- Agencies manage multiple client organizations
- Client apps scoped to organizations
- Data isolation via Row-Level Security (RLS)
- Unified dashboard across managed clients

**📖 Business Context:** [docs/05-workflows/YODEL_MOBILE_CONTEXT.md](docs/05-workflows/YODEL_MOBILE_CONTEXT.md)

---

## 📞 Support

### For Developers

- **Architecture Questions:** See [CURRENT_ARCHITECTURE.md](CURRENT_ARCHITECTURE.md)
- **Development Help:** See [DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md)
- **Common Issues:** Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- **AI Development:** Read [docs/07-ai-development/](docs/07-ai-development/)

### Documentation Structure

- **Active Documentation:** `/docs/01-08/` (numbered sections)
- **Historical Records:** `/docs/archive/` (phases, fixes, audits)
- **Deprecated Features:** `/docs/deprecated/` (old systems)
- **Code Documentation:** In-place READMEs (`src/`, `supabase/functions/`)

---

## 📝 Contributing

### Before Making Changes

1. **Read:** [CURRENT_ARCHITECTURE.md](CURRENT_ARCHITECTURE.md) - Understand the system
2. **Read:** [DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md) - Learn patterns
3. **Read:** [docs/07-ai-development/AI_ENGINEERING_RULES.md](docs/07-ai-development/AI_ENGINEERING_RULES.md) - AI safety
4. **Plan:** Use the pre-flight checklist
5. **Validate:** Test before deploying

### Pull Request Process

- Follow `.github/PULL_REQUEST_TEMPLATE.md`
- Include tests for new features
- Update documentation
- Ensure TypeScript compiles
- Verify production features still work

---

## 📊 Project Status

**Current Version:** 2.0 (Dashboard V2 + Reviews Production)

**Active Users:**
- Primary: `cli@yodelmobile.com` (Yodel Mobile, ORG_ADMIN)
- Total Admin Users: 4
- MFA Grace Period: Expires December 8, 2025

**Production Pages:**
- ✅ Dashboard V2 (`/dashboard-v2`)
- ✅ Reviews Management (`/growth-accelerators/reviews`)
- ✅ Security Monitoring (`/admin/security`)
- ✅ Settings (`/settings`)

---

## 📄 License

**Proprietary - Yodel Mobile Internal Use Only**

---

## 🔗 Quick Links

- [📚 Documentation Index](DOCUMENTATION_INDEX.md)
- [🚀 Quick Start Guide](QUICK_START.md)
- [🏗️ Architecture Overview](CURRENT_ARCHITECTURE.md)
- [👨‍💻 Development Guide](DEVELOPMENT_GUIDE.md)
- [🤖 AI Development Standards](docs/07-ai-development/)
- [🔧 Troubleshooting](TROUBLESHOOTING.md)
- [🚢 Deployment Checklist](DEPLOYMENT_CHECKLIST.md)

---

**Last Updated:** 2025-11-19
**Maintained By:** Yodel Mobile Engineering Team
**Platform:** Yodel ASO Insight v2.0
