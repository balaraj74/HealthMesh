#!/bin/bash

# GitHub Actions Setup Script
# This script helps you configure GitHub Actions for Azure deployment

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║ 🚀 GitHub Actions Setup for Azure Deployment              ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${YELLOW}⚠️  GitHub CLI (gh) is not installed${NC}"
    echo ""
    echo "Please install it:"
    echo "  Ubuntu/Debian: sudo apt install gh"
    echo "  macOS: brew install gh"
    echo ""
    echo "Or follow manual setup in DEPLOYMENT.md"
    exit 1
fi

# Check if logged in to GitHub
if ! gh auth status &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not logged in to GitHub CLI${NC}"
    echo ""
    echo "Please login first:"
    echo "  gh auth login"
    echo ""
    exit 1
fi

echo -e "${BLUE}📥 Fetching Azure publish profile...${NC}"
PUBLISH_PROFILE=$(az webapp deployment list-publishing-profiles \
  --name healthmesh-dev-app \
  --resource-group healthmesh-test \
  --xml)

if [ -z "$PUBLISH_PROFILE" ]; then
    echo -e "${RED}❌ Failed to fetch publish profile${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Publish profile retrieved${NC}"
echo ""

echo -e "${BLUE}🔐 Setting GitHub secret...${NC}"
echo "$PUBLISH_PROFILE" | gh secret set AZURE_WEBAPP_PUBLISH_PROFILE

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Secret AZURE_WEBAPP_PUBLISH_PROFILE added successfully!${NC}"
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║ ✨ Setup Complete!                                        ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Commit the workflow file:"
    echo "   git add .github/workflows/deploy-azure.yml"
    echo "   git commit -m 'ci: Add GitHub Actions workflow'"
    echo "   git push origin main"
    echo ""
    echo "2. Monitor your deployment:"
    echo "   https://github.com/balaraj74/HealthMesh/actions"
    echo ""
    echo "3. Your app will be deployed automatically on every push to main!"
    echo "   URL: https://healthmesh-dev-app.azurewebsites.net"
else
    echo -e "${RED}❌ Failed to set GitHub secret${NC}"
    echo ""
    echo "Please set it manually:"
    echo "1. Go to: https://github.com/balaraj74/HealthMesh/settings/secrets/actions"
    echo "2. Click 'New repository secret'"
    echo "3. Name: AZURE_WEBAPP_PUBLISH_PROFILE"
    echo "4. Value: <paste the publish profile XML>"
    exit 1
fi
