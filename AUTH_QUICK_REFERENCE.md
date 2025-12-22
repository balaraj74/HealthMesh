# 🔐 HealthMesh Authentication - Quick Reference

## ✅ What Was Implemented

### 1. **Microsoft Entra ID (Azure AD) Authentication**
   - OAuth 2.0 / OpenID Connect flow
   - Enterprise-grade security
   - JWT token validation
   - Single Sign-On (SSO) capability

### 2. **Frontend Components** (React + MSAL)
   - ✅ Login page (`client/src/pages/login.tsx`)
   - ✅ Auth provider (`client/src/auth/AuthProvider.tsx`)
   - ✅ Protected routes (`client/src/auth/ProtectedRoute.tsx`)
   - ✅ MSAL configuration (`client/src/auth/authConfig.ts`)
   - ✅ API client with auto token attachment (`client/src/auth/apiClient.ts`)

### 3. **Backend Security** (Express + JWT)
   - ✅ Token validation middleware (`server/auth/validateToken.ts`)
   - ✅ Applied to all `/api/*` routes
   - ✅ User context extraction
   - ✅ Role-based access control support

### 4. **UI/UX Enhancements**
   - ✅ User profile in sidebar with logout button
   - ✅ Microsoft-style login design (Fluent UI)
   - ✅ Loading states during authentication
   - ✅ Clinical disclaimers and security notices

### 5. **Documentation**
   - ✅ Complete setup guide (`AZURE_AUTH_SETUP.md`)
   - ✅ Troubleshooting section
   - ✅ Production deployment instructions

---

## 🚀 Quick Start (3 Steps)

### Step 1: Create App Registration in Azure

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Microsoft Entra ID** > **App registrations**
3. Click **"+ New registration"**
4. Configure:
   - Name: `HealthMesh`
   - Supported accounts: Single tenant
   - Redirect URI: `Single-page application (SPA)` → `http://localhost:5000`
5. Click **"Register"**
6. Copy **Application (client) ID** and **Directory (tenant) ID**

### Step 2: Configure Authentication

In App Registration:
1. Go to **Authentication**
2. Add redirect URIs:
   - `http://localhost:5000`
   - `http://localhost:5000/login`
3. Under **Implicit grant and hybrid flows**:
   - ✅ Check "ID tokens"
   - ✅ Check "Access tokens"
4. Click **"Save"**

### Step 3: Update Environment Variables

**Backend (.env):**
```bash
AZURE_AD_CLIENT_ID=<your-client-id>
AZURE_AD_TENANT_ID=<your-tenant-id>
AZURE_AD_AUTHORITY=https://login.microsoftonline.com/<your-tenant-id>
AZURE_AD_REDIRECT_URI=http://localhost:5000
```

**Frontend (create .env.local in project root):**
```bash
VITE_AZURE_AD_CLIENT_ID=<your-client-id>
VITE_AZURE_AD_TENANT_ID=<your-tenant-id>
VITE_AZURE_AD_REDIRECT_URI=http://localhost:5000
```

**Start the app:**
```bash
npm run dev
```

Navigate to `http://localhost:5000` → You'll see the login page!

---

## 📁 File Structure

```
HealthMesh/
├── client/src/
│   ├── auth/
│   │   ├── AuthProvider.tsx       # MSAL wrapper
│   │   ├── ProtectedRoute.tsx     # Route guard
│   │   ├── authConfig.ts          # MSAL config
│   │   └── apiClient.ts           # API client with tokens
│   ├── pages/
│   │   └── login.tsx              # Login page
│   └── components/
│       └── app-sidebar.tsx        # Updated with user profile
├── server/
│   ├── auth/
│   │   └── validateToken.ts       # JWT validation
│   └── routes.ts                  # Middleware applied here
├── .env                            # Backend env vars
├── .env.local                      # Frontend env vars (create this)
├── AZURE_AUTH_SETUP.md            # Complete setup guide
└── AUTH_QUICK_REFERENCE.md        # This file
```

---

## 🔒 Security Features

### Token Storage
- ✅ `sessionStorage` (cleared on browser close)
- ✅ No sensitive data in `localStorage`
- ✅ Automatic token refresh by MSAL

### Backend Validation
- ✅ JWT signature verification using JWKS
- ✅ Issuer validation (Azure AD)
- ✅ Audience validation (your app)
- ✅ Expiration check

### Healthcare Compliance
- ✅ "Authorized users only" notices
- ✅ "Decision Support Only" disclaimers
- ✅ Audit logging for authentication events
- ✅ User attribution on all API requests

---

## 🧪 Testing Authentication

### Test Login Flow
1. Start app: `npm run dev`
2. Open `http://localhost:5000`
3. Should redirect to `/login`
4. Click "Sign in with Microsoft"
5. Authenticate with your Microsoft account
6. Should redirect to dashboard
7. Check sidebar footer for your user info

### Test Protected Routes
1. Log out
2. Try to access `http://localhost:5000/patients`
3. Should redirect to `/login`
4. Log in again
5. Should be at `/patients`

### Test API Authentication
1. Open browser DevTools > Network tab
2. Perform an action (e.g., view patients)
3. Check API request headers
4. Should see: `Authorization: Bearer eyJ0eXAi...`

---

## 🔧 Troubleshooting

### "Pop-up blocked" error
**Solution**: Allow pop-ups for localhost:5000 in browser settings

### "Invalid redirect URI" error
**Solution**: 
- Verify redirect URI in Azure Portal matches `.env`
- Ensure platform is "Single-page application (SPA)"

### Backend returns 401 Unauthorized
**Solution**:
1. Check token in Network tab (should start with `Bearer eyJ...`)
2. Verify `AZURE_AD_CLIENT_ID` and `AZURE_AD_TENANT_ID` in `.env`
3. Check server logs for validation errors

### "Cannot find module '@azure/msal-browser'"
**Solution**: `npm install @azure/msal-browser @azure/msal-react`

---

## 🌐 Production Deployment

### Azure Portal Updates
1. Add production redirect URI: `https://your-app.azurewebsites.net`
2. Add: `https://your-app.azurewebsites.net/login`

### Environment Variables
Update `.env` and `.env.local`:
```bash
AZURE_AD_REDIRECT_URI=https://your-app.azurewebsites.net
VITE_AZURE_AD_REDIRECT_URI=https://your-app.azurewebsites.net
```

### Azure App Service Configuration
1. Go to App Service > Configuration > Application settings
2. Add all Azure AD environment variables
3. Restart app

---

## 💡 Using the API Client

Instead of `fetch()`, use the authenticated API client:

```typescript
import { apiClient } from '@/auth/apiClient';

// GET request (token automatically attached)
const patients = await apiClient.get('/api/patients');

// POST request
const newCase = await apiClient.post('/api/cases', {
  patientId: '123',
  clinicalQuestion: 'Treatment recommendation?'
});

// File upload
const formData = new FormData();
formData.append('file', file);
const result = await apiClient.upload('/api/labs/upload', formData);
```

---

## 🎓 For Imagine Cup Judges/Evaluators

### Demo Account
1. Create a demo Microsoft account: `healthmesh-demo@outlook.com`
2. Share credentials with judges
3. Pre-configure in App Registration

### Key Features to Highlight
- ✅ **Enterprise-grade security**: Microsoft Entra ID
- ✅ **Healthcare compliance**: Proper disclaimers and audit trails
- ✅ **Professional UX**: Microsoft Fluent design
- ✅ **Production-ready**: Token validation, error handling

### If Demo Fails
- Have backup video of login flow
- Show Azure Portal App Registration configuration
- Explain it's production Azure AD (not mock auth)

---

## 📚 Additional Resources

- **Setup Guide**: See `AZURE_AUTH_SETUP.md` for detailed instructions
- **Microsoft Docs**: https://learn.microsoft.com/entra/identity/
- **MSAL.js Docs**: https://github.com/AzureAD/microsoft-authentication-library-for-js
- **Azure Portal**: https://portal.azure.com

---

## ✅ Configuration Checklist

Before submitting/deploying:

- [ ] App Registration created in Azure Portal
- [ ] Redirect URIs configured
- [ ] ID tokens and Access tokens enabled
- [ ] Backend `.env` has Azure AD credentials
- [ ] Frontend `.env.local` has `VITE_*` credentials
- [ ] Login page loads without errors
- [ ] Can sign in with Microsoft account
- [ ] User info displays in sidebar
- [ ] Logout works correctly
- [ ] All routes require authentication
- [ ] API requests include Bearer token

---

**🎉 You now have enterprise-grade Microsoft authentication in HealthMesh!**

For detailed troubleshooting and advanced configuration, see `AZURE_AUTH_SETUP.md`.
