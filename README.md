# ASO Tool - Enterprise App Store Optimization Platform

An enterprise-grade App Store Optimization platform built to extract, validate, analyze, and visualize mobile app metrics at scale.

## 🧭 Project Overview

**ASO Tool** empowers ASO managers, analysts, and clients with precise app store data, AI-powered insights, and white-label reporting capabilities.

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

### Prerequisites
- Node.js 18+ and npm/yarn
- Supabase account with project setup
- BigQuery project (optional for full functionality)

### Local Development

1. **Clone and install dependencies**
   ```bash
   git clone <repository-url>
   cd aso-tool
   npm install
   ```

2. **Environment Configuration**
   
   This project supports multiple Supabase environments:
   - **Development**: `bkbcqocpjahewqjmlgvf` (personal dev)
   - **Staging**: `tykkyqspugowivuymqdf` (Yodel staging)
   - **Production**: `izagplcpcdruqkwnpwpd` (Yodel prod)

   Create environment files:
   ```bash
   # .env.development
   VITE_SUPABASE_PROJECT_ID="bkbcqocpjahewqjmlgvf"
   VITE_SUPABASE_URL="https://bkbcqocpjahewqjmlgvf.supabase.co"
   VITE_SUPABASE_PUBLISHABLE_KEY="your-dev-key"
   VITE_ENV="development"

   # .env.production
   VITE_SUPABASE_PROJECT_ID="izagplcpcdruqkwnpwpd"
   VITE_SUPABASE_URL="https://izagplcpcdruqkwnpwpd.supabase.co"
   VITE_SUPABASE_PUBLISHABLE_KEY="your-prod-key"
   VITE_ENV="production"
   ```

   **Switch environments:**
   ```bash
   # Use your switch script
   node scripts/switch-env.js [development|staging|production]
   
   # Or manually copy
   cp .env.development .env
   ```

3. **Database Setup**
   ```bash
   # Apply Supabase migrations
   npx supabase db reset
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

   **⚠️ Important**: After switching environments, restart the dev server and clear browser cache to ensure the correct Supabase project is used.

### Environment Switching

The Supabase client (`src/integrations/supabase/client.ts`) has been manually configured to use environment variables instead of hardcoded values. This allows seamless switching between Supabase projects.

**If Lovable regenerates this file**, you'll need to reapply the environment variable configuration:
```typescript
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "fallback-url";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "fallback-key";
```

### Deployment

The application can be deployed using the built-in Lovable deployment system or manually:

```bash
npm run build
# Deploy to your preferred hosting platform
```

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
src/
├── components/          # Reusable UI components
├── pages/              # Application routes and pages
├── hooks/              # Custom React hooks
├── utils/              # Utility functions and helpers
├── services/           # API service layers
├── constants/          # Feature flags and configuration
├── context/            # React context providers
└── integrations/       # Third-party integrations

supabase/
├── functions/          # Edge functions (serverless API)
├── migrations/         # Database schema migrations
└── config.toml        # Supabase configuration
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