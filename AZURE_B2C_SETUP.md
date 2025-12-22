# Azure AD B2C Setup Guide for HealthMesh

## Overview

This guide will walk you through setting up Azure AD B2C for email/password authentication in HealthMesh. Azure AD B2C provides consumer identity and access management, allowing users to sign up and sign in with email addresses.

---

## Prerequisites

- Azure subscription (Azure for Students works!)
- Azure Portal access: https://portal.azure.com
- HealthMesh already configured with Microsoft Entra ID (completed)

---

## Step 1: Create Azure AD B2C Tenant

### 1.1 Navigate to Azure AD B2C

1. Go to **Azure Portal**: https://portal.azure.com
2. In the search bar, type **"Azure AD B2C"**
3. Select **"Azure AD B2C"** from the results

### 1.2 Create New B2C Tenant

1. Click **"Create a tenant"** or **"+ Create"**
2. Select **"Azure Active Directory B2C"**
3. Fill in the details:
   - **Organization name**: `HealthMesh B2C`
   - **Initial domain name**: `healthmesh` (this will be `healthmesh.onmicrosoft.com`)
   - **Country/Region**: Select your country
   - **Subscription**: Choose your Azure subscription
   - **Resource group**: Create new or use existing (e.g., `healthmesh-rg`)
4. Click **"Review + create"**
5. Click **"Create"**

**⏱ Wait Time**: 1-2 minutes for tenant creation

### 1.3 Switch to B2C Tenant

1. After creation, click the notification bell (top right)
2. Click **"Go to resource"**
3. You should now be in your B2C tenant
4. **Important**: Note your tenant name - it will be `healthmesh.onmicrosoft.com`

---

## Step 2: Create User Flows

User flows define how users sign up, sign in, and manage their profiles.

### 2.1 Create Sign Up and Sign In Flow

1. In your B2C tenant, click **"User flows"** in the left menu
2. Click **"+ New user flow"**
3. Select **"Sign up and sign in"**
4. Select **"Recommended"** version
5. Fill in the details:
   - **Name**: `SignUpSignIn` (this becomes `B2C_1_SignUpSignIn`)
   - **Identity providers**:
     - ✅ Check **"Email signup"**
   - **Multifactor authentication**:
     - Optional: Enable if required by your organization
   - **User attributes and token claims**:
     - **Collect attributes** (during sign-up):
       - ✅ Email Address
       - ✅ Given Name
       - ✅ Surname
       - ✅ Display Name
     - **Return claims** (in token):
       - ✅ Email Addresses
       - ✅ Given Name
       - ✅ Surname
       - ✅ Display Name
       - ✅ User's Object ID
6. Click **"Create"**

### 2.2 Create Sign Up Flow (Optional)

If you want a separate sign-up flow:

1. Click **"+ New user flow"**
2. Select **"Sign up"**
3. Follow similar steps as above
4. Name it: `SignUp` (becomes `B2C_1_SignUp`)

---

## Step 3: Register Application

### 3.1 Create App Registration

1. In your B2C tenant, click **"App registrations"** in the left menu
2. Click **"+ New registration"**
3. Fill in the details:
   - **Name**: `HealthMesh Web App`
   - **Supported account types**: 
     - Select **"Accounts in any identity provider or organizational directory (for authenticating users with user flows)"**
   - **Redirect URI**:
     - Platform: **Single-page application (SPA)**
     - URI: `http://localhost:5000`
4. Click **"Register"**

### 3.2 Note Your Credentials

After registration, you'll see the **Overview** page. **COPY THESE VALUES**:

- **Application (client) ID**: (e.g., `a1b2c3d4-...`)
- **Directory (tenant) ID**: (e.g., `e5f6g7h8-...`)

### 3.3 Configure Redirect URIs

1. Click **"Authentication"** in the left menu
2. Under **"Single-page application"**, click **"Add URI"**
3. Add these redirect URIs:
   - `http://localhost:5000`
   - `http://localhost:5000/login`
   - `http://localhost:5000/signup`
4. Under **"Implicit grant and hybrid flows"**:
   - ✅ Check **"Access tokens (used for implicit flows)"**
   - ✅ Check **"ID tokens (used for implicit and hybrid flows)"**
5. Click **"Save"**

### 3.4 Configure Token Configuration (Optional)

1. Click **"Token configuration"** in the left menu
2. Click **"+ Add optional claim"**
3. Select **"ID"** token type
4. Add these claims:
   - ✅ email
   - ✅ family_name
   - ✅ given_name
5. Click **"Add"**

---

## Step 4: Update Environment Variables

### 4.1 Update `.env.local` (Frontend)

Open `/home/balaraj/HealthMesh/.env.local` and update:

```dotenv
# ===========================================
# AZURE AD B2C AUTHENTICATION (Email/Password)
# ===========================================
VITE_AZURE_B2C_CLIENT_ID=<YOUR-B2C-CLIENT-ID-HERE>
VITE_AZURE_B2C_TENANT_NAME=healthmesh
VITE_AZURE_B2C_POLICY_SIGNIN=B2C_1_SignUpSignIn
VITE_AZURE_B2C_POLICY_SIGNUP=B2C_1_SignUp
```

**Replace**:
- `<YOUR-B2C-CLIENT-ID-HERE>` with the Application (client) ID from Step 3.2

### 4.2 Update `.env` (Backend)

Open `/home/balaraj/HealthMesh/.env` and update:

```dotenv
# ===========================================
# AZURE AD B2C AUTHENTICATION (Email/Password)
# ===========================================
AZURE_B2C_CLIENT_ID=<YOUR-B2C-CLIENT-ID-HERE>
AZURE_B2C_TENANT_NAME=healthmesh
AZURE_B2C_AUTHORITY=https://healthmesh.b2clogin.com/healthmesh.onmicrosoft.com
AZURE_B2C_POLICY_SIGNIN=B2C_1_SignUpSignIn
AZURE_B2C_POLICY_SIGNUP=B2C_1_SignUp
```

**Replace**:
- `<YOUR-B2C-CLIENT-ID-HERE>` with the Application (client) ID from Step 3.2

---

## Step 5: Test Authentication

### 5.1 Restart Your Application

```bash
# Stop the current server (Ctrl+C in the npm terminal)
npm run dev
```

### 5.2 Test Microsoft Sign-In (Entra ID)

1. Open browser: http://localhost:5000
2. You'll be redirected to `/login`
3. Click the **"Microsoft"** tab
4. Click **"Sign in with Microsoft"**
5. Sign in with your Microsoft account
6. You should be redirected to the dashboard

### 5.3 Test Email Sign-In (B2C)

1. Go to: http://localhost:5000/login
2. Click the **"Email"** tab
3. Click **"Don't have an account? Sign up"**
4. Fill in the sign-up form:
   - Email address
   - Password (must meet requirements)
   - Confirm password
   - ✅ Agree to terms
5. Click **"Create Account"**
6. You'll be redirected to Azure B2C's sign-up page
7. Complete the B2C sign-up form
8. After successful sign-up, you'll be redirected back to HealthMesh dashboard

### 5.4 Test Email Sign-In (Existing User)

1. Go to: http://localhost:5000/login
2. Click the **"Email"** tab
3. Enter your email and password
4. Click **"Sign In"**
5. You'll be redirected to Azure B2C's sign-in page
6. Enter your credentials
7. You should be redirected to the dashboard

---

## Step 6: Production Configuration

### 6.1 For Production Deployment

When deploying to Azure App Service (e.g., `https://healthmesh.azurewebsites.net`):

1. Go to your B2C App Registration
2. Click **"Authentication"**
3. Add production redirect URIs:
   - `https://healthmesh.azurewebsites.net`
   - `https://healthmesh.azurewebsites.net/login`
   - `https://healthmesh.azurewebsites.net/signup`
4. Click **"Save"**

5. Update production environment variables:
   ```dotenv
   VITE_AZURE_AD_REDIRECT_URI=https://healthmesh.azurewebsites.net
   ```

### 6.2 Custom Domain (Optional)

If you have a custom domain (e.g., `app.healthmesh.com`):

1. Configure custom domain in Azure B2C tenant
2. Update redirect URIs to use custom domain
3. Update `VITE_AZURE_B2C_TENANT_NAME` if needed

---

## Step 7: Customize B2C UI (Optional)

### 7.1 Customize Sign-Up/Sign-In Page

1. In B2C tenant, go to **"User flows"**
2. Select your **B2C_1_SignUpSignIn** flow
3. Click **"Page layouts"**
4. Select **"Unified sign up or sign in page"**
5. Click **"Use custom page content"** and provide your HTML URL
6. Or use built-in templates and customize colors

### 7.2 Brand Your B2C Tenant

1. Go to **"Company branding"** in B2C tenant
2. Upload your logo
3. Set background color to match HealthMesh (`#0078D4`)
4. Add banner image

---

## Troubleshooting

### Issue: "AADB2C90080: The provided grant has expired"

**Solution**: The user flow policy name might be incorrect. Check:
1. Go to B2C tenant → User flows
2. Verify the exact name (should be `B2C_1_SignUpSignIn`)
3. Update `.env` and `.env.local` if different

### Issue: "AADB2C90091: The user has cancelled"

**Solution**: User cancelled the sign-in. This is normal user behavior.

### Issue: Redirect URI mismatch

**Solution**:
1. Go to App Registration → Authentication
2. Ensure all redirect URIs are exactly:
   - `http://localhost:5000`
   - `http://localhost:5000/login`
   - `http://localhost:5000/signup`
3. Platform type must be **"Single-page application (SPA)"**

### Issue: Token validation fails

**Solution**:
1. Check backend logs for specific error
2. Verify `AZURE_B2C_CLIENT_ID` matches frontend
3. Verify `AZURE_B2C_TENANT_NAME` is correct (no `.onmicrosoft.com` suffix)
4. Restart backend server after env changes

---

## Security Best Practices

### 1. Password Policy

In B2C User Flow settings:
- Minimum length: 8 characters
- Require: uppercase, lowercase, number, special character
- Already enforced in HealthMesh signup form

### 2. Session Management

- Tokens stored in `sessionStorage` (cleared on browser close)
- Token lifetime: 60 minutes (default B2C setting)
- Automatic token refresh handled by MSAL

### 3. Healthcare Compliance

- Enable MFA for production (optional in B2C User Flow)
- Log all authentication events (already implemented)
- Use HTTPS in production
- Regular security audits of B2C tenant

---

## Additional Resources

- **Azure AD B2C Documentation**: https://learn.microsoft.com/azure/active-directory-b2c/
- **MSAL.js Documentation**: https://github.com/AzureAD/microsoft-authentication-library-for-js
- **User Flow Customization**: https://learn.microsoft.com/azure/active-directory-b2c/customize-ui
- **Healthcare Compliance**: https://learn.microsoft.com/azure/compliance/

---

## Summary

You now have dual authentication set up:

✅ **Microsoft Entra ID** - For enterprise users with Microsoft accounts
✅ **Azure AD B2C** - For email/password users

Both authentication methods:
- Share the same HealthMesh dashboard
- Have JWT tokens validated on the backend
- Support role-based access control
- Include audit logging
- Are HIPAA-compliant ready

---

## Quick Reference

### Environment Variables

```dotenv
# Frontend (.env.local)
VITE_AZURE_AD_CLIENT_ID=5f575598-453d-4278-8e0f-a31fb9048256
VITE_AZURE_AD_TENANT_ID=0ba0de08-9840-495b-9ba1-a219de9356b8
VITE_AZURE_B2C_CLIENT_ID=<YOUR-B2C-CLIENT-ID>
VITE_AZURE_B2C_TENANT_NAME=healthmesh

# Backend (.env)
AZURE_AD_CLIENT_ID=5f575598-453d-4278-8e0f-a31fb9048256
AZURE_AD_TENANT_ID=0ba0de08-9840-495b-9ba1-a219de9356b8
AZURE_B2C_CLIENT_ID=<YOUR-B2C-CLIENT-ID>
AZURE_B2C_TENANT_NAME=healthmesh
```

### Key Endpoints

- **Login**: http://localhost:5000/login
- **Signup**: http://localhost:5000/signup
- **Dashboard**: http://localhost:5000/
- **B2C Portal**: https://portal.azure.com → Azure AD B2C

---

**Need help?** Check the troubleshooting section or contact support.
