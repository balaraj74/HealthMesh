# Intelligent Lab Trend Interpretation Engine

## 🎯 Overview

The Lab Trend Interpretation Engine is an AI-powered clinical decision support tool that helps clinicians understand lab results in context by detecting meaningful trends, patterns, and inconsistencies over time.

**Key Principle: Interpretation, NOT Diagnosis**

---

## ✨ Core Capabilities

### 1. Rolling Window Analysis
- Configurable time windows: 24h, 48h, 72h, or 7 days
- Minimum 2 readings per lab for trend calculation
- Gap detection in lab data

### 2. Trend Detection
For each lab tracked:
- **Direction**: Increasing, Decreasing, Stable, Fluctuating
- **Slope**: Rate of change per hour
- **Velocity**: Rapid, Gradual, Slow
- **Persistence**: Hours of consistent trend

### 3. Pattern Recognition
Clinically significant patterns detected:

| Pattern | Description | Significance |
|---------|-------------|--------------|
| **Inflammatory Progression** | Rising CRP + falling lymphocytes | HIGH |
| **Sepsis Warning Pattern** | Rising lactate + falling platelets + WBC abnormal | HIGH |
| **Acute Kidney Injury Progression** | Rising creatinine + BUN | HIGH |
| **Hepatic Stress Pattern** | Rising AST/ALT + bilirubin | MODERATE |
| **Coagulation Instability** | Falling platelets + rising INR/PT | HIGH |
| **Electrolyte Instability** | Multiple electrolyte abnormalities | MODERATE |
| **Treatment Failure Pattern** | Labs not improving despite therapy | HIGH |
| **Metabolic Acidosis Pattern** | Falling bicarbonate + rising lactate | HIGH |
| **Recovery Pattern** | Improving inflammatory markers | LOW |

---

## 📊 API Reference

### POST `/api/lab-trends/analyze`
Analyze lab trends with provided data.

**Request Body:**
```json
{
  "patientId": "uuid",
  "labs": [
    {
      "name": "CRP",
      "value": 45.2,
      "unit": "mg/L",
      "timestamp": "2026-01-03T10:30:00Z",
      "referenceRangeLow": 0,
      "referenceRangeHigh": 10
    }
  ],
  "demographics": {
    "age": 62,
    "gender": "male"
  },
  "windowHours": 48
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "agent": "LabTrendInterpretationAgent",
    "analysisId": "uuid",
    "overallStatus": "Worsening",
    "summary": "Laboratory trends show concerning worsening over the last 48 hours...",
    "confidence": 0.85,
    "patterns": [...],
    "trends": [...],
    "recommendations": [...],
    "monitoringPriorities": [...],
    "explainability": {...}
  }
}
```

### POST `/api/lab-trends/analyze-real`
Analyze labs from database for a real patient.

**Request Body:**
```json
{
  "patientId": "uuid",
  "windowHours": 72
}
```

### POST `/api/lab-trends/demo`
Demo with sample scenarios.

**Request Body:**
```json
{
  "scenario": "inflammatory" | "sepsis" | "recovery" | "aki"
}
```

---

## 🔬 Output Contract

### Overall Status
- `Improving` - Majority of trends improving
- `Stable` - Labs stable within reference
- `Worsening` - Concerning deterioration detected
- `Mixed` - Some improving, some worsening
- `Insufficient Data` - Not enough readings for analysis

### Pattern Object
```json
{
  "type": "Inflammatory Progression",
  "confidence": 0.88,
  "supportingLabs": ["CRP", "Lymphocytes", "WBC"],
  "description": "Rising inflammatory markers suggesting ongoing inflammation",
  "clinicalSignificance": "high",
  "evidence": ["CRP rising: 18 → 56 (+211%)"]
}
```

### Trend Object
```json
{
  "labCode": "CRP",
  "labName": "CRP",
  "currentValue": 56,
  "previousValue": 18,
  "unit": "mg/L",
  "deltaValue": 38,
  "deltaPercent": 211.1,
  "trend": {
    "direction": "increasing",
    "slope": 0.79,
    "velocity": "gradual",
    "persistence": 48
  },
  "isAbnormal": true,
  "referenceRange": { "low": 0, "high": 10 }
}
```

### Explainability
```json
{
  "reasoning": [
    "Analyzed 12 lab values over 48-hour window",
    "Identified 4 labs with sufficient data for trend analysis",
    "Detected 1 clinical pattern(s) based on correlated lab changes"
  ],
  "evidence": [
    "FHIR R4 Observation resources",
    "Clinical laboratory interpretation standards"
  ],
  "limitations": [
    "Limited lab panel - some patterns may not be detectable",
    "This is decision support only - clinical judgment required"
  ],
  "dataQuality": {
    "totalReadings": 12,
    "uniqueLabs": 4,
    "missingData": ["Lactate"],
    "timeGaps": []
  }
}
```

---

## 🏥 Clinical Pattern Logic

### Inflammatory Progression
**Criteria** (at least 2 of):
- CRP rising >10%
- Lymphocytes falling >10%
- WBC rising >10%
- Procalcitonin rising
- ESR rising

**Recommendations:**
- Review ongoing infection management
- Consider repeat cultures if indicated
- Assess source control adequacy
- Monitor inflammatory markers closely (q6-12h)

### Sepsis Warning Pattern
**Criteria** (at least 3 of):
- WBC abnormal (high or low)
- Lactate rising
- Platelets falling
- Creatinine rising
- Bilirubin rising

**Recommendations:**
- Urgent clinical reassessment required
- Consider sepsis bundle initiation
- Ensure adequate fluid resuscitation
- Review antibiotic coverage
- Monitor lactate clearance

### Acute Kidney Injury Progression
**Criteria** (at least 2 of):
- Creatinine rising
- BUN rising
- eGFR falling
- Potassium rising

**Recommendations:**
- Review nephrotoxic medications
- Assess volume status
- Consider renal consult if progressive
- Monitor urine output
- Hold ACE-I/ARBs if appropriate

---

## ⚠️ Safety & Governance

### Safeguards
- **No diagnosis statements** - Only pattern interpretation
- **"Decision Support Only"** labeling on all outputs
- **Audit logging** for all analyses
- **Confidence scores** with every result
- **Limitations** clearly stated in explainability

### Engineering Constraints
- Deterministic logic - same inputs = same outputs
- No hallucinated labs - only uses provided data
- Safe defaults when data incomplete
- Configurable thresholds (reference ranges)
- Testable rules

---

## 🔗 Multi-Agent Integration

The Lab Trend Interpretation Engine integrates with:

| Agent | Integration Point |
|-------|-------------------|
| **Patient Context Agent** | Demographics & baseline risk |
| **Early Deterioration Agent** | Risk trajectory correlation |
| **Medication Safety Agent** | Lab-drug correlations |
| **Clinical Chat Agent** | Conversational summaries |

---

## 📱 UI Features

### Summary View
- Trend status badge (Improving / Stable / Worsening)
- Time window analyzed
- Confidence score
- Quick statistics (labs tracked, patterns found, abnormal count)

### Detailed View
- Sparkline charts per lab
- Highlighted trend changes
- Explanation text
- "Why this matters" section

### Monitoring Priorities
- **STAT** - Immediate attention
- **4h** - Within 4 hours
- **Routine** - Standard monitoring

---

## 🎯 Success Criteria

1. **Time saved for clinicians** - Automated trend detection
2. **Fewer missed lab-based signals** - Pattern recognition
3. **Trustworthy explanations** - Full explainability
4. **Integration with real clinical workflow** - FHIR R4 compatible

---

## 📋 Clinical Disclaimer

> This system provides **DECISION SUPPORT ONLY**.
>
> All findings must be correlated with clinical presentation and verified by qualified healthcare professionals. The system provides interpretation, NOT diagnosis.

---

*Last Updated: January 3, 2026*
