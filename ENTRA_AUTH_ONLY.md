# HealthMesh Authentication System

## 🔐 Microsoft Entra ID - Single Source of Truth (Multi-Tenant + Consumer)

HealthMesh uses **Microsoft Entra ID exclusively** for all authentication. This document describes the authentication architecture and security model.

**Supported Account Types:**
- ✅ Work/School accounts (any Azure AD organization)
- ✅ Personal Microsoft accounts (Outlook, Hotmail, Xbox, etc.)
- ✅ University/Student accounts

---

## ⛔ What We DON'T Support

| Feature | Status |
|---------|--------|
| Email/Password Login | ❌ **REMOVED** |
| Local User Signup | ❌ **REMOVED** |
| Backend JWT Creation | ❌ **REMOVED** |
| Dev Bypass Auth | ❌ **REMOVED** |
| Azure AD B2C | ❌ **NOT USED** |
| Fallback Authentication | ❌ **NONE** |

---

## ✅ What We Support

| Feature | Status |
|---------|--------|
| Microsoft Entra ID | ✅ **ONLY PROVIDER** |
| Multi-Tenant Auth | ✅ **Any Azure AD org** |
| Personal MS Accounts | ✅ **Outlook, Gmail, Xbox** |
| Enterprise SSO | ✅ **Enabled** |
| MFA via Azure | ✅ **Enabled** |
| Conditional Access | ✅ **Supported** |
| App Roles | ✅ **Supported** |
| Data Isolation | ✅ **Per tenant (tid)** |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  @azure/msal-browser                                     │   │
│  │  - Handles all authentication                            │   │
│  │  - Uses redirect/popup flow                              │   │
│  │  - Acquires tokens from Microsoft                        │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Authorization: Bearer <ID_Token>
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  entraIdAuth.ts Middleware                               │   │
│  │  - Validates token signature via JWKS                    │   │
│  │  - Verifies iss, aud, exp claims                         │   │
│  │  - Extracts tid (tenant) and oid (user)                  │   │
│  │  - Auto-provisions organizations and users               │   │
│  │  - Attaches context to req.tenantId, req.userId          │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ tenant_id enforced on ALL queries
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         DATABASE                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Multi-Tenant Isolation                                  │   │
│  │  - Every table has tenant_id column                      │   │
│  │  - All queries include WHERE tenant_id = :tid            │   │
│  │  - Hospital A can NEVER see Hospital B's data            │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔑 Token Flow

### 1. User Initiates Login
```javascript
// Frontend triggers Microsoft login
await msalInstance.loginRedirect(loginRequest);
```

### 2. Microsoft Returns Token
```javascript
// After successful auth, MSAL acquires ID token
const response = await msalInstance.acquireTokenSilent({
  account: accounts[0],
  scopes: ["openid", "profile", "email", "User.Read"],
});
const idToken = response.idToken;
```

### 3. Frontend Sends Token to Backend
```javascript
// Every API call includes the token
fetch('/api/patients', {
  headers: {
    'Authorization': `Bearer ${idToken}`
  }
});
```

### 4. Backend Validates Token
```typescript
// entraIdAuth.ts validates against Microsoft
const decoded = jwt.verify(token, signingKey, {
  algorithms: ["RS256"],
  audience: AZURE_CLIENT_ID,
  issuer: [
    `https://login.microsoftonline.com/${AZURE_TENANT_ID}/v2.0`,
    `https://sts.windows.net/${AZURE_TENANT_ID}/`,
  ],
});
```

### 5. Backend Extracts Claims
```typescript
// Extract user/tenant from verified claims
req.tenantId = decoded.tid;  // Tenant ID (organization)
req.userOid = decoded.oid;   // User Object ID
req.userEmail = decoded.email;
req.userName = decoded.name;
```

### 6. Auto-Provision User (First Login)
```sql
-- User is created from Entra ID claims
INSERT INTO users (id, tenant_id, email, name, auth_provider)
VALUES (:id, :tid, :email, :name, 'entra')
ON CONFLICT (user_oid, tenant_id) DO NOTHING;
```

### 7. All Queries Are Tenant-Scoped
```sql
-- EVERY query includes tenant isolation
SELECT * FROM patients WHERE tenant_id = :tid;
INSERT INTO patients (tenant_id, ...) VALUES (:tid, ...);
```

---

## 🔒 Security Features

### Token Validation
- ✅ Signature verified via Microsoft's JWKS endpoint
- ✅ Audience (aud) must match our Client ID
- ✅ Issuer (iss) must be Microsoft
- ✅ Expiration (exp) is checked
- ✅ Required claims (tid, oid) are validated

### Multi-Tenant Isolation
- ✅ Every database table has `tenant_id` column
- ✅ All queries enforce `WHERE tenant_id = :req.tenantId`
- ✅ Different hospitals can NEVER access each other's data
- ✅ Organization auto-created from Entra ID tenant

### Audit Logging
- ✅ All authentication events are logged
- ✅ All data access is logged with user OID
- ✅ IP address and user agent recorded
- ✅ Audit logs are tenant-scoped

---

## 🛡️ HIPAA Compliance Features

| Requirement | Implementation |
|-------------|----------------|
| Access Control | Microsoft Entra ID + App Roles |
| Audit Controls | Full audit logging with user OID |
| Transmission Security | HTTPS only, token-based auth |
| Unique User Identification | Azure AD Object ID (oid) |
| Automatic Logoff | Token expiration + MSAL refresh |

---

## 📋 Configuration Checklist

### Azure Portal Setup

1. **Create App Registration**
   - Go to Azure Portal > Microsoft Entra ID > App registrations
   - Register new application
   - Note the Application (client) ID
   - Note the Directory (tenant) ID

2. **Configure Authentication**
   - Add redirect URI: `http://localhost:5000/login` (dev)
   - Add redirect URI: `https://yourdomain.com/login` (prod)
   - Enable ID tokens
   - Enable access tokens

3. **Configure Token Claims**
   - Ensure `email`, `name`, `oid`, `tid` claims are included

### Environment Variables

```env
# Required for Backend
AZURE_AD_TENANT_ID=your-tenant-id
AZURE_AD_CLIENT_ID=your-client-id

# Required for Frontend
VITE_AZURE_AD_TENANT_ID=your-tenant-id
VITE_AZURE_AD_CLIENT_ID=your-client-id
VITE_AZURE_AD_REDIRECT_URI=http://localhost:5000/login
```

---

## 🧪 Testing Authentication

### Check Auth Status
```http
GET /api/config/status
```
Response:
```json
{
  "authType": "entra-id",
  "authProvider": "microsoft-entra-id",
  "localAuthEnabled": false,
  "emailPasswordEnabled": false,
  "devBypass": false
}
```

### Verify Token (Logs)
On successful authentication, you should see:
```
✅ [AUTH:abc123] Entra token validated | User: user@hospital.com | OID: 12345678... | TID: abcdef12... | Role: user
```

### Test Removed Endpoints
```http
POST /api/auth/login
```
Response (410 Gone):
```json
{
  "error": "Endpoint removed",
  "message": "Local authentication has been permanently removed. Please use Microsoft Entra ID.",
  "authProvider": "microsoft-entra-id"
}
```

---

## 🚨 Error Handling

| HTTP Status | Meaning | Action |
|-------------|---------|--------|
| 401 | Token missing/invalid/expired | Redirect to login |
| 403 | Access denied | Show permission error |
| 410 | Endpoint removed | Use Microsoft login |

---

## 📞 Support

For Azure Entra ID configuration issues, contact your organization's IT administrator or refer to:
- [Microsoft Entra ID Documentation](https://docs.microsoft.com/azure/active-directory/)
- [MSAL.js Documentation](https://github.com/AzureAD/microsoft-authentication-library-for-js)
