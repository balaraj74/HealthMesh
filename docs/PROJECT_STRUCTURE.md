# 📁 HealthMesh Project Structure

Clean, organized project structure for the HealthMesh healthcare platform.

## Root Directory

```
healthmesh/
├── 📄 README.md                    # Main project documentation
├── 📄 package.json                 # Dependencies & scripts
├── 📄 tsconfig.json               # TypeScript configuration
├── 📄 vite.config.ts              # Vite build configuration
├── 📄 tailwind.config.ts          # Tailwind CSS configuration
├── 📄 drizzle.config.ts           # Database ORM configuration
├── 📄 components.json             # UI component configuration
├── 📄 postcss.config.js           # PostCSS configuration
│
├── 🔐 .env.example                # Environment variables template
├── 🔐 .env.azure.example          # Azure-specific env template
├── 🔐 .gitignore                  # Git ignore rules
│
├── 📁 client/                     # Frontend React application
├── 📁 server/                     # Backend Express application
├── 📁 shared/                     # Shared types & utilities
├── 📁 docs/                       # All documentation (see below)
├── 📁 scripts/                    # Deployment & utility scripts
├── 📁 db/                         # Database utilities
├── 📁 infra/                      # Infrastructure as code
├── 📁 dist/                       # Production build output
└── 📁 node_modules/               # Dependencies (not tracked)
```

## Documentation Structure (`docs/`)

```
docs/
├── 📄 README.md                           # Documentation index & navigation
│
├── 📁 security/                           # Security documentation
│   ├── SECURITY.md                        # Security policy & reporting
│   ├── SECURITY_UPGRADE_REPORT.md         # Phase 1 security audit
│   └── SECURITY_PHASE2_COMPLETE.md        # Phase 2 enhancements
│
├── 📁 deployment/                         # Deployment guides
│   └── AZURE_PES_SETUP_GUIDE.md          # Azure deployment
│
├── 📁 sql/                                # Database schemas
│   ├── init-azure-sql.sql                 # Azure SQL initialization
│   ├── add-audit-logs-table.sql          # Audit logging
│   ├── add-chat-messages-table.sql       # Chat functionality
│   ├── create-missing-tables.sql         # Missing tables
│   └── seed-data-simple.sql              # Sample data
│
└── AI Agent Documentation
    ├── AGENT_PROMPTS.md                   # Agent system prompts
    ├── EARLY_DETERIORATION_AGENT.md       # Patient monitoring
    ├── LAB_TREND_INTERPRETATION_ENGINE.md # Lab analysis
    ├── EVALUATION_TEST_CASES.md           # Testing scenarios
    ├── JUDGE_DEMO_STORYLINE.md           # Demo walkthrough
    └── SQL_FHIR_SCHEMAS.md               # FHIR schemas
```

## Server Structure (`server/`)

```
server/
├── 📄 index.ts                            # Main entry point
├── 📄 routes.ts                           # Route registration
├── 📄 api-routes.ts                       # API endpoint definitions
├── 📄 storage.ts                          # Data access layer
├── 📄 agents.ts                           # AI agent orchestration
│
├── 📁 auth/                               # Authentication & authorization
│   ├── entraAuth.ts                       # Microsoft Entra ID auth
│   ├── validateToken.ts                   # Token validation
│   ├── rbac-middleware.ts                 # Role-based access control
│   ├── routes.ts                          # Auth routes
│   └── password.ts                        # Password utilities (legacy)
│
├── 📁 security/                           # Security middleware
│   └── advanced-security.ts               # SQL/NoSQL injection protection
│
├── 📁 encryption/                         # Data encryption
│   └── field-encryption.ts                # AES-256-GCM field encryption
│
├── 📁 azure/                              # Azure integrations
│   ├── config.ts                          # Azure configuration
│   ├── sql-db.ts                         # Azure SQL client
│   └── openai-client.ts                  # Azure OpenAI client
│
├── 📁 ai/                                # AI services
│   └── gemini-client.ts                  # Gemini AI client
│
├── 📁 agents/                            # Clinical AI agents
│   ├── clinical-decision-agent.ts        # Clinical decisions
│   ├── differential-diagnosis-agent.ts   # Diagnosis suggestions
│   ├── early-deterioration-agent.ts      # Patient monitoring
│   └── lab-trend-interpretation-agent.ts # Lab analysis
│
├── 📁 data/                              # Data access
│   └── azureDataAccess.ts               # Azure data services
│
├── 📁 db/                                # Database
│   ├── azure-sql.ts                      # Azure SQL utilities
│   ├── sql-client.ts                     # SQL client
│   ├── sql-schema.ts                     # Schema definitions
│   └── setup-*.ts                        # Setup scripts
│
└── 📁 scripts/                           # Server utilities
    └── *.ts                              # Various utility scripts
```

## Client Structure (`client/`)

```
client/
├── 📄 index.html                         # HTML entry point
├── 📄 main.tsx                           # React app entry
│
└── 📁 src/
    ├── 📁 components/                    # React components
    │   ├── ui/                           # Reusable UI components
    │   ├── case-chat.tsx                 # Case discussion chat
    │   ├── patient-qr-display.tsx       # QR code display
    │   └── ...                           # More components
    │
    ├── 📁 pages/                         # Route pages
    │   ├── auth-page.tsx                 # Authentication
    │   ├── dashboard.tsx                 # Main dashboard
    │   ├── patients.tsx                  # Patient list
    │   ├── patient-detail.tsx           # Patient details
    │   ├── cases.tsx                     # Case management
    │   ├── case-detail.tsx              # Case details
    │   ├── labs.tsx                      # Lab reports
    │   └── ...                           # More pages
    │
    ├── 📁 hooks/                         # Custom React hooks
    │   └── use-*.tsx                     # Hook files
    │
    ├── 📁 lib/                           # Utilities
    │   ├── api.ts                        # API client
    │   └── utils.ts                      # Helper functions
    │
    └── 📁 styles/                        # Global styles
        └── *.css                         # CSS files
```

## Scripts Directory (`scripts/`)

```
scripts/
├── 🔐 security-audit.ts                  # Security auditing
├── 🚀 azure-setup.sh                     # Azure deployment
├── 🚀 azure-setup-phase1.sh             # Phase 1 setup
├── 🚀 deploy.sh                         # Deployment script
├── 🚀 quick-start.sh                    # Quick start
├── 🚀 setup-github-actions.sh           # CI/CD setup
├── 🚀 setup-pes-azure.sh                # PES Azure setup
└── 🛠️  run-missing-tables.sh            # Database migration
```

## Key Files Explained

### Configuration Files

| File | Purpose |
|------|---------|
| `package.json` | Node.js dependencies, scripts, metadata |
| `tsconfig.json` | TypeScript compiler options |
| `vite.config.ts` | Vite bundler configuration |
| `tailwind.config.ts` | Tailwind CSS customization |
| `drizzle.config.ts` | Database ORM configuration |
| `.env.example` | Environment variable template |

### Security Files

| File | Purpose |
|------|---------|
| `server/security.ts` | Main security middleware (Helmet, CORS, rate limiting) |
| `server/security/advanced-security.ts` | SQL/NoSQL injection protection |
| `server/encryption/field-encryption.ts` | AES-256-GCM encryption |
| `server/auth/rbac-middleware.ts` | Role-based access control |
| `server/auth/entraAuth.ts` | Microsoft Entra ID authentication |

### AI Agent Files

| File | Purpose |
|------|---------|
| `server/agents.ts` | Agent orchestration |
| `server/agents/clinical-decision-agent.ts` | Clinical decisions |
| `server/agents/differential-diagnosis-agent.ts` | Diagnosis suggestions |
| `server/agents/early-deterioration-agent.ts` | Patient monitoring |
| `server/agents/lab-trend-interpretation-agent.ts` | Lab analysis |

## Ignored Files (`.gitignore`)

```
node_modules/          # Dependencies
dist/                  # Build output
*.db                   # Database files
*.zip                  # Archives
.env*                  # Environment files (except .example)
*.log                  # Log files
coverage/              # Test coverage
.cache/                # Cache directories
```

## Quick Navigation

- **Getting Started**: [README.md](../README.md)
- **Documentation**: [docs/README.md](../docs/README.md)
- **Security**: [docs/security/](../docs/security/)
- **Deployment**: [docs/deployment/](../docs/deployment/)
- **API Reference**: [docs/AGENT_PROMPTS.md](../docs/AGENT_PROMPTS.md)

## Clean Build

To ensure a clean project state:

```bash
# Remove build artifacts
rm -rf dist/ node_modules/

# Remove temporary files
rm -rf .cache/ coverage/

# Reinstall dependencies
npm install --legacy-peer-deps

# Run security audit
npm run security-audit

# TypeScript check
npm run check

# Build for production
npm run build
```

## Development Workflow

```bash
# Start development server
npm run dev

# Run security checks
npm run security-audit

# Check TypeScript
npm run check

# Build for production
npm run build

# Start production server
npm start
```

---

**Project Structure Version**: 2.0.0  
**Last Updated**: February 2026  
**Maintained by**: HealthMesh Team
