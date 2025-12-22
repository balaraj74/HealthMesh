# HealthMesh Azure Infrastructure

This folder contains Infrastructure as Code (IaC) using Azure Bicep for deploying HealthMesh to Microsoft Azure with healthcare-grade security and compliance.

## 📁 Files

- **main.bicep**: Main infrastructure template (624 lines)
- **parameters.dev.json**: Development environment parameters
- **parameters.staging.json**: Staging environment parameters  
- **parameters.prod.json**: Production environment parameters

## 🏗️ Infrastructure Components

### Core Services
- **Azure App Service** (Node.js 20 LTS on Linux)
  - Dev: B2 tier
  - Prod: P1V3 tier (2 instances)
  - Always On, HTTPS only, TLS 1.2+

- **Azure SQL Database** (Multi-tenant)
  - Dev: S1 tier
  - Prod: S3 tier with zone redundancy
  - Ledger enabled for immutable audit logs
  - Advanced Threat Protection
  - Geo-redundant backup (prod)

- **Azure Blob Storage**
  - Containers: lab-reports, medical-documents, backups
  - GRS for production, LRS for dev
  - TLS 1.2 minimum, HTTPS only
  - Soft delete enabled

- **Azure Key Vault**
  - Premium SKU for production
  - Stores SQL credentials and secrets
  - RBAC enabled, soft delete + purge protection

### Monitoring & Security
- **Application Insights** - Telemetry and APM
- **Log Analytics Workspace** - Centralized logging (365 days retention for prod)
- **Diagnostic Settings** - Audit logs for all services
- **Monitoring Alerts**:
  - High CPU (>80%)
  - HTTP 5xx errors (>10)
  - SQL DTU (>80%)

### Security Features
- ✅ Managed identities (no hardcoded credentials)
- ✅ RBAC role assignments (Key Vault + Storage)
- ✅ Encryption at rest and in transit
- ✅ SQL Advanced Threat Protection
- ✅ Network security rules
- ✅ Audit logging to Log Analytics

## 🚀 Deployment

### Prerequisites
```bash
# Install Azure CLI
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Login to Azure
az login

# Set subscription
az account set --subscription "YOUR_SUBSCRIPTION_ID"
```

### 1. Development Environment
```bash
az group create --name healthmesh-dev-rg --location eastus2

az deployment group create \
  --resource-group healthmesh-dev-rg \
  --template-file main.bicep \
  --parameters parameters.dev.json \
  --parameters sqlAdminPassword="YourSecurePassword123!"
```

### 2. Staging Environment
```bash
az group create --name healthmesh-staging-rg --location eastus2

az deployment group create \
  --resource-group healthmesh-staging-rg \
  --template-file main.bicep \
  --parameters parameters.staging.json \
  --parameters sqlAdminPassword="YourSecurePassword123!"
```

### 3. Production Environment
```bash
az group create --name healthmesh-prod-rg --location eastus2

az deployment group create \
  --resource-group healthmesh-prod-rg \
  --template-file main.bicep \
  --parameters parameters.prod.json \
  --parameters sqlAdminPassword="YourStrongProductionPassword!"
```

## ⚙️ Configuration

### Update Parameters
Before deploying, update the parameter files with your values:

1. **azureAdTenantId**: Your Azure AD tenant ID
   ```bash
   az account show --query tenantId -o tsv
   ```

2. **adminEmail**: Email for monitoring alerts
3. **sqlAdminPassword**: Secure password (provided during deployment)

### Get Azure AD Tenant ID
```bash
# Get your tenant ID
az account show --query tenantId -o tsv

# Update parameters file
sed -i 's/YOUR_TENANT_ID_HERE/your-actual-tenant-id/g' parameters.*.json
```

## 📊 Post-Deployment

### Get Deployment Outputs
```bash
az deployment group show \
  --resource-group healthmesh-prod-rg \
  --name main \
  --query properties.outputs
```

### Access Key Vault
```bash
# Get Key Vault name
KV_NAME=$(az deployment group show --resource-group healthmesh-prod-rg --name main --query properties.outputs.keyVaultName.value -o tsv)

# Grant yourself access
az role assignment create \
  --assignee your-email@example.com \
  --role "Key Vault Secrets Officer" \
  --scope /subscriptions/$(az account show --query id -o tsv)/resourceGroups/healthmesh-prod-rg/providers/Microsoft.KeyVault/vaults/$KV_NAME
```

### Database Connection
```bash
# Get SQL server FQDN
az deployment group show \
  --resource-group healthmesh-prod-rg \
  --name main \
  --query properties.outputs.sqlServerFqdn.value
```

## 🔒 Security Best Practices

1. **Never commit secrets to git** - Use Azure Key Vault
2. **Use managed identities** - App Service accesses Key Vault and Storage without passwords
3. **Enable MFA** - For all Azure AD users
4. **Review audit logs** - Regularly check Log Analytics for suspicious activity
5. **Rotate secrets** - Change SQL passwords quarterly
6. **Use RBAC** - Grant minimum necessary permissions

## 💰 Cost Estimation

### Development (~$200/month)
- App Service B2: $50
- SQL S1: $30
- Storage: $10
- Monitoring: $20
- AI Services: $90

### Production (~$800/month)
- App Service P1V3 (2 instances): $400
- SQL S3: $150
- Storage GRS: $50
- Monitoring: $100
- AI Services: $100

## 🔧 Troubleshooting

### Validate Bicep Template
```bash
az deployment group validate \
  --resource-group healthmesh-dev-rg \
  --template-file main.bicep \
  --parameters parameters.dev.json
```

### Check Deployment Status
```bash
az deployment group list --resource-group healthmesh-prod-rg -o table
```

### View Deployment Errors
```bash
az deployment group show \
  --resource-group healthmesh-prod-rg \
  --name main \
  --query properties.error
```

## 📚 Resources

- [Bicep Documentation](https://learn.microsoft.com/azure/azure-resource-manager/bicep/)
- [Azure Well-Architected Framework](https://learn.microsoft.com/azure/architecture/framework/)
- [HIPAA on Azure](https://learn.microsoft.com/azure/compliance/offerings/offering-hipaa-us)

---

For detailed deployment instructions, see [AZURE_DEPLOYMENT_GUIDE.md](../AZURE_DEPLOYMENT_GUIDE.md)
