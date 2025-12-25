# HealthMesh

🏥 **Intelligent Clinical Decision Support Platform** powered by Azure AI

A multi-agent healthcare orchestration system that provides real-time clinical decision support for complex patient cases. Built for Microsoft Imagine Cup 2025.

## 🌟 Key Features

- **5-Agent Clinical Intelligence Pipeline** - Production-grade multi-agent system:
  - 🚨 **Triage Agent** - NEWS2/SOFA-lite scoring, risk classification (Low/Moderate/High/Critical)
  - 🩺 **Diagnostic Agent** - Ranked differential diagnoses with supporting/contradictory findings
  - 📋 **Guideline Agent** - Maps to NCCN, WHO, ICMR, ADA, ACC/AHA, IDSA guidelines
  - 💊 **Medication Safety Agent** - Drug interactions, contraindications, allergy cross-reactivity
  - 📚 **Evidence Agent** - RAG-powered clinical research retrieval with evidence grading
  - 🧠 **Synthesis Orchestrator** - Unified output with explainability panel

- **Transparent & Explainable AI**:
  - Step-by-step reasoning chains
  - Confidence scores per agent and overall
  - Missing data identification
  - Clinical disclaimers

- **Multi-Tenant SaaS Architecture**:
  - Azure Entra ID (Azure AD) authentication
  - Tenant-isolated data access
  - Automatic user provisioning
  - Enterprise-ready security

- **Azure-Powered Backend**:
  - Azure OpenAI (GPT-4o) for clinical reasoning
  - Azure Health Data Services (FHIR R4) for patient data
  - Azure Document Intelligence for lab report extraction
  - Azure Cognitive Search for medical guidelines RAG
  - Azure SQL Database for multi-tenant data
  - Azure Monitor for audit trails

- **Healthcare-Safe Design**:
  - Full audit logging for compliance
  - Structured outputs with evidence citations
  - Clinician-in-the-loop decision making
  - HIPAA-ready architecture


## 🏗️ Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Radix UI, Wouter
- **Backend**: Express.js, TypeScript, Node.js 20
- **AI/ML**: Azure OpenAI, Azure Cognitive Search, Azure Document Intelligence
- **Data**: Azure Cosmos DB, Azure Health Data Services (FHIR R4)
- **Monitoring**: Azure Application Insights, Log Analytics
- **Infrastructure**: Bicep IaC, GitHub Actions CI/CD

## 📋 Prerequisites

- Node.js 20+
- Azure subscription ([Create one for free](https://azure.microsoft.com/free/))
- Azure services:
  - Azure Entra ID (for authentication)
  - Azure OpenAI (GPT-4o deployment)
  - Azure SQL Database (for multi-tenant data)
  - Azure Health Data Services (optional)
  - Azure Cognitive Search (for RAG)
  - Azure Document Intelligence (for lab reports)

## 🚀 Quick Start

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Configure Azure AD Authentication

See **[AZURE_AD_SETUP.md](./AZURE_AD_SETUP.md)** for complete instructions.

**Quick setup:**
1. Create app registration in [Azure Portal](https://portal.azure.com)
2. Add redirect URI: `http://localhost:3000/`
3. Enable ID tokens and Access tokens
4. Update `.env` with your credentials:

```env
AZURE_AD_TENANT_ID=your-tenant-id
AZURE_AD_CLIENT_ID=your-client-id
VITE_AZURE_AD_TENANT_ID=your-tenant-id
VITE_AZURE_AD_CLIENT_ID=your-client-id
```

### Step 3: Start Development Server

```bash
npm run dev
```

The application will be available at **http://localhost:3000**

### Step 4: Sign In

1. Open http://localhost:3000
2. Click "Sign In with Microsoft"
3. Enter your Microsoft credentials
4. Grant consent for permissions

### Development Mode (No Azure Setup Required)

For testing without Azure configuration:

```env
# In .env file
DEV_BYPASS_AUTH=true
```

This bypasses authentication and uses mock tenant data. Perfect for:
- Local UI development
- Testing without Azure subscription
- Demo purposes

⚠️ **Remove `DEV_BYPASS_AUTH` before production deployment!**

### Azure Deployment (Production)

```bash
# Set deployment configuration
export RESOURCE_GROUP="healthmesh-rg"
export LOCATION="eastus2"
export ENVIRONMENT="dev"
export ADMIN_EMAIL="your-email@example.com"

# Deploy to Azure
./script/deploy-azure.sh
```

### Manual Azure Setup

1. **Create Resource Group**:
   ```bash
   az group create --name healthmesh-rg --location eastus2
   ```

2. **Deploy Infrastructure**:
   ```bash
   az deployment group create \
     --resource-group healthmesh-rg \
     --template-file infra/main.bicep \
     --parameters environment=dev adminEmail=you@example.com
   ```

3. **Build and Deploy**:
   ```bash
   npm run build
   az webapp deployment source config-zip \
     --resource-group healthmesh-rg \
     --name <webapp-name> \
     --src dist.zip
   ```

## ⚙️ Environment Variables

Copy `.env.azure.example` to `.env` and configure:

```env
# Azure OpenAI
AZURE_OPENAI_ENDPOINT=https://your-openai.openai.azure.com/
AZURE_OPENAI_API_KEY=your-key
AZURE_OPENAI_DEPLOYMENT=gpt-4o

# Azure Cosmos DB
AZURE_COSMOS_ENDPOINT=https://your-cosmos.documents.azure.com:443/
AZURE_COSMOS_KEY=your-key
AZURE_COSMOS_DATABASE=healthmesh

# Azure Health Data Services
AZURE_FHIR_ENDPOINT=https://your-fhir.fhir.azurehealthcareapis.com

# Azure Document Intelligence
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=https://your-docint.cognitiveservices.azure.com/
AZURE_DOCUMENT_INTELLIGENCE_KEY=your-key

# Azure Cognitive Search
AZURE_SEARCH_ENDPOINT=https://your-search.search.windows.net
AZURE_SEARCH_ADMIN_KEY=your-key

# Azure Monitor
APPLICATIONINSIGHTS_CONNECTION_STRING=InstrumentationKey=...
```

## 📁 Project Structure

```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # UI components (Radix-based)
│   │   ├── pages/          # Route pages
│   │   ├── hooks/          # Custom React hooks
│   │   └── lib/            # Utilities
├── server/                 # Backend Express server
│   ├── azure/              # Azure service clients
│   │   ├── config.ts       # Configuration management
│   │   ├── openai-client.ts
│   │   ├── fhir-client.ts
│   │   ├── document-intelligence.ts
│   │   ├── cognitive-search.ts
│   │   ├── cosmos-db.ts
│   │   └── monitoring.ts
│   ├── azure-agents.ts     # Azure-powered AI agents
│   ├── azure-routes.ts     # REST API endpoints
│   └── index.ts            # Server entry point
├── shared/                 # Shared TypeScript schemas
├── infra/                  # Azure Bicep IaC
│   └── main.bicep          # Infrastructure definition
├── .github/workflows/      # CI/CD pipelines
│   └── deploy.yml
└── script/
    └── deploy-azure.sh     # Deployment script
```

## 🔧 Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm start` | Run production server |
| `npm run check` | TypeScript type checking |
| `./script/deploy-azure.sh` | Deploy to Azure |

## 📊 API Endpoints

### Patients
- `GET /api/patients` - List all patients
- `GET /api/patients/:id` - Get patient by ID
- `POST /api/patients` - Create new patient
- `PUT /api/patients/:id` - Update patient
- `DELETE /api/patients/:id` - Delete patient

### Clinical Cases
- `GET /api/cases` - List all cases
- `GET /api/cases/:id` - Get case by ID
- `POST /api/cases` - Create new case
- `PUT /api/cases/:id` - Update case
- `POST /api/cases/:id/analyze` - Run basic AI analysis
- `POST /api/cases/:id/clinical-analyze` - **NEW**: Run 5-agent clinical intelligence pipeline (with optional vitals/labs)

### Lab Reports
- `GET /api/cases/:id/lab-reports` - Get case lab reports
- `POST /api/cases/:id/lab-reports` - Upload lab report (PDF/image)

### Chat
- `POST /api/cases/:id/chat` - Send message to clinical assistant

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics

### Audit
- `GET /api/audit` - Get audit logs
- `GET /api/audit/:entityType/:entityId` - Get entity audit trail

## 🔒 Security & Compliance

- All AI decisions logged to Azure Monitor
- Full audit trail for HIPAA compliance
- Managed identities for Azure service auth
- HTTPS-only with TLS 1.2+
- Role-based access control ready

## 🏆 Imagine Cup 2025

This project is built for Microsoft Imagine Cup 2025 in the Healthcare category. It demonstrates:

1. **Technical Excellence** - Multi-agent AI architecture with Azure services
2. **Healthcare Impact** - Addresses clinical decision support challenges
3. **Azure Integration** - Deep integration with Azure AI and health services
4. **Production Ready** - Complete with IaC, CI/CD, and monitoring

## 📜 License

MIT

## 🤝 Contributing

Contributions welcome! Please read our contributing guidelines first.
