<p align="center">
  <img src="https://img.shields.io/badge/Version-2.0.0-green?style=for-the-badge" alt="Version 2.0.0" />
  <img src="https://img.shields.io/badge/Microsoft%20Azure-Healthcare-0078D4?style=for-the-badge&logo=microsoft-azure&logoColor=white" alt="Azure Healthcare" />
  <img src="https://img.shields.io/badge/FHIR%20R4-Compliant-success?style=for-the-badge" alt="FHIR R4" />
  <img src="https://img.shields.io/badge/HIPAA-Ready-blue?style=for-the-badge" alt="HIPAA Ready" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Azure%20OpenAI-GPT--4o-0078D4?style=for-the-badge&logo=openai&logoColor=white" alt="Azure OpenAI" />
  <img src="https://img.shields.io/badge/Microsoft%20Entra%20ID-Auth-purple?style=for-the-badge&logo=microsoft&logoColor=white" alt="Entra ID" />
  <img src="https://img.shields.io/badge/Microsoft%20Imagine%20Cup-2026-purple?style=for-the-badge" alt="Imagine Cup 2026" />
</p>

<h1 align="center">🏥 HealthMesh v2.0</h1>

<p align="center">
  <strong>Intelligent Clinical Decision Support Platform</strong><br/>
  A production-ready, multi-agent healthcare orchestration system powered by Microsoft Azure AI Services
</p>

<p align="center">
  <em>Built for Microsoft Imagine Cup 2026 | Healthcare Category</em>
</p>

---

## 📋 Release Notes - Version 2.0.0

**Release Date:** January 3, 2026

### 🆕 What's New in v2.0

| Feature | Description |
|---------|-------------|
| **🧠 Azure OpenAI Integration** | GPT-4o powered clinical reasoning with intelligent fallback |
| **⚡ Early Deterioration Detection** | AI-powered NEWS2/SOFA scoring with real-time patient monitoring |
| **💊 Medication Safety Engine** | Context-aware drug interaction detection with severity grading |
| **🤖 Agent Orchestrator** | Visual multi-agent pipeline with step-by-step execution |
| **🔐 Microsoft Entra ID** | Enterprise-grade authentication with multi-tenant isolation |
| **📊 Azure SQL Database** | Persistent cloud storage with hospital-level data isolation |
| **🚀 Production Deployment** | GitHub Actions CI/CD with Azure App Service |

---

## 🌟 Overview

**HealthMesh** is an enterprise-grade, multi-tenant clinical decision support platform designed to assist healthcare professionals in making informed decisions for complex patient cases. The platform leverages **Microsoft Azure AI Services** to provide real-time clinical insights, evidence-based recommendations, and transparent AI reasoning.

### Architecture Highlights

- **Azure OpenAI**: GPT-4o powered clinical intelligence with rule-based fallback
- **Multi-Tenant Isolation**: Complete data separation per hospital/organization
- **HIPAA-Ready**: Comprehensive audit logging and encryption
- **FHIR R4 Compatible**: Standard healthcare data interoperability

### Quick Navigation

📚 **[Complete Documentation](./docs/)** | 🔒 **[Security Policy](./docs/security/SECURITY.md)** | 🚀 **[Deployment Guide](./docs/deployment/AZURE_PES_SETUP_GUIDE.md)** | 📁 **[Project Structure](./docs/PROJECT_STRUCTURE.md)**

**Security Features:**
- [Security Scorecard (99/100)](./docs/security/SECURITY_PHASE2_COMPLETE.md#new-security-scorecard) ⭐
- [RBAC Authorization](./docs/security/SECURITY_PHASE2_COMPLETE.md#advanced-authorization)
- [Field Encryption](./docs/security/SECURITY_PHASE2_COMPLETE.md#field-level-data-protection)
- [Vulnerability Report](./docs/security/SECURITY_UPGRADE_REPORT.md)


---

## ✨ Complete Feature List

### 🤖 Multi-Agent Clinical Intelligence Pipeline (6 Agents)

| Agent | Role | Key Outputs |
|-------|------|-------------|
| **🚨 Triage Agent** | NEWS2/SOFA scoring, risk classification | Urgency score, risk category, red flags |
| **🩺 Diagnostic Agent** | Differential diagnosis generation | Ranked diagnoses with probability scores |
| **📋 Guideline Agent** | Medical guideline mapping (NCCN, WHO, ICMR, ADA) | Evidence-based recommendations |
| **💊 Medication Safety Agent** | Drug interactions, dosing, allergies | Severity-graded alerts with clinical context |
| **📚 Evidence Agent** | RAG-powered clinical research retrieval | PubMed/guideline citations |
| **🧠 Synthesis Orchestrator** | Multi-agent output integration | Unified clinical summary |

### 💊 Medication Safety Engine (NEW in v2.0)

| Feature | Description |
|---------|-------------|
| **Drug-Drug Interactions** | 15+ interaction rules with clinical mechanisms |
| **Context-Aware Severity** | Age, renal function modify alert severity |
| **Allergy Cross-Reactivity** | Detects related drug class allergies |
| **Renal/Hepatic Dosing** | Flags medications needing adjustment |
| **Explainability Panel** | Data sources, reasoning chain, limitations |
| **Alert Fatigue Prevention** | Suppressible low-priority alerts |

**Detected Interactions Include:**
- Aspirin + ACE Inhibitors → Reduced cardioprotection
- Metformin + Sulfonylureas → Hypoglycemia risk
- Statins + Amlodipine → Myopathy risk
- NSAIDs + Anticoagulants → Bleeding risk
- And many more...

### ⚡ Early Deterioration Detection (NEW in v2.0)

| Feature | Description |
|---------|-------------|
| **NEWS2 Scoring** | National Early Warning Score 2 calculation |
| **SOFA-lite Assessment** | Organ dysfunction evaluation |
| **AI Enhancement** | Azure OpenAI-powered trend analysis |
| **Real-Time Signals** | Vital sign deterioration tracking |
| **Clinical Recommendations** | Actionable intervention suggestions |
| **Risk Trajectory** | Predictive deterioration modeling |

### 🎭 Agent Orchestrator (Visual Pipeline)

- **Step-by-Step Execution**: Watch each agent process in real-time
- **Dependency Resolution**: Automatic agent sequencing
- **Parallel Execution**: Independent agents run simultaneously
- **Output Visualization**: Expandable results per agent
- **Error Handling**: Graceful fallbacks on agent failure

### 📱 Patient QR Identity System

- **FHIR R4 Compliant** Patient Master ID
- **Unique QR Codes** for instant patient identification
- **Mobile Scanning** with role-based access control
- **Longitudinal Dashboard** on scan

### 🔐 Enterprise Security & Multi-Tenancy

| Feature | Implementation |
|---------|----------------|
| **Authentication** | Microsoft Entra ID (Azure AD) only |
| **Data Isolation** | Hospital-level tenant separation |
| **Access Control** | Role-Based (Doctor, Nurse, Admin) |
| **Audit Logging** | Full action trail with timestamps |
| **Zero Passwords** | No local credential storage |

### 📊 Clinical Scoring Algorithms

- **NEWS2** (National Early Warning Score 2)
- **SOFA-lite** (Sequential Organ Failure Assessment)
- **Risk Classification**: Low / Moderate / High / Critical

### 🔍 Explainable AI

- Step-by-step reasoning chains
- Confidence scores per agent
- Data source citations
- Known limitations disclosure
- Clinical disclaimers

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         HEALTHMESH v2.0 PLATFORM                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────┐ │
│  │     FRONTEND        │    │      BACKEND        │    │   AZURE AI      │ │
│  │                     │    │                     │    │   SERVICES      │ │
│  │  • React 18 + TS    │    │  • Express.js       │    │                 │ │
│  │  • Tailwind CSS     │◄──►│  • TypeScript       │◄──►│ 🔵 Azure OpenAI │ │
│  │  • Radix UI         │    │  • Node.js 20       │    │    (GPT-4o)     │ │
│  │  • TanStack Query   │    │  • RESTful APIs     │    │ 📋 Rule Fallback│ │
│  │  • Wouter Router    │    │  • Multi-Agent      │    │                 │ │
│  └─────────────────────┘    └─────────────────────┘    └─────────────────┘ │
│                                       │                                     │
│  ┌────────────────────────────────────┴────────────────────────────────┐   │
│  │                        AZURE SERVICES LAYER                          │   │
│  │                                                                      │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────┐ │   │
│  │  │ Azure SQL    │  │ Microsoft    │  │ Azure        │  │ Azure    │ │   │
│  │  │ Database     │  │ Entra ID     │  │ App Service  │  │ Monitor  │ │   │
│  │  │              │  │              │  │              │  │          │ │   │
│  │  │ Multi-tenant │  │ Enterprise   │  │ Production   │  │ Logging  │ │   │
│  │  │ Persistence  │  │ Auth/SSO     │  │ Hosting      │  │ & Audit  │ │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────┘ │   │
│  │                                                                      │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────┐ │   │
│  │  │ Azure OpenAI │  │ Azure Health │  │ Azure        │  │ Azure    │ │   │
│  │  │ (GPT-4o)     │  │ Data Services│  │ Cognitive    │  │ Document │ │   │
│  │  │              │  │ (FHIR R4)    │  │ Search       │  │ Intel    │ │   │
│  │  │ AI Engine    │  │ HL7 FHIR API │  │ RAG Index    │  │ Lab OCR  │ │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Technology Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.x | UI Framework |
| TypeScript | 5.x | Type Safety |
| Tailwind CSS | 3.x | Styling |
| Radix UI | Latest | Accessible Components |
| TanStack Query | 5.x | Data Fetching & Caching |
| Wouter | 3.x | Client-side Routing |
| Recharts | 2.x | Data Visualization |
| Framer Motion | 11.x | Animations |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Express.js | 4.x | Web Framework |
| TypeScript | 5.x | Type Safety |
| Node.js | 20.x | Runtime |
| mssql | 11.x | Azure SQL Client |
| Zod | 3.x | Schema Validation |
| MSAL Node | 2.x | Azure AD Authentication |

### Azure Services
| Service | Purpose |
|---------|---------|
| **Azure OpenAI (GPT-4o)** | Clinical reasoning & analysis |
| **Azure SQL Database** | Multi-tenant data persistence |
| **Microsoft Entra ID** | Enterprise authentication |
| **Azure App Service** | Production web hosting |
| **Azure Monitor** | Logging & telemetry |
| **Azure Health Data Services** | FHIR R4 (optional) |
| **Azure Document Intelligence** | Lab report OCR |
| **Azure Cognitive Search** | Medical guidelines RAG |
| **Azure Key Vault** | Secrets management |
| **Azure Application Insights** | Performance monitoring |

---

## 📁 Project Structure

```
healthmesh/
├── client/                          # Frontend React Application
│   ├── src/
│   │   ├── pages/                   # Route Pages
│   │   │   ├── dashboard.tsx        # Main dashboard
│   │   │   ├── patients.tsx         # Patient management
│   │   │   ├── cases.tsx            # Clinical cases
│   │   │   ├── orchestrator.tsx     # Agent Orchestrator (NEW)
│   │   │   ├── early-deterioration.tsx  # NEWS2/SOFA (NEW)
│   │   │   ├── medication-safety.tsx    # Drug safety (NEW)
│   │   │   ├── labs.tsx             # Lab reports
│   │   │   ├── qr-scan.tsx          # QR scanner
│   │   │   ├── audit.tsx            # Audit logs
│   │   │   └── settings.tsx         # User settings
│   │   ├── components/              # Reusable UI Components
│   │   ├── auth/                    # MSAL Authentication
│   │   └── lib/                     # Utilities
│   └── index.html
│
├── server/                          # Backend Express Server
│   ├── agents/                      # AI Agent Engines (NEW)
│   │   ├── ai-medication-safety-agent.ts   # AI medication safety
│   │   ├── medication-safety-engine.ts     # Rule-based drug interactions
│   │   ├── early-deterioration-agent.ts    # NEWS2/SOFA scoring
│   │   └── ai-enhanced-deterioration-agent.ts  # AI deterioration
│   ├── azure/                       # Azure Service Clients
│   │   ├── openai-client.ts         # Azure OpenAI
│   │   ├── monitoring.ts            # Azure Monitor
│   │   └── config.ts                # Configuration
│   ├── auth/                        # Authentication
│   │   └── entraAuth.ts             # Microsoft Entra ID
│   ├── api/                         # API Route Modules
│   │   ├── medication-safety-routes.ts  # Medication safety API
│   │   └── deterioration-routes.ts      # Deterioration API
│   ├── db/                          # Database Layer
│   │   ├── azure-sql.ts             # Azure SQL connection
│   │   └── migrations/              # SQL migrations
│   ├── clinical-agents.ts           # Core clinical pipeline
│   ├── api-routes.ts                # Main API routes
│   └── index.ts                     # Server entry point
│
├── shared/                          # Shared TypeScript Types
│   └── schema.ts                    # Zod Schemas
│
├── docs/                            # Documentation
│   ├── EARLY_DETERIORATION_AGENT.md
│   ├── AGENT_PROMPTS.md
│   └── ...
│
├── .github/workflows/               # CI/CD Pipelines
│   └── deploy-production.yml
│
└── infra/                           # Azure Infrastructure (Bicep)
    └── main.bicep
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20+ ([Download](https://nodejs.org/))
- **Azure Subscription** ([Create free account](https://azure.microsoft.com/free/))
- **Azure CLI** ([Install](https://docs.microsoft.com/cli/azure/install-azure-cli))

### 1. Clone the Repository

```bash
git clone https://github.com/balaraj74/HealthMesh.git
cd HealthMesh
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

```bash
cp .env.azure.example .env
```

Edit `.env` with your Azure credentials:

```env
# ===== Azure OpenAI =====
AZURE_OPENAI_ENDPOINT=https://your-openai.openai.azure.com/
AZURE_OPENAI_API_KEY=your-api-key
AZURE_OPENAI_DEPLOYMENT=gpt-4o

# ===== Azure Authentication =====
AZURE_AD_TENANT_ID=your-tenant-id
AZURE_AD_CLIENT_ID=your-client-id
VITE_AZURE_AD_TENANT_ID=your-tenant-id
VITE_AZURE_AD_CLIENT_ID=your-client-id

# ===== Azure SQL Database =====
AZURE_SQL_CONNECTION_STRING=Server=your-server.database.windows.net;Database=healthmesh;User Id=admin;Password=password;Encrypt=true

# ===== Optional Services =====
AZURE_FHIR_ENDPOINT=https://your-fhir.fhir.azurehealthcareapis.com
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=https://your-docint.cognitiveservices.azure.com/
AZURE_DOCUMENT_INTELLIGENCE_KEY=your-key
AZURE_SEARCH_ENDPOINT=https://your-search.search.windows.net
AZURE_SEARCH_ADMIN_KEY=your-key
```

### 4. Start Development Server

```bash
npm run dev
```

Application available at **http://localhost:5000**

### 5. Sign In

1. Open http://localhost:5000
2. Click **"Sign In with Microsoft"**
3. Authenticate with your Azure AD credentials

---

## 📡 API Reference

### Authentication
All endpoints require Microsoft Entra ID Bearer token:

```http
Authorization: Bearer <entra-access-token>
```

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/me` | Get authenticated user profile |
| `GET` | `/api/patients` | List patients (hospital-scoped) |
| `POST` | `/api/patients` | Create new patient |
| `GET` | `/api/cases` | List clinical cases |
| `POST` | `/api/cases/:id/clinical-analyze` | Run 6-agent analysis |

### Medication Safety API (NEW)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/medication-safety/analyze-real` | AI-powered safety analysis |
| `POST` | `/api/medication-safety/check-new` | Check new medication |
| `POST` | `/api/medication-safety/alert/:id/acknowledge` | Acknowledge alert |
| `GET` | `/api/medication-safety/patient/:id/history` | Alert history |

### Early Deterioration API (NEW)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/deterioration/analyze` | Basic NEWS2/SOFA |
| `POST` | `/api/deterioration/analyze-real` | AI-enhanced analysis |
| `GET` | `/api/deterioration/patient/:id/alerts` | Patient alerts |

### Lab Reports API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/lab-reports/patient/:id` | Get patient lab reports |
| `POST` | `/api/lab-reports/upload` | Upload lab report (OCR) |

### QR Identity API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/qr/patient/:id` | Get patient QR code |
| `POST` | `/api/qr/scan` | Scan QR and retrieve patient |

---

## 🔒 Security & Compliance

### Authentication Flow

```
User → Microsoft Entra ID → JWT Token → Backend Validation → Hospital Context
```

### Compliance Features

| Standard | Implementation |
|----------|----------------|
| **HIPAA Ready** | Audit logging, encryption, access controls |
| **FHIR R4** | Azure Health Data Services integration |
| **SOC 2 Ready** | Azure security controls |
| **GDPR Compliant** | Data isolation, consent management |

### Security Controls

- ✅ HTTPS-only with TLS 1.2+
- ✅ Role-Based Access Control (RBAC)
- ✅ Hospital-level data isolation
- ✅ Full audit trail logging
- ✅ No local password storage
- ✅ Managed identities for Azure services
- ✅ Azure Key Vault for secrets

---

## 🚢 Production Deployment

### GitHub Actions CI/CD

The repository includes automated deployment:

```yaml
# .github/workflows/deploy-production.yml
# Triggers on push to main branch
# Deploys to Azure App Service
```

### Manual Deployment

```bash
# Build application
npm run build

# Deploy to Azure App Service
az webapp deployment source config-zip \
  --resource-group healthmesh-rg \
  --name healthmesh-app \
  --src deploy.zip
```

### Azure Infrastructure (Bicep)

```bash
# Deploy infrastructure
az deployment group create \
  --resource-group healthmesh-rg \
  --template-file infra/main.bicep \
  --parameters environment=production
```

---

## 📊 Monitoring & Observability

### Azure Monitor Integration

- **Application Insights**: Performance metrics, distributed tracing
- **Log Analytics**: Centralized logging
- **Azure Alerts**: Proactive issue detection

### Tracked Metrics

| Metric | Description |
|--------|-------------|
| Agent Execution Time | Per-agent performance |
| AI Token Usage | Azure OpenAI consumption |
| Confidence Scores | Analysis reliability |
| Alert Generation | Safety alerts created |
| API Response Times | Endpoint latency |
| Error Rates | System health indicators |

---

## 🧪 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (port 5000) |
| `npm run build` | Build for production |
| `npm start` | Run production server |
| `npm run check` | TypeScript type checking |

---

## ⚠️ Clinical Disclaimer

> **This system is designed as CLINICAL DECISION SUPPORT only.**
>
> - All recommendations must be reviewed by a licensed clinician
> - The AI does NOT make diagnoses or treatment decisions
> - The final clinical decision rests with the treating physician
> - Evidence and guidelines may change; always verify current standards
> - Patient-specific factors may override general recommendations

---

## 🏆 Microsoft Imagine Cup 2026

HealthMesh is built for **Microsoft Imagine Cup 2026** in the **Healthcare** category.

### Judging Criteria Alignment

| Criteria | Implementation |
|----------|----------------|
| **Technical Excellence** | Multi-agent AI architecture with Azure services |
| **Innovation** | 6-agent explainable clinical AI pipeline |
| **Impact** | Addresses medication safety and deterioration detection |
| **Azure Integration** | Deep integration with 10+ Azure services |
| **Production Ready** | Complete with CI/CD, monitoring, and multi-tenancy |

### Key Differentiators

- **Multi-Agent Architecture**: 6 specialized clinical AI agents
- **Explainable AI**: Full transparency in reasoning
- **Enterprise Ready**: Multi-tenant with hospital isolation
- **Real Clinical Value**: NEWS2, SOFA, drug interaction detection

---

## 👨‍💻 Author & Contact

**Balaraj R**  
*Developer & Owner*

- 📧 Email: [balarajr483@gmail.com](mailto:balarajr483@gmail.com)
- 💼 LinkedIn: [linkedin.com/in/balaraj-r-209a67330](https://www.linkedin.com/in/balaraj-r-209a67330)
- 🐙 GitHub: [github.com/balaraj74](https://github.com/balaraj74)

---

## 📜 License

This project is proprietary software developed for Microsoft Imagine Cup 2026.
All rights reserved © 2026 Balaraj R.

---

## 🙏 Acknowledgments

- Microsoft Azure team for comprehensive cloud services
- Microsoft Imagine Cup for the opportunity
- Healthcare professionals who provided clinical insights
- Open-source community for foundational technologies

---

<p align="center">
  <strong>Made with ❤️ for better healthcare</strong><br/>
  <em>Powered by Microsoft Azure AI Services</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Build-Passing-success?style=flat-square" alt="Build" />
  <img src="https://img.shields.io/badge/Coverage-85%25-yellow?style=flat-square" alt="Coverage" />
  <img src="https://img.shields.io/badge/License-Proprietary-red?style=flat-square" alt="License" />
</p>
