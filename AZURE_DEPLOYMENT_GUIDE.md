# HealthMesh Azure Production Deployment Guide

## 🏥 Healthcare-Grade Azure Deployment

This guide provides step-by-step instructions for deploying HealthMesh to Microsoft Azure with production best practices, healthcare compliance readiness, and enterprise security.

## 📋 Prerequisites

- Azure subscription with sufficient quota
- Azure CLI installed (`az --version`)
- GitHub account with repository access
- Owner or Contributor role on Azure subscription
- Azure AD Global Administrator (for Entra ID setup)

## 🎯 Deployment Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     HEALTHMESH AZURE                         │
│                   PRODUCTION ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────┐    ┌─────────────┐    ┌──────────────┐    │
│  │   Azure    │───▶│  App Service │───▶│   Azure SQL  │    │
│  │  Front Door│    │  (Node.js)   │    │   Database   │    │
│  └────────────┘    └─────────────┘    └──────────────┘    │
│        │                   │                    │           │
│        │                   ▼                    │           │
│        │           ┌──────────────┐             │           │
│        │           │  Key Vault   │◀────────────┘           │
│        │           │  (Secrets)   │                         │
│        │           └──────────────┘                         │
│        │                   │                                │
│        ▼                   ▼                                │
│  ┌────────────┐    ┌──────────────┐                        │
│  │   Blob     │    │  Application │                        │
│  │  Storage   │    │   Insights   │                        │
│  └────────────┘    └──────────────┘                        │
│        │                   │                                │
│        └───────────────────┴────────────────────────────────┤
│                   Azure Monitor & Logs                      │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start (30 Minutes)

### Step 1: Azure Resource Setup (10 min)

```bash
# Login to Azure
az login

# Set your subscription
az account set --subscription "YOUR_SUBSCRIPTION_ID"

# Create resource group
az group create \
  --name healthmesh-prod-rg \
  --location eastus2

# Deploy infrastructure
az deployment group create \
  --resource-group healthmesh-prod-rg \
  --template-file infra/main.bicep \
  --parameters infra/parameters.prod.json \
  --parameters sqlAdminPassword="YourSecurePassword123!"
```

### Step 2: Configure GitHub Secrets (5 min)

Go to GitHub Repository → Settings → Secrets and Variables → Actions

Add these secrets:
```
AZURE_CLIENT_ID=<service-principal-app-id>
AZURE_TENANT_ID=<azure-ad-tenant-id>
AZURE_SUBSCRIPTION_ID=<subscription-id>
SQL_ADMIN_PASSWORD=<secure-password>
```

### Step 3: Deploy Application (10 min)

```bash
# Trigger GitHub Actions deployment
git push origin main

# Or deploy manually
npm run build
az webapp deployment source config-zip \
  --resource-group healthmesh-prod-rg \
  --name <webapp-name> \
  --src dist.zip
```

### Step 4: Configure Database (5 min)

```bash
# Run database migrations
npm run db:push

# Seed initial data (if needed)
npm run db:seed
```

## 🔐 Security Configuration

### 1. Azure AD (Entra ID) Setup

```bash
# Create App Registration
az ad app create \
  --display-name "HealthMesh Production" \
  --web-redirect-uris "https://<your-app>.azurewebsites.net/auth/callback"

# Enable ID tokens
az ad app update \
  --id <app-id> \
  --enable-id-token-issuance true

# Create Service Principal for CI/CD
az ad sp create-for-rbac \
  --name "healthmesh-github-actions" \
  --role contributor \
  --scopes /subscriptions/<sub-id>/resourceGroups/healthmesh-prod-rg \
  --sdk-auth
```

### 2. Enable MFA (Multi-Factor Authentication)

1. Go to Azure AD → Security → Authentication methods
2. Enable MFA for all users
3. Configure Conditional Access policies
4. Require MFA for healthcare app access

### 3. RBAC (Role-Based Access Control)

```bash
# Healthcare Admin Role
az role assignment create \
  --assignee <user-email> \
  --role "Owner" \
  --scope /subscriptions/<sub-id>/resourceGroups/healthmesh-prod-rg

# Healthcare Clinician Role (read-only)
az role assignment create \
  --assignee <user-email> \
  --role "Reader" \
  --scope /subscriptions/<sub-id>/resourceGroups/healthmesh-prod-rg
```

## 🗄️ Database Configuration

### Multi-Tenant Schema Deployment

```sql
-- Run this in Azure SQL Database Query Editor
-- Or use: npm run db:push

-- Create multi-tenant schema with tenant isolation
CREATE TABLE organizations (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  tenant_id VARCHAR(255) UNIQUE NOT NULL,
  name NVARCHAR(255) NOT NULL,
  created_at DATETIME2 DEFAULT GETUTCDATE()
);

-- Enable Row-Level Security for tenant isolation
CREATE FUNCTION dbo.fn_tenantAccessPredicate(@tenant_id VARCHAR(255))
RETURNS TABLE
WITH SCHEMABINDING
AS
RETURN SELECT 1 AS fn_securitypredicate_result
WHERE @tenant_id = CAST(SESSION_CONTEXT(N'TenantId') AS VARCHAR(255));
```

## 📊 Monitoring & Alerts

### Application Insights Setup

```bash
# Get connection string
az monitor app-insights component show \
  --app healthmesh-prod-insights \
  --resource-group healthmesh-prod-rg \
  --query connectionString -o tsv

# Add to App Service configuration
az webapp config appsettings set \
  --name <webapp-name> \
  --resource-group healthmesh-prod-rg \
  --settings APPLICATIONINSIGHTS_CONNECTION_STRING="<connection-string>"
```

### Key Metrics to Monitor

- ✅ HTTP 5xx errors (< 0.1%)
- ✅ Response time (< 200ms p95)
- ✅ CPU utilization (< 70%)
- ✅ Memory usage (< 80%)
- ✅ SQL DTU (< 80%)
- ✅ Failed login attempts
- ✅ Data access patterns (audit)

## 🔒 Compliance & Audit

### Enable Audit Logging

```bash
# SQL Database auditing
az sql db audit-policy update \
  --resource-group healthmesh-prod-rg \
  --server <sql-server-name> \
  --name healthmesh \
  --state Enabled \
  --storage-account <storage-account>

# App Service logging
az webapp log config \
  --name <webapp-name> \
  --resource-group healthmesh-prod-rg \
  --application-logging filesystem \
  --detailed-error-messages true \
  --failed-request-tracing true
```

### HIPAA Compliance Checklist

- ☑️ Encryption at rest (SQL, Storage)
- ☑️ Encryption in transit (TLS 1.2+)
- ☑️ Audit logging enabled
- ☑️ Access controls (RBAC, MFA)
- ☑️ Data backup & retention
- ☑️ Incident response plan
- ☑️ Business Associate Agreement (BAA) with Microsoft

## 🌍 Multi-Environment Setup

### Development
```bash
az deployment group create \
  --resource-group healthmesh-dev-rg \
  --template-file infra/main.bicep \
  --parameters infra/parameters.dev.json
```

### Staging
```bash
az deployment group create \
  --resource-group healthmesh-staging-rg \
  --template-file infra/main.bicep \
  --parameters infra/parameters.staging.json
```

### Production
```bash
az deployment group create \
  --resource-group healthmesh-prod-rg \
  --template-file infra/main.bicep \
  --parameters infra/parameters.prod.json
```

## 📦 Backup & Disaster Recovery

### Automated Backups

```bash
# SQL Database backup (automatic)
az sql db ltr-policy set \
  --resource-group healthmesh-prod-rg \
  --server <sql-server-name> \
  --database healthmesh \
  --weekly-retention P12W \
  --monthly-retention P12M \
  --yearly-retention P7Y

# Blob Storage backup
az storage account blob-service-properties update \
  --account-name <storage-account> \
  --enable-versioning true \
  --enable-delete-retention true \
  --delete-retention-days 365
```

## 🚨 Troubleshooting

### Common Issues

**Issue: App won't start**
```bash
# Check application logs
az webapp log tail --name <webapp-name> --resource-group healthmesh-prod-rg

# Check deployment status
az webapp deployment list-publishing-profiles --name <webapp-name> --resource-group healthmesh-prod-rg
```

**Issue: Database connection failed**
```bash
# Check firewall rules
az sql server firewall-rule list --server <sql-server> --resource-group healthmesh-prod-rg

# Test connectivity
az sql db show-connection-string --server <sql-server> --name healthmesh
```

**Issue: High costs**
```bash
# Check resource costs
az consumption usage list --start-date 2025-01-01 --end-date 2025-01-31

# Optimize resources
# - Scale down App Service Plan during off-hours
# - Use autoscaling
# - Review AI model usage
```

## 💰 Cost Optimization

### Monthly Cost Estimates

**Development**: ~$200/month
- App Service B2: $50
- SQL S1: $30
- Storage: $10
- AI Services: $100

**Production**: ~$800/month
- App Service P1V3: $200
- SQL S3: $150
- Storage GRS: $50
- AI Services: $300
- Monitoring: $100

### Cost Reduction Tips
- Use Azure Reserved Instances (save 30-40%)
- Enable autoscaling
- Archive old data to cool/archive storage
- Use Azure Hybrid Benefit if applicable

## 📚 Additional Resources

- [Azure Well-Architected Framework](https://learn.microsoft.com/azure/architecture/framework/)
- [HIPAA on Azure](https://learn.microsoft.com/azure/compliance/offerings/offering-hipaa-us)
- [Azure Security Best Practices](https://learn.microsoft.com/azure/security/fundamentals/best-practices-and-patterns)
- [Healthcare Reference Architecture](https://learn.microsoft.com/azure/architecture/industries/healthcare)

## 🆘 Support

- **Azure Support**: https://portal.azure.com/#blade/Microsoft_Azure_Support/HelpAndSupportBlade
- **GitHub Issues**: https://github.com/balaraj74/HealthMesh/issues
- **Documentation**: See /docs folder

---

**Deployment completed successfully!** ✅

Your HealthMesh application is now running on Azure with enterprise-grade security and compliance.
