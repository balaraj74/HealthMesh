# GitHub Actions CI/CD Setup

This repository is configured for automatic deployment to Azure App Service using GitHub Actions.

## 🚀 How It Works

Every time you push to the `main` branch, GitHub Actions will automatically:
1. ✅ Check out the code
2. 📦 Install dependencies
3. 🔨 Build the application
4. 📁 Package the build
5. 🚀 Deploy to Azure App Service
6. ✅ Verify deployment

## 📋 One-Time Setup Required

### Step 1: Add Azure Publish Profile to GitHub Secrets

1. The publish profile has been saved to `/tmp/azure-publish-profile.xml`
2. Copy its contents (see terminal output above)
3. Go to: https://github.com/balaraj74/HealthMesh/settings/secrets/actions
4. Click **"New repository secret"**
5. Name: `AZURE_WEBAPP_PUBLISH_PROFILE`
6. Value: Paste the XML content
7. Click **"Add secret"**

### Step 2: Push the Workflow File

```bash
cd /home/balaraj/HealthMesh
git add .github/workflows/deploy-azure.yml
git commit -m "ci: Add GitHub Actions workflow for Azure deployment"
git push origin main
```

## 🎯 Usage

### Automatic Deployment (Recommended)
Simply push your changes to the `main` branch:
```bash
git add .
git commit -m "your commit message"
git push origin main
```

The deployment will start automatically and you can monitor it at:
https://github.com/balaraj74/HealthMesh/actions

### Manual Deployment
You can also trigger a deployment manually:
1. Go to: https://github.com/balaraj74/HealthMesh/actions
2. Click on "Deploy to Azure App Service"
3. Click "Run workflow"
4. Select branch and click "Run workflow"

## 📊 Monitoring Deployments

- **GitHub Actions**: https://github.com/balaraj74/HealthMesh/actions
- **Application URL**: https://healthmesh-dev-app.azurewebsites.net
- **Azure Portal**: https://portal.azure.com

## 🔧 Configuration

The workflow is configured in `.github/workflows/deploy-azure.yml`:
- Node.js version: 20.x
- Build command: `npm run build`
- Deployment method: ZIP deploy
- Target: Azure App Service (healthmesh-dev-app)

## ⚙️ Environment Variables

Build-time environment variables are set in the workflow:
- `VITE_AZURE_AD_REDIRECT_URI`: Azure production URL
- `NODE_ENV`: production

Runtime environment variables are managed in Azure App Service settings:
- `AZURE_SQL_CONNECTION_STRING`: Database connection
- `AZURE_AD_TENANT_ID`: Microsoft Entra ID tenant
- `AZURE_AD_CLIENT_ID`: Application ID

## 🐛 Troubleshooting

If deployment fails:
1. Check the GitHub Actions logs: https://github.com/balaraj74/HealthMesh/actions
2. Verify the publish profile secret is set correctly
3. Check Azure App Service logs: `az webapp log tail --name healthmesh-dev-app --resource-group healthmesh-test`
4. Ensure all dependencies are in `package.json` (not just devDependencies for runtime deps)

## 🔄 Workflow Status

[![Deploy to Azure](https://github.com/balaraj74/HealthMesh/actions/workflows/deploy-azure.yml/badge.svg)](https://github.com/balaraj74/HealthMesh/actions/workflows/deploy-azure.yml)

## 📝 Next Steps

After setting up the secret, your next `git push` will automatically deploy your application to Azure!

```bash
# Example workflow
git add .
git commit -m "feat: Add new feature"
git push origin main
# ✨ Automatic deployment starts!
```
