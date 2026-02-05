# 🔧 GitHub Secret Setup Required

## ⚠️ ACTION REQUIRED: Add Azure Publish Profile to GitHub

The deployment workflow has been updated to use the more reliable `azure/webapps-deploy@v2` action, which requires a publish profile.

---

## 📋 Step-by-Step Instructions

### 1. Get the Publish Profile (Already Done)

The publish profile has been retrieved using:
```bash
az webapp deployment list-publishing-profiles \
  --resource-group HealthMesh \
  --name healthmesh \
  --xml
```

Output is saved temporarily (contains sensitive credentials - do NOT commit).

---

### 2. Add Secret to GitHub

#### Option A: Via GitHub Web UI (Recommended)

1. **Go to your repository**:
   ```
   https://github.com/balaraj74/HealthMesh
   ```

2. **Navigate to Settings**:
   - Click **Settings** tab
   - Click **Secrets and variables** in left sidebar
   - Click **Actions**

3. **Create new secret**:
   - Click **New repository secret**
   - Name: `AZURE_WEBAPP_PUBLISH_PROFILE`
   - Value: Paste the ENTIRE XML output from the `az` command above

4. **Save**:
   - Click **Add secret**

#### Option B: Via GitHub CLI (Alternative)

```bash
# Install GitHub CLI if not already installed
# sudo apt install gh

# Login to GitHub
gh auth login

# Add the secret (replace with actual XML content)
gh secret set AZURE_WEBAPP_PUBLISH_PROFILE < publish-profile.xml
```

---

### 3. Get the Publish Profile XML

Run this command locally to get the XML:

```bash
az webapp deployment list-publishing-profiles \
  --resource-group HealthMesh \
  --name healthmesh \
  --xml > publish-profile.xml
```

Then copy the ENTIRE contents of `publish-profile.xml` and paste it as the secret value in GitHub.

**⚠️ IMPORTANT**: Delete `publish-profile.xml` after adding to GitHub - it contains sensitive credentials!

---

## ✅ Verification

After adding the secret:

1. **Check Secret Exists**:
   - Go to: https://github.com/balaraj74/HealthMesh/settings/secrets/actions
   - Verify `AZURE_WEBAPP_PUBLISH_PROFILE` is listed

2. **Trigger Deployment**:
   - Make any commit and push to `main`
   - Or manually trigger via Actions tab

3. **Monitor Deployment**:
   - Go to: https://github.com/balaraj74/HealthMesh/actions
   - Watch the deployment progress

---

## 🔍 What This Changes

### Before (Azure CLI - Deprecated & Failing)
- Used `az webapp deployment source config-zip` (deprecated)
- Had authentication issues (403 errors)
- Failed with 400 errors on `az webapp deploy`

### After (Azure Web Apps Deploy Action)
- Uses official Azure GitHub Action
- More reliable authentication via publish profile
- Better error handling and logging
- Supports ZIP deployment natively

---

## 📊 Expected Outcome

Once the secret is added, the deployment will:

1. ✅ Build the application with Node 22
2. ✅ Install dependencies with --legacy-peer-deps
3. ✅ Create a simplified package.json for Azure
4. ✅ Deploy using azure/webapps-deploy@v2 action
5. ✅ Start the application automatically
6. ✅ Be accessible at https://healthmesh.azurewebsites.net

---

## 🆘 Troubleshooting

### If deployment still fails:

1. **Verify Secret**:
   - Ensure secret name is exactly: `AZURE_WEBAPP_PUBLISH_PROFILE`
   - Ensure entire XML was copied (including `<publishData>` tags)

2. **Check Logs**:
   - GitHub Actions logs will show deployment details
   - Azure Portal → App Service → Log stream

3. **Test Locally**:
   ```bash
   npm run build
   npm start
   ```
   If it works locally, deployment should work too.

---

## 🔐 Security Note

**The publish profile contains sensitive credentials!**

- ✅ Store ONLY in GitHub Secrets
- ❌ Never commit to repository
- ❌ Never share publicly
- ✅ Can be regenerated if compromised:
  ```bash
  az webapp deployment list-publishing-profiles --name healthmesh --resource-group HealthMesh --xml
  ```

---

**Last Updated**: February 5, 2026  
**Status**: Waiting for GitHub secret to be added  
**Next Step**: Add `AZURE_WEBAPP_PUBLISH_PROFILE` to GitHub Secrets
