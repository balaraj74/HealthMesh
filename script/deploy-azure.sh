#!/bin/bash
# HealthMesh - Azure Deployment Script
# This script deploys all required Azure infrastructure

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}  HealthMesh Azure Deployment Script  ${NC}"
echo -e "${GREEN}======================================${NC}"

# Check for required tools
command -v az >/dev/null 2>&1 || { echo -e "${RED}Azure CLI is required but not installed. Aborting.${NC}" >&2; exit 1; }
command -v node >/dev/null 2>&1 || { echo -e "${RED}Node.js is required but not installed. Aborting.${NC}" >&2; exit 1; }

# Configuration
RESOURCE_GROUP="${RESOURCE_GROUP:-healthmesh-rg}"
LOCATION="${LOCATION:-eastus2}"
ENVIRONMENT="${ENVIRONMENT:-dev}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@example.com}"

echo ""
echo -e "${YELLOW}Configuration:${NC}"
echo "  Resource Group: $RESOURCE_GROUP"
echo "  Location: $LOCATION"
echo "  Environment: $ENVIRONMENT"
echo "  Admin Email: $ADMIN_EMAIL"
echo ""

# Check Azure login
echo -e "${YELLOW}Checking Azure authentication...${NC}"
az account show >/dev/null 2>&1 || {
    echo -e "${YELLOW}Not logged in. Running az login...${NC}"
    az login
}

SUBSCRIPTION=$(az account show --query name -o tsv)
echo -e "${GREEN}Using subscription: $SUBSCRIPTION${NC}"
echo ""

# Create resource group
echo -e "${YELLOW}Creating resource group...${NC}"
az group create --name "$RESOURCE_GROUP" --location "$LOCATION" --output none
echo -e "${GREEN}Resource group created.${NC}"

# Deploy Bicep template
echo ""
echo -e "${YELLOW}Deploying Azure infrastructure (this may take 10-15 minutes)...${NC}"
DEPLOYMENT_OUTPUT=$(az deployment group create \
    --resource-group "$RESOURCE_GROUP" \
    --template-file "$(dirname "$0")/../infra/main.bicep" \
    --parameters environment="$ENVIRONMENT" adminEmail="$ADMIN_EMAIL" \
    --query "properties.outputs" \
    -o json)

# Extract outputs
WEBAPP_URL=$(echo "$DEPLOYMENT_OUTPUT" | jq -r '.webAppUrl.value')
WEBAPP_NAME=$(echo "$DEPLOYMENT_OUTPUT" | jq -r '.webAppName.value')
OPENAI_ENDPOINT=$(echo "$DEPLOYMENT_OUTPUT" | jq -r '.openaiEndpoint.value')
COSMOS_ENDPOINT=$(echo "$DEPLOYMENT_OUTPUT" | jq -r '.cosmosEndpoint.value')
FHIR_ENDPOINT=$(echo "$DEPLOYMENT_OUTPUT" | jq -r '.fhirEndpoint.value')
SEARCH_ENDPOINT=$(echo "$DEPLOYMENT_OUTPUT" | jq -r '.searchEndpoint.value')

echo -e "${GREEN}Infrastructure deployed successfully!${NC}"
echo ""

# Build application
echo -e "${YELLOW}Building application...${NC}"
npm ci
npm run build
echo -e "${GREEN}Application built.${NC}"

# Deploy application
echo ""
echo -e "${YELLOW}Deploying application to Azure...${NC}"
cd dist
zip -r ../app.zip .
cd ..
az webapp deployment source config-zip \
    --resource-group "$RESOURCE_GROUP" \
    --name "$WEBAPP_NAME" \
    --src app.zip
rm app.zip
echo -e "${GREEN}Application deployed.${NC}"

# Print summary
echo ""
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}       Deployment Complete!          ${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo -e "${YELLOW}Resources Created:${NC}"
echo "  Web App URL:        $WEBAPP_URL"
echo "  Azure OpenAI:       $OPENAI_ENDPOINT"
echo "  Cosmos DB:          $COSMOS_ENDPOINT"
echo "  FHIR Service:       $FHIR_ENDPOINT"
echo "  Cognitive Search:   $SEARCH_ENDPOINT"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Visit $WEBAPP_URL to access HealthMesh"
echo "  2. Configure FHIR service authentication"
echo "  3. Upload medical guidelines to Cognitive Search"
echo "  4. Review Application Insights for monitoring"
echo ""
echo -e "${GREEN}For support, visit: https://github.com/your-org/healthmesh${NC}"
