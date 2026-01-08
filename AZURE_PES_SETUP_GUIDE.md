# HealthMesh Setup Guide for PES Azure Account

**Account:** PES1UG24CS560@stu.pes.edu  
**Subscription:** Azure for Students  
**Tenant ID:** e290fb02-d184-4a8c-ae49-c83b04485909

---

## ⚠️ Important Note
Your Azure for Students account has region restrictions. You'll need to create resources through the Azure Portal to see which regions are available.

---

## Step-by-Step Setup

### 1. Create Entra ID App Registration (Already Done ✅)

You've already created:
- **Client ID:** 6116990b-c0d4-42fd-bb31-006498740273
- **Tenant ID:** e290fb02-d184-4a8c-ae49-c83b04485909

Make sure you have:
- ✅ Created a client secret (save it securely!)
- ✅ Added redirect URI: `https://healthmesh-pes.azurewebsites.net/login`
- ✅ Set account type to: "Accounts in any organizational directory (Multitenant)"

---

### 2. Create Azure SQL Server & Database

1. Go to [Azure Portal - SQL Databases](https://portal.azure.com/#create/Microsoft.SQLDatabase)

2. **Basic Settings:**
   - **Resource Group:** HealthMesh
   - **Database name:** healthmesh-db
   - **Server:** Click "Create new"
     - Server name: `healthmesh-pes-sql` (or any unique name)
     - Location: **Choose any available region** (portal will show allowed regions)
     - Authentication: SQL authentication
     - Server admin login: `healthmeshadmin`
     - Password: `HealthMesh@2025Secure!`

3. **Compute + Storage:**
   - Service tier: **Basic** or **Standard S0** (cheapest options)
   - Click "Configure database"
   - Select "Basic" (5 DTUs, 2GB) - costs ~$5/month

4. **Networking:**
   - Connectivity: Public endpoint
   - Allow Azure services: **YES**
   - Add current client IP: **YES**

5. **Review + Create** → Wait for deployment

6. **After creation, note:**
   - Server name: `<your-server-name>.database.windows.net`
   - Database name: `healthmesh-db`

---

### 3. Create App Service

1. Go to [Azure Portal - Web App](https://portal.azure.com/#create/Microsoft.WebSite)

2. **Basic Settings:**
   - **Resource Group:** HealthMesh
   - **Name:** `healthmesh-pes` (or any unique name)
   - **Publish:** Code
   - **Runtime stack:** Node 20 LTS
   - **Operating System:** Linux
   - **Region:** **Choose same region as SQL Server**

3. **App Service Plan:**
   - Create new plan
   - Name: `healthmesh-pes-plan`
   - Pricing tier: **B1 (Basic)** - costs ~$13/month
     - *Note: Free tier doesn't support custom domains or SSL*

4. **Review + Create** → Wait for deployment

5. **After creation, note:**
   - App URL: `https://<your-app-name>.azurewebsites.net`

---

### 4. Configure App Service Settings

1. Go to your App Service → **Configuration** → **Application settings**

2. **Add these settings** (click "New application setting" for each):

```
NODE_ENV = production
PORT = 8080

# Azure SQL Connection
AZURE_SQL_SERVER = <your-server-name>.database.windows.net
AZURE_SQL_DATABASE = healthmesh-db
AZURE_SQL_USERNAME = healthmeshadmin
AZURE_SQL_PASSWORD = HealthMesh@2025Secure!
AZURE_SQL_CONNECTION_STRING = Server=tcp:<your-server-name>.database.windows.net,1433;Initial Catalog=healthmesh-db;User Id=healthmeshadmin;Password=HealthMesh@2025Secure!;Encrypt=true;TrustServerCertificate=false;Connection Timeout=30;

# Entra ID Auth
AZURE_AD_TENANT_ID = e290fb02-d184-4a8c-ae49-c83b04485909
AZURE_AD_CLIENT_ID = 6116990b-c0d4-42fd-bb31-006498740273
VITE_AZURE_AD_CLIENT_ID = 6116990b-c0d4-42fd-bb31-006498740273
VITE_AZURE_AD_TENANT_ID = e290fb02-d184-4a8c-ae49-c83b04485909
VITE_AZURE_AD_REDIRECT_URI = https://<your-app-name>.azurewebsites.net/login

# Build Settings
SCM_DO_BUILD_DURING_DEPLOYMENT = false
ENABLE_ORYX_BUILD = false
WEBSITE_NODE_DEFAULT_VERSION = ~20
WEBSITE_RUN_FROM_PACKAGE = 1
WEBSITE_HTTPLOGGING_RETENTION_DAYS = 3
```

3. Click **Save** at the top

---

### 5. Initialize Database Schema

After SQL Server is created, run migrations:

```bash
# From your local machine (while in HealthMesh directory)
cd /home/balaraj/HealthMesh

# Set environment variables
export AZURE_SQL_SERVER="<your-server-name>.database.windows.net"
export AZURE_SQL_DATABASE="healthmesh-db"
export AZURE_SQL_USERNAME="healthmeshadmin"
export AZURE_SQL_PASSWORD="HealthMesh@2025Secure!"
export AZURE_SQL_CONNECTION_STRING="Server=tcp:<your-server-name>.database.windows.net,1433;Initial Catalog=healthmesh-db;User Id=healthmeshadmin;Password=HealthMesh@2025Secure!;Encrypt=true;TrustServerCertificate=false;Connection Timeout=30;"

# Run database initialization
npm run db:init
```

Or manually run SQL scripts:
1. Go to Azure Portal → SQL Database → Query editor
2. Login with `healthmeshadmin` / `HealthMesh@2025Secure!`
3. Run scripts from `/home/balaraj/HealthMesh/db/multi-tenant-schema.sql`

---

### 6. Build and Deploy Application

```bash
cd /home/balaraj/HealthMesh

# Install dependencies
npm install

# Build the application
npm run build

# Create deployment package
cd dist
zip -r ../dist.zip .
cd ..

# Deploy to Azure
az webapp deployment source config-zip \
  --resource-group HealthMesh \
  --name <your-app-name> \
  --src dist.zip
```

---

### 7. Verify Deployment

1. Go to `https://<your-app-name>.azurewebsites.net`
2. Click "Sign in with Microsoft"
3. Login with your PES account: `PES1UG24CS560@stu.pes.edu`
4. You should see the HealthMesh dashboard

---

## Troubleshooting

### Login Loop Issue
If you get stuck in a login loop:
1. Check App Service logs: `az webapp log tail --name <app-name> --resource-group HealthMesh`
2. Look for database connection errors
3. Verify SQL firewall allows Azure services
4. Check connection string is correct

### Database Connection Fails
1. Go to SQL Server → Firewalls and virtual networks
2. Make sure "Allow Azure services and resources to access this server" is **ON**
3. Add your current IP if accessing from local machine

### App Won't Start
1. Check logs: Portal → App Service → Log stream
2. Verify Node version is 20 LTS
3. Check environment variables are set correctly

---

## Cost Estimate (Monthly)

- **Azure SQL Basic:** ~$5/month
- **App Service B1:** ~$13/month
- **Total:** ~$18/month

*Azure for Students gives you $100 credit, so you can run this for ~5 months free!*

---

## Quick Reference

**Your Resources:**
- Resource Group: `HealthMesh`
- SQL Server: `<your-server-name>.database.windows.net`
- Database: `healthmesh-db`
- App Service: `https://<your-app-name>.azurewebsites.net`
- Client ID: `6116990b-c0d4-42fd-bb31-006498740273`
- Tenant ID: `e290fb02-d184-4a8c-ae49-c83b04485909`

**Important Commands:**
```bash
# Login to PES Azure account
az login

# View resources
az resource list --resource-group HealthMesh --output table

# View app logs
az webapp log tail --name <app-name> --resource-group HealthMesh

# Deploy app
az webapp deployment source config-zip --resource-group HealthMesh --name <app-name> --src dist.zip

# Restart app
az webapp restart --name <app-name> --resource-group HealthMesh
```

---

## Next Steps

After setup is complete:
1. ✅ Test login with your PES account
2. ✅ Create test patients and cases
3. ✅ Try the AI features (Medication Safety, Lab Trends, etc.)
4. ✅ Invite team members (they'll need PES email addresses)

---

Need help? Check the logs or contact support!
