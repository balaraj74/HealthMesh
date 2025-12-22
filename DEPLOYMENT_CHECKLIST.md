# 🚀 Deployment & Testing Checklist

## Overview
This checklist guides you through deploying and testing the multi-tenant HealthMesh platform.

---

## 📋 Pre-Deployment Checklist

### 1. Environment Configuration

**Azure AD Settings:**
```env
AZURE_AD_TENANT_ID=________________________________________
AZURE_AD_CLIENT_ID=7b142c72-f7cf-432b-972f-40712981f089
```

**Database Settings:**
```env
SQL_SERVER=healthmesh-sql.database.windows.net
SQL_DATABASE=healthmesh
SQL_USER=________________________________________
SQL_PASSWORD=________________________________________
```

**Verification:**
- [ ] Azure AD Tenant ID obtained from Azure Portal
- [ ] Azure AD Client ID matches registered app
- [ ] SQL Server connection string tested
- [ ] SQL credentials validated

### 2. Dependencies Installation

```bash
# Required packages
npm install jwks-rsa @types/jsonwebtoken

# Verify installation
npm list jwks-rsa
npm list @types/jsonwebtoken
```

**Verification:**
- [ ] `jwks-rsa` installed (for JWT validation)
- [ ] `@types/jsonwebtoken` installed (TypeScript types)
- [ ] No installation errors

### 3. Database Deployment

**Step 1: Connect to Azure SQL**
```bash
sqlcmd -S healthmesh-sql.database.windows.net \
       -d healthmesh \
       -U <SQL_USER> \
       -P <SQL_PASSWORD>
```

**Step 2: Execute Schema**
```bash
# Option A: From file
cat db/multi-tenant-schema.sql | sqlcmd -S ... -d ... -U ... -P ...

# Option B: Interactive
sqlcmd -S ... -d ... -U ... -P ...
> :r db/multi-tenant-schema.sql
> GO
```

**Step 3: Verify Tables Created**
```sql
-- Check all tables exist
SELECT TABLE_NAME 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_NAME;

-- Expected tables:
-- audit_logs
-- cases
-- chat_messages
-- lab_reports
-- organizations
-- patients
-- users
```

**Step 4: Verify Indexes**
```sql
-- Check indexes on tenant_id
SELECT 
    i.name AS index_name,
    OBJECT_NAME(i.object_id) AS table_name
FROM sys.indexes i
WHERE i.name LIKE '%tenant_id%'
ORDER BY table_name;
```

**Verification:**
- [ ] All 7 tables created successfully
- [ ] Primary keys configured
- [ ] Foreign keys with CASCADE configured
- [ ] Indexes on tenant_id exist
- [ ] No SQL errors

---

## 🧹 Optional Cleanup (Remove Old Files)

### Backend Files to Delete
```bash
# Old authentication system
rm server/auth/routes.ts          # Email/password routes
rm server/auth/password.ts        # Password hashing
rm server/auth/validateToken.ts   # Old middleware

# Old storage/database
rm server/storage.ts              # Mock storage
rm server/azure-routes.ts         # Old routes (replaced by tenant-routes.ts)
rm healthmesh.db                  # SQLite database

# Old schema
rm db/schema.ts                   # Old single-tenant schema
```

### Frontend Files (Optional)
```bash
# Can keep these if you want dual auth UI, but not functional
# client/src/pages/login.tsx     # Has email/password tab (not needed)
# client/src/pages/signup.tsx    # Signup form (not needed)
```

**Verification:**
- [ ] Old authentication files removed
- [ ] Old database files removed
- [ ] No broken imports in remaining files

---

## 🧪 Testing Protocol

### Test 1: Single Tenant Basic Flow

**Objective:** Verify authentication and data creation for one tenant.

**Steps:**
1. Start the application: `npm run dev`
2. Navigate to `/login`
3. Click "Sign in with Microsoft"
4. Login with Microsoft account (e.g., user@hospitala.com)
5. Should redirect to dashboard
6. Create a new patient:
   - First Name: John
   - Last Name: Doe
   - MRN: MRN-001
7. Create a case for the patient
8. Check dashboard statistics

**Expected Results:**
- [ ] Login successful, redirects to dashboard
- [ ] Patient created successfully
- [ ] Case created successfully
- [ ] Dashboard shows 1 patient, 1 case
- [ ] No errors in browser console
- [ ] No errors in server logs

**Database Verification:**
```sql
-- Check organization auto-provisioned
SELECT * FROM organizations;

-- Check user auto-provisioned
SELECT * FROM users;

-- Check patient with tenant_id
SELECT id, tenant_id, first_name, last_name, mrn FROM patients;

-- Check case with tenant_id
SELECT id, tenant_id, patient_id, status FROM cases;

-- Check audit logs
SELECT event_type, resource_type, created_at FROM audit_logs ORDER BY created_at DESC;
```

---

### Test 2: Multi-Tenant Isolation

**Objective:** Verify complete data isolation between tenants.

**Steps:**
1. Logout from Tenant A
2. Login with different Microsoft account (Tenant B, e.g., user@hospitalb.com)
3. Check dashboard - should be empty
4. Create a new patient:
   - First Name: Jane
   - Last Name: Smith
   - MRN: MRN-002
5. Create a case for the patient
6. Logout from Tenant B
7. Login back to Tenant A
8. Verify ONLY Tenant A's data visible (John Doe, not Jane Smith)

**Expected Results:**
- [ ] Tenant B login successful
- [ ] Tenant B dashboard shows 0 patients initially
- [ ] Tenant B can create patients and cases
- [ ] When back to Tenant A, NO Tenant B data visible
- [ ] Complete isolation verified

**Database Verification:**
```sql
-- Should see 2 organizations
SELECT tenant_id, name FROM organizations;

-- Should see 2 users (different tenant_id)
SELECT user_oid, tenant_id, email FROM users;

-- Should see patients from BOTH tenants (different tenant_id)
SELECT tenant_id, first_name, last_name, mrn FROM patients;

-- Verify counts per tenant
SELECT tenant_id, COUNT(*) as patient_count 
FROM patients 
GROUP BY tenant_id;

-- Each tenant should have separate counts
```

---

### Test 3: Auto-Provisioning

**Objective:** Verify automatic organization and user creation.

**Steps:**
1. Login with a BRAND NEW Microsoft account (never logged in before)
2. Should succeed and redirect to dashboard
3. Check database for new organization and user

**Expected Results:**
- [ ] New user can login successfully
- [ ] Dashboard accessible (empty state)
- [ ] No errors during first login

**Database Verification:**
```sql
-- Check new organization created
SELECT tenant_id, name, created_at 
FROM organizations 
ORDER BY created_at DESC 
LIMIT 1;

-- Check new user created
SELECT user_oid, tenant_id, email, created_at 
FROM users 
ORDER BY created_at DESC 
LIMIT 1;

-- Verify they match
SELECT 
    o.tenant_id as org_tenant,
    u.tenant_id as user_tenant,
    u.email
FROM organizations o
JOIN users u ON o.tenant_id = u.tenant_id
ORDER BY o.created_at DESC 
LIMIT 1;
```

---

### Test 4: Security - Tenant Isolation at API Level

**Objective:** Verify API cannot access other tenant's data.

**Steps:**
1. Login as Tenant A
2. Open browser DevTools → Network tab
3. Get a patient ID from Tenant A (e.g., `patient-a-id`)
4. Note the Authorization header token
5. Logout and login as Tenant B
6. Get a patient ID from Tenant B (e.g., `patient-b-id`)
7. Try to manually fetch Tenant A's patient using Tenant B's token:

```javascript
// In browser console (while logged in as Tenant B)
fetch('/api/patients/patient-a-id', {
  headers: {
    'Authorization': 'Bearer <tenant-b-token>'
  }
})
.then(r => r.json())
.then(console.log);
```

**Expected Results:**
- [ ] Request returns 404 (Not Found) or 403 (Forbidden)
- [ ] Tenant B CANNOT access Tenant A's patient
- [ ] Server logs show tenant isolation enforced

---

### Test 5: Audit Logging

**Objective:** Verify all actions are logged with tenant context.

**Steps:**
1. Login as any tenant
2. Perform actions:
   - Create patient
   - View patient details
   - Update patient
   - Create case
   - View case details
3. Check audit logs

**Expected Results:**
- [ ] All actions logged
- [ ] Each log has tenant_id
- [ ] Each log has user_id
- [ ] Each log has event_type
- [ ] Timestamps recorded

**Database Verification:**
```sql
-- View recent audit logs
SELECT 
    tenant_id,
    user_id,
    event_type,
    resource_type,
    resource_id,
    created_at
FROM audit_logs
ORDER BY created_at DESC
LIMIT 20;

-- Verify all logs have tenant_id
SELECT COUNT(*) as total_logs,
       COUNT(tenant_id) as logs_with_tenant
FROM audit_logs;
-- Should match

-- Logs per tenant
SELECT tenant_id, COUNT(*) as log_count
FROM audit_logs
GROUP BY tenant_id;
```

---

## 🔍 Troubleshooting

### Issue: "SECURITY VIOLATION: Request missing tenant context"

**Cause:** Request not authenticated or JWT token invalid.

**Solution:**
1. Check `.env` has correct `AZURE_AD_TENANT_ID` and `AZURE_AD_CLIENT_ID`
2. Verify JWT token in Authorization header
3. Check server logs for JWT validation errors
4. Ensure MSAL instance is initialized in frontend

---

### Issue: 401 Unauthorized on all API calls

**Cause:** Authentication middleware not receiving valid token.

**Solution:**
1. Check browser console for MSAL errors
2. Verify `msalInstance.acquireTokenSilent()` succeeds
3. Check Authorization header in Network tab
4. Verify Azure AD app registration configuration

---

### Issue: Users see each other's data (isolation broken)

**Cause:** CRITICAL - tenant_id filter missing in queries.

**Solution:**
1. **STOP IMMEDIATELY** - This is a security issue
2. Check service layer calls: All should have `tenantId` parameter
3. Verify database queries: All should have `WHERE tenant_id = ?`
4. Check route handlers: All should use `getTenantId(req)`
5. Review `server/tenant-routes.ts` - ensure using TenantXxxService
6. DO NOT DEPLOY until fixed

---

### Issue: New tenant login fails

**Cause:** Auto-provisioning error or database constraint violation.

**Solution:**
1. Check server logs for SQL errors
2. Verify organizations and users tables exist
3. Check database connection (SQL_SERVER, SQL_DATABASE)
4. Verify Azure AD token has `tid` and `oid` claims
5. Check `ensureOrganization()` and `ensureUser()` functions

---

## ✅ Final Verification Checklist

Before going live:

**Security:**
- [ ] Multi-tenant isolation tested and verified
- [ ] No way to access other tenant's data
- [ ] All API routes require authentication
- [ ] All queries include tenant_id filter
- [ ] Audit logging working for all actions

**Functionality:**
- [ ] Login with Microsoft works
- [ ] Patient creation works
- [ ] Case creation works
- [ ] Dashboard shows correct stats
- [ ] All endpoints functional

**Database:**
- [ ] Schema deployed successfully
- [ ] All tables exist
- [ ] Foreign keys configured
- [ ] Indexes created
- [ ] No SQL errors

**Configuration:**
- [ ] Environment variables set
- [ ] Azure AD configured
- [ ] Database connection working
- [ ] Dependencies installed
- [ ] Old files cleaned up (optional)

---

## 🎯 Success Criteria

Your deployment is successful when:

1. ✅ Multiple tenants can login independently
2. ✅ Each tenant sees ONLY their own data
3. ✅ Organizations and users auto-provisioned
4. ✅ All CRUD operations work correctly
5. ✅ Dashboard statistics accurate per tenant
6. ✅ Audit logs recording all actions
7. ✅ No security violations possible
8. ✅ No errors in console or logs

---

## 📞 Support

### If Tests Fail
1. Check `TRANSFORMATION_COMPLETE.md` for architecture overview
2. Review `MIGRATION_GUIDE.md` for detailed migration steps
3. Check server logs for specific error messages
4. Verify environment variables
5. Confirm database schema deployed correctly

### If Still Stuck
1. Check all files created:
   - `db/multi-tenant-schema.sql`
   - `db/multi-tenant-schema.ts`
   - `server/auth/entraIdAuth.ts`
   - `server/data/tenantDataAccess.ts`
   - `server/tenant-routes.ts`
   - `client/src/lib/queryClient.ts` (updated)
2. Verify imports in `server/routes.ts`
3. Ensure `authMiddleware` applied to `/api` routes

---

**🎉 Good luck with testing! Remember: Security first - verify tenant isolation before deploying to production.**
