<p align="center">
  <img src="https://img.shields.io/badge/Microsoft%20Azure-Healthcare-0078D4?style=for-the-badge&logo=microsoft-azure&logoColor=white" alt="Azure Healthcare" />
  <img src="https://img.shields.io/badge/FHIR%20R4-Compliant-success?style=for-the-badge" alt="FHIR R4" />
  <img src="https://img.shields.io/badge/HIPAA-Ready-blue?style=for-the-badge" alt="HIPAA Ready" />
  <img src="https://img.shields.io/badge/Microsoft%20Imagine%20Cup-2025-purple?style=for-the-badge" alt="Imagine Cup 2025" />
</p>

<h1 align="center">🏥 HealthMesh</h1>

<p align="center">
  <strong>Intelligent Clinical Decision Support Platform</strong><br/>
  A multi-agent healthcare orchestration system powered by Microsoft Azure AI Services
</p>

<p align="center">
  <em>Built for Microsoft Imagine Cup 2025 | Healthcare Category</em>
</p>

---

## 🌟 Overview

**HealthMesh** is an enterprise-grade, multi-tenant clinical decision support platform designed to assist healthcare professionals in making informed decisions for complex patient cases. The platform leverages Microsoft Azure's AI and cloud services to provide real-time clinical insights, evidence-based recommendations, and transparent AI reasoning.

The system implements a **5-Agent Clinical Intelligence Pipeline** that works collaboratively to analyze patient data, assess risks, generate differential diagnoses, validate against medical guidelines, ensure medication safety, and synthesize evidence-backed recommendations.

---

## ✨ Key Features

### 🤖 5-Agent Clinical Intelligence Pipeline

| Agent | Role | Output |
|-------|------|--------|
| **🚨 Triage Agent** | NEWS2/SOFA-lite scoring, risk classification | Urgency score, risk category, red flags |
| **🩺 Diagnostic Agent** | Differential diagnosis generation | Ranked diagnoses with supporting/contradictory findings |
| **📋 Guideline Agent** | Medical guideline mapping (NCCN, WHO, ICMR, ADA, ACC/AHA, IDSA) | Recommendations, evidence levels, deviations |
| **💊 Medication Safety Agent** | Drug interactions, contraindications, allergy cross-reactivity | Critical alerts, safer alternatives, monitoring |
| **📚 Evidence Agent** | RAG-powered clinical research retrieval | Key studies, evidence grading, limitations |
| **🧠 Synthesis Orchestrator** | Integration of all agent outputs | Unified recommendations with explainability panel |

### 🔐 Enterprise Security & Multi-Tenancy

- **Microsoft Entra ID (Azure AD)** authentication
- **Hospital-level data isolation** - Complete tenant separation
- **Role-Based Access Control (RBAC)** - Doctor, Nurse, Admin roles
- **Automatic user provisioning** from Azure AD claims
- **Zero local passwords** - All auth through Microsoft identity

### 📊 Clinical Scoring Algorithms

- **NEWS2** (National Early Warning Score 2) - Acute deterioration detection
- **SOFA-lite** (Sequential Organ Failure Assessment) - Organ dysfunction assessment
- **Risk Classification** - Low / Moderate / High / Critical

### 🔍 Transparent & Explainable AI

- Step-by-step reasoning chains
- Confidence scores per agent and overall
- Missing data identification
- Clinical disclaimers
- Evidence citations with grading

### 📱 Patient QR Identity System

- **FHIR R4 compliant** Patient Master ID
- **Unique QR codes** for instant patient identification
- **Longitudinal patient dashboard** on scan
- **Cross-platform compatibility** with role-based access

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              HEALTHMESH PLATFORM                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────┐ │
│  │     FRONTEND        │    │      BACKEND        │    │   AZURE AI      │ │
│  │                     │    │                     │    │                 │ │
│  │  • React 18         │    │  • Express.js       │    │  • Azure OpenAI │ │
│  │  • TypeScript       │◄──►│  • TypeScript       │◄──►│  • GPT-4o       │ │
│  │  • Tailwind CSS     │    │  • Node.js 20       │    │  • Azure AI     │ │
│  │  • Radix UI         │    │  • RESTful APIs     │    │    Foundry      │ │
│  │  • Framer Motion    │    │  • WebSocket        │    │                 │ │
│  └─────────────────────┘    └─────────────────────┘    └─────────────────┘ │
│                                       │                                     │
│  ┌────────────────────────────────────┴────────────────────────────────┐   │
│  │                        AZURE SERVICES LAYER                          │   │
│  │                                                                      │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────┐ │   │
│  │  │ Azure SQL    │  │ Azure Health │  │ Azure        │  │ Azure    │ │   │
│  │  │ Database     │  │ Data Services│  │ Cognitive    │  │ Document │ │   │
│  │  │              │  │ (FHIR R4)    │  │ Search       │  │ Intel    │ │   │
│  │  │ Multi-tenant │  │              │  │              │  │          │ │   │
│  │  │ Data Store   │  │ HL7 FHIR API │  │ RAG Index    │  │ Lab OCR  │ │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────┘ │   │
│  │                                                                      │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────┐ │   │
│  │  │ Microsoft    │  │ Azure        │  │ Azure        │  │ Azure    │ │   │
│  │  │ Entra ID     │  │ Key Vault    │  │ App Service  │  │ Monitor  │ │   │
│  │  │              │  │              │  │              │  │          │ │   │
│  │  │ Identity &   │  │ Secrets Mgmt │  │ Web Hosting  │  │ Logging  │ │   │
│  │  │ Access       │  │              │  │              │  │ & Audit  │ │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Technology Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| React 18 | UI Framework |
| TypeScript | Type Safety |
| Tailwind CSS | Styling |
| Radix UI | Accessible Components |
| Framer Motion | Animations |
| TanStack Query | Data Fetching |
| Wouter | Routing |
| Recharts | Data Visualization |

### Backend
| Technology | Purpose |
|------------|---------|
| Express.js | Web Framework |
| TypeScript | Type Safety |
| Node.js 20 | Runtime |
| Drizzle ORM | Database ORM |
| Zod | Schema Validation |
| WebSocket | Real-time Communication |

### Azure Services
| Service | Purpose |
|---------|---------|
| **Azure OpenAI (GPT-4o)** | Clinical reasoning & analysis |
| **Azure AI Foundry** | Model orchestration & deployment |
| **Azure Health Data Services** | FHIR R4 compliant patient data |
| **Azure SQL Database** | Multi-tenant data persistence |
| **Azure Cognitive Search** | Medical guidelines RAG |
| **Azure Document Intelligence** | Lab report OCR extraction |
| **Microsoft Entra ID** | Enterprise authentication |
| **Azure Key Vault** | Secrets management |
| **Azure App Service** | Web application hosting |
| **Azure Monitor** | Logging, metrics, & audit trails |
| **Azure Application Insights** | Performance monitoring |
| **Azure Blob Storage** | Document & file storage |

### Infrastructure
| Technology | Purpose |
|------------|---------|
| Bicep | Infrastructure as Code |
| GitHub Actions | CI/CD Pipeline |
| Azure CLI | Deployment automation |

---

## 📋 Prerequisites

- **Node.js** 20+ ([Download](https://nodejs.org/))
- **Azure Subscription** ([Create free account](https://azure.microsoft.com/free/))
- **Azure CLI** ([Install](https://docs.microsoft.com/cli/azure/install-azure-cli))

### Required Azure Services

| Service | Configuration |
|---------|---------------|
| Microsoft Entra ID | App Registration with redirect URIs |
| Azure OpenAI | GPT-4o deployment |
| Azure SQL Database | Standard tier or higher |
| Azure Health Data Services | FHIR R4 workspace (optional) |
| Azure Cognitive Search | Basic tier or higher |
| Azure Document Intelligence | S0 tier |

---

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/healthmesh.git
cd healthmesh
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

Copy the example environment file and configure your Azure services:

```bash
cp .env.azure.example .env
```

Edit `.env` with your Azure credentials:

```env
# Azure Authentication
AZURE_AD_TENANT_ID=your-tenant-id
AZURE_AD_CLIENT_ID=your-client-id
VITE_AZURE_AD_TENANT_ID=your-tenant-id
VITE_AZURE_AD_CLIENT_ID=your-client-id

# Azure OpenAI
AZURE_OPENAI_ENDPOINT=https://your-openai.openai.azure.com/
AZURE_OPENAI_API_KEY=your-api-key
AZURE_OPENAI_DEPLOYMENT=gpt-4o

# Azure SQL Database
DATABASE_URL=your-azure-sql-connection-string

# Azure Health Data Services (Optional)
AZURE_FHIR_ENDPOINT=https://your-fhir.fhir.azurehealthcareapis.com

# Azure Document Intelligence
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=https://your-docint.cognitiveservices.azure.com/
AZURE_DOCUMENT_INTELLIGENCE_KEY=your-key

# Azure Cognitive Search
AZURE_SEARCH_ENDPOINT=https://your-search.search.windows.net
AZURE_SEARCH_ADMIN_KEY=your-key

# Azure Monitor
APPLICATIONINSIGHTS_CONNECTION_STRING=your-connection-string
```

### 4. Start Development Server

```bash
npm run dev
```

The application will be available at **http://localhost:3000**

### 5. Sign In

1. Open http://localhost:3000
2. Click **"Sign In with Microsoft"**
3. Enter your Microsoft credentials
4. Grant consent for permissions

---

## 📁 Project Structure

```
healthmesh/
├── client/                      # Frontend React Application
│   ├── src/
│   │   ├── components/          # Reusable UI Components
│   │   │   ├── ui/              # Base UI components (Radix)
│   │   │   ├── clinical-synthesis.tsx
│   │   │   ├── qr-scanner.tsx
│   │   │   └── ...
│   │   ├── pages/               # Route Pages
│   │   │   ├── dashboard.tsx
│   │   │   ├── patients.tsx
│   │   │   ├── cases.tsx
│   │   │   ├── orchestrator.tsx
│   │   │   ├── risk-safety.tsx
│   │   │   └── ...
│   │   ├── hooks/               # Custom React Hooks
│   │   ├── lib/                 # Utilities & Helpers
│   │   └── App.tsx              # Main Application
│   └── index.html
│
├── server/                      # Backend Express Server
│   ├── azure/                   # Azure Service Clients
│   │   ├── config.ts            # Configuration Management
│   │   ├── openai-client.ts     # Azure OpenAI Integration
│   │   ├── fhir-client.ts       # FHIR R4 API Client
│   │   ├── document-intelligence.ts
│   │   ├── cognitive-search.ts
│   │   └── monitoring.ts
│   ├── auth/                    # Authentication
│   │   └── entraAuth.ts         # Microsoft Entra ID Middleware
│   ├── services/                # Business Logic Services
│   │   ├── qr-identity.service.ts
│   │   └── ...
│   ├── db/                      # Database Layer
│   │   ├── schema.ts            # Drizzle Schema
│   │   └── migrations/          # SQL Migrations
│   ├── clinical-agents.ts       # 5-Agent Clinical Pipeline
│   ├── azure-agents.ts          # Azure AI Agents
│   ├── api-routes.ts            # REST API Endpoints
│   └── index.ts                 # Server Entry Point
│
├── shared/                      # Shared TypeScript Types
│   └── schema.ts                # Zod Schemas
│
├── infra/                       # Azure Infrastructure
│   ├── main.bicep               # Bicep IaC Template
│   └── modules/                 # Bicep Modules
│
├── .github/
│   └── workflows/               # GitHub Actions CI/CD
│       └── deploy-production.yml
│
└── scripts/                     # Utility Scripts
    └── deploy-azure.sh
```

---

## 📡 API Reference

### Authentication
All API endpoints require a valid Microsoft Entra ID Bearer token.

```http
Authorization: Bearer <entra-access-token>
```

### User Profile
```http
GET /api/me
```
Returns the authenticated user's profile and hospital context.

### Patients

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/patients` | List all patients (hospital-scoped) |
| `GET` | `/api/patients/:id` | Get patient by ID |
| `POST` | `/api/patients` | Create new patient |
| `PUT` | `/api/patients/:id` | Update patient |
| `DELETE` | `/api/patients/:id` | Delete patient |

### Clinical Cases

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/cases` | List all cases (hospital-scoped) |
| `GET` | `/api/cases/:id` | Get case by ID |
| `POST` | `/api/cases` | Create new case |
| `PUT` | `/api/cases/:id` | Update case |
| `POST` | `/api/cases/:id/analyze` | Run basic AI analysis |
| `POST` | `/api/cases/:id/clinical-analyze` | Run 5-agent clinical pipeline |

### Clinical Analysis Request

```http
POST /api/cases/:id/clinical-analyze
Content-Type: application/json

{
  "vitals": {
    "respiratoryRate": 18,
    "oxygenSaturation": 96,
    "supplementalOxygen": false,
    "systolicBP": 125,
    "heartRate": 78,
    "consciousness": "alert",
    "temperature": 37.2
  },
  "labValues": {
    "creatinine": 1.1,
    "bilirubin": 0.8,
    "platelets": 250,
    "gcs": 15
  }
}
```

### Lab Reports

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/cases/:id/lab-reports` | Get lab reports for case |
| `POST` | `/api/cases/:id/lab-reports` | Upload lab report (PDF/Image) |

### Clinical Chat

```http
POST /api/cases/:id/chat
Content-Type: application/json

{
  "message": "What are the next recommended tests?"
}
```

### QR Identity

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/qr/patient/:id` | Get patient QR code |
| `POST` | `/api/qr/scan` | Scan QR and retrieve patient data |

### Audit Logs

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/audit` | Get all audit logs |
| `GET` | `/api/audit/:entityType/:entityId` | Get entity audit trail |

### Dashboard Statistics

```http
GET /api/dashboard/stats
```

---

## 🔒 Security & Compliance

### Authentication Flow

```
User → Microsoft Entra ID → JWT Token → HealthMesh Backend → Validated Context
```

### Data Isolation

- **Tenant ID** extracted from verified JWT claims
- **Hospital ID** auto-provisioned per Azure AD tenant
- **All queries** filtered by `hospital_id` - zero cross-tenant data access

### Compliance Features

| Feature | Implementation |
|---------|----------------|
| **HIPAA Ready** | Audit logging, data encryption, access controls |
| **FHIR R4 Compliant** | Azure Health Data Services integration |
| **SOC 2 Ready** | Azure security controls, monitoring |
| **GDPR Compliant** | Data isolation, consent management |

### Security Controls

- ✅ HTTPS-only with TLS 1.2+
- ✅ Role-Based Access Control (RBAC)
- ✅ Managed Identities for Azure service auth
- ✅ Azure Key Vault for secrets management
- ✅ Full audit trail logging
- ✅ No local password storage

---

## 🚢 Deployment

### Azure App Service Deployment

```bash
# Set deployment configuration
export RESOURCE_GROUP="healthmesh-rg"
export LOCATION="eastus2"
export ENVIRONMENT="production"

# Deploy infrastructure
az deployment group create \
  --resource-group $RESOURCE_GROUP \
  --template-file infra/main.bicep \
  --parameters environment=$ENVIRONMENT

# Build and deploy application
npm run build
az webapp deployment source config-zip \
  --resource-group $RESOURCE_GROUP \
  --name healthmesh-app \
  --src deploy.zip
```

### GitHub Actions CI/CD

The repository includes GitHub Actions workflows for automated deployment:

- **`.github/workflows/deploy-production.yml`** - Production deployment pipeline
- Automatic builds on push to `main` branch
- Azure App Service deployment with slot swapping

---

## 📊 Monitoring & Observability

### Azure Monitor Integration

- **Application Insights** - Performance metrics, distributed tracing
- **Log Analytics** - Centralized logging, query workbooks
- **Azure Monitor Alerts** - Proactive issue detection

### Tracked Metrics

| Metric | Description |
|--------|-------------|
| Agent Execution Time | Performance of each clinical agent |
| Confidence Scores | AI recommendation confidence levels |
| Error Rates | Agent and API failure rates |
| Risk Alert Generation | Critical clinical alerts created |
| Audit Events | User actions and data access |

---

## 🧪 Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm start` | Run production server |
| `npm run check` | TypeScript type checking |
| `npm run lint` | ESLint code quality check |
| `npm run db:push` | Push database schema changes |

---

## ⚠️ Clinical Disclaimer

> **This system is designed as CLINICAL DECISION SUPPORT only.**
>
> - All recommendations must be reviewed by a licensed clinician
> - The AI does NOT make diagnoses
> - The final clinical decision rests with the treating physician
> - Evidence and guidelines may change; always verify current standards
> - Patient-specific factors may override general recommendations

---

## 🏆 Microsoft Imagine Cup 2025

HealthMesh is proudly built for **Microsoft Imagine Cup 2025** in the **Healthcare** category.

### Judging Criteria Alignment

| Criteria | HealthMesh Implementation |
|----------|---------------------------|
| **Technical Excellence** | Multi-agent AI architecture with Azure services |
| **Impact** | Addresses clinical decision support challenges |
| **Innovation** | 5-agent explainable AI pipeline |
| **Azure Integration** | Deep integration with Azure AI & health services |
| **Production Ready** | Complete with IaC, CI/CD, and monitoring |

---

## 👨‍💻 Author & Contact

**Balaraj R**  
*Developer & Owner*

- 📧 Email: [balarajr74@gmail.com](mailto:balarajr74@gmail.com)
- 💼 LinkedIn: [linkedin.com/in/balaraj-r](https://linkedin.com/in/balaraj-r)
- 🐙 GitHub: [github.com/balaraj74](https://github.com/balaraj74)

---

## 📜 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Microsoft Azure team for comprehensive cloud services
- Microsoft Imagine Cup for the opportunity
- Healthcare professionals who provided clinical insights
- Open-source community for foundational technologies

---

<p align="center">
  <strong>Made with ❤️ for better healthcare</strong><br/>
  <em>Powered by Microsoft Azure</em>
</p>
