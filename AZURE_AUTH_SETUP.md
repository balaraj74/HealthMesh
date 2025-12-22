# Azure Entra ID Authentication Setup Guide

## Overview

This guide walks you through setting up **Microsoft Entra ID (Azure Active Directory)** authentication for HealthMesh. This provides enterprise-grade OAuth 2.0 / OpenID Connect authentication suitable for healthcare applications and Imagine Cup projects.

## 🎯 What You'll Get

- ✅ **Enterprise SSO**: Single Sign-On with Microsoft accounts
- ✅ **Secure Token-Based Auth**: JWT tokens with signature verification
- ✅ **Role-Based Access Control**: Support for user roles and permissions
- ✅ **Audit Trail**: All authentication events are logged
- ✅ **Healthcare Compliant**: Suitable for HIPAA-aligned applications

---

## 📋 Prerequisites

- Azure subscription (Azure for Students works perfectly)
- HealthMesh application running locally or deployed
- Access to Azure Portal: https://portal.azure.com

---

## 🚀 Step-by-Step Setup

### Step 1: Create App Registration in Azure Portal

1. **Navigate to Microsoft Entra ID**
   - Go to [Azure Portal](https://portal.azure.com)
   - Search for "Microsoft Entra ID" or "Azure Active Directory"
   - Click on the service

2. **Create New App Registration**
   - In the left menu, click **"App registrations"**
   - Click **"+ New registration"**
   
3. **Fill in Application Details**
   - **Name**: `HealthMesh` (or your preferred name)
   - **Supported account types**: Choose one:
     - `Accounts in this organizational directory only` (Single tenant - recommended for students/demos)
     - `Accounts in any organizational directory` (Multi-tenant)
     - `Accounts in any organizational directory and personal Microsoft accounts` (Widest access)
   - **Redirect URI**: 
     - Platform: `Single-page application (SPA)`
     - URL: `http://localhost:5000` (for local development)
   - Click **"Register"**

4. **Note Your IDs** ⚠️ IMPORTANT
   After registration, you'll see the **Overview** page. Copy these values:
   - **Application (client) ID**: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
   - **Directory (tenant) ID**: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

---

### Step 2: Configure Authentication Settings

1. **Go to Authentication**
   - In your App Registration, click **"Authentication"** in the left menu
   
2. **Configure Redirect URIs**
   Add these redirect URIs under **Single-page application**:
   ```
   http://localhost:5000
   http://localhost:5000/login
   ```
   
   For production, also add:
   ```
   https://your-app-name.azurewebsites.net
   https://your-app-name.azurewebsites.net/login
   ```

3. **Implicit Grant and Hybrid Flows**
   - ✅ Check **"ID tokens"** (used for user sign-in)
   - ✅ Check **"Access tokens"** (used for API calls)

4. **Advanced Settings**
   - Allow public client flows: **No** (for SPAs)
   - Supported account types: As configured in Step 1

5. Click **"Save"**

---

### Step 3: Configure API Permissions

1. **Go to API Permissions**
   - Click **"API permissions"** in the left menu

2. **Default Permissions** (Already added)
   - `Microsoft Graph > User.Read` ✓ (Allows reading user profile)

3. **Add Custom API Scopes** (Optional - for custom backend API)
   - Click **"+ Add a permission"**
   - Click **"My APIs"** tab
   - Select your API (if you have a separate backend API registration)
   - Select permissions
   - Click **"Add permissions"**

4. **Grant Admin Consent** (If required by your organization)
   - Click **"Grant admin consent for [Your Organization]"**
   - Confirm

---

### Step 4: Expose API (Optional - For Custom Backend)

If you want to protect your backend API with the same Azure AD:

1. **Go to Expose an API**
   - Click **"Expose an API"** in the left menu

2. **Set Application ID URI**
   - Click **"Set"** next to Application ID URI
   - Accept default: `api://[your-client-id]`
   - Or use custom: `api://healthmesh`

3. **Add a Scope**
   - Click **"+ Add a scope"**
   - Scope name: `access`
   - Who can consent: `Admins and users`
   - Admin consent display name: `Access HealthMesh API`
   - Admin consent description: `Allows the app to access HealthMesh on behalf of the user`
   - User consent display name: `Access HealthMesh`
   - User consent description: `Allows the app to access HealthMesh on your behalf`
   - State: **Enabled**
   - Click **"Add scope"**

---

### Step 5: Configure Environment Variables

Update your `.env` file in the **HealthMesh** project root:

```bash
# ===========================================
# AZURE ENTRA ID AUTHENTICATION
# ===========================================
# Paste the values from your App Registration
AZURE_AD_CLIENT_ID=<your-application-client-id>
AZURE_AD_TENANT_ID=<your-directory-tenant-id>
AZURE_AD_AUTHORITY=https://login.microsoftonline.com/<your-directory-tenant-id>
AZURE_AD_REDIRECT_URI=http://localhost:5000

# For production, update to your production URL:
# AZURE_AD_REDIRECT_URI=https://your-app.azurewebsites.net
```

**Example with real values:**
```bash
AZURE_AD_CLIENT_ID=a1b2c3d4-e5f6-7890-abcd-ef1234567890
AZURE_AD_TENANT_ID=d5f02518-1708-46c7-9185-528f94300a43
AZURE_AD_AUTHORITY=https://login.microsoftonline.com/d5f02518-1708-46c7-9185-528f94300a43
AZURE_AD_REDIRECT_URI=http://localhost:5000
```

---

### Step 6: Create Frontend Environment File

Create `.env.local` in the **client** directory (or add to your existing `.env`):

```bash
# Frontend Azure AD Configuration (Vite requires VITE_ prefix)
VITE_AZURE_AD_CLIENT_ID=<your-application-client-id>
VITE_AZURE_AD_TENANT_ID=<your-directory-tenant-id>
VITE_AZURE_AD_REDIRECT_URI=http://localhost:5000
```

**Note**: Vite requires the `VITE_` prefix for environment variables to be exposed to the client.

---

### Step 7: Test Authentication Flow

1. **Start the Application**
   ```bash
   npm run dev
   ```

2. **Open Browser**
   - Navigate to: `http://localhost:5000`
   - You should be redirected to the login page

3. **Sign In with Microsoft**
   - Click **"Sign in with Microsoft"**
   - A popup will open with Microsoft login
   - Enter your Microsoft account credentials
   - Grant consent if prompted
   - You should be redirected to the dashboard

4. **Verify User Info**
   - Check the sidebar footer for your name/email
   - Verify logout button works

---

## 🔐 Security Best Practices

### Token Storage
- ✅ Tokens stored in `sessionStorage` (cleared on browser close)
- ✅ No tokens in `localStorage` for enhanced security
- ✅ Automatic token refresh handled by MSAL

### Backend Validation
- ✅ All API calls require valid JWT token
- ✅ Token signature verified using JWKS
- ✅ Issuer and audience validated
- ✅ Expiration checked on every request

### Audit Logging
- ✅ All authentication events logged
- ✅ User context attached to API requests
- ✅ Failed authentication attempts tracked

---

## 🏥 Healthcare Compliance

HealthMesh implements authentication suitable for healthcare applications:

1. **HIPAA Alignment**
   - Strong authentication (OAuth 2.0)
   - Session timeout (browser close)
   - Audit trail for all access

2. **Clinical Disclaimers**
   - "Decision Support Only" notices
   - "Authorized users only" warnings
   - Clear responsibility statements

3. **Access Control**
   - Role-based permissions (extensible)
   - User attribution for all actions
   - Session management

---

## 🚨 Troubleshooting

### Issue: "Pop-up blocked" error

**Solution**: Allow pop-ups for `localhost:5000` in your browser settings.

**Alternative**: Use redirect flow instead of popup:
- In `client/src/pages/login.tsx`, change:
  ```typescript
  await instance.loginPopup(loginRequest);
  ```
  To:
  ```typescript
  await instance.loginRedirect(loginRequest);
  ```

---

### Issue: "Invalid redirect URI" error

**Causes**:
1. Redirect URI not added to App Registration
2. Mismatch between `.env` and App Registration

**Solution**:
1. Go to Azure Portal > App Registration > Authentication
2. Verify redirect URIs include:
   - `http://localhost:5000`
   - `http://localhost:5000/login`
3. Ensure `.env` has:
   ```
   AZURE_AD_REDIRECT_URI=http://localhost:5000
   ```

---

### Issue: "AADSTS50011: The reply URL specified in the request does not match"

**Solution**: 
1. Check that **Platform** is set to "Single-page application (SPA)" not "Web"
2. Verify exact URL match (no trailing slash)

---

### Issue: Backend returns 401 Unauthorized

**Causes**:
1. Token not sent in Authorization header
2. Token expired
3. Backend can't reach Azure AD JWKS endpoint

**Solution**:
1. Check browser Network tab > API request > Headers > Authorization
2. Should see: `Bearer eyJ0eXAiOiJKV1QiLCJhbGc...`
3. Check backend logs for validation errors
4. Verify `AZURE_AD_CLIENT_ID` and `AZURE_AD_TENANT_ID` in `.env`

---

### Issue: "Cannot find module '@azure/msal-browser'"

**Solution**:
```bash
npm install @azure/msal-browser @azure/msal-react
```

---

### Issue: Development mode - want to skip authentication temporarily

**Solution**: Comment out middleware in `server/routes.ts`:
```typescript
// Temporarily disable auth for development
// app.use("/api", validateAzureToken);
```

⚠️ **Remember to re-enable before deploying!**

---

## 📱 Testing with Different Accounts

### Test with Personal Microsoft Account
1. Use `@outlook.com`, `@hotmail.com`, `@live.com`
2. Ensure App Registration supports "Personal Microsoft accounts"

### Test with Work/School Account
1. Use your organization's account
2. May require admin consent for first login

### Test with Multiple Users
1. Use browser's "Incognito/Private" mode
2. Sign out and sign in with different account

---

## 🌐 Production Deployment

### Update App Registration
1. Add production redirect URIs:
   ```
   https://healthmesh.azurewebsites.net
   https://healthmesh.azurewebsites.net/login
   ```

### Update Environment Variables
```bash
# Production .env
AZURE_AD_REDIRECT_URI=https://healthmesh.azurewebsites.net
```

### Configure Azure App Service
1. Go to App Service > Configuration > Application settings
2. Add all Azure AD environment variables
3. Restart app

---

## 🎓 For Imagine Cup / Demos

### Demo Account Setup
1. Create a demo Microsoft account
2. Pre-configure in App Registration
3. Share credentials with judges/evaluators

### Presentation Tips
1. Have account signed in before demo
2. Show the login page briefly
3. Highlight "Authorized users only" notice
4. Mention enterprise-grade security

### If Demo Fails
1. Have backup video of login flow
2. Mention it's production Azure AD
3. Show configuration in Azure Portal

---

## 📚 Additional Resources

- [Microsoft Entra ID Documentation](https://learn.microsoft.com/entra/identity/)
- [MSAL.js Documentation](https://github.com/AzureAD/microsoft-authentication-library-for-js)
- [Azure AD Best Practices](https://learn.microsoft.com/azure/active-directory/develop/identity-platform-integration-checklist)
- [OAuth 2.0 and OpenID Connect](https://learn.microsoft.com/azure/active-directory/develop/v2-protocols)

---

## ✅ Verification Checklist

Before submitting your project or going live:

- [ ] App Registration created in Azure Portal
- [ ] Redirect URIs configured correctly
- [ ] API permissions added and consented
- [ ] Environment variables set in `.env`
- [ ] Frontend `.env.local` created with `VITE_` prefix
- [ ] Login page loads without errors
- [ ] Can sign in with Microsoft account
- [ ] Token validation working on backend
- [ ] User info displays in sidebar
- [ ] Logout works correctly
- [ ] All protected routes require authentication
- [ ] Authentication events logged in console
- [ ] Clinical disclaimers visible on login page

---

## 🆘 Need Help?

**Azure Portal**: https://portal.azure.com  
**Microsoft Support**: https://learn.microsoft.com/answers/

For HealthMesh-specific issues, check:
1. Browser console for client-side errors
2. Server logs for backend validation errors
3. Azure Portal > App Registration > Authentication logs

---

**🎉 You're all set! HealthMesh now has enterprise-grade Microsoft authentication.**
