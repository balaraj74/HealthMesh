# Azure SQL Database Integration Guide

## ✅ What's Been Created

### Azure Resources:
- **SQL Server**: `healthmesh-sql.database.windows.net`
- **Database**: `healthmesh-db`
- **Admin User**: `CloudSAfb6affea`
- **Location**: Central India
- **Status**: 🟡 Deploying (check Portal)

### Code Files Created:
1. `/server/db/sql-client.ts` - Azure SQL connection manager
2. `/server/db/sql-schema.ts` - Database schema & demo data
3. `/scripts/setup-sql.ts` - One-command setup script

---

## 🔐 Step 1: Get Your Database Password

You set this password when creating the database. If you forgot:

### Option A: Use the password you set
- Check your notes or password manager

### Option B: Reset password via Portal
1. Go to: https://portal.azure.com
2. Navigate to: **SQL servers** → **healthmesh-sql**
3. Click: **"Reset password"** in left menu
4. Set new password (save it!)

---

## 🔌 Step 2: Get Connection String

### Method 1: From Azure Portal (Recommended)
1. Go to: https://portal.azure.com
2. Navigate to: **SQL databases** → **healthmesh-db**
3. Click: **"Connection strings"** in left menu
4. Copy the **ADO.NET** connection string
5. It looks like:
   ```
   Server=tcp:healthmesh-sql.database.windows.net,1433;Initial Catalog=healthmesh-db;Persist Security Info=False;User ID=CloudSAfb6affea;Password={your_password};...
   ```
6. Replace `{your_password}` with your actual password

### Method 2: Use the template in `.env`
The connection string is already in your `.env` file:
```bash
AZURE_SQL_CONNECTION_STRING=Server=tcp:healthmesh-sql.database.windows.net,1433;Initial Catalog=healthmesh-db;Persist Security Info=False;User ID=CloudSAfb6affea;Password=YOUR_PASSWORD_HERE;MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;
```

**Just replace `YOUR_PASSWORD_HERE` with your password!**

---

## 🔥 Step 3: Configure Firewall

Azure SQL requires your IP address to be whitelisted:

### Option A: Via Azure Portal
1. Go to: https://portal.azure.com
2. Navigate to: **SQL servers** → **healthmesh-sql**
3. Click: **"Networking"** or **"Firewalls and virtual networks"**
4. Click: **"+ Add client IP"** (adds your current IP)
5. Click: **"Save"**

### Option B: Via Azure CLI
```bash
# Get your public IP
curl -4 ifconfig.me

# Add it to firewall (replace IP_ADDRESS)
az sql server firewall-rule create \
  --resource-group healthmesh \
  --server healthmesh-sql \
  --name AllowMyIP \
  --start-ip-address YOUR_IP_ADDRESS \
  --end-ip-address YOUR_IP_ADDRESS
```

### Option C: Allow all Azure services (for testing)
```bash
az sql server firewall-rule create \
  --resource-group healthmesh \
  --server healthmesh-sql \
  --name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

---

## 🚀 Step 4: Initialize Database

Once you have:
- ✅ Password in `.env`
- ✅ Firewall configured

Run the setup script:

```bash
cd /home/balaraj/HealthMesh
npm install  # Ensure mssql package is installed
tsx scripts/setup-sql.ts
```

This will:
1. ✅ Test database connection
2. ✅ Create all tables (patients, cases, lab_reports, etc.)
3. ✅ Seed demo data (3 patients, 3 cases)
4. ✅ Verify everything works

---

## 🎉 Step 5: Start Application

```bash
npm run dev
```

Open: http://localhost:5000

Your app now uses **persistent Azure SQL storage**! Data survives restarts.

---

## 📊 What Gets Created

### Tables:
1. **patients** - Patient demographics, diagnoses, medications, allergies
2. **cases** - Clinical cases with AI agent outputs
3. **lab_reports** - Lab report documents and extracted data
4. **audit_logs** - All user actions for compliance
5. **chat_messages** - Clinician chat history
6. **users** - User accounts (future feature)

### Demo Data:
- **Patient 1**: Sarah Johnson (Breast cancer + diabetes)
- **Patient 2**: Michael Chen (Cardiac case)
- **Patient 3**: Emily Rodriguez (MS case)
- **3 Clinical cases** with complete AI analysis

---

## 🔍 Verify Setup

### Check database via CLI:
```bash
# List all tables
az sql db show \
  --resource-group healthmesh \
  --server healthmesh-sql \
  --name healthmesh-db \
  --query "{name:name,status:status,tier:currentServiceObjectiveName}"
```

### Connect via Azure Data Studio (Optional):
1. Download: https://aka.ms/azuredatastudio
2. New Connection:
   - Server: `healthmesh-sql.database.windows.net`
   - Database: `healthmesh-db`
   - Authentication: SQL Login
   - Username: `CloudSAfb6affea`
   - Password: (your password)
3. Browse tables and run queries!

---

## 🐛 Troubleshooting

### Error: "Login failed for user"
- ❌ **Wrong password** → Check .env, ensure no extra spaces
- ❌ **Firewall blocking** → Add your IP in Azure Portal

### Error: "Cannot open server"
- ❌ **Firewall not configured** → Add client IP
- ❌ **Server name wrong** → Should be: `healthmesh-sql.database.windows.net`

### Error: "Database 'healthmesh-db' does not exist"
- ⏳ **Still deploying** → Wait 2-3 minutes, check Portal
- ❌ **Different name** → Check actual database name in Portal

### Connection works but no tables
- Run: `tsx scripts/setup-sql.ts` to create schema

### "Cannot find module 'mssql'"
- Run: `npm install` to ensure dependencies installed

---

## 💰 Cost Estimate

**Azure SQL Basic Tier:**
- ~$5/month
- 2GB storage
- 5 DTUs
- Perfect for dev/demo

**Covered by:**
- ✅ Azure for Students $100 credit
- ✅ Free for ~20 months!

---

## 📞 Quick Links

- **Azure Portal SQL Database**: https://portal.azure.com/#view/HubsExtension/BrowseResource/resourceType/Microsoft.Sql%2Fservers%2Fdatabases
- **Connection String Help**: https://learn.microsoft.com/azure/azure-sql/database/connect-query-content-reference-guide
- **SQL Server Firewall**: https://learn.microsoft.com/azure/azure-sql/database/firewall-configure

---

## 🎯 Next Steps After Setup

1. ✅ Verify demo data in dashboard
2. ✅ Create new patients via UI
3. ✅ Upload lab reports
4. ✅ Test AI agent orchestration
5. ✅ Practice Imagine Cup demo!

---

## 🔄 Migration from In-Memory

Your app currently uses in-memory storage. After SQL setup:
- Data persists across restarts
- Multiple users can access same data
- Audit trail for compliance
- Production-ready scalability

The in-memory fallback remains for development without DB connection.

---

## 📝 Status Checklist

- [ ] SQL Server deployed (check Portal)
- [ ] Database created
- [ ] Password saved in `.env`
- [ ] Firewall rule added
- [ ] `tsx scripts/setup-sql.ts` ran successfully
- [ ] `npm run dev` starts without errors
- [ ] Dashboard shows 3 demo patients
- [ ] Ready for Imagine Cup! 🏆

---

**Created**: December 17, 2025
**Database**: healthmesh-db
**Server**: healthmesh-sql.database.windows.net

**Need help?** Check Azure Portal deployment status or run `az deployment group list --resource-group healthmesh`
