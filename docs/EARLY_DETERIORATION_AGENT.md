# Early Clinical Deterioration Detection Agent

## Overview

The **Early Clinical Deterioration Detection Agent** is a production-ready component of HealthMesh that identifies slow, progressive patient deterioration using trend-aware, explainable clinical reasoning—not just static thresholds.

**Goal**: Reduce missed deterioration, late ICU transfers, and preventable mortality.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    HealthMesh Orchestrator                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │   Patient    │───▶│    Early     │───▶│    Safety    │       │
│  │   Context    │    │ Deterioration│    │    Agent     │       │
│  │    Agent     │    │    Agent     │    │              │       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
│                             │                                    │
│                             ▼                                    │
│                    ┌──────────────┐                              │
│                    │  Clinician   │                              │
│                    │ Interaction  │                              │
│                    │    Agent     │                              │
│                    └──────────────┘                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Features

### 1. Trend-Aware Analysis (Critical)

Unlike static scoring systems, this agent analyzes:

- **Vital sign trends** (HR, RR, BP, SpO₂, Temp)
- **Lab drifts** (CRP, WBC, Lactate, Creatinine, Platelets)
- **Oxygen support escalation**
- **Medication changes** (new vasopressors, antibiotics, sedatives)

**Key Detection Methods:**
- Rolling windows
- Delta analysis  
- Slope detection
- Pattern consistency checks

### 2. Clinical Scores

The agent computes:

| Score | Range | Description |
|-------|-------|-------------|
| **NEWS2** | 0-20 | National Early Warning Score 2 |
| **qSOFA** | 0-3 | Quick Sequential Organ Failure Assessment |
| **Custom Risk Score** | 0-100 | Composite score with trend weighting |

### 3. Explainability (NON-NEGOTIABLE)

Every alert includes:

```json
{
  "reasoning": "Respiratory rate increased from 18 → 24 over 8 hours (+33%), 
               CRP rose by 40%, oxygen requirement increased from room air 
               to 2L. Pattern consistent with early inflammatory deterioration.",
  "clinicalRationale": [
    "NEWS2 score of 7 indicates high clinical risk",
    "Rising CRP indicates ongoing inflammation"
  ],
  "evidenceSources": [
    "NEWS2 (Royal College of Physicians, 2017)",
    "Sepsis-3 / qSOFA (JAMA, 2016)"
  ],
  "confidenceFactors": [
    "Multiple converging signals increase confidence"
  ],
  "limitations": [
    "Analysis based on available data within time window"
  ]
}
```

---

## Data Inputs (FHIR R4 Aligned)

### Vital Observations

```typescript
interface VitalObservation {
  id: string;
  code: "heart-rate" | "respiratory-rate" | "systolic-bp" | 
        "diastolic-bp" | "oxygen-saturation" | "temperature" | 
        "consciousness-level";
  value: number;
  unit: string;
  timestamp: Date;
  status: "final" | "preliminary" | "amended";
}
```

### Lab Observations

```typescript
interface LabObservation {
  id: string;
  code: "crp" | "wbc" | "lactate" | "creatinine" | "platelets" | 
        "procalcitonin" | "bnp" | "troponin" | ...;
  value: number;
  unit: string;
  timestamp: Date;
  referenceRange?: { low?: number; high?: number };
  interpretation?: "normal" | "abnormal" | "critical";
}
```

### Oxygen Support

```typescript
interface OxygenSupport {
  timestamp: Date;
  type: "room-air" | "nasal-cannula" | "simple-mask" | 
        "venturi-mask" | "non-rebreather" | "hfnc" | "niv" | 
        "invasive-ventilation";
  flowRate?: number;
  fio2?: number;
}
```

### Medication Events

```typescript
interface MedicationEvent {
  medicationName: string;
  category: "vasopressor" | "sedative" | "antibiotic" | 
            "diuretic" | "bronchodilator" | ...;
  action: "started" | "increased" | "decreased" | "stopped";
  timestamp: Date;
}
```

---

## Output Contract

```json
{
  "agent": "EarlyDeteriorationAgent",
  "riskLevel": "HIGH",
  "trajectory": "WORSENING",
  "confidence": 0.91,
  "scores": {
    "news2Score": 7,
    "news2Trend": "WORSENING",
    "qsofaScore": 2,
    "customRiskScore": 65,
    "trendAcceleration": 0.6
  },
  "keySignals": [
    {
      "type": "vital",
      "code": "respiratory-rate",
      "description": "Respiratory rate",
      "severity": "high",
      "trend": "WORSENING",
      "values": {
        "baseline": 18,
        "current": 28,
        "change": "+10",
        "changePercent": 55.6
      },
      "timeSpan": "24 hours",
      "clinicalSignificance": "Rising respiratory rate (+56%) may indicate respiratory distress, metabolic acidosis, or early sepsis"
    }
  ],
  "recommendations": [
    {
      "priority": "urgent",
      "action": "Senior clinician review",
      "rationale": "High risk score requires prompt clinical assessment",
      "evidenceLevel": "A",
      "timeframe": "Within 1 hour"
    }
  ],
  "explainability": {
    "reasoning": "...",
    "clinicalRationale": ["..."],
    "evidenceSources": ["NEWS2", "qSOFA", "WHO sepsis guidance"],
    "confidenceFactors": ["..."],
    "limitations": ["..."]
  },
  "analysisWindow": {
    "startTime": "2025-01-01T12:00:00Z",
    "endTime": "2025-01-02T12:00:00Z",
    "hoursAnalyzed": 24,
    "dataPointsEvaluated": 45
  },
  "governance": {
    "alertId": "uuid",
    "version": "1.0.0",
    "modelUsed": "EarlyDeteriorationAgent-v1",
    "auditTrail": [...]
  }
}
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/deterioration/analyze` | Run analysis for a patient |
| GET | `/api/deterioration/alerts/:patientId` | Get alerts for a patient |
| GET | `/api/deterioration/alert/:alertId` | Get specific alert details |
| POST | `/api/deterioration/alert/:alertId/acknowledge` | Acknowledge an alert |
| POST | `/api/deterioration/alert/:alertId/escalate` | Escalate an alert |
| POST | `/api/deterioration/alert/:alertId/dismiss` | Dismiss with reason |
| GET | `/api/deterioration/dashboard` | Hospital-wide alert summary |
| POST | `/api/deterioration/demo` | Generate demo alert |

---

## Risk Levels

| Level | Criteria | Response |
|-------|----------|----------|
| **CRITICAL** | NEWS2 ≥9, Custom ≥70, or ≥2 critical signals | Immediate review |
| **HIGH** | NEWS2 ≥7, Custom ≥50, or ≥1 critical signal | Urgent review within 1 hour |
| **MODERATE** | NEWS2 ≥5, Custom ≥30 | Increased monitoring |
| **LOW** | Below thresholds | Routine monitoring |

---

## Trajectory Classification

| Trajectory | Description |
|------------|-------------|
| **RAPIDLY_WORSENING** | ≥70% of signals worsening |
| **WORSENING** | ≥40% of signals worsening |
| **STABLE** | Mixed signals, no clear trend |
| **IMPROVING** | Majority of signals improving |

---

## Alert Governance

### Audit Trail

Every alert action is logged:
- Created
- Viewed (who, when)
- Acknowledged (who, when, notes)
- Escalated (who, when, target)
- Dismissed (who, when, reason - **required**)

### Cool-down Periods

- Prevents alert fatigue from repeated triggers
- Configurable per risk level

### Feedback Loop

```typescript
{
  "acknowledged": true,
  "acknowledgedBy": "user-id",
  "acknowledgedAt": "2025-01-01T14:30:00Z",
  "acknowledgedNotes": "Patient reviewed, starting IV fluids"
}
```

---

## UI/UX Components

### Clinical Deterioration Panel

Located: `client/src/components/ClinicalDeteriorationPanel.tsx`

Features:
- **Risk Badge** (color-coded)
- **Trend Arrow** (improving/stable/worsening)
- **Score Cards** (NEWS2, qSOFA, Custom)
- **Signal Cards** (expandable details)
- **Recommendation Cards** (priority-sorted)
- **Reasoning Trace** (full explainability)
- **Evidence Sources** (guideline references)
- **Action Buttons** (Acknowledge, Escalate)
- **Clinical Disclaimer**

---

## Demo Scenarios

Available via `/api/deterioration/demo`:

| Scenario | Pattern |
|----------|---------|
| `sepsis` | Rising RR, HR, Temp, CRP, Lactate, new antibiotics |
| `respiratory` | Falling SpO2, rising RR, oxygen escalation |
| `cardiac` | BP changes, rising troponin, BNP |
| `general` | Generic mild deterioration |

---

## Engineering Constraints

✅ **Deterministic outputs** (same input → same result)  
✅ **No hallucinated data**  
✅ **Graceful degradation** if data missing  
✅ **Secure, auditable, testable**  
✅ **HIPAA-compliant audit logging**

---

## File Structure

```
server/
├── agents/
│   └── early-deterioration-agent.ts    # Core agent logic
├── api/
│   └── deterioration-routes.ts         # API endpoints
client/
├── components/
│   └── ClinicalDeteriorationPanel.tsx  # UI component
docs/
└── EARLY_DETERIORATION_AGENT.md        # This file
```

---

## Evidence Sources

1. **NEWS2** - Royal College of Physicians (2017)
2. **qSOFA / Sepsis-3** - JAMA (2016)
3. **Surviving Sepsis Campaign** - Critical Care Medicine (2021)
4. **BTS Oxygen Guidelines** - Thorax (2017)
5. **NICE Sepsis Guidelines** - NG51 (2017)

---

## Success Criteria

The agent demonstrates:

1. ✅ **Earlier detection** than static scores
2. ✅ **Explainability** clinicians trust
3. ✅ **Reduced alert fatigue** (trajectory + confidence thresholds)
4. ✅ **Real patient safety impact**
5. ✅ **Defensible in clinical audit**

---

## Clinical Disclaimer

> **This is decision support, not diagnosis.**
> 
> All alerts must be reviewed and validated by qualified healthcare professionals before any clinical action is taken. The treating physician maintains full responsibility for patient care decisions.

---

*Built for Microsoft Imagine Cup 2025 - HealthMesh Clinical Intelligence Platform*
