# ⚡ HealthMesh Azure - Quick Start

## 🚀 Deploy to Azure in 3 Commands

### 1️⃣ Login to Azure
```bash
az login
```

### 2️⃣ Configure Parameters
```bash
# Get your Azure AD Tenant ID
export TENANT_ID=$(az account show --query tenantId -o tsv)
echo "Your Tenant ID: $TENANT_ID"

# Update parameter files
sed -i "s/YOUR_TENANT_ID_HERE/$TENANT_ID/g" infra/parameters.*.json
sed -i "s/admin@example.com/YOUR_EMAIL@example.com/g" infra/parameters.*.json
```

### 3️⃣ Deploy
```bash
# Deploy to production
./deploy.sh prod

# Or deploy to development
./deploy.sh dev
```

## 📋 What Gets Deployed

✅ **Azure App Service** - Node.js 20 LTS application  
✅ **Azure SQL Database** - Multi-tenant with ledger  
✅ **Azure Blob Storage** - Medical documents  
✅ **Azure Key Vault** - Secrets management  
✅ **Application Insights** - Monitoring & telemetry  
✅ **Log Analytics** - Centralized logging  
✅ **Monitoring Alerts** - CPU, errors, SQL DTU  

## 💰 Estimated Costs

| Environment | Monthly Cost |
|-------------|--------------|
| Development | ~$200 |
| Staging | ~$500 |
| Production | ~$800 |

## 🔐 Security Features

✅ HIPAA compliance readiness  
✅ Encryption at rest and in transit  
✅ Azure AD authentication  
✅ Managed identities (no passwords)  
✅ Audit logging (365 days retention)  
✅ Advanced Threat Protection  

## ⏱️ Deployment Time

- Infrastructure: **10-15 minutes**
- Application code: **5 minutes**
- Database setup: **5 minutes**
- **Total: ~25 minutes**

## 🆘 Need Help?

- **Full Guide**: [AZURE_DEPLOYMENT_GUIDE.md](AZURE_DEPLOYMENT_GUIDE.md)
- **Summary**: [DEPLOYMENT_SUMMARY.md](DEPLOYMENT_SUMMARY.md)
- **Infrastructure Docs**: [infra/README.md](infra/README.md)

## ✅ Post-Deployment Checklist

After deployment completes:

```bash
# 1. Get your app URL
az deployment group show \
  --resource-group healthmesh-prod-rg \
  --name $(az deployment group list --resource-group healthmesh-prod-rg --query '[0].name' -o tsv) \
  --query properties.outputs.appServiceUrl.value

# 2. Test health endpoint
curl https://YOUR-APP.azurewebsites.net/api/health

# 3. Check logs
az webapp log tail --resource-group healthmesh-prod-rg --name YOUR-APP-NAME

# 4. Configure GitHub Actions (see DEPLOYMENT_SUMMARY.md)
```

---

**Ready?** Run: `./deploy.sh prod` 🚀
