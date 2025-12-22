# Azure Entra ID Configuration Guide

## 1. App Registration (Azure Portal)

Ensure your App Registration matches these EXACT settings:

- **Name**: HealthMesh
- **Supported Account Types**: Accounts in this organizational directory only (Single tenant)
- **Redirect URIs (SPA)**:
  - `http://localhost:5000/login`
  - `http://localhost:5000/` (optional, but good for fallback)

## 2. API Permissions

Grant the following **Delegated** permissions and click "Grant admin consent":

- `User.Read` (Sign in and read user profile)
- `email` (View users' email address)
- `openid` (Sign users in)
- `profile` (View users' basic profile)

## 3. Environment Variables (.env)

Your `.env` file is configured as follows:

```env
# Application (Client) ID from App Registration
VITE_AZURE_AD_CLIENT_ID=7b142c72-f7cf-432b-972f-40712981f089

# Directory (Tenant) ID
VITE_AZURE_AD_TENANT_ID=0ba0de08-9840-495b-9ba1-a219de9356b8

# Redirect URI (Must match App Registration EXACTLY)
VITE_AZURE_AD_REDIRECT_URI=http://localhost:5000/login
```

## 4. Troubleshooting

If you see `AADSTS700016` (Application not found):
- Verify `VITE_AZURE_AD_CLIENT_ID` matches the **Application (client) ID**, NOT the Object ID.
- Verify the App Registration is in the correct Tenant (`0ba0de08...`).

If you see `AADSTS50011` (Reply URL mismatch):
- Verify `http://localhost:5000/login` is listed in the **Authentication** blade under **Single-page application**.
