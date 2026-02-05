# HealthMesh Documentation

Welcome to the HealthMesh documentation! This directory contains comprehensive guides, security documentation, and technical specifications.

## 📚 Documentation Index

### 🔒 Security Documentation

Located in `security/`

- **[SECURITY.md](./security/SECURITY.md)** - Security policy, vulnerability reporting, compliance information
- **[SECURITY_UPGRADE_REPORT.md](./security/SECURITY_UPGRADE_REPORT.md)** - Phase 1 security audit and fixes
- **[SECURITY_PHASE2_COMPLETE.md](./security/SECURITY_PHASE2_COMPLETE.md)** - Phase 2 enhancements (RBAC, encryption, validation)

**Quick Links:**
- Vulnerability Reporting → [SECURITY.md](./security/SECURITY.md#reporting-a-vulnerability)
- Security Checklist → [SECURITY.md](./security/SECURITY.md#security-checklist)
- Security Scorecard → [SECURITY_PHASE2_COMPLETE.md](./security/SECURITY_PHASE2_COMPLETE.md#new-security-scorecard)

### 🚀 Deployment Documentation

Located in `deployment/`

- **[AZURE_PES_SETUP_GUIDE.md](./deployment/AZURE_PES_SETUP_GUIDE.md)** - Azure deployment guide
- **Deployment Scripts** - Located in `../scripts/`

### 💾 Database Documentation

Located in `sql/`

- **Schema Definitions** - SQL table creation scripts
- **Migration Scripts** - Database updates and changes
- **Seed Data** - Sample data for development

### 🤖 AI Agent Documentation

Technical documentation for the multi-agent clinical intelligence system:

- **[AGENT_PROMPTS.md](./AGENT_PROMPTS.md)** - AI agent system prompts and configurations
- **[EARLY_DETERIORATION_AGENT.md](./EARLY_DETERIORATION_AGENT.md)** - Patient deterioration detection
- **[LAB_TREND_INTERPRETATION_ENGINE.md](./LAB_TREND_INTERPRETATION_ENGINE.md)** - Lab result analysis
- **[EVALUATION_TEST_CASES.md](./EVALUATION_TEST_CASES.md)** - Agent testing scenarios
- **[JUDGE_DEMO_STORYLINE.md](./JUDGE_DEMO_STORYLINE.md)** - Demo walkthrough
- **[SQL_FHIR_SCHEMAS.md](./SQL_FHIR_SCHEMAS.md)** - FHIR-compliant schemas

---

## 🎯 Quick Start Guides

### For Developers

1. **Getting Started** → See main [README.md](../README.md)
2. **Security Setup** → [SECURITY.md](./security/SECURITY.md#security-checklist)
3. **Deployment** → [AZURE_PES_SETUP_GUIDE.md](./deployment/AZURE_PES_SETUP_GUIDE.md)

### For Security Auditors

1. **Security Overview** → [SECURITY.md](./security/SECURITY.md)
2. **Security Audit Report** → [SECURITY_UPGRADE_REPORT.md](./security/SECURITY_UPGRADE_REPORT.md)
3. **Advanced Features** → [SECURITY_PHASE2_COMPLETE.md](./security/SECURITY_PHASE2_COMPLETE.md)

### For DevOps Engineers

1. **Azure Deployment** → [AZURE_PES_SETUP_GUIDE.md](./deployment/AZURE_PES_SETUP_GUIDE.md)
2. **Database Setup** → [sql/](./sql/)
3. **Scripts** → [../scripts/](../scripts/)

---

## 📖 Documentation by Topic

### Authentication & Authorization
- Entra ID Setup → [SECURITY.md](./security/SECURITY.md#authentication--authorization)
- RBAC Implementation → [SECURITY_PHASE2_COMPLETE.md](./security/SECURITY_PHASE2_COMPLETE.md#advanced-authorization)
- Permission Matrix → `../server/auth/rbac-middleware.ts`

### Data Protection
- Encryption Standards → [SECURITY.md](./security/SECURITY.md#encryption-standards)
- Field Encryption → [SECURITY_PHASE2_COMPLETE.md](./security/SECURITY_PHASE2_COMPLETE.md#field-level-data-protection)
- Implementation → `../server/encryption/field-encryption.ts`

### API Security
- Security Headers → [SECURITY_UPGRADE_REPORT.md](./security/SECURITY_UPGRADE_REPORT.md#security-enhancements-completed)
- Rate Limiting → [SECURITY_PHASE2_COMPLETE.md](./security/SECURITY_PHASE2_COMPLETE.md#rate-limiting-enhanced)
- Input Validation → `../server/security/advanced-security.ts`

### AI & Clinical Intelligence
- Agent Architecture → [AGENT_PROMPTS.md](./AGENT_PROMPTS.md)
- Lab Analysis → [LAB_TREND_INTERPRETATION_ENGINE.md](./LAB_TREND_INTERPRETATION_ENGINE.md)
- Patient Monitoring → [EARLY_DETERIORATION_AGENT.md](./EARLY_DETERIORATION_AGENT.md)

### Deployment
- Azure Setup → [AZURE_PES_SETUP_GUIDE.md](./deployment/AZURE_PES_SETUP_GUIDE.md)
- Environment Config → [../.env.example](../.env.example)
- Scripts → [../scripts/](../scripts/)

---

## 🔍 Finding What You Need

### By Role

**👨‍💻 Developer**
- Setup: [../README.md](../README.md)
- API Docs: [AGENT_PROMPTS.md](./AGENT_PROMPTS.md)
- Security: [SECURITY_PHASE2_COMPLETE.md](./security/SECURITY_PHASE2_COMPLETE.md#developer-guide)

**🔒 Security Engineer**
- Policy: [SECURITY.md](./security/SECURITY.md)
- Audit: [SECURITY_UPGRADE_REPORT.md](./security/SECURITY_UPGRADE_REPORT.md)
- Implementation: [SECURITY_PHASE2_COMPLETE.md](./security/SECURITY_PHASE2_COMPLETE.md)

**☁️ DevOps Engineer**
- Deployment: [AZURE_PES_SETUP_GUIDE.md](./deployment/AZURE_PES_SETUP_GUIDE.md)
- Scripts: [../scripts/](../scripts/)
- Database: [sql/](./sql/)

**🏥 Healthcare Admin**
- Overview: [../README.md](../README.md)
- Compliance: [SECURITY.md](./security/SECURITY.md#compliance)
- Demo: [JUDGE_DEMO_STORYLINE.md](./JUDGE_DEMO_STORYLINE.md)

### By Task

**🚀 Deploying to Production**
1. [AZURE_PES_SETUP_GUIDE.md](./deployment/AZURE_PES_SETUP_GUIDE.md)
2. [SECURITY.md](./security/SECURITY.md#deployment-checklist)
3. Environment setup: [../.env.example](../.env.example)

**🔐 Security Hardening**
1. [SECURITY_UPGRADE_REPORT.md](./security/SECURITY_UPGRADE_REPORT.md)
2. [SECURITY_PHASE2_COMPLETE.md](./security/SECURITY_PHASE2_COMPLETE.md)
3. Run security audit: `npm run security-audit`

**🤖 Understanding AI Agents**
1. [AGENT_PROMPTS.md](./AGENT_PROMPTS.md) - Overview
2. [LAB_TREND_INTERPRETATION_ENGINE.md](./LAB_TREND_INTERPRETATION_ENGINE.md) - Lab analysis
3. [EARLY_DETERIORATION_AGENT.md](./EARLY_DETERIORATION_AGENT.md) - Patient monitoring

**💾 Database Setup**
1. [sql/](./sql/) - Schema files
2. [SQL_FHIR_SCHEMAS.md](./SQL_FHIR_SCHEMAS.md) - FHIR schemas
3. Database scripts: [../scripts/](../scripts/)

---

## 📊 Documentation Status

| Document | Status | Last Updated | Version |
|----------|--------|--------------|---------|
| SECURITY.md | ✅ Complete | Feb 2026 | 1.0.0 |
| SECURITY_UPGRADE_REPORT.md | ✅ Complete | Feb 2026 | 1.0.0 |
| SECURITY_PHASE2_COMPLETE.md | ✅ Complete | Feb 2026 | 2.0.0 |
| AZURE_PES_SETUP_GUIDE.md | ✅ Complete | Jan 2026 | 1.0.0 |
| AGENT_PROMPTS.md | ✅ Complete | Jan 2026 | 1.0.0 |

---

## 🆘 Need Help?

### Common Questions

**Q: How do I secure my production deployment?**  
A: Follow the checklist in [SECURITY.md](./security/SECURITY.md#security-checklist)

**Q: What security features are included?**  
A: See [SECURITY_PHASE2_COMPLETE.md](./security/SECURITY_PHASE2_COMPLETE.md#7-layer-security-architecture)

**Q: How do I deploy to Azure?**  
A: Follow [AZURE_PES_SETUP_GUIDE.md](./deployment/AZURE_PES_SETUP_GUIDE.md)

**Q: How do the AI agents work?**  
A: Read [AGENT_PROMPTS.md](./AGENT_PROMPTS.md)

**Q: How do I report a security vulnerability?**  
A: See [SECURITY.md](./security/SECURITY.md#reporting-a-vulnerability)

### Additional Resources

- **Main README**: [../README.md](../README.md)
- **Source Code**: [../server/](../server/), [../client/](../client/)
- **Scripts**: [../scripts/](../scripts/)
- **Environment Config**: [../.env.example](../.env.example)

---

## 📝 Contributing to Documentation

When adding new documentation:

1. **Organize by category** - Use appropriate subdirectory
2. **Update this index** - Add links to new docs
3. **Follow markdown standards** - Use proper formatting
4. **Include examples** - Show practical usage
5. **Keep it current** - Update version and date

### Documentation Standards

- Use clear, concise language
- Include code examples where applicable
- Add table of contents for long documents
- Use proper markdown formatting
- Include version and date information

---

**HealthMesh Documentation**  
Version: 2.0.0  
Last Updated: February 2026  
Maintained by: HealthMesh Team
