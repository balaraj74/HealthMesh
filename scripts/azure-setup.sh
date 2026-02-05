#!/bin/bash

#############################################################################
# HealthMesh - Azure Infrastructure Setup Script
# 
# This script creates ALL required Azure resources for the HealthMesh
# multi-agent healthcare AI platform using Azure for Students subscription
#
# Prerequisites:
# - Azure CLI installed and logged in (az login)
# - Azure for Students subscription active
#############################################################################

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
RESOURCE_GROUP="healthmesh-rg"
LOCATION="eastus2"
OPENAI_LOCATION="swedencentral"  # OpenAI available region for Azure Students
SUBSCRIPTION_ID="ef4b9fcc-7b99-4ebd-8299-6932f9dd16a3"  # Your Azure for Students subscription

# Resource names
OPENAI_NAME="healthmesh-openai-$(date +%s)"
COSMOSDB_NAME="healthmesh-cosmos-$(date +%s)"
FHIR_WORKSPACE="healthmesh-fhir-workspace"
FHIR_SERVICE="healthmesh-fhir-service"
DOC_INTEL_NAME="healthmesh-docintel-$(date +%s)"
SEARCH_NAME="healthmesh-search-$(date +%s)"
APPINSIGHTS_NAME="healthmesh-insights"
STORAGE_NAME="healthmeshstore$(date +%s)"

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  HealthMesh Azure Setup${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# Set subscription
echo -e "${YELLOW}Setting Azure subscription...${NC}"
az account set --subscription "$SUBSCRIPTION_ID"

# Create resource group
echo -e "${YELLOW}Using existing resource group: $RESOURCE_GROUP in $LOCATION...${NC}"
az group show --name "$RESOURCE_GROUP" &>/dev/null || \
  az group create \
    --name "$RESOURCE_GROUP" \
    --location "$LOCATION" \
    --tags Project=HealthMesh Environment=Development

echo -e "${GREEN}✓ Resource group created${NC}"
echo ""

#############################################################################
# 1. AZURE OPENAI SERVICE (GPT-4o for all agents)
#############################################################################
echo -e "${BLUE}[1/7] Deploying Azure OpenAI Service...${NC}"

# Create Azure OpenAI resource
az cognitiveservices account create \
  --name "$OPENAI_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$OPENAI_LOCATION" \
  --kind OpenAI \
  --sku S0 \
  --custom-domain "$OPENAI_NAME" \
  --tags Service=OpenAI

# Deploy GPT-4o model
echo -e "${YELLOW}Deploying GPT-4o model...${NC}"
az cognitiveservices account deployment create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$OPENAI_NAME" \
  --deployment-name "gpt-4o" \
  --model-name "gpt-4o" \
  --model-version "2024-05-13" \
  --model-format OpenAI \
  --sku-capacity 10 \
  --sku-name "Standard"

# Get OpenAI endpoint and key
OPENAI_ENDPOINT=$(az cognitiveservices account show \
  --name "$OPENAI_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "properties.endpoint" -o tsv)

OPENAI_KEY=$(az cognitiveservices account keys list \
  --name "$OPENAI_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "key1" -o tsv)

echo -e "${GREEN}✓ Azure OpenAI deployed${NC}"
echo ""

#############################################################################
# 2. AZURE COSMOS DB (NoSQL API for cases, patients, audit logs)
#############################################################################
echo -e "${BLUE}[2/7] Deploying Azure Cosmos DB...${NC}"

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

# Cases container
az cosmosdb sql container create \
  --account-name "$COSMOSDB_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --database-name "HealthMeshDB" \
  --name "Cases" \
  --partition-key-path "/id" \
  --throughput 400

# Patients container
az cosmosdb sql container create \
  --account-name "$COSMOSDB_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --database-name "HealthMeshDB" \
  --name "Patients" \
  --partition-key-path "/id" \
  --throughput 400

# AuditLogs container
az cosmosdb sql container create \
  --account-name "$COSMOSDB_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --database-name "HealthMeshDB" \
  --name "AuditLogs" \
  --partition-key-path "/id" \
  --throughput 400

# Get Cosmos DB connection string
COSMOS_CONNECTION_STRING=$(az cosmosdb keys list \
  --name "$COSMOSDB_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --type connection-strings \
  --query "connectionStrings[0].connectionString" -o tsv)

echo -e "${GREEN}✓ Cosmos DB deployed${NC}"
echo ""

#############################################################################
# 3. AZURE HEALTH DATA SERVICES (FHIR)
#############################################################################
echo -e "${BLUE}[3/7] Deploying Azure Health Data Services (FHIR)...${NC}"

# Note: FHIR requires healthcare workspace
# For Azure for Students, we'll document the manual setup steps
echo -e "${YELLOW}FHIR Setup Instructions:${NC}"
echo "1. Go to Azure Portal: https://portal.azure.com"
echo "2. Create 'Azure Health Data Services workspace'"
echo "3. Add FHIR service to the workspace"
echo "4. Configure authentication (Microsoft Entra ID)"
echo "5. Update .env with FHIR endpoint"
echo ""
echo -e "${YELLOW}Automated FHIR setup not available in CLI for this subscription.${NC}"
echo -e "${YELLOW}Manual setup required via Azure Portal.${NC}"
echo ""

#############################################################################
# 4. AZURE DOCUMENT INTELLIGENCE (for lab report extraction)
#############################################################################
echo -e "${BLUE}[4/7] Deploying Azure Document Intelligence...${NC}"

az cognitiveservices account create \
  --name "$DOC_INTEL_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --kind FormRecognizer \
  --sku S0 \
  --tags Service=DocumentIntelligence

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
# 5. AZURE COGNITIVE SEARCH (for RAG - medical guidelines)
#############################################################################
echo -e "${BLUE}[5/7] Deploying Azure Cognitive Search...${NC}"

az search service create \
  --name "$SEARCH_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --sku basic \
  --partition-count 1 \
  --replica-count 1

SEARCH_ENDPOINT="https://${SEARCH_NAME}.search.windows.net"
SEARCH_KEY=$(az search admin-key show \
  --service-name "$SEARCH_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "primaryKey" -o tsv)

echo -e "${GREEN}✓ Cognitive Search deployed${NC}"
echo ""

#############################################################################
# 6. AZURE STORAGE ACCOUNT (for lab report uploads)
#############################################################################
echo -e "${BLUE}[6/7] Deploying Azure Storage Account...${NC}"

az storage account create \
  --name "$STORAGE_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --sku Standard_LRS \
  --kind StorageV2

# Create container for lab reports
STORAGE_KEY=$(az storage account keys list \
  --account-name "$STORAGE_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "[0].value" -o tsv)

az storage container create \
  --name "lab-reports" \
  --account-name "$STORAGE_NAME" \
  --account-key "$STORAGE_KEY"

STORAGE_CONNECTION_STRING="DefaultEndpointsProtocol=https;AccountName=${STORAGE_NAME};AccountKey=${STORAGE_KEY};EndpointSuffix=core.windows.net"

echo -e "${GREEN}✓ Storage Account deployed${NC}"
echo ""

#############################################################################
# 7. AZURE APPLICATION INSIGHTS (for monitoring)
#############################################################################
echo -e "${BLUE}[7/7] Deploying Azure Application Insights...${NC}"

# Create Log Analytics Workspace first
LOG_WORKSPACE="healthmesh-logs"
az monitor log-analytics workspace create \
  --resource-group "$RESOURCE_GROUP" \
  --workspace-name "$LOG_WORKSPACE" \
  --location "$LOCATION"

# Create Application Insights
az monitor app-insights component create \
  --app "$APPINSIGHTS_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --workspace "$LOG_WORKSPACE"

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
# HealthMesh Azure Configuration
# Generated on: $(date)
# Resource Group: $RESOURCE_GROUP
# Location: $LOCATION

#############################################################################
# AZURE OPENAI
#############################################################################
AZURE_OPENAI_ENDPOINT=$OPENAI_ENDPOINT
AZURE_OPENAI_API_KEY=$OPENAI_KEY
AZURE_OPENAI_DEPLOYMENT=gpt-4o
AZURE_OPENAI_API_VERSION=2024-05-13

#############################################################################
# AZURE COSMOS DB
#############################################################################
AZURE_COSMOS_CONNECTION_STRING=$COSMOS_CONNECTION_STRING
AZURE_COSMOS_DATABASE=HealthMeshDB

#############################################################################
# AZURE FHIR (MANUAL SETUP REQUIRED)
#############################################################################
# Visit: https://portal.azure.com
# 1. Create Azure Health Data Services workspace
# 2. Add FHIR service
# 3. Get endpoint and configure auth
AZURE_FHIR_ENDPOINT=https://your-fhir-service.azurehealthcareapis.com
AZURE_FHIR_TENANT_ID=0ba0de08-9840-495b-9ba1-a219de9356b8
# Use Managed Identity or Service Principal for auth

#############################################################################
# AZURE DOCUMENT INTELLIGENCE
#############################################################################
AZURE_DOC_INTEL_ENDPOINT=$DOC_INTEL_ENDPOINT
AZURE_DOC_INTEL_KEY=$DOC_INTEL_KEY

#############################################################################
# AZURE COGNITIVE SEARCH
#############################################################################
AZURE_SEARCH_ENDPOINT=$SEARCH_ENDPOINT
AZURE_SEARCH_API_KEY=$SEARCH_KEY
AZURE_SEARCH_INDEX_NAME=medical-guidelines

#############################################################################
# AZURE STORAGE
#############################################################################
AZURE_STORAGE_CONNECTION_STRING=$STORAGE_CONNECTION_STRING
AZURE_STORAGE_CONTAINER=lab-reports

#############################################################################
# AZURE APPLICATION INSIGHTS
#############################################################################
APPLICATIONINSIGHTS_CONNECTION_STRING=$APPINSIGHTS_CONNECTION_STRING

#############################################################################
# APPLICATION SETTINGS
#############################################################################
NODE_ENV=production
PORT=5000
EOF

echo -e "${GREEN}✓ .env file generated${NC}"
echo ""

#############################################################################
# SUMMARY
#############################################################################
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}  Setup Complete!${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo -e "${BLUE}Resources Created:${NC}"
echo "  Resource Group: $RESOURCE_GROUP"
echo "  Azure OpenAI: $OPENAI_NAME"
echo "  Cosmos DB: $COSMOSDB_NAME"
echo "  Document Intelligence: $DOC_INTEL_NAME"
echo "  Cognitive Search: $SEARCH_NAME"
echo "  Storage Account: $STORAGE_NAME"
echo "  Application Insights: $APPINSIGHTS_NAME"
echo ""
echo -e "${YELLOW}Manual Setup Required:${NC}"
echo "  1. Azure FHIR Service (via Portal)"
echo "  2. Update .env with FHIR endpoint"
echo "  3. Index medical guidelines in Cognitive Search"
echo ""
echo -e "${BLUE}Configuration saved to: .env${NC}"
echo ""
echo -e "${GREEN}Next Steps:${NC}"
echo "  1. Review and update .env file"
echo "  2. Run: npm install"
echo "  3. Run: npm run dev"
echo "  4. Test agent integrations"
echo ""
echo -e "${BLUE}View resources: ${NC}az group show --name $RESOURCE_GROUP"
echo ""
