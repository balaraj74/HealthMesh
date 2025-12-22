# Azure Portal Setup Guide - HealthMesh

## Quick Links
- **Azure Portal**: https://portal.azure.com
- **Resource Group**: healthmesh-rg (East US 2)

---

## Step 1: Create Storage Account (5 minutes)

### Direct Link:
https://portal.azure.com/#create/Microsoft.StorageAccount

### Steps:
1. Click the link above or go to portal.azure.com → "Create a resource" → Search "Storage account"
2. Fill in:
   - **Subscription**: Azure for Students
   - **Resource group**: `healthmesh-rg`
   - **Storage account name**: `healthmeshstorage` (must be globally unique, lowercase only)
   - **Region**: `East US 2` (or try other regions if blocked)
   - **Performance**: Standard
   - **Redundancy**: LRS (Locally-redundant storage)
3. Click **"Review + create"**
4. Click **"Create"**
5. Wait 1-2 minutes for deployment
6. ✅ Done! Move to Step 2

---

## Step 2: Create Cosmos DB (5 minutes)

### Direct Link:
https://portal.azure.com/#create/Microsoft.DocumentDB

### Steps:
1. Click the link above or go to "Create a resource" → Search "Azure Cosmos DB"
2. Choose **"Azure Cosmos DB for NoSQL"** → Click "Create"
3. Fill in:
   - **Subscription**: Azure for Students
   - **Resource group**: `healthmesh-rg`
   - **Account name**: `healthmesh-cosmos` (must be globally unique)
   - **Location**: `East US 2` (same as storage)
   - **Capacity mode**: Provisioned throughput
   - **Apply Free Tier Discount**: Yes (if available)
   - **Limit total account throughput**: Check this (saves cost)
4. Click **"Review + create"**
5. Click **"Create"**
6. Wait 3-5 minutes for deployment
7. ✅ Done! Move to Step 3

---

## Step 3: Create Cognitive Services (5 minutes)

### Direct Link:
https://portal.azure.com/#create/Microsoft.CognitiveServicesAllInOne

### Steps:
1. Click the link above or go to "Create a resource" → Search "Cognitive Services"
2. Choose **"Cognitive Services"** (multi-service resource)
3. Fill in:
   - **Subscription**: Azure for Students
   - **Resource group**: `healthmesh-rg`
   - **Region**: `East US 2`
   - **Name**: `healthmesh-cognitive`
   - **Pricing tier**: F0 (Free tier) - or S0 if F0 not available
4. Check **"I confirm I have read and understood the notice below"**
5. Click **"Review + create"**
6. Click **"Create"**
7. Wait 1-2 minutes
8. ✅ Done! Move to Step 4

---

## Step 4: Create Azure AI Search (5 minutes)

### Direct Link:
https://portal.azure.com/#create/Microsoft.Search

### Steps:
1. Click the link above or go to "Create a resource" → Search "Azure AI Search"
2. Fill in:
   - **Subscription**: Azure for Students
   - **Resource group**: `healthmesh-rg`
   - **Service name**: `healthmesh-search` (must be globally unique)
   - **Location**: `East US 2`
   - **Pricing tier**: Free (or Basic if Free not available)
3. Click **"Review + create"**
4. Click **"Create"**
5. Wait 2-3 minutes
6. ✅ Done! Move to Step 5

---

## Step 5: Create Application Insights (3 minutes)

### Direct Link:
https://portal.azure.com/#create/Microsoft.AppInsights

### Steps:
1. Click the link above or go to "Create a resource" → Search "Application Insights"
2. Fill in:
   - **Subscription**: Azure for Students
   - **Resource group**: `healthmesh-rg`
   - **Name**: `healthmesh-insights`
   - **Region**: `East US 2`
   - **Resource Mode**: Classic (or Workspace-based)
3. Click **"Review + create"**
4. Click **"Create"**
5. Wait 1 minute
6. ✅ Done!

---

## Step 6: Try Azure OpenAI (Optional - May Require Approval)

### Direct Link:
https://portal.azure.com/#create/Microsoft.CognitiveServicesOpenAI

### Steps:
1. Click the link above or go to "Create a resource" → Search "Azure OpenAI"
2. If you see **"Request Access"** button:
   - Fill the form: https://aka.ms/oai/access
   - Mention: "Student using Azure for Imagine Cup healthcare AI project"
   - Approval takes 1-2 business days
3. If you can create directly:
   - **Resource group**: `healthmesh-rg`
   - **Region**: `Sweden Central` (best availability for students)
   - **Name**: `healthmesh-openai`
   - **Pricing**: S0
4. ✅ If successful, great! If not, we'll use OpenAI API instead

---

## After Creating All Resources

### Tell me "done" and I will:
1. ✅ Automatically retrieve all connection strings and API keys
2. ✅ Populate your .env file with all credentials
3. ✅ Initialize Cosmos DB with sample data
4. ✅ Set up Azure Search with medical guidelines
5. ✅ Start the HealthMesh application

---

## Troubleshooting

**If any resource creation fails:**
- Try a different region (Canada Central, West Europe, UK South)
- Use the Free/F0 tier if available
- Some services may require email verification for Azure for Students

**Check your Azure credits:**
https://www.microsoftazuresponsorships.com/Balance

**Still blocked?**
Let me know which specific resource failed, and I'll provide an alternative approach.

---

## Estimated Total Time: 20-25 minutes
## Total Cost: ~$0-5/month (mostly free tiers + $100 student credit)
