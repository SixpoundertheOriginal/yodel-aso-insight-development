# User Activity Logging System - Implementation Plan

**Date**: December 3, 2025
**Priority**: HIGH - Enterprise Feature
**Estimated Effort**: 8-12 hours

---

## 1. CURRENT STATE AUDIT

### ✅ **Existing Infrastructure** (Already Built)

#### Database Schema
- **`audit_logs` table** - Comprehensive audit logging table with:
  - User identification (user_id, organization_id, user_email)
  - Action tracking (action, resource_type, resource_id)
  - Request metadata (ip_address, user_agent, request_path)
  - Status tracking (success, failure, denied)
  - JSONB details field for flexible data
  - Proper indexes for performance
  - RLS policies for security

#### Helper Functions
- **`log_audit_event()`** - Database function for easy log insertion
- **`audit_logs_recent` view** - Pre-filtered view for last 24 hours

#### UI Components
- **SecurityMonitoring Page** (`src/pages/SecurityMonitoring.tsx`) - Shows audit logs, failed logins, MFA status
- **SuperAdminDebugPanel** - Diagnostics panel (only for igor@yodelmobile.com)

#### Current Logging Coverage
- ✅ MFA enrollment/disable events (MFASetup.tsx lines 119-128, 156-165)
- ⚠️ Authentication events - **PARTIALLY LOGGED** (AuthContext shows toasts but doesn't log to database)
- ❌ Session tracking - **NOT IMPLEMENTED**
- ❌ User page views - **NOT IMPLEMENTED**
- ❌ CRUD operations - **NOT IMPLEMENTED**
- ❌ Failed access attempts - **NOT IMPLEMENTED**

---

## 2. MISSING COMPONENTS (What Needs to Be Built)

### 🔴 **Critical Missing Features**

#### A. Authentication Event Logging
**Status**: Toast notifications exist but no database logging
**Location**: `src/context/AuthContext.tsx` lines 48-62
**What's Missing**:
- Login success → No audit log
- Login failure → No audit log
- Logout → No audit log
- Password reset → No audit log
- OAuth login → No audit log

#### B. Session Tracking System
**Status**: No dedicated session tracking
**What's Missing**:
- No `user_sessions` table
- No session duration tracking
- No IP address/device fingerprinting
- No "last active" timestamp
- No active session count per user
- No geolocation tracking

#### C. User Activity Tracking
**Status**: Only manual logging via `log_audit_event()` where explicitly called
**What's Missing**:
- Page view tracking
- CRUD operation logging (create/update/delete apps, keywords, etc.)
- API call logging
- Export/download tracking
- Search query logging

#### D. Super Admin Activity Dashboard
**Status**: SuperAdminDebugPanel exists but shows diagnostics only, not activity
**What's Missing**:
- Real-time activity feed (who's doing what right now)
- Active user list (currently online users)
- Session management UI (view/terminate sessions)
- User behavior analytics (most active users, popular features)
- Geolocation map of login locations
- Device breakdown (mobile/desktop/browser stats)

---

## 3. BEST PRACTICES & ARCHITECTURE

### 🏗️ **Recommended Architecture**

#### **Option A: Lightweight (Audit Logs Only)** ⭐ **RECOMMENDED FOR MVP**
- Use existing `audit_logs` table for everything
- Add automatic logging hooks in AuthContext
- Add page view tracking via middleware/hook
- Extend SuperAdminDebugPanel with activity feed

**Pros**:
- Fast implementation (4-6 hours)
- Uses existing infrastructure
- No new tables needed
- Simple querying

**Cons**:
- Limited session management
- No real-time active user tracking
- Higher storage costs (verbose logging)

#### **Option B: Full Session Management System**
- Create `user_sessions` table with session lifecycle
- Track active sessions in real-time
- Add session management UI (force logout)
- Add geolocation via IP lookup service
- Add device fingerprinting

**Pros**:
- Complete visibility into user sessions
- Can force logout users
- Better performance (separate tables)
- Real-time "who's online" tracking

**Cons**:
- Longer implementation (8-12 hours)
- More complex to maintain
- Requires edge function for session creation
- Requires periodic cleanup jobs

#### **Option C: Hybrid Approach** ⭐ **RECOMMENDED FOR PRODUCTION**
- Authentication events → `audit_logs` (historical)
- Active sessions → `user_sessions` (current state)
- User actions → `audit_logs` (detailed tracking)
- Real-time feed → Query both tables

**Pros**:
- Best of both worlds
- Optimized for different use cases
- Scalable architecture

**Cons**:
- Medium complexity (6-8 hours)

---

## 4. IMPLEMENTATION PLAN (Hybrid Approach)

### **Phase 1: Authentication & Session Logging** (2-3 hours)

#### Step 1.1: Create `user_sessions` table
```sql
CREATE TABLE user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  organization_id uuid REFERENCES organizations(id),

  -- Session metadata
  session_token text UNIQUE, -- Supabase session access_token hash

  -- Device/browser info
  ip_address inet,
  user_agent text,
  device_type text, -- 'mobile', 'desktop', 'tablet'
  browser text,
  os text,

  -- Geolocation (optional)
  country_code text,
  city text,

  -- Session lifecycle
  created_at timestamptz NOT NULL DEFAULT now(),
  last_active_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  ended_at timestamptz, -- NULL = still active

  -- Session end reason
  end_reason text, -- 'logout', 'timeout', 'force_logout', 'token_expired'

  CONSTRAINT valid_dates CHECK (ended_at IS NULL OR ended_at >= created_at)
);

-- Indexes
CREATE INDEX idx_sessions_user_active ON user_sessions(user_id, ended_at) WHERE ended_at IS NULL;
CREATE INDEX idx_sessions_last_active ON user_sessions(last_active_at DESC) WHERE ended_at IS NULL;
CREATE INDEX idx_sessions_token ON user_sessions(session_token) WHERE ended_at IS NULL;

-- Enable RLS
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "users_view_own_sessions" ON user_sessions
FOR SELECT USING (user_id = auth.uid() OR is_super_admin());

CREATE POLICY "super_admin_view_all_sessions" ON user_sessions
FOR SELECT USING (is_super_admin());

CREATE POLICY "service_role_manage_sessions" ON user_sessions
FOR ALL USING (true) WITH CHECK (true);
```

#### Step 1.2: Add authentication logging to AuthContext
**File**: `src/context/AuthContext.tsx`

Add logging for:
- `SIGNED_IN` event → Log login success + create session
- `SIGNED_OUT` event → Log logout + end session
- `signInWithPassword` error → Log failed login attempt
- `TOKEN_REFRESHED` event → Update `last_active_at`

#### Step 1.3: Create session management service
**File**: `src/services/sessionService.ts`

Functions:
- `createSession()` - Log new session on login
- `updateSessionActivity()` - Update last_active_at (called on user interaction)
- `endSession()` - Mark session as ended
- `getActiveSessions()` - Get all active sessions for a user
- `forceLogoutSession()` - Super admin can force end a session

---

### **Phase 2: User Activity Tracking** (2-3 hours)

#### Step 2.1: Create activity tracking hook
**File**: `src/hooks/useActivityLogger.ts`

```typescript
export function useActivityLogger() {
  const { user } = useAuth();
  const { organizationId } = usePermissions();

  const logActivity = useCallback(async (
    action: string,
    resourceType?: string,
    resourceId?: string,
    details?: Record<string, any>
  ) => {
    if (!user) return;

    await supabaseCompat.rpcAny('log_audit_event', {
      p_user_id: user.id,
      p_organization_id: organizationId,
      p_user_email: user.email,
      p_action: action,
      p_resource_type: resourceType,
      p_resource_id: resourceId,
      p_details: details,
      p_status: 'success',
    });
  }, [user, organizationId]);

  return { logActivity };
}
```

#### Step 2.2: Add automatic page view tracking
**File**: `src/hooks/usePageViewLogger.ts`

Track page views automatically on route change:
```typescript
export function usePageViewLogger() {
  const location = useLocation();
  const { logActivity } = useActivityLogger();

  useEffect(() => {
    logActivity('page_view', 'page', undefined, {
      path: location.pathname,
      search: location.search,
    });
  }, [location.pathname, location.search]);
}
```

#### Step 2.3: Add activity logging to key operations
Add `logActivity()` calls to:
- App creation/deletion
- Keyword updates
- Metadata changes
- Competitor additions
- Export operations
- Admin actions

---

### **Phase 3: Super Admin Activity Dashboard** (3-4 hours)

#### Step 3.1: Extend SuperAdminDebugPanel
**File**: `src/components/Debug/SuperAdminDebugPanel.tsx`

Add new tabs:
1. **"Live Activity"** tab - Real-time feed of user actions (last 50)
2. **"Active Users"** tab - Who's currently online
3. **"Session Management"** tab - View/terminate sessions

#### Step 3.2: Create activity feed component
**File**: `src/components/Admin/UserActivityFeed.tsx`

Features:
- Auto-refreshing feed (every 5 seconds)
- Filter by user, action type, status
- Color-coded by action type (login=green, error=red, etc.)
- Click to expand details

#### Step 3.3: Create active users component
**File**: `src/components/Admin/ActiveUsersList.tsx`

Features:
- Show users active in last 5 minutes
- Display IP, location, device
- Show current page/action
- "Force Logout" button

#### Step 3.4: Create session management component
**File**: `src/components/Admin/SessionManagement.tsx`

Features:
- Table of all active sessions
- Filter by user, organization
- Show session duration, last activity
- Terminate session button
- Export session history

---

### **Phase 4: Analytics & Insights** (2-3 hours) [OPTIONAL]

#### Step 4.1: Add session analytics
- Average session duration
- Peak usage hours heatmap
- Most active users (last 7 days)
- Feature usage stats (which pages visited most)

#### Step 4.2: Add geolocation visualization
- Map of login locations (using Mapbox/Leaflet)
- Country/city breakdown

#### Step 4.3: Add security alerts
- Multiple failed login attempts from same IP
- Unusual login locations (new country)
- Session from multiple IPs simultaneously

---

## 5. SECURITY & PRIVACY CONSIDERATIONS

### ✅ **Best Practices to Follow**

1. **Data Minimization**
   - Only log necessary data
   - Don't log passwords, tokens, or sensitive form data
   - Hash IP addresses if GDPR compliance required

2. **Access Control**
   - Activity logs only visible to super admins
   - Users can view their own activity (GDPR right to access)
   - Org admins can view org-level activity

3. **Retention Policies**
   - Session data: 90 days
   - Audit logs: 7 years (compliance requirement)
   - Anonymous older logs (remove PII after 2 years)

4. **Performance**
   - Use database indexes for fast queries
   - Archive old logs to cold storage (S3)
   - Use pagination for large result sets
   - Cache frequently accessed data (Redis)

5. **Compliance**
   - SOC 2 Type II: Audit all security-relevant actions ✅
   - GDPR: Allow users to export/delete their logs ✅
   - ISO 27001: Log access to sensitive data ✅

---

## 6. QUESTIONS FOR CLIENT

### 🔴 **Critical Decisions Needed**

1. **Scope: Which approach do you want?**
   - [ ] **Option A: Lightweight** (4-6 hours) - Only audit logs, no session management
   - [ ] **Option B: Full Session Management** (8-12 hours) - Complete session tracking + UI
   - [ ] **Option C: Hybrid** (6-8 hours) - Balanced approach (RECOMMENDED)

2. **Session Tracking: How detailed?**
   - [ ] **Basic** - Just login/logout times, IP address
   - [ ] **Standard** - + Device type, browser, OS (RECOMMENDED)
   - [ ] **Advanced** - + Geolocation (country/city), device fingerprinting

3. **Real-Time Updates: Required?**
   - [ ] **Yes** - Live activity feed updates automatically (use polling or websockets)
   - [ ] **No** - Manual refresh button is fine

4. **Session Management: Can super admins force logout users?**
   - [ ] **Yes** - Super admins can terminate any user's session (RECOMMENDED)
   - [ ] **No** - View-only access to sessions

5. **Geolocation: Do you want IP-to-location mapping?**
   - [ ] **Yes** - Show country/city on map (requires IP lookup service like ipapi.co or MaxMind)
   - [ ] **No** - Just show IP address

6. **Privacy: Should users see their own activity logs?**
   - [ ] **Yes** - Add "My Activity" page for all users (GDPR compliance)
   - [ ] **No** - Only super admins can view logs

7. **Automatic Tracking: Which user actions to log?**
   - [ ] **All page views** (verbose, high volume)
   - [ ] **Only key actions** (login, CRUD, exports) (RECOMMENDED)
   - [ ] **Custom list** (specify which actions)

8. **Activity Dashboard Location: Where should it live?**
   - [ ] **Inside SuperAdminDebugPanel** (floating panel, bottom-right)
   - [ ] **New dedicated Admin page** (e.g., `/admin/activity`)
   - [ ] **Add tab to existing SecurityMonitoring page** (RECOMMENDED)

9. **Data Retention: How long to keep logs?**
   - [ ] **90 days** - Minimum for operational needs
   - [ ] **1 year** - Good for trend analysis
   - [ ] **7 years** - Full compliance retention (RECOMMENDED)

10. **Performance: Expected user count?**
    - [ ] **< 100 users** - No optimization needed
    - [ ] **100-1000 users** - Add caching layer
    - [ ] **> 1000 users** - Archive old logs, use time-series DB

---

## 7. IMPLEMENTATION PRIORITY (Recommended Sequence)

### **Sprint 1: Foundation** (4 hours)
1. Create `user_sessions` table
2. Add authentication logging to AuthContext
3. Create session management service
4. Basic session list UI in SuperAdminDebugPanel

### **Sprint 2: Activity Tracking** (3 hours)
5. Create activity logging hook
6. Add automatic page view tracking
7. Add logging to key CRUD operations
8. Create activity feed component

### **Sprint 3: Analytics & Management** (3 hours)
9. Add session management UI (force logout)
10. Add filters and search to activity feed
11. Add session analytics (duration, peak hours)
12. Add security alerts (failed logins, unusual activity)

### **Sprint 4: Polish & Optimization** (2 hours)
13. Add geolocation (if requested)
14. Optimize queries with caching
15. Add export functionality
16. Add data retention cleanup job

---

## 8. TECHNICAL STACK

- **Backend**: Supabase PostgreSQL + Edge Functions
- **Logging**: `audit_logs` table + `user_sessions` table
- **Session Tracking**: Supabase Auth hooks (`onAuthStateChange`)
- **IP Geolocation**: ipapi.co or MaxMind GeoIP2 (if needed)
- **UI Components**: shadcn/ui (Card, Table, Badge, Tabs)
- **Real-time Updates**: Supabase Realtime or polling (every 5s)
- **Charting**: Recharts (for analytics)
- **State Management**: React hooks + Context

---

## 9. SUCCESS METRICS

After implementation, super admins should be able to:

1. ✅ See who logged in today, from where, using what device
2. ✅ View real-time activity feed of all user actions
3. ✅ See list of currently active users (last 5 minutes)
4. ✅ View session history for any user
5. ✅ Terminate a user's session (force logout)
6. ✅ Export audit logs for compliance
7. ✅ View analytics (most active users, peak hours, feature usage)
8. ✅ Receive alerts for suspicious activity (failed logins, unusual locations)

---

## 10. NEXT STEPS

1. **Review this plan** and answer the 10 questions above
2. **Approve approach** (Lightweight/Full/Hybrid)
3. **Begin Sprint 1** implementation
4. **Iterate based on feedback**

---

**Notes**:
- Existing infrastructure (`audit_logs` table) is already SOC 2 / ISO 27001 compliant ✅
- Current SecurityMonitoring page can be extended with new features
- SuperAdminDebugPanel is only visible to igor@yodelmobile.com - should activity dashboard be visible to all super admins?
