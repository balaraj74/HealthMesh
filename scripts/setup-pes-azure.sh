#!/bin/bash

# HealthMesh Azure Setup Script for PES University Account
# Account: PES1UG24CS560@stu.pes.edu
# Subscription: 4f8e7887-b6f8-476b-8041-596a706a10eb

set -e

echo "=================================================="
echo "HealthMesh Azure Infrastructure Setup"
echo "Account: PES1UG24CS560@stu.pes.edu"
echo "=================================================="

# Configuration
RESOURCE_GROUP="HealthMesh"
LOCATION="eastus"
APP_NAME="healthmesh-pes"
SQL_SERVER_NAME="healthmesh-pes-sql"
SQL_DB_NAME="healthmesh-db"
SQL_ADMIN_USER="healthmeshadmin"
SQL_ADMIN_PASSWORD="HealthMesh@2025Secure!"
PLAN_NAME="healthmesh-pes-plan"

echo ""
echo "📋 Configuration:"
echo "  Resource Group: $RESOURCE_GROUP"
echo "  Location: $LOCATION"
echo "  App Name: $APP_NAME"
echo "  SQL Server: $SQL_SERVER_NAME"
echo ""

# Verify login
echo "🔐 Verifying Azure login..."
CURRENT_USER=$(az account show --query user.name -o tsv)
echo "  Logged in as: $CURRENT_USER"

if [ "$CURRENT_USER" != "PES1UG24CS560@stu.pes.edu" ]; then
    echo "❌ Error: Please login with PES1UG24CS560@stu.pes.edu"
    echo "Run: az login"
    exit 1
fi

echo "✅ Correct account verified"
echo ""

# Create App Service Plan
echo "📦 Creating App Service Plan..."
az appservice plan create \
    --name $PLAN_NAME \
    --resource-group $RESOURCE_GROUP \
    --location $LOCATION \
    --sku B1 \
    --is-linux \
    || echo "App Service Plan already exists"

echo "✅ App Service Plan ready"
echo ""

# Create Web App
echo "🌐 Creating Web App..."
az webapp create \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --plan $PLAN_NAME \
    --runtime "NODE:20-lts" \
    || echo "Web App already exists"

echo "✅ Web App created: https://$APP_NAME.azurewebsites.net"
echo ""

# Create SQL Server
echo "🗄️  Creating Azure SQL Server..."
az sql server create \
    --name $SQL_SERVER_NAME \
    --resource-group $RESOURCE_GROUP \
    --location $LOCATION \
    --admin-user $SQL_ADMIN_USER \
    --admin-password $SQL_ADMIN_PASSWORD \
    || echo "SQL Server already exists"

echo "✅ SQL Server created: $SQL_SERVER_NAME.database.windows.net"
echo ""

# Configure SQL Server Firewall
echo "🔥 Configuring SQL Server firewall..."
az sql server firewall-rule create \
    --resource-group $RESOURCE_GROUP \
    --server $SQL_SERVER_NAME \
    --name AllowAllWindowsAzureIps \
    --start-ip-address 0.0.0.0 \
    --end-ip-address 0.0.0.0 \
    || echo "Azure services rule already exists"

# Get current IP and add it
CURRENT_IP=$(curl -s ifconfig.me)
echo "  Your IP: $CURRENT_IP"

az sql server firewall-rule create \
    --resource-group $RESOURCE_GROUP \
    --server $SQL_SERVER_NAME \
    --name AllowCurrentIP \
    --start-ip-address $CURRENT_IP \
    --end-ip-address $CURRENT_IP \
    || echo "Current IP rule already exists"

echo "✅ Firewall configured"
echo ""

# Create SQL Database
echo "💾 Creating SQL Database..."
az sql db create \
    --resource-group $RESOURCE_GROUP \
    --server $SQL_SERVER_NAME \
    --name $SQL_DB_NAME \
    --service-objective Basic \
    --compute-model Serverless \
    --edition GeneralPurpose \
    --family Gen5 \
    --capacity 1 \
    || echo "Database already exists"

echo "✅ Database created: $SQL_DB_NAME"
echo ""

# Get Entra ID Application details
echo "🔐 Entra ID Configuration Required:"
echo ""
echo "You need to create an Entra ID App Registration:"
echo "1. Go to: https://portal.azure.com/#view/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/~/RegisteredApps"
echo "2. Click 'New registration'"
echo "3. Name: HealthMesh"
echo "4. Supported account types: Accounts in any organizational directory (Any Microsoft Entra ID tenant - Multitenant)"
echo "5. Redirect URI: https://$APP_NAME.azurewebsites.net/login"
echo "6. After creation, note the 'Application (client) ID' and 'Directory (tenant) ID'"
echo "7. Create a client secret in 'Certificates & secrets'"
echo ""
echo "Press Enter after creating the Entra ID app registration..."
read

echo ""
echo "Please enter your Entra ID details:"
read -p "Application (client) ID: " CLIENT_ID
read -p "Directory (tenant) ID: " TENANT_ID

echo ""
echo "⚙️  Configuring Web App settings..."

# Build connection string
CONNECTION_STRING="Server=tcp:$SQL_SERVER_NAME.database.windows.net,1433;Initial Catalog=$SQL_DB_NAME;User Id=$SQL_ADMIN_USER;Password=$SQL_ADMIN_PASSWORD;Encrypt=true;TrustServerCertificate=false;Connection Timeout=30;"

# Configure app settings
az webapp config appsettings set \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --settings \
        NODE_ENV=production \
        PORT=8080 \
        AZURE_SQL_SERVER="$SQL_SERVER_NAME.database.windows.net" \
        AZURE_SQL_DATABASE="$SQL_DB_NAME" \
        AZURE_SQL_USERNAME="$SQL_ADMIN_USER" \
        AZURE_SQL_PASSWORD="$SQL_ADMIN_PASSWORD" \
        AZURE_SQL_CONNECTION_STRING="$CONNECTION_STRING" \
        AZURE_AD_TENANT_ID="$TENANT_ID" \
        AZURE_AD_CLIENT_ID="$CLIENT_ID" \
        VITE_AZURE_AD_CLIENT_ID="$CLIENT_ID" \
        VITE_AZURE_AD_TENANT_ID="$TENANT_ID" \
        VITE_AZURE_AD_REDIRECT_URI="https://$APP_NAME.azurewebsites.net/login" \
        SCM_DO_BUILD_DURING_DEPLOYMENT=false \
        ENABLE_ORYX_BUILD=false \
        WEBSITE_NODE_DEFAULT_VERSION="~20" \
        WEBSITE_RUN_FROM_PACKAGE=1 \
    --output none

echo "✅ App settings configured"
echo ""

echo "=================================================="
echo "✅ Infrastructure Setup Complete!"
echo "=================================================="
echo ""
echo "📝 Summary:"
echo "  Web App URL: https://$APP_NAME.azurewebsites.net"
echo "  SQL Server: $SQL_SERVER_NAME.database.windows.net"
echo "  Database: $SQL_DB_NAME"
echo ""
echo "Next Steps:"
echo "1. Build the application: npm run build"
echo "2. Deploy to Azure: az webapp deployment source config-zip --resource-group $RESOURCE_GROUP --name $APP_NAME --src dist.zip"
echo "3. Initialize database: Run migrations"
echo ""
echo "🔐 Important Credentials (save these securely):"
echo "  SQL Admin User: $SQL_ADMIN_USER"
echo "  SQL Admin Password: $SQL_ADMIN_PASSWORD"
echo "  Client ID: $CLIENT_ID"
echo "  Tenant ID: $TENANT_ID"
echo ""
