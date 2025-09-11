# 🔍 DEBUG WHOAMI - ROOT CAUSE ANALYSIS SETUP

## ✅ DEPLOYED CHANGES

1. **Enhanced Debug Logging**: Added comprehensive debug logging to `/admin-whoami` Edge Function
2. **Frontend Debug Tool**: Created interactive test component in System Debug Panel
3. **Test Scripts**: Created curl and Node.js test scripts for manual testing

## 🎯 TESTING INSTRUCTIONS

### Option 1: Use Frontend Debug Tool (RECOMMENDED)

1. **Login**: Sign in as `demo@next-demo.com` (or the user with access issues)
2. **Navigate**: Go to Admin → System (if you have admin access)
3. **Find Debug Panel**: Look for "Whoami Debug Test - ROOT CAUSE ANALYSIS" section
4. **Run Test**: Click "Test /whoami Endpoint" button
5. **Check Logs**: 
   - Browser Console (F12) for frontend logs
   - [Supabase Function Logs](https://supabase.com/dashboard/project/bkbcqocpjahewqjmlgvf/functions) → "admin-whoami" → "Logs" tab

### Option 2: Manual curl Test

```bash
# 1. Login to the app in browser as demo@next-demo.com
# 2. Open DevTools > Application > Cookies
# 3. Copy the value of "sb-bkbcqocpjahewqjmlgvf-auth-token"
# 4. Run:

export SUPABASE_AUTH_TOKEN="paste-your-auth-token-here"
./debug-whoami-curl.sh
```

### Option 3: Node.js Test Script

```bash
# Same auth token setup as above, then:
export SUPABASE_AUTH_TOKEN="paste-your-auth-token-here"
node debug-whoami-test.js
```

## 📋 WHAT TO LOOK FOR IN LOGS

The debug logs will show these key pieces of information:

### 1. JWT Authentication
```
[DEBUG/WHOAMI] Authorization header present: true
[DEBUG/WHOAMI] JWT preview: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
[DEBUG/WHOAMI] JWT user: {"id":"48977685-7795-49fa-953e-579d6a6739cb",...}
[DEBUG/WHOAMI] Using user_id for query: 48977685-7795-49fa-953e-579d6a6739cb
```

### 2. Database Query Results
```
[DEBUG/WHOAMI] userRoles query result: [{"role":"ASO_MANAGER","organization_id":"4b8d3f4e-6782-4305-9253-ac2179f1c319"}] null
```

### 3. If Query Returns Empty (RLS Issue)
```
[DEBUG/WHOAMI] user_roles is EMPTY for 48977685-7795-49fa-953e-579d6a6739cb
[DEBUG/WHOAMI] CONTROL - Service role query result: [{"role":"ASO_MANAGER","organization_id":"4b8d3f4e-6782-4305-9253-ac2179f1c319","is_active":true,"expires_at":null}] null
```

## 🔍 EXPECTED VALUES

For the user in question:
- **User ID**: `48977685-7795-49fa-953e-579d6a6739cb`  
- **Organization ID**: `4b8d3f4e-6782-4305-9253-ac2179f1c319`
- **Role**: `ASO_MANAGER`

## 📊 ANALYSIS SCENARIOS

### Scenario A: JWT Issue
- JWT user shows wrong/missing user_id
- **Fix**: Authentication problem, check login flow

### Scenario B: RLS Policy Issue  
- userRoles query returns empty `[]`
- Service role query returns data `[{...}]`
- **Fix**: RLS policy not allowing user to read their own roles

### Scenario C: Data Issue
- Both queries return empty `[]`
- **Fix**: Missing user_roles record in database

### Scenario D: Success
- userRoles query returns `[{"role":"ASO_MANAGER","organization_id":"4b8d3f4e-6782-4305-9253-ac2179f1c319"}]`
- **Result**: Should resolve access issues

## 🚀 NEXT STEPS

1. **Run the test** using any of the methods above
2. **Collect all debug logs** from Supabase Function Logs
3. **Paste the logs** for root cause analysis
4. **Check API response** to see if it includes proper org_id and role

## 🔧 FILES MODIFIED

- `supabase/functions/admin-whoami/index.ts` - Added debug logging
- `src/components/debug/WhoamiDebugTest.tsx` - Frontend test component  
- `src/components/admin/system/SystemDebugPanel.tsx` - Added debug test to admin panel
- `debug-whoami-curl.sh` - Curl test script
- `debug-whoami-test.js` - Node.js test script

The comprehensive debug logging will expose exactly what the Edge Function sees and help identify whether the issue is:
- JWT/Authentication
- RLS Policy configuration  
- Missing database records
- Organization context resolution

**Ready to test!** 🎯