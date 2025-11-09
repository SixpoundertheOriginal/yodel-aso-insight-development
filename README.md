# Yodel ASO Insight Platform

**Enterprise App Store Optimization Platform**

An enterprise-grade App Store Optimization platform built to extract, validate, analyze, and visualize mobile app metrics at scale.

---

## ✅ CURRENT STATUS (2025-11-09)

**System Status**: 🟢 **FULLY OPERATIONAL** - All systems working correctly
**Security Status**: 🟢 **FULLY COMPLIANT** - All security layers working

**Yodel Mobile Configuration**:
- Access Level: `'reporting_only'` (6-7 analytics/reporting pages)
- This is CORRECT for internal reporting tool use case
- See: **[YODEL_MOBILE_CORRECT_CONTEXT.md](YODEL_MOBILE_CORRECT_CONTEXT.md)** for details

---

## 📖 Documentation Quick Links

**New to the project?** Start here:

- **[QUICK_START.md](QUICK_START.md)** - Get up and running in 15 minutes
- **[CURRENT_SYSTEM_STATUS.md](CURRENT_SYSTEM_STATUS.md)** - Current system state
- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Common issues and solutions

**For context and architecture:**
- **[YODEL_MOBILE_CORRECT_CONTEXT.md](YODEL_MOBILE_CORRECT_CONTEXT.md)** - Yodel Mobile use case and access level
- **[CONTEXT_CONTRADICTION_AUDIT.md](CONTEXT_CONTRADICTION_AUDIT.md)** - Why documentation was updated (Nov 9)

**For developers:**
- **[DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md)** - Coding standards and best practices (if exists)
- **[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)** - Pre-deployment verification (if exists)
- **[ROLLBACK_INSTRUCTIONS.md](ROLLBACK_INSTRUCTIONS.md)** - Emergency rollback procedures (if exists)

**Architecture and context:**
- **[ORGANIZATION_ROLES_SYSTEM_DOCUMENTATION.md](ORGANIZATION_ROLES_SYSTEM_DOCUMENTATION.md)** - Official role system specification
- **[YODEL_MOBILE_AGENCY_CONTEXT_ANALYSIS.md](YODEL_MOBILE_AGENCY_CONTEXT_ANALYSIS.md)** - Business model and agency context
- **[docs/architecture/](docs/architecture/)** - Detailed architecture documentation
- **[docs/completed-fixes/](docs/completed-fixes/)** - Historical issue resolutions

---

## 🧭 Project Overview

**Yodel ASO Insight** empowers ASO managers, analysts, and clients with precise app store data, AI-powered insights, and white-label reporting capabilities.

**Current Deployment**: Yodel Mobile (Agency) managing client apps via BigQuery analytics

### Key Differentiators
- **Multi-tenant isolation** with row-level security
- **Real-time sync** with BigQuery integration
- **Advanced anomaly & predictive analytics**
- **Modular promptable architecture**
- **White-label client portal**

## 🛠 Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI Components**: shadcn/ui + Tailwind CSS
- **Backend**: Supabase (Auth, RLS, Edge Functions)
- **Database**: PostgreSQL with BigQuery integration
- **State Management**: TanStack Query + React Context
- **Analytics**: Custom BigQuery ML models
- **Routing**: React Router DOM

## 🏗 Architecture

### Multi-Tenant Security
- **Row-Level Security (RLS)** enforced on all data tables
- **Tenant isolation** via `tenant_id` scoping
- **Role-based access control** (RBAC) with 6 permission levels
- **Audit logging** for all CRUD operations

### User Personas & Roles
- **Super Admin** - System-wide access and management
- **Organization Admin** - Tenant-level configuration and oversight
- **ASO Manager** - Data source configuration and report management
- **Data Analyst** - Raw metrics extraction and custom analysis
- **Client** - Curated dashboards and reports
- **Viewer** - Read-only access to assigned data

## 📊 Core Features

### Data Extraction & Validation
- **Connectors**: App Store Connect, Google Play Console, third-party APIs
- **Pattern Engine**: Regex + heuristics with confidence scoring
- **Cross-Validation**: Multi-source comparison and discrepancy flagging
- **Batch & Streaming**: Background jobs + real-time delta processing

### Metrics Engine & AI Insights
- **Core Metrics**: Impressions, downloads, proceeds, conversion rates, keyword rankings
- **Advanced Metrics**: Retention (D1/D7), crash rates, competitive indexing
- **Anomaly Detection**: Z-score based alerts using BigQuery ML
- **Predictive Forecasting**: ARIMA_PLUS models for download predictions
- **Narrative Generation**: Template-based LLM summaries and recommendations

### Dashboard & Reporting
- **Executive Dashboard**: KPI cards, trend charts, geographic heatmaps
- **Advanced Query Builder**: No-code BigQuery SQL generation
- **Custom Dashboards**: Drag-and-drop widget library
- **Automated Reports**: PDF/HTML delivery via email or portal

### Growth Accelerators
- **Review Management**: iTunes RSS feed analysis and export
- **Creative Analysis**: Screenshot and metadata optimization
- **Keyword Discovery**: Competitive intelligence and gap analysis
- **Metadata Copilot**: AI-powered ASO recommendations

## 🚀 Getting Started

**👉 For a complete setup guide, see [QUICK_START.md](QUICK_START.md)**

### Quick Setup (5 Minutes)

```bash
# 1. Clone and install
git clone <repository-url>
cd yodel-aso-insight
npm install

# 2. Set up environment
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# 3. Apply database migrations
supabase db push

# 4. Start development server
npm run dev:frontend
```

### Prerequisites
- Node.js 18+
- Supabase account with project setup
- BigQuery project (for analytics features)

**Full setup instructions, environment configuration, and deployment procedures are in [QUICK_START.md](QUICK_START.md)**

## 🔧 Configuration

### Environment Variables

**Required:**
- `VITE_SUPABASE_URL` - Supabase project URL (e.g., `https://yourproject.supabase.co`)
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase publishable (anon) key
- `VITE_SUPABASE_PROJECT_ID` - Supabase project ID
- `VITE_ENV` - Environment name (`development`, `staging`, `production`)

**Optional:**
- `VITE_BIGQUERY_PROJECT_ID` - BigQuery project ID for advanced analytics

**Note:** The Supabase client is configured to use these environment variables dynamically, allowing you to switch between different Supabase projects without code changes.

### Feature Flags
The platform uses a comprehensive feature flag system defined in `src/constants/features.ts`:
- **REVIEWS_PUBLIC_RSS_ENABLED** - Public review access
- **CREATIVE_ANALYSIS_ENABLED** - Screenshot analysis tools
- **BIGQUERY_INTEGRATION_ENABLED** - Advanced analytics
- **WHITE_LABEL_PORTAL_ENABLED** - Client portal features

## 📁 Project Structure

```
/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── AppSidebar.tsx  # Navigation (route access control)
│   │   └── ProtectedRoute.tsx  # Feature flag checks
│   ├── pages/              # Application routes and pages
│   ├── hooks/              # Custom React hooks
│   │   ├── useUserProfile.ts  # User profile and permissions
│   │   └── useOrgAccessLevel.ts  # Organization access level
│   ├── utils/              # Utility functions and helpers
│   ├── services/           # API service layers
│   ├── constants/          # Feature flags and configuration
│   ├── config/             # Configuration
│   │   └── allowedRoutes.ts  # Route access logic
│   ├── context/            # React context providers
│   └── integrations/       # Third-party integrations
│       └── supabase/
│           ├── client.ts   # Supabase client
│           └── types.ts    # Generated database types
│
├── supabase/
│   ├── functions/          # Edge functions (serverless API)
│   │   └── bigquery-aso-data/  # BigQuery analytics endpoint
│   ├── migrations/         # Database schema migrations
│   └── config.toml        # Supabase configuration
│
├── docs/
│   ├── architecture/       # Architecture documentation
│   ├── operational/        # Operational guides
│   ├── development/        # Development guides
│   └── completed-fixes/    # Historical issue resolutions
│       ├── 2025-11-access-control/  # Access control fixes
│       ├── reviews-feature/  # Reviews feature implementation
│       ├── dashboard-v2/   # Dashboard V2 fixes
│       └── ...             # Other feature areas
│
└── *.md                    # Root documentation
    ├── README.md (this file)
    ├── QUICK_START.md      # Developer onboarding
    ├── CURRENT_SYSTEM_STATUS.md  # Current working state
    ├── TROUBLESHOOTING.md  # Common issues
    ├── ORGANIZATION_ROLES_SYSTEM_DOCUMENTATION.md  # Role system
    └── YODEL_MOBILE_AGENCY_CONTEXT_ANALYSIS.md  # Business context
```

## 🔒 Security & Privacy

1. **Row-Level Security** enforced on all data tables
2. **Encryption**: TLS in transit, AES-256 at rest
3. **Audit Logs**: Immutable CRUD operation tracking
4. **Compliance**: GDPR-ready with deletion and export endpoints
5. **API Security**: JWT tokens with tenant scoping and rate limiting

## 🧪 Testing & Quality

- **Unit Tests**: Jest + React Testing Library
- **Integration Tests**: Supabase function testing
- **Security Validation**: RLS policy verification
- **Load Testing**: BigQuery performance benchmarks
- **Edge Case Handling**: Data validation and error recovery

## 📚 API Documentation

### Core Endpoints
- `POST /functions/v1/app-store-scraper` - App search and reviews
- `POST /functions/v1/bigquery-aso-data` - Analytics data retrieval
- `POST /functions/v1/competitive-intelligence` - Competitor analysis
- `POST /functions/v1/creative-vision-analyzer` - Creative optimization

### Authentication
All API endpoints use Supabase JWT authentication with tenant-scoped access control.

## 🤝 Contributing

1. Follow the established TypeScript and React patterns
2. Ensure all data operations respect tenant isolation
3. Add comprehensive tests for new features
4. Update feature flags for new functionality
5. Document security implications of changes

## 📄 License

This project is proprietary and confidential. All rights reserved.

## 📞 Support

For technical support or questions about the ASO Tool platform, please contact the development team or refer to the internal documentation.

---

**Built with ❤️ for ASO professionals worldwide**