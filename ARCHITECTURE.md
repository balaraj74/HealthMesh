# HealthMesh Authentication & Data Isolation Architecture

## 🔐 Production-Grade Security Model

HealthMesh uses **Microsoft Entra ID exclusively** for authentication with complete hospital-level data isolation.

---

## 📊 Architecture Overview

```
┌────────────────────────────────────────────────────────────────────┐
│                           USER                                      │
│                    (Doctor, Nurse, Admin)                           │
└────────────────────────────────────────────────────────────────────┘
                              │
                              │ Click "Sign in with Microsoft"
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│                    MICROSOFT ENTRA ID                               │
│                                                                     │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐ │
│  │  Work Account   │    │ School Account  │    │Personal Account │ │
│  │  @company.com   │    │ @university.edu │    │  @outlook.com   │ │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘ │
│                                                                     │
│  Returns JWT with claims:                                           │
│  - oid: User Object ID                                              │
│  - tid: Tenant ID                                                   │
│  - email, name                                                      │
└────────────────────────────────────────────────────────────────────┘
                              │
                              │ Bearer Token in Authorization header
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│                       HEALTHMESH BACKEND                            │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  entraAuth.ts Middleware                                     │  │
│  │                                                              │  │
│  │  1. Validate token signature (JWKS from Microsoft)           │  │
│  │  2. Verify issuer, audience, expiration                      │  │
│  │  3. Extract tid → hospitalId (auto-create if new)            │  │
│  │  4. Extract oid → userId (auto-create if new)                │  │
│  │  5. Attach req.user = { id, hospitalId, email, role }        │  │
│  │                                                              │  │
│  │  ❌ NO local passwords                                       │  │
│  │  ❌ NO hardcoded users                                       │  │
│  │  ❌ NO frontend-supplied hospital_id                         │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  API Routes                                                  │  │
│  │                                                              │  │
│  │  GET  /api/me           → User profile from token            │  │
│  │  GET  /api/patients     → Hospital-scoped patient list       │  │
│  │  POST /api/patients     → Create patient (hospital_id auto)  │  │
│  │  GET  /api/cases        → Hospital-scoped case list          │  │
│  │  ...                                                         │  │
│  │                                                              │  │
│  │  ALL queries include: WHERE hospital_id = req.user.hospitalId│  │
│  └─────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│                         DATABASE                                    │
│                                                                     │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐          │
│  │   hospitals   │  │    users      │  │   patients    │          │
│  │               │  │               │  │               │          │
│  │ id            │  │ id            │  │ id            │          │
│  │ tenant_id     │◄─│ hospital_id   │  │ hospital_id   │          │
│  │ name          │  │ entra_oid     │  │ created_by_   │          │
│  │               │  │ email         │  │   user_id     │          │
│  │               │  │ role          │  │ mrn           │          │
│  └───────────────┘  └───────────────┘  └───────────────┘          │
│                                                                     │
│  Hospital A data is INVISIBLE to Hospital B                        │
└────────────────────────────────────────────────────────────────────┘
```

---

## 🏥 Hospital Isolation Model

### Key Principle
**Every Entra tenant (tid) maps to exactly ONE hospital**

| Entra Tenant ID | Hospital Name | Data Access |
|-----------------|---------------|-------------|
| `abc-123-...` | City General Hospital | ✅ Own patients only |
| `def-456-...` | County Medical Center | ✅ Own patients only |
| `9188040d-...` | Personal Account Demo | ✅ Own patients only |

### Security Guarantees

1. **Hospital A can NEVER see Hospital B's data**
2. **`hospital_id` comes from verified token, NEVER from frontend**
3. **All queries include `WHERE hospital_id = :hospitalId`**

---

## 🔑 User Context Flow

### 1. User Signs In
```javascript
// Frontend: MSAL triggers Microsoft login
await msalInstance.loginRedirect(loginRequest);
```

### 2. Token Validated on Backend
```typescript
// Backend: entraAuth.ts validates token
const verified = jwt.verify(token, signingKey, {
  algorithms: ["RS256"],
  audience: AZURE_CLIENT_ID,
});
```

### 3. Hospital Auto-Provisioned
```sql
-- First login from new tenant creates hospital
INSERT INTO hospitals (id, tenant_id, name)
VALUES (UUID(), :tid, 'New Hospital');
```

### 4. User Auto-Provisioned
```sql
-- First login creates user from Entra claims
INSERT INTO users (id, entra_oid, hospital_id, email, name, role)
VALUES (UUID(), :oid, :hospitalId, :email, :name, 'doctor');
```

### 5. Context Attached to Request
```typescript
// Every authenticated request has:
req.user = {
  id: "uuid-of-user",
  entraOid: "azure-object-id",
  tenantId: "azure-tenant-id",
  hospitalId: "uuid-of-hospital",  // For data isolation
  email: "doctor@hospital.com",
  name: "Dr. Smith",
  role: "doctor"
};
```

### 6. All Queries Use hospitalId
```typescript
// Data access layer forces hospital isolation
const patients = await db.select()
  .from(patients)
  .where(eq(patients.hospitalId, req.user.hospitalId)); // ALWAYS
```

---

## 🛡️ Security Checklist

| Requirement | Implementation |
|-------------|----------------|
| No local passwords | ✅ Only Entra ID auth |
| No hardcoded users | ✅ Auto-provisioned from claims |
| No frontend hospital_id | ✅ Extracted from token only |
| Hospital isolation | ✅ All queries filtered by hospital_id |
| Audit trail | ✅ All actions logged with entra_oid |
| Token validation | ✅ JWKS signature verification |
| Multi-tenant support | ✅ Any Azure AD organization |
| Personal accounts | ✅ Outlook, Xbox, etc. |

---

## 🔧 Configuration

### Environment Variables
```env
# Backend
AZURE_AD_CLIENT_ID=your-client-id

# Frontend
VITE_AZURE_AD_CLIENT_ID=your-client-id
VITE_AZURE_AD_REDIRECT_URI=http://localhost:5000/login
```

### Azure Portal Configuration

1. **App Registration** → Supported account types:
   ```
   ✅ Accounts in any organizational directory 
      AND personal Microsoft accounts
   ```

2. **Authentication** → Redirect URIs:
   ```
   http://localhost:5000/login
   https://yourdomain.com/login
   ```

3. **API Permissions**:
   ```
   Microsoft Graph → User.Read (Delegated)
   ```

---

## 📡 API Endpoints

### User Profile
```http
GET /api/me
Authorization: Bearer <entra-token>

Response:
{
  "success": true,
  "data": {
    "id": "user-uuid",
    "email": "doctor@hospital.com",
    "name": "Dr. Smith",
    "role": "doctor",
    "hospitalId": "hospital-uuid"
  }
}
```

### Patients (Hospital-Scoped)
```http
GET /api/patients
Authorization: Bearer <entra-token>

Response: Only patients where hospital_id matches user's hospital
```

### Create Patient
```http
POST /api/patients
Authorization: Bearer <entra-token>
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "mrn": "MRN-12345"
  // hospital_id is NOT in body - comes from token
}

Response: Patient created with hospital_id from token
```

---

## 🚨 Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `AADSTS700016` | App not found in tenant | Use `/common` authority |
| `unauthorized_client` | Personal accounts not enabled | Enable "Personal Microsoft accounts" in Azure |
| `401 Unauthorized` | Token expired/invalid | Re-authenticate with Microsoft |
| `Patient not found` | Patient belongs to different hospital | Correct - hospital isolation working |

---

## ✅ What We Removed

| Anti-Pattern | Status |
|--------------|--------|
| Local JWT secrets | ❌ REMOVED |
| SQL-based user auth | ❌ REMOVED |
| Hardcoded users | ❌ REMOVED |
| `/common` misuse | ❌ FIXED |
| Frontend hospital_id | ❌ BLOCKED |
| Dev bypass auth | ❌ REMOVED |
| Shared demo data | ❌ REMOVED |
