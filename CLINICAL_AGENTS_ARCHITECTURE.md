# HealthMesh Clinical Intelligence Architecture

## Overview

HealthMesh implements a production-grade **5-Agent Clinical Intelligence Pipeline** designed for healthcare decision support. The system coordinates multiple specialized AI agents to assist clinicians in complex medical cases with transparent reasoning, evidence-based recommendations, and explicit uncertainty quantification.

---

## 🏗️ Agent Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        CLINICAL CASE INPUT                              │
│  Patient Data │ Vitals │ Labs │ Clinical Question │ Medical History     │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         1️⃣ TRIAGE AGENT                                 │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ • Analyzes vitals, symptoms, labs, demographics                  │   │
│  │ • Computes NEWS2 score (if vitals available)                    │   │
│  │ • Computes SOFA-lite score (if organ dysfunction indicators)    │   │
│  │ • Classifies risk: Low / Moderate / High / Critical             │   │
│  │ • Identifies red flags requiring immediate attention            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│  OUTPUT: urgencyScore, riskCategory, rationale, redFlags               │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       2️⃣ DIAGNOSTIC AGENT                              │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ • Converts symptoms/findings into structured clinical features   │   │
│  │ • Generates RANKED differential diagnoses                       │   │
│  │ • Explains WHY each diagnosis is considered                     │   │
│  │ • Lists supporting AND contradictory findings                   │   │
│  │ • Highlights missing data that would improve confidence         │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│  OUTPUT: differentialDiagnoses[], primarySuspicion, dataGaps          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       3️⃣ GUIDELINE AGENT                               │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ • Maps diagnoses/treatments to medical guidelines:              │   │
│  │   - NCCN (Oncology)                                             │   │
│  │   - WHO (Global health standards)                               │   │
│  │   - ICMR (Indian clinical guidelines)                           │   │
│  │   - ADA (Diabetes)                                              │   │
│  │   - ACC/AHA (Cardiology)                                        │   │
│  │   - IDSA (Infectious diseases)                                  │   │
│  │ • States recommendation class/strength (Class I/II/III)         │   │
│  │ • Flags deviations and gray areas                               │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│  OUTPUT: applicableGuidelines[], deviations, grayAreas                 │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   4️⃣ MEDICATION SAFETY AGENT                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ • Checks drug-drug interactions (DDIs)                          │   │
│  │ • Identifies drug-allergy conflicts and cross-reactivity        │   │
│  │ • Assesses dose risks (renal/hepatic adjustments)               │   │
│  │ • Identifies contraindications (absolute/relative)              │   │
│  │ • Suggests safer alternatives                                   │   │
│  │ • Recommends monitoring parameters                              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│  OUTPUT: interactions[], allergyConflicts[], contraindications[],      │
│          saferAlternatives[], monitoringRecommendations[]              │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        5️⃣ EVIDENCE AGENT                               │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ • Retrieves relevant clinical trials and meta-analyses          │   │
│  │ • Prefers recent evidence (≤5 years)                            │   │
│  │ • Grades strength of evidence (Strong/Moderate/Limited)         │   │
│  │ • Notes limitations and potential biases                        │   │
│  │ • Uses Azure Cognitive Search RAG when available                │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│  OUTPUT: keyStudies[], evidenceSummary, strengthOfEvidence             │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    🧠 SYNTHESIS ORCHESTRATOR                            │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ • Integrates findings from ALL 5 agents                         │   │
│  │ • Resolves conflicting information with reasoning               │   │
│  │ • Prioritizes recommendations by clinical urgency               │   │
│  │ • Provides EXPLAINABILITY PANEL:                                │   │
│  │   - Why this recommendation was made                            │   │
│  │   - What data influenced it most                                │   │
│  │   - What data is missing                                        │   │
│  │ • Calculates overall confidence (Low/Medium/High)               │   │
│  │ • Includes clinical disclaimer                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│  OUTPUT: Unified ClinicalSynthesis object                              │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Output Format

### Final Synthesis Structure

```typescript
interface ClinicalSynthesis {
  // 1. Case Summary
  caseSummary: string;
  
  // 2. Risk & Urgency Assessment
  riskAndUrgency: {
    urgencyScore: number;        // 1-10 scale
    riskCategory: "Low" | "Moderate" | "High" | "Critical";
    rationale: string;
    immediateActions: string[];
  };
  
  // 3. Differential Diagnosis
  differentialDiagnosis: Array<{
    diagnosis: string;
    confidence: number;          // 0-100%
    supportingEvidence: string[];
  }>;
  
  // 4. Guideline-Aligned Recommendations
  guidelineRecommendations: Array<{
    guideline: string;           // e.g., "NCCN Breast Cancer v2.2024"
    recommendation: string;
    evidenceLevel: string;       // Level A/B/C
  }>;
  
  // 5. Medication Safety Considerations
  medicationSafety: {
    overallRisk: "Low" | "Moderate" | "High";
    criticalAlerts: string[];
    recommendations: string[];
  };
  
  // 6. Supporting Evidence
  supportingEvidence: {
    keyFindings: string[];
    strengthOfEvidence: "Strong" | "Moderate" | "Limited" | "Conflicting";
  };
  
  // 7. Explainability Panel
  explainabilityPanel: {
    whyThisRecommendation: string[];
    keyInfluencingData: string[];
    missingData: string[];
  };
  
  // 8. Confidence Level
  overallConfidence: "Low" | "Medium" | "High";
  
  // 9. Clinical Disclaimer
  clinicalDisclaimer: string;
}
```

---

## 🔧 API Endpoints

### Enhanced Clinical Analysis

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

### Response

```json
{
  "success": true,
  "data": {
    "case": { /* Updated case object */ },
    "agentOutputs": [
      {
        "agentType": "orchestrator",
        "status": "completed",
        "summary": "Risk: Moderate | Urgency: 5/10 | NEWS2: 3",
        "details": { "agentName": "Triage Agent", /* ... */ },
        "confidence": 85
      },
      // ... other agent outputs
    ],
    "recommendations": [ /* Actionable recommendations */ ],
    "riskAlerts": [ /* Safety alerts */ ],
    "synthesis": { /* Full ClinicalSynthesis object */ }
  }
}
```

---

## 🎯 Clinical Scoring Algorithms

### NEWS2 (National Early Warning Score 2)

Used for detecting acute deterioration in hospitalized patients.

| Parameter | Score 3 | Score 2 | Score 1 | Score 0 | Score 1 | Score 2 | Score 3 |
|-----------|---------|---------|---------|---------|---------|---------|---------|
| RR (/min) | ≤8 | - | 9-11 | 12-20 | - | 21-24 | ≥25 |
| SpO2 (%) | ≤91 | 92-93 | 94-95 | ≥96 | - | - | - |
| Supp O2 | - | Yes | - | No | - | - | - |
| SBP (mmHg) | ≤90 | 91-100 | 101-110 | 111-219 | - | - | ≥220 |
| HR (/min) | ≤40 | - | 41-50 | 51-90 | 91-110 | 111-130 | ≥131 |
| Consciousness | - | - | - | Alert | - | - | CVPU |
| Temp (°C) | ≤35.0 | - | 35.1-36.0 | 36.1-38.0 | 38.1-39.0 | ≥39.1 | - |

**Risk Classification:**
- 0-4: Low risk
- 5-6: Medium risk  
- ≥7: High risk

### SOFA-lite (Sequential Organ Failure Assessment - Simplified)

Used for assessing organ dysfunction in critically ill patients.

| System | 0 | 1 | 2 | 3 | 4 |
|--------|---|---|---|---|---|
| Respiratory (PaO2/FiO2) | ≥400 | <400 | <300 | <200 | <100 |
| Coagulation (Platelets ×10³) | ≥150 | <150 | <100 | <50 | <20 |
| Liver (Bilirubin mg/dL) | <1.2 | 1.2-1.9 | 2.0-5.9 | 6.0-11.9 | ≥12 |
| Renal (Creatinine mg/dL) | <1.2 | 1.2-1.9 | 2.0-3.4 | 3.5-4.9 | ≥5.0 |
| CNS (GCS) | 15 | 13-14 | 10-12 | 6-9 | <6 |

---

## 🔐 Core Operating Principles

1. **NOT a diagnostic authority** - Assists licensed clinicians only
2. **Explainable outputs** - All recommendations include reasoning chains
3. **Evidence-backed** - References guidelines and research
4. **Cautious by design** - Explicitly states uncertainty
5. **No hallucination** - Never fabricates facts, drugs, or studies
6. **Transparent** - Separates clinical facts from reasoning

---

## 📁 File Structure

```
server/
├── clinical-agents.ts          # NEW: 5-Agent Clinical Pipeline
│   ├── invokeTriageAgent()
│   ├── invokeDiagnosticAgent()
│   ├── invokeGuidelineAgent()
│   ├── invokeMedicationSafetyAgent()
│   ├── invokeEvidenceAgent()
│   ├── invokeSynthesisOrchestrator()
│   └── analyzeCaseWithClinicalAgents()
│
├── azure-agents.ts             # Legacy Azure-powered agents
├── azure-routes.ts             # API routes (includes /clinical-analyze)
│
client/
├── components/
│   └── clinical-synthesis.tsx  # NEW: UI component for synthesis display
```

---

## 🚀 Usage Example

```typescript
import { analyzeCaseWithClinicalAgents } from './clinical-agents';

// Run clinical analysis
const result = await analyzeCaseWithClinicalAgents(
  patient,
  clinicalCase,
  vitals,      // Optional: for NEWS2 calculation
  labValues    // Optional: for SOFA calculation
);

// Access structured synthesis
console.log(result.synthesis.caseSummary);
console.log(result.synthesis.riskAndUrgency.riskCategory);
console.log(result.synthesis.differentialDiagnosis);
console.log(result.synthesis.explainabilityPanel.whyThisRecommendation);
```

---

## ⚠️ Clinical Disclaimer

**This system is designed as CLINICAL DECISION SUPPORT only.**

- All recommendations must be reviewed by a licensed clinician
- The AI does NOT make diagnoses
- The final clinical decision rests with the treating physician
- Evidence and guidelines may change; always verify current standards
- Patient-specific factors may override general recommendations

---

## 📈 Monitoring & Observability

All agent executions are tracked via Azure Monitor with:
- Execution time per agent
- Confidence scores
- Error rates
- Risk alert generation
- Recommendation acceptance rates

---

*Last Updated: December 25, 2024*
