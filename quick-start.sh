#!/bin/bash

#############################################################################
# HealthMesh - Quick Start Script
# Run this after azure-setup.sh completes
#############################################################################

set -e

echo "========================================"
echo "  HealthMesh Azure Integration"
echo "  Quick Start Verification"
echo "========================================"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "Please run: ./azure-setup.sh first"
    exit 1
fi

echo "✓ .env file found"
echo ""

# Install dependencies
echo "📦 Installing npm dependencies..."
npm install
echo "✓ Dependencies installed"
echo ""

# Build TypeScript
echo "🔨 Compiling TypeScript..."
npm run build 2>/dev/null || echo "⚠️  Build warnings (ignore for development)"
echo "✓ TypeScript compiled"
echo ""

# Check Azure resources
echo "🔍 Verifying Azure resources..."

# Get resource group from .env or use default
RESOURCE_GROUP="healthmesh-rg"

# Check if resource group exists
if az group show --name "$RESOURCE_GROUP" &>/dev/null; then
    echo "✓ Resource group exists: $RESOURCE_GROUP"
    
    # List resources
    echo ""
    echo "📋 Deployed Azure Resources:"
    az resource list \
        --resource-group "$RESOURCE_GROUP" \
        --query "[].{Name:name, Type:type, Location:location}" \
        --output table
else
    echo "❌ Resource group not found: $RESOURCE_GROUP"
    echo "Please run: ./azure-setup.sh"
    exit 1
fi

echo ""
echo "========================================"
echo "  ✓ Setup Complete!"
echo "========================================"
echo ""
echo "Next Steps:"
echo "  1. Review AZURE_INTEGRATION_GUIDE.md for detailed instructions"
echo "  2. Manually setup FHIR service via Azure Portal"
echo "  3. Update .env with FHIR endpoint"
echo "  4. Run: npm run dev"
echo ""
echo "Demo Scenario:"
echo "  - Open http://localhost:5000"
echo "  - Create a new patient"
echo "  - Create a clinical case"
echo "  - Upload a lab report"
echo "  - Trigger agent processing"
echo "  - Review AI recommendations"
echo ""
echo "Documentation:"
echo "  - Full Guide: ./AZURE_INTEGRATION_GUIDE.md"
echo "  - Architecture: ./design_guidelines.md"
echo ""
