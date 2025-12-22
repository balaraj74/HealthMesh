# Azure AD Authentication Setup Guide

This guide walks you through configuring Azure Active Directory (Entra ID) authentication for HealthMesh React SPA.

## Prerequisites

- ✅ Azure subscription ([Create one for free](https://azure.microsoft.com/free/))
- ✅ Node.js installed
- ✅ Visual Studio Code or another code editor
- ✅ MSAL packages already installed:
  - `@azure/msal-browser` v4.27.0
  - `@azure/msal-react` v3.0.23

## Step 1: Configure Your Application in Azure Portal

### 1.1 Create App Registration

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** (now called **Microsoft Entra ID**)
3. Click **App registrations** → **New registration**
4. Fill in the details:
   - **Name**: `HealthMesh`
   - **Supported account types**: Choose based on your needs:
     - `Accounts in this organizational directory only (Single tenant)` - For enterprise
     - `Accounts in any organizational directory (Multi-tenant)` - For SaaS
     - `Accounts in any organizational directory and personal Microsoft accounts` - For public apps
   - **Redirect URI**: 
     - Platform: `Single-page application (SPA)`
     - URI: `http://localhost:3000/`
5. Click **Register**

### 1.2 Note Your Credentials

After registration, you'll see:
- **Application (client) ID**: Copy this value
- **Directory (tenant) ID**: Copy this value

### 1.3 Configure Authentication

1. In your app registration, go to **Authentication**
2. Under **Single-page application**, verify `http://localhost:3000/` is added
3. Under **Implicit grant and hybrid flows**, enable:
   - ✅ **ID tokens** (used for user sign-in)
   - ✅ **Access tokens** (used for API calls)
4. Click **Save**

### 1.4 Configure API Permissions

1. Go to **API permissions**
2. Click **Add a permission**
3. Select **Microsoft Graph**
4. Select **Delegated permissions**
5. Add these permissions:
   - ✅ `User.Read` (Sign in and read user profile)
   - ✅ `openid` (Sign users in)
   - ✅ `profile` (View users' basic profile)
   - ✅ `email` (View users' email address)
6. Click **Add permissions**
7. Click **Grant admin consent** (if you have admin rights)

## Step 2: Update Environment Variables

Your `.env` file has been configured with:

```env
# Azure Entra ID Configuration
AZURE_AD_TENANT_ID=your-tenant-id-here
AZURE_AD_CLIENT_ID=your-client-id-here

# Frontend environment variables (exposed to client)
VITE_AZURE_AD_TENANT_ID=your-tenant-id-here
VITE_AZURE_AD_CLIENT_ID=your-client-id-here
VITE_AZURE_AD_REDIRECT_URI=http://localhost:3000/
```

**Replace the values** with your actual credentials from Step 1.2:
- Replace `your-tenant-id-here` with your **Directory (tenant) ID**
- Replace `your-client-id-here` with your **Application (client) ID**

## Step 3: Application Configuration (Already Done ✅)

The following configurations have been completed in your codebase:

### ✅ MSAL Configuration (`client/src/auth/authConfig.ts`)
- Configured with proper redirect URI: `http://localhost:3000/`
- Set up scopes for Microsoft Graph API
- Enabled session storage for tokens

### ✅ Auth Provider (`client/src/auth/AuthProvider.tsx`)
- MSAL Provider wraps the application
- Handles redirect responses
- Manages active account state

### ✅ Protected Routes (`client/src/auth/ProtectedRoute.tsx`)
- Checks authentication state
- Supports dev bypass mode for testing
- Redirects to login when unauthenticated

### ✅ Development Server Port
- Vite configured to run on port 3000
- Matches Azure redirect URI

## Step 4: Run the Project

### Install Dependencies (if not already done)
```bash
npm install
```

### Start the Development Server
```bash
npm run dev
```

The application will start at: **http://localhost:3000/**

### Test Authentication Flow

1. **Navigate to the app**: Open http://localhost:3000/
2. **Click "Sign In"**: You'll be redirected to Microsoft login
3. **Enter credentials**: Use your Microsoft account
4. **Grant consent**: On first login, approve the requested permissions
5. **Success!**: You'll be redirected back to the dashboard

## Step 5: Testing with Different Account Types

### Test with Work/School Account (Entra ID)
```typescript
// This is the default configuration in authConfig.ts
const mode = "entra";
```
Users sign in with: `user@yourcompany.com`

### Test with Personal Microsoft Account
Make sure you selected the right account type in Step 1.1:
- Choose "Accounts in any organizational directory and personal Microsoft accounts"

## How the Authentication Works

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Browser   │         │  MSAL.js     │         │  Microsoft  │
│   (React)   │         │  Library     │         │   Login     │
└─────────────┘         └──────────────┘         └─────────────┘
       │                        │                        │
       │  1. Click Sign In      │                        │
       ├───────────────────────>│                        │
       │                        │                        │
       │                        │  2. Redirect to Login  │
       │                        ├───────────────────────>│
       │                        │                        │
       │                        │  3. User Authenticates │
       │                        │<───────────────────────│
       │                        │                        │
       │  4. Receive Token      │                        │
       │<───────────────────────│                        │
       │                        │                        │
       │  5. Call API with Token│                        │
       ├───────────────────────>│                        │
```

## Microsoft Graph API Integration

Once authenticated, you can call Microsoft Graph:

```typescript
import { useMsal } from "@azure/msal-react";
import { graphRequest } from "@/auth/authConfig";

function ProfileComponent() {
  const { instance, accounts } = useMsal();

  const requestProfileData = async () => {
    const request = {
      ...graphRequest,
      account: accounts[0],
    };

    try {
      const response = await instance.acquireTokenSilent(request);
      
      // Call Microsoft Graph
      const graphResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
        headers: {
          Authorization: `Bearer ${response.accessToken}`,
        },
      });
      
      const userData = await graphResponse.json();
      console.log("User profile:", userData);
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  return (
    <button onClick={requestProfileData}>
      Request Profile Information
    </button>
  );
}
```

## Development Mode Bypass

For local testing **without** Azure authentication:

```env
# In .env file
DEV_BYPASS_AUTH=true
```

This allows you to test the application without configuring Azure AD. Perfect for:
- ✅ Local development
- ✅ UI testing
- ✅ Demo purposes

⚠️ **REMOVE IN PRODUCTION!**

## Troubleshooting

### Error: "AADSTS700016: Application not found"
**Solution**: Check that your `VITE_AZURE_AD_CLIENT_ID` matches the Application ID in Azure Portal.

### Error: "AADSTS50011: Redirect URI mismatch"
**Solution**: Ensure `http://localhost:3000/` is added in Azure Portal → Authentication → Redirect URIs.

### Error: "Consent required"
**Solution**: 
1. Go to Azure Portal → Your App → API Permissions
2. Click "Grant admin consent for [Your Organization]"

### Port Already in Use
**Solution**: 
```bash
# Kill process on port 3000
npx kill-port 3000

# Or change port in vite.config.ts
```

### Tokens Not Being Stored
**Solution**: Check browser console for MSAL errors. Ensure:
- Session storage is enabled
- No browser extensions blocking cookies

## Next Steps

✅ **Production Deployment**: Update redirect URI to your production domain
✅ **Add More Scopes**: Configure additional Microsoft Graph permissions
✅ **Multi-Tenant**: Update to support multiple Azure AD tenants
✅ **Token Caching**: Already configured with session storage

## Additional Resources

- [Microsoft Identity Platform Docs](https://learn.microsoft.com/entra/identity-platform/)
- [MSAL.js Documentation](https://github.com/AzureAD/microsoft-authentication-library-for-js)
- [Microsoft Graph API](https://learn.microsoft.com/graph/overview)
- [Azure AD B2C Setup](https://learn.microsoft.com/azure/active-directory-b2c/)

## Security Best Practices

✅ **Never commit credentials**: Use environment variables
✅ **Use HTTPS in production**: Required by Azure AD
✅ **Implement token refresh**: MSAL handles this automatically
✅ **Validate tokens server-side**: Backend validation in `server/auth/entraIdAuth.ts`
✅ **Limit token scope**: Only request permissions you need
✅ **Monitor sign-ins**: Use Azure AD sign-in logs

---

**Need Help?** Check the [Microsoft Identity Platform documentation](https://learn.microsoft.com/entra/identity-platform/) or reach out to your Azure administrator.
