# ASO Tool - System Architecture

## Overview
The ASO Tool is built as a multi-tenant SaaS platform with enterprise-grade security, scalability, and performance requirements.

## Architecture Principles

### Multi-Tenant Isolation
- **Row-Level Security (RLS)**: Every table enforces tenant-based access control
- **Tenant Scoping**: All queries automatically filtered by `tenant_id`
- **Data Segregation**: Complete isolation between organizations
- **Super Admin Override**: System administrators can access cross-tenant data when needed

### Security-First Design
- **Authentication**: Supabase Auth with JWT tokens
- **Authorization**: Role-based access control (RBAC) with 6 permission levels
- **Audit Trail**: Immutable logging of all data operations
- **Encryption**: TLS 1.3 in transit, AES-256 at rest

## System Components

### Frontend Layer
```
React 18 + TypeScript + Vite
├── UI Framework: shadcn/ui + Tailwind CSS
├── State Management: TanStack Query + React Context
├── Routing: React Router DOM with protected routes
├── Forms: React Hook Form + Zod validation
└── Charts: Recharts for data visualization
```

### Backend Services
```
Supabase Platform
├── Authentication & Authorization
├── PostgreSQL Database with RLS
├── Edge Functions (Serverless API)
├── Real-time Subscriptions
└── File Storage with policies
```

### Data Pipeline
```
BigQuery Integration
├── Raw Data Ingestion
├── ML Models (ARIMA_PLUS, anomaly detection)
├── Aggregated Metrics Storage
└── Custom Query Builder
```

## Database Schema

### Core Tables
- **users**: User authentication and profile data
- **organizations**: Tenant configuration and settings
- **user_roles**: RBAC assignments with organization scoping
- **apps**: Mobile application metadata and tracking
- **aso_metrics**: Time-series performance data
- **keyword_rankings**: Search positioning and competitive data
- **ai_insights**: Generated recommendations and analysis
- **audit_logs**: Immutable operation tracking

### Security Policies
All tables implement tenant-aware RLS policies:
```sql
CREATE POLICY tenant_isolation ON table_name
  FOR ALL TO authenticated
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
```

## API Architecture

### Edge Functions
- **app-store-scraper**: App search and review extraction
- **bigquery-aso-data**: Analytics data retrieval and processing
- **competitive-intelligence**: Competitor analysis and benchmarking
- **creative-vision-analyzer**: Screenshot and creative optimization
- **chatgpt-topic-analysis**: AI-powered content analysis
- **authorize**: Centralized permission validation

### Request Flow
1. **Authentication**: JWT validation via Supabase
2. **Authorization**: Role and tenant permission checking
3. **Tenant Context**: Automatic scoping to user's organization
4. **Data Processing**: Business logic execution
5. **Response**: Formatted JSON with CORS headers

## Feature Flag System

### Implementation
```typescript
// Feature configuration with role-based access
export const PLATFORM_FEATURES = {
  REVIEWS_PUBLIC_RSS_ENABLED: {
    enabled: true,
    roles: ['super_admin', 'org_admin', 'aso_manager']
  },
  BIGQUERY_INTEGRATION_ENABLED: {
    enabled: true,
    roles: ['super_admin', 'org_admin', 'analyst']
  }
};
```

### Benefits
- **Gradual Rollouts**: Feature enablement by organization or role
- **A/B Testing**: Controlled feature exposure
- **Emergency Toggles**: Quick feature disabling if issues arise
- **Subscription Tiers**: Premium feature gating

## Performance Optimization

### Caching Strategy
- **Browser Caching**: Static assets with long TTL
- **API Response Caching**: Redis for frequently accessed data
- **Query Optimization**: Indexed database queries and materialized views
- **CDN Integration**: Global content delivery

### Monitoring & Observability
- **Error Tracking**: Comprehensive logging and alerting
- **Performance Metrics**: API response times and database query analysis
- **User Analytics**: Feature usage and engagement tracking
- **Security Monitoring**: Authentication and authorization event logging

## Deployment Architecture

### Development Environment
```
Local Development
├── Vite Dev Server (Frontend)
├── Supabase Local Instance
├── Edge Functions Runtime
└── PostgreSQL Database
```

### Production Environment
```
Cloud Infrastructure
├── Supabase Hosted Platform
├── CDN (Static Assets)
├── Edge Functions (Serverless)
└── PostgreSQL (Managed)
```

## Data Flow Patterns

### Real-time Updates
1. **Client Subscription**: WebSocket connection to Supabase
2. **Database Triggers**: Notify on data changes
3. **RLS Filtering**: Only relevant tenant data pushed
4. **UI Updates**: Reactive state management

### Batch Processing
1. **Scheduled Jobs**: BigQuery ETL processes
2. **Data Validation**: Quality checks and anomaly detection
3. **Metric Calculation**: Derived analytics computation
4. **Notification System**: Alert generation for significant changes

## Security Considerations

### Authentication Flow
1. **User Login**: Email/password or SSO
2. **JWT Generation**: Supabase Auth service
3. **Token Validation**: Edge function verification
4. **Session Management**: Automatic refresh and expiry

### Data Protection
- **Input Validation**: Zod schemas on all user inputs
- **SQL Injection Prevention**: Parameterized queries only
- **XSS Protection**: Content Security Policy headers
- **CSRF Prevention**: Same-site cookie configuration

## Scalability Design

### Horizontal Scaling
- **Stateless Services**: Edge functions with no local state
- **Database Read Replicas**: Query load distribution
- **Microservice Architecture**: Independent service scaling
- **Auto-scaling**: Dynamic resource allocation

### Vertical Optimization
- **Database Indexing**: Optimized query performance
- **Connection Pooling**: Efficient database resource usage
- **Memory Management**: Optimized React component rendering
- **Bundle Optimization**: Code splitting and lazy loading

## Integration Points

### External APIs
- **App Store Connect**: Official Apple developer data
- **Google Play Console**: Android app metrics
- **Third-party Analytics**: Sensor Tower, App Annie integrations
- **AI Services**: OpenAI for content generation

### Webhook Endpoints
- **Data Ingestion**: Real-time metric updates
- **Event Processing**: User action tracking
- **Notification Delivery**: Email and in-app alerts
- **Audit Trail**: External compliance logging