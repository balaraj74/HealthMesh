#!/bin/bash
set -e

# HealthMesh Azure Deployment Script
# Usage: ./deploy.sh [dev|staging|prod]

ENVIRONMENT=${1:-dev}
RESOURCE_GROUP="healthmesh-${ENVIRONMENT}-rg"
LOCATION="eastus2"

echo "🚀 Deploying HealthMesh to Azure"
echo "Environment: $ENVIRONMENT"
echo "Resource Group: $RESOURCE_GROUP"
echo ""

# Check if logged in to Azure
if ! az account show &> /dev/null; then
    echo "❌ Not logged in to Azure. Please run 'az login' first."
    exit 1
fi

# Get current tenant ID
TENANT_ID=$(az account show --query tenantId -o tsv)
echo "✅ Using Azure AD Tenant: $TENANT_ID"

# Prompt for admin email if not set
if [ -z "$ADMIN_EMAIL" ]; then
    read -p "Enter admin email for alerts: " ADMIN_EMAIL
fi

# Prompt for SQL password if not set
if [ -z "$SQL_PASSWORD" ]; then
    read -s -p "Enter SQL admin password (min 8 chars, must include upper, lower, number, special): " SQL_PASSWORD
    echo ""
fi

# Update parameter file with tenant ID
sed -i "s/YOUR_TENANT_ID_HERE/$TENANT_ID/g" "infra/parameters.${ENVIRONMENT}.json"
sed -i "s/admin@example.com/$ADMIN_EMAIL/g" "infra/parameters.${ENVIRONMENT}.json"

# Create resource group
echo ""
echo "📦 Creating resource group..."
az group create --name $RESOURCE_GROUP --location $LOCATION

# Deploy infrastructure
echo ""
echo "🏗️  Deploying infrastructure (this may take 10-15 minutes)..."
az deployment group create \
  --resource-group $RESOURCE_GROUP \
  --template-file infra/main.bicep \
  --parameters "infra/parameters.${ENVIRONMENT}.json" \
  --parameters sqlAdminPassword="$SQL_PASSWORD" \
  --name "healthmesh-${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S)"

# Get deployment outputs
echo ""
echo "📋 Deployment outputs:"
az deployment group show \
  --resource-group $RESOURCE_GROUP \
  --name $(az deployment group list --resource-group $RESOURCE_GROUP --query '[0].name' -o tsv) \
  --query properties.outputs

# Get app service URL
APP_URL=$(az deployment group show \
  --resource-group $RESOURCE_GROUP \
  --name $(az deployment group list --resource-group $RESOURCE_GROUP --query '[0].name' -o tsv) \
  --query properties.outputs.appServiceUrl.value -o tsv)

echo ""
echo "✅ Deployment completed successfully!"
echo ""
echo "🌐 Application URL: $APP_URL"
echo "🔑 Next steps:"
echo "   1. Configure GitHub Actions secrets"
echo "   2. Deploy application code"
echo "   3. Run database migrations: npm run db:push"
echo "   4. Verify monitoring in Azure Portal"
echo ""
