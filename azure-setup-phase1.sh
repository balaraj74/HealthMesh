#!/bin/bash

#############################################################################
# HealthMesh - Azure Infrastructure Setup (Phase 1 - No OpenAI restrictions)
# 
# This phase creates all Azure resources EXCEPT OpenAI
# OpenAI requires manual approval for Azure for Students subscriptions
#############################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
RESOURCE_GROUP="healthmesh-rg"
LOCATION="eastus2"
SUBSCRIPTION_ID="ef4b9fcc-7b99-4ebd-8299-6932f9dd16a3"

# Resource names (avoid OpenAI naming conflicts)
COSMOSDB_NAME="healthmesh-cosmos-$(date +%s)"
DOC_INTEL_NAME="healthmesh-docintel-$(date +%s)"
SEARCH_NAME="healthmesh-search-$(date +%s)"
APPINSIGHTS_NAME="healthmesh-insights"
STORAGE_NAME="healthmeshstore$(date +%s)"
LOG_WORKSPACE="healthmesh-logs"

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  HealthMesh Azure Setup (Phase 1)${NC}"
echo -e "${BLUE}  Creating non-OpenAI resources${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# Set subscription
echo -e "${YELLOW}Setting Azure subscription...${NC}"
az account set --subscription "$SUBSCRIPTION_ID"

# Ensure resource group exists
echo -e "${YELLOW}Ensuring resource group exists: $RESOURCE_GROUP...${NC}"
az group show --name "$RESOURCE_GROUP" &>/dev/null || \
  az group create \
    --name "$RESOURCE_GROUP" \
    --location "$LOCATION" \
    --tags Project=HealthMesh Environment=Development

echo -e "${GREEN}✓ Resource group ready${NC}"
echo ""

#############################################################################
# 1. AZURE COSMOS DB
#############################################################################
echo -e "${BLUE}[1/5] Deploying Azure Cosmos DB...${NC}"

# Check if already exists
if az cosmosdb show --name "$COSMOSDB_NAME" --resource-group "$RESOURCE_GROUP" &>/dev/null; then
    echo -e "${YELLOW}Cosmos DB already exists, skipping...${NC}"
else
    az cosmosdb create \
      --name "$COSMOSDB_NAME" \
      --resource-group "$RESOURCE_GROUP" \
      --locations regionName="$LOCATION" failoverPriority=0 isZoneRedundant=False \
      --default-consistency-level Session \
      --enable-free-tier false \
      --tags Service=CosmosDB

    # Create database
    az cosmosdb sql database create \
      --account-name "$COSMOSDB_NAME" \
      --resource-group "$RESOURCE_GROUP" \
      --name "HealthMeshDB"

    # Create containers
    echo -e "${YELLOW}Creating Cosmos DB containers...${NC}"

    az cosmosdb sql container create \
      --account-name "$COSMOSDB_NAME" \
      --resource-group "$RESOURCE_GROUP" \
      --database-name "HealthMeshDB" \
      --name "Cases" \
      --partition-key-path "/id" \
      --throughput 400

    az cosmosdb sql container create \
      --account-name "$COSMOSDB_NAME" \
      --resource-group "$RESOURCE_GROUP" \
      --database-name "HealthMeshDB" \
      --name "Patients" \
      --partition-key-path "/id" \
      --throughput 400

    az cosmosdb sql container create \
      --account-name "$COSMOSDB_NAME" \
      --resource-group "$RESOURCE_GROUP" \
      --database-name "HealthMeshDB" \
      --name "AuditLogs" \
      --partition-key-path "/id" \
      --throughput 400
fi

COSMOS_CONNECTION_STRING=$(az cosmosdb keys list \
  --name "$COSMOSDB_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --type connection-strings \
  --query "connectionStrings[0].connectionString" -o tsv)

echo -e "${GREEN}✓ Cosmos DB deployed${NC}"
echo ""

#############################################################################
# 2. AZURE DOCUMENT INTELLIGENCE
#############################################################################
echo -e "${BLUE}[2/5] Deploying Azure Document Intelligence...${NC}"

if az cognitiveservices account show --name "$DOC_INTEL_NAME" --resource-group "$RESOURCE_GROUP" &>/dev/null; then
    echo -e "${YELLOW}Document Intelligence already exists, skipping...${NC}"
else
    az cognitiveservices account create \
      --name "$DOC_INTEL_NAME" \
      --resource-group "$RESOURCE_GROUP" \
      --location "$LOCATION" \
      --kind FormRecognizer \
      --sku S0 \
      --tags Service=DocumentIntelligence \
      --yes
fi

DOC_INTEL_ENDPOINT=$(az cognitiveservices account show \
  --name "$DOC_INTEL_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "properties.endpoint" -o tsv)

DOC_INTEL_KEY=$(az cognitiveservices account keys list \
  --name "$DOC_INTEL_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "key1" -o tsv)

echo -e "${GREEN}✓ Document Intelligence deployed${NC}"
echo ""

#############################################################################
# 3. AZURE COGNITIVE SEARCH
#############################################################################
echo -e "${BLUE}[3/5] Deploying Azure Cognitive Search...${NC}"

if az search service show --name "$SEARCH_NAME" --resource-group "$RESOURCE_GROUP" &>/dev/null; then
    echo -e "${YELLOW}Search service already exists, skipping...${NC}"
else
    az search service create \
      --name "$SEARCH_NAME" \
      --resource-group "$RESOURCE_GROUP" \
      --location "$LOCATION" \
      --sku basic \
      --partition-count 1 \
      --replica-count 1
fi

SEARCH_ENDPOINT="https://${SEARCH_NAME}.search.windows.net"
SEARCH_KEY=$(az search admin-key show \
  --service-name "$SEARCH_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "primaryKey" -o tsv)

echo -e "${GREEN}✓ Cognitive Search deployed${NC}"
echo ""

#############################################################################
# 4. AZURE STORAGE ACCOUNT
#############################################################################
echo -e "${BLUE}[4/5] Deploying Azure Storage Account...${NC}"

if az storage account show --name "$STORAGE_NAME" --resource-group "$RESOURCE_GROUP" &>/dev/null; then
    echo -e "${YELLOW}Storage account already exists, skipping...${NC}"
else
    az storage account create \
      --name "$STORAGE_NAME" \
      --resource-group "$RESOURCE_GROUP" \
      --location "$LOCATION" \
      --sku Standard_LRS \
      --kind StorageV2
fi

STORAGE_KEY=$(az storage account keys list \
  --account-name "$STORAGE_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "[0].value" -o tsv)

az storage container create \
  --name "lab-reports" \
  --account-name "$STORAGE_NAME" \
  --account-key "$STORAGE_KEY" \
  --only-show-errors || true

STORAGE_CONNECTION_STRING="DefaultEndpointsProtocol=https;AccountName=${STORAGE_NAME};AccountKey=${STORAGE_KEY};EndpointSuffix=core.windows.net"

echo -e "${GREEN}✓ Storage Account deployed${NC}"
echo ""

#############################################################################
# 5. AZURE APPLICATION INSIGHTS
#############################################################################
echo -e "${BLUE}[5/5] Deploying Azure Application Insights...${NC}"

if az monitor log-analytics workspace show --workspace-name "$LOG_WORKSPACE" --resource-group "$RESOURCE_GROUP" &>/dev/null; then
    echo -e "${YELLOW}Log Analytics already exists, skipping...${NC}"
else
    az monitor log-analytics workspace create \
      --resource-group "$RESOURCE_GROUP" \
      --workspace-name "$LOG_WORKSPACE" \
      --location "$LOCATION"
fi

if az monitor app-insights component show --app "$APPINSIGHTS_NAME" --resource-group "$RESOURCE_GROUP" &>/dev/null; then
    echo -e "${YELLOW}Application Insights already exists, skipping...${NC}"
else
    az monitor app-insights component create \
      --app "$APPINSIGHTS_NAME" \
      --resource-group "$RESOURCE_GROUP" \
      --location "$LOCATION" \
      --workspace "$LOG_WORKSPACE"
fi

APPINSIGHTS_CONNECTION_STRING=$(az monitor app-insights component show \
  --app "$APPINSIGHTS_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "connectionString" -o tsv)

echo -e "${GREEN}✓ Application Insights deployed${NC}"
echo ""

#############################################################################
# GENERATE .env FILE
#############################################################################
echo -e "${BLUE}Generating .env configuration file...${NC}"

cat > .env << EOF
# HealthMesh Azure Configuration (Phase 1)
# Generated on: $(date)
# Resource Group: $RESOURCE_GROUP
# Location: $LOCATION

#############################################################################
# AZURE OPENAI - REQUIRES MANUAL SETUP
#############################################################################
# Azure for Students has restrictions on OpenAI deployment
# INSTRUCTIONS:
# 1. Apply for Azure OpenAI access: https://aka.ms/oai/access
# 2. Once approved, create Azure OpenAI resource via Portal
# 3. Deploy gpt-4o model
# 4. Update these values:

AZURE_OPENAI_ENDPOINT=https://your-openai-resource.openai.azure.com
AZURE_OPENAI_API_KEY=your-openai-api-key-here
AZURE_OPENAI_DEPLOYMENT=gpt-4o
AZURE_OPENAI_API_VERSION=2024-05-13

#############################################################################
# AZURE COSMOS DB - ✅ CONFIGURED
#############################################################################
AZURE_COSMOS_CONNECTION_STRING=$COSMOS_CONNECTION_STRING
AZURE_COSMOS_DATABASE=HealthMeshDB

#############################################################################
# AZURE FHIR - REQUIRES MANUAL SETUP
#############################################################################
# Visit: https://portal.azure.com
# 1. Create Azure Health Data Services workspace
# 2. Add FHIR service
# 3. Get endpoint and configure auth
AZURE_FHIR_ENDPOINT=https://your-fhir-service.azurehealthcareapis.com
AZURE_FHIR_TENANT_ID=0ba0de08-9840-495b-9ba1-a219de9356b8

#############################################################################
# AZURE DOCUMENT INTELLIGENCE - ✅ CONFIGURED
#############################################################################
AZURE_DOC_INTEL_ENDPOINT=$DOC_INTEL_ENDPOINT
AZURE_DOC_INTEL_KEY=$DOC_INTEL_KEY

#############################################################################
# AZURE COGNITIVE SEARCH - ✅ CONFIGURED
#############################################################################
AZURE_SEARCH_ENDPOINT=$SEARCH_ENDPOINT
AZURE_SEARCH_API_KEY=$SEARCH_KEY
AZURE_SEARCH_INDEX_NAME=medical-guidelines

#############################################################################
# AZURE STORAGE - ✅ CONFIGURED
#############################################################################
AZURE_STORAGE_CONNECTION_STRING=$STORAGE_CONNECTION_STRING
AZURE_STORAGE_CONTAINER=lab-reports

#############################################################################
# AZURE APPLICATION INSIGHTS - ✅ CONFIGURED
#############################################################################
APPLICATIONINSIGHTS_CONNECTION_STRING=$APPINSIGHTS_CONNECTION_STRING

#############################################################################
# APPLICATION SETTINGS
#############################################################################
NODE_ENV=development
PORT=5000
EOF

echo -e "${GREEN}✓ .env file generated${NC}"
echo ""

#############################################################################
# SUMMARY
#############################################################################
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}  Phase 1 Complete!${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo -e "${BLUE}✅ Resources Created:${NC}"
echo "  • Cosmos DB: $COSMOSDB_NAME"
echo "  • Document Intelligence: $DOC_INTEL_NAME"
echo "  • Cognitive Search: $SEARCH_NAME"
echo "  • Storage Account: $STORAGE_NAME"
echo "  • Application Insights: $APPINSIGHTS_NAME"
echo ""
echo -e "${YELLOW}⚠️  Manual Setup Required:${NC}"
echo ""
echo -e "${BLUE}1. Azure OpenAI Access (CRITICAL):${NC}"
echo "   • Azure for Students has restricted OpenAI access"
echo "   • Apply here: ${YELLOW}https://aka.ms/oai/access${NC}"
echo "   • Or use OpenAI API as alternative (add OPENAI_API_KEY to .env)"
echo ""
echo -e "${BLUE}2. Azure FHIR Service (Optional for demo):${NC}"
echo "   • Create via Azure Portal"
echo "   • Update AZURE_FHIR_ENDPOINT in .env"
echo ""
echo -e "${GREEN}Next Steps:${NC}"
echo "  1. Run: ${YELLOW}npm install${NC}"
echo "  2. Update .env with OpenAI credentials"
echo "  3. Run: ${YELLOW}npm run dev${NC}"
echo ""
echo -e "${BLUE}Alternative: Use OpenAI API directly${NC}"
echo "  If Azure OpenAI approval takes time:"
echo "  1. Get API key from: https://platform.openai.com"
echo "  2. Add to .env: ${YELLOW}OPENAI_API_KEY=sk-...${NC}"
echo "  3. App will fallback to OpenAI API"
echo ""
