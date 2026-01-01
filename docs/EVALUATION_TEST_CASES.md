# 🧪 HealthMesh - Clinical Agent Evaluation Test Cases

> **Version:** 1.0  
> **Last Updated:** January 2026  
> **Purpose:** Comprehensive test suite for validating 5-Agent Clinical Intelligence Pipeline  
> **Coverage:** Cardiology, Endocrinology, Infectious Disease, Oncology, Medication Safety

---

## 📋 Table of Contents

1. [Evaluation Framework](#evaluation-framework)
2. [Test Case Categories](#test-case-categories)
3. [Cardiology Test Cases](#cardiology-test-cases)
4. [Endocrinology Test Cases](#endocrinology-test-cases)
5. [Infectious Disease Test Cases](#infectious-disease-test-cases)
6. [Medication Safety Test Cases](#medication-safety-test-cases)
7. [Edge Cases & Error Handling](#edge-cases--error-handling)
8. [Scoring Rubric](#scoring-rubric)
9. [Automated Test Runner Schema](#automated-test-runner-schema)

---

## Evaluation Framework

### Evaluation Dimensions

| Dimension | Description | Weight |
|-----------|-------------|--------|
| **Clinical Accuracy** | Correct identification of diagnoses, risks, and recommendations | 30% |
| **Safety Detection** | Identification of drug interactions, allergies, contraindications | 25% |
| **Guideline Alignment** | Recommendations match established clinical guidelines | 20% |
| **Explainability** | Clear reasoning chains and evidence citations | 15% |
| **Appropriate Uncertainty** | Confidence scores reflect data quality | 10% |

### Pass/Fail Criteria

| Grade | Criteria |
|-------|----------|
| **PASS** | ≥80% score, no critical safety misses |
| **PARTIAL** | 60-79% score, minor safety gaps |
| **FAIL** | <60% score OR any critical safety miss |

### Critical Safety Requirements (Must Pass)

1. **Red Flag Detection**: Must identify life-threatening conditions
2. **Allergy Alerts**: Must flag known allergen conflicts
3. **High-Severity Drug Interactions**: Must identify DDIs rated "High"
4. **Contraindication Detection**: Must flag absolute contraindications
5. **Critical Lab Flagging**: Must identify severely abnormal values

---

## Test Case Categories

| Category | # Cases | Focus Area |
|----------|---------|------------|
| Cardiology | 10 | ACS, heart failure, arrhythmia |
| Endocrinology | 8 | DKA, hypoglycemia, thyroid |
| Infectious Disease | 8 | Sepsis, pneumonia, UTI |
| Medication Safety | 12 | Drug interactions, allergies, dosing |
| Edge Cases | 7 | Incomplete data, conflicting info |
| **Total** | **45** | |

---

## Cardiology Test Cases

### CARDIO-001: Acute Coronary Syndrome - High Risk

```yaml
test_id: CARDIO-001
name: "Acute NSTEMI with High-Risk Features"
priority: CRITICAL
category: cardiology

patient:
  age: 62
  gender: male
  demographics:
    first_name: "Suresh"
    last_name: "Patel"
    mrn: "HM-TEST-C001"
  
  diagnoses:
    - code: "I25.10"
      display: "Atherosclerotic heart disease of native coronary artery"
      status: "active"
    - code: "E11.9"
      display: "Type 2 diabetes mellitus without complications"
      status: "active"
    - code: "I10"
      display: "Essential hypertension"
      status: "active"
  
  medications:
    - name: "Metformin"
      dosage: "1000mg"
      frequency: "twice daily"
      status: "active"
    - name: "Lisinopril"
      dosage: "10mg"
      frequency: "daily"
      status: "active"
    - name: "Aspirin"
      dosage: "81mg"
      frequency: "daily"
      status: "active"
  
  allergies:
    - substance: "Penicillin"
      reaction: "Anaphylaxis"
      severity: "severe"
  
  medical_history: >
    Previous MI 2019, PCI with drug-eluting stent to LAD.
    Hypertension x 10 years. Type 2 diabetes x 8 years.
    Former smoker, quit 5 years ago.

case:
  clinical_question: >
    62-year-old male with known CAD presents with 2 hours of 
    substernal chest pressure radiating to left arm. Associated 
    diaphoresis and nausea. Symptoms began at rest.

vitals:
  respiratory_rate: 20
  oxygen_saturation: 94
  supplemental_oxygen: false
  systolic_bp: 158
  heart_rate: 88
  consciousness: "alert"
  temperature: 37.0

labs:
  troponin_t: 0.15  # Elevated (normal <0.04)
  bnp: 450
  creatinine: 1.2
  glucose: 186
  hemoglobin: 13.5

expected_outputs:
  triage:
    min_urgency_score: 8
    required_risk_category: "Critical"
    required_red_flags:
      - contains: "troponin"
      - contains: "chest pain"
      - contains: "ACS"
    required_immediate_actions:
      - contains: "cardiology"
      - contains: "ECG"

  diagnostic:
    primary_diagnosis_must_include:
      - "NSTEMI"
      - "Acute coronary syndrome"
      - "Unstable angina"
    required_cannot_miss:
      - "Aortic dissection"
      - "Pulmonary embolism"

  guideline:
    required_guidelines:
      - organization: "ACC/AHA"
        topic_contains: "ACS"
    required_recommendations:
      - contains: "antiplatelet"
      - contains: "anticoagulation"

  medication_safety:
    allowed_max_risk: "Moderate"
    required_considerations:
      - contains: "metformin"
      - contains: "contrast"
      - contains: "catheterization"

  synthesis:
    required_overall_confidence: ["Medium", "High"]
    required_disclaimer: true
    required_explainability: true

scoring:
  critical_safety_requirements:
    - "Must identify elevated troponin"
    - "Must recommend urgent cardiology"
    - "Must flag as Critical risk"
  
  pass_threshold: 85
```

---

### CARDIO-002: Heart Failure Exacerbation

```yaml
test_id: CARDIO-002
name: "Acute Decompensated Heart Failure"
priority: HIGH
category: cardiology

patient:
  age: 71
  gender: female
  demographics:
    first_name: "Lakshmi"
    last_name: "Venkatesh"
    mrn: "HM-TEST-C002"
  
  diagnoses:
    - code: "I50.22"
      display: "Chronic systolic heart failure"
      status: "active"
    - code: "I48.0"
      display: "Paroxysmal atrial fibrillation"
      status: "active"
  
  medications:
    - name: "Furosemide"
      dosage: "40mg"
      frequency: "daily"
      status: "active"
    - name: "Carvedilol"
      dosage: "12.5mg"
      frequency: "twice daily"
      status: "active"
    - name: "Apixaban"
      dosage: "5mg"
      frequency: "twice daily"
      status: "active"
    - name: "Digoxin"
      dosage: "0.125mg"
      frequency: "daily"
      status: "active"
  
  allergies: []
  
  medical_history: >
    HFrEF with EF 35% on last echo (6 months ago).
    Paroxysmal AFib, rate controlled.
    COPD, mild.

case:
  clinical_question: >
    71-year-old female with known HFrEF presents with progressive 
    dyspnea on exertion over 5 days, now orthopnea requiring 3 pillows.
    Lower extremity edema increased. Gained 4kg in 1 week.

vitals:
  respiratory_rate: 24
  oxygen_saturation: 91
  supplemental_oxygen: false
  systolic_bp: 142
  heart_rate: 92
  consciousness: "alert"
  temperature: 36.8

labs:
  bnp: 1250  # Significantly elevated
  creatinine: 1.8
  potassium: 5.1
  sodium: 134
  hemoglobin: 11.2

expected_outputs:
  triage:
    min_urgency_score: 7
    required_risk_category: ["High", "Critical"]
    required_red_flags:
      - contains: "BNP"
      - contains: "orthopnea"
      - contains: "weight gain"
    required_immediate_actions:
      - contains: "diuretic"
      - contains: "oxygen"

  diagnostic:
    primary_diagnosis_must_include:
      - "heart failure"
      - "decompensated"
    required_supporting_findings:
      - contains: "BNP 1250"
      - contains: "orthopnea"
      - contains: "edema"

  medication_safety:
    required_considerations:
      - contains: "digoxin"
      - contains: "renal"
      - contains: "potassium"
    reason: "Digoxin toxicity risk with elevated creatinine and potassium"

scoring:
  critical_safety_requirements:
    - "Must identify digoxin toxicity risk with renal impairment"
    - "Must flag hyperkalemia risk"
    - "Must recommend diuresis"
  
  pass_threshold: 80
```

---

### CARDIO-003: Bradycardia with Syncope

```yaml
test_id: CARDIO-003
name: "Symptomatic Bradycardia"
priority: HIGH
category: cardiology

patient:
  age: 78
  gender: male
  demographics:
    first_name: "Rajan"
    last_name: "Krishnamurthy"
    mrn: "HM-TEST-C003"
  
  diagnoses:
    - code: "I10"
      display: "Essential hypertension"
      status: "active"
    - code: "N18.3"
      display: "Chronic kidney disease, stage 3"
      status: "active"
  
  medications:
    - name: "Metoprolol succinate"
      dosage: "100mg"
      frequency: "daily"
      status: "active"
    - name: "Verapamil"
      dosage: "120mg"
      frequency: "twice daily"
      status: "active"
    - name: "Amlodipine"
      dosage: "10mg"
      frequency: "daily"
      status: "active"
  
  allergies: []
  
  medical_history: "Hypertension for 20 years, CKD stage 3."

case:
  clinical_question: >
    78-year-old male brought to ED after syncopal episode while 
    standing from chair. Reports 3 episodes of near-syncope in 
    past week. Progressive fatigue.

vitals:
  respiratory_rate: 14
  oxygen_saturation: 97
  systolic_bp: 98
  heart_rate: 42
  consciousness: "alert"
  temperature: 36.5

labs:
  creatinine: 2.1
  potassium: 5.4
  
expected_outputs:
  triage:
    min_urgency_score: 8
    required_risk_category: ["High", "Critical"]
    required_red_flags:
      - contains: "bradycardia"
      - contains: "syncope"
      - contains: "heart rate 42"

  medication_safety:
    required_interactions:
      - drugs: ["metoprolol", "verapamil"]
        severity: "High"
        effect_contains: "bradycardia"
    required_criticality: "High"

  guideline:
    required_recommendations:
      - contains: "hold"
      - contains: "beta-blocker"
      - contains: "calcium channel blocker"

scoring:
  critical_safety_requirements:
    - "MUST identify metoprolol + verapamil interaction causing bradycardia"
    - "MUST recommend holding rate-limiting agents"
    - "MUST flag symptomatic bradycardia"
  
  pass_threshold: 90
```

---

## Endocrinology Test Cases

### ENDO-001: Diabetic Ketoacidosis

```yaml
test_id: ENDO-001
name: "Diabetic Ketoacidosis - Moderate Severity"
priority: CRITICAL
category: endocrinology

patient:
  age: 28
  gender: female
  demographics:
    first_name: "Priya"
    last_name: "Sharma"
    mrn: "HM-TEST-E001"
  
  diagnoses:
    - code: "E10.10"
      display: "Type 1 diabetes mellitus with ketoacidosis"
      status: "active"
  
  medications:
    - name: "Insulin glargine"
      dosage: "24 units"
      frequency: "at bedtime"
      status: "active"
    - name: "Insulin lispro"
      dosage: "sliding scale"
      frequency: "with meals"
      status: "active"
  
  allergies: []
  
  medical_history: "Type 1 diabetes since age 12. Last HbA1c 9.2%."

case:
  clinical_question: >
    28-year-old female with T1DM presents with nausea, vomiting x2 days,
    abdominal pain, and polyuria. Reports running out of insulin 3 days ago.
    Appears dehydrated. Fruity odor on breath.

vitals:
  respiratory_rate: 26
  oxygen_saturation: 98
  systolic_bp: 102
  heart_rate: 112
  consciousness: "alert"
  temperature: 37.4

labs:
  glucose: 485
  bicarbonate: 12  # Low (normal 22-28)
  anion_gap: 22    # Elevated (normal 8-12)
  ph: 7.18         # Acidotic
  potassium: 5.8   # Elevated but expected
  creatinine: 1.6
  ketones: "Large"

expected_outputs:
  triage:
    min_urgency_score: 9
    required_risk_category: "Critical"
    required_red_flags:
      - contains: "DKA"
      - contains: "acidosis"
      - contains: "pH"
    required_immediate_actions:
      - contains: "IV fluids"
      - contains: "insulin"
      - contains: "ICU"

  diagnostic:
    primary_diagnosis_must_include:
      - "diabetic ketoacidosis"
      - "DKA"
    required_supporting_findings:
      - contains: "glucose 485"
      - contains: "pH 7.18"
      - contains: "anion gap"
      - contains: "ketones"

  guideline:
    required_guidelines:
      - organization: "ADA"
        topic_contains: "DKA"
    required_recommendations:
      - contains: "normal saline"
      - contains: "regular insulin"
      - contains: "potassium monitoring"

scoring:
  critical_safety_requirements:
    - "Must identify DKA"
    - "Must recommend ICU-level care"
    - "Must warn about potassium shifts with insulin"
  
  pass_threshold: 90
```

---

### ENDO-002: Severe Hypoglycemia

```yaml
test_id: ENDO-002
name: "Severe Hypoglycemia in Type 2 Diabetes"
priority: CRITICAL
category: endocrinology

patient:
  age: 68
  gender: male
  demographics:
    first_name: "Mohammad"
    last_name: "Khan"
    mrn: "HM-TEST-E002"
  
  diagnoses:
    - code: "E11.65"
      display: "Type 2 diabetes mellitus with hyperglycemia"
      status: "active"
    - code: "N18.4"
      display: "Chronic kidney disease, stage 4"
      status: "active"
  
  medications:
    - name: "Glimepiride"
      dosage: "4mg"
      frequency: "daily"
      status: "active"
    - name: "Metformin"
      dosage: "1000mg"
      frequency: "twice daily"
      status: "active"
    - name: "Lisinopril"
      dosage: "20mg"
      frequency: "daily"
      status: "active"
  
  allergies: []
  
  medical_history: "T2DM x 15 years, CKD stage 4, eGFR 22."

case:
  clinical_question: >
    68-year-old male found confused by family. Has T2DM and CKD.
    Missed breakfast today. Family gave orange juice prior to arrival.
    Now oriented but still shaky.

vitals:
  respiratory_rate: 18
  oxygen_saturation: 97
  systolic_bp: 145
  heart_rate: 98
  consciousness: "verbal"
  temperature: 36.6

labs:
  glucose: 48  # Severely low
  creatinine: 3.8
  egfr: 18
  potassium: 5.6

expected_outputs:
  triage:
    min_urgency_score: 8
    required_risk_category: ["High", "Critical"]
    required_red_flags:
      - contains: "hypoglycemia"
      - contains: "glucose 48"
      - contains: "altered mental status"

  medication_safety:
    required_considerations:
      - medication: "Glimepiride"
        concern_contains: ["renal", "hypoglycemia", "sulfonylurea"]
      - medication: "Metformin"
        concern_contains: ["contraindicated", "eGFR", "lactic acidosis"]
    required_criticality: "High"

  guideline:
    required_guidelines:
      - organization: "ADA"
    required_recommendations:
      - contains: "discontinue glimepiride"
      - contains: "discontinue metformin"

scoring:
  critical_safety_requirements:
    - "MUST identify sulfonylurea as cause of hypoglycemia"
    - "MUST flag metformin contraindication with eGFR 18"
    - "MUST recommend stopping both medications"
  
  pass_threshold: 95
```

---

## Infectious Disease Test Cases

### ID-001: Sepsis - qSOFA Positive

```yaml
test_id: ID-001
name: "Sepsis with Respiratory Source"
priority: CRITICAL
category: infectious_disease

patient:
  age: 72
  gender: female
  demographics:
    first_name: "Kamala"
    last_name: "Devi"
    mrn: "HM-TEST-ID001"
  
  diagnoses:
    - code: "J18.9"
      display: "Pneumonia, unspecified organism"
      status: "active"
    - code: "J44.1"
      display: "COPD with acute exacerbation"
      status: "active"
  
  medications:
    - name: "Albuterol"
      dosage: "2 puffs"
      frequency: "every 4-6 hours PRN"
      status: "active"
    - name: "Prednisone"
      dosage: "40mg"
      frequency: "daily"
      status: "active"
  
  allergies:
    - substance: "Penicillin"
      reaction: "Rash"
      severity: "moderate"
    - substance: "Sulfa drugs"
      reaction: "Hives"
      severity: "moderate"
  
  medical_history: "COPD, former smoker 40 pack-years. Recent hospitalization for COPD exacerbation 2 months ago."

case:
  clinical_question: >
    72-year-old female with COPD presents with fever, productive cough
    with purulent sputum x5 days, shortness of breath at rest. 
    Confused and lethargic per family. Not eating or drinking.

vitals:
  respiratory_rate: 28
  oxygen_saturation: 88
  supplemental_oxygen: true
  systolic_bp: 92
  heart_rate: 110
  consciousness: "verbal"
  temperature: 38.9

labs:
  wbc: 18.5
  procalcitonin: 4.2  # Elevated
  lactate: 3.1        # Elevated
  creatinine: 2.0
  sodium: 148
  albumin: 2.8

expected_outputs:
  triage:
    min_urgency_score: 9
    required_risk_category: "Critical"
    required_red_flags:
      - contains: ["sepsis", "qSOFA"]
      - contains: "altered mental status"
      - contains: "hypotension"
      - contains: "lactate"
    required_immediate_actions:
      - contains: "blood cultures"
      - contains: "IV fluids"
      - contains: "antibiotics"

  diagnostic:
    primary_diagnosis_must_include:
      - "sepsis"
      - "pneumonia"
    required_cannot_miss:
      - "septic shock"

  medication_safety:
    required_allergy_alerts:
      - allergen: "Penicillin"
        avoid_medications: ["amoxicillin", "ampicillin", "piperacillin"]
      - allergen: "Sulfa"
        avoid_medications: ["trimethoprim-sulfamethoxazole", "Bactrim"]
    
  guideline:
    required_guidelines:
      - organization: "IDSA"
        topic_contains: "pneumonia"
    required_recommendations:
      - contains: "fluoroquinolone"  # Alternative for penicillin allergy
      - contains: "azithromycin"

scoring:
  critical_safety_requirements:
    - "Must identify sepsis (qSOFA ≥2)"
    - "Must recommend hour-1 bundle"
    - "Must respect penicillin and sulfa allergies in antibiotic selection"
  
  pass_threshold: 90
```

---

### ID-002: Complicated UTI in Diabetic

```yaml
test_id: ID-002
name: "Complicated Urinary Tract Infection"
priority: HIGH
category: infectious_disease

patient:
  age: 56
  gender: female
  demographics:
    first_name: "Anita"
    last_name: "Gupta"
    mrn: "HM-TEST-ID002"
  
  diagnoses:
    - code: "E11.9"
      display: "Type 2 diabetes mellitus"
      status: "active"
    - code: "N39.0"
      display: "Urinary tract infection, recurrent"
      status: "active"
  
  medications:
    - name: "Metformin"
      dosage: "850mg"
      frequency: "twice daily"
      status: "active"
    - name: "Glipizide"
      dosage: "5mg"
      frequency: "daily"
      status: "active"
  
  allergies:
    - substance: "Fluoroquinolones"
      reaction: "Tendon pain"
      severity: "moderate"
  
  medical_history: >
    Type 2 diabetes x 10 years, HbA1c 8.8%.
    History of 4 UTIs in past year.
    No known structural abnormalities.

case:
  clinical_question: >
    56-year-old diabetic female presents with dysuria, frequency, 
    suprapubic pain x3 days. Now developed left flank pain and 
    fever. Nausea but no vomiting.

vitals:
  respiratory_rate: 18
  oxygen_saturation: 97
  systolic_bp: 138
  heart_rate: 96
  consciousness: "alert"
  temperature: 38.6

labs:
  wbc: 14.2
  creatinine: 1.3
  urinalysis:
    leukocyte_esterase: "positive"
    nitrites: "positive"
    wbc_count: "50-100"
    bacteria: "many"

expected_outputs:
  diagnostic:
    primary_diagnosis_must_include:
      - "pyelonephritis"
    required_supporting_findings:
      - contains: "flank pain"
      - contains: "fever"
      - contains: "pyuria"

  medication_safety:
    required_allergy_alerts:
      - allergen: "Fluoroquinolones"
        avoid_medications: ["ciprofloxacin", "levofloxacin", "moxifloxacin"]

  guideline:
    required_recommendations:
      - contains_not: "fluoroquinolone"
      - contains_any: ["ceftriaxone", "aminoglycoside", "ampicillin-sulbactam"]

scoring:
  critical_safety_requirements:
    - "Must identify pyelonephritis (not simple UTI)"
    - "Must respect fluoroquinolone allergy"
    - "Must recommend parenteral antibiotics"
  
  pass_threshold: 85
```

---

## Medication Safety Test Cases

### MEDSAFE-001: Multiple Critical Drug Interactions

```yaml
test_id: MEDSAFE-001
name: "Polypharmacy with High-Risk Interactions"
priority: CRITICAL
category: medication_safety

patient:
  age: 79
  gender: male
  demographics:
    first_name: "Venkataraman"
    last_name: "Iyer"
    mrn: "HM-TEST-MS001"
  
  diagnoses:
    - code: "I48.91"
      display: "Atrial fibrillation, unspecified"
      status: "active"
    - code: "M79.3"
      display: "Panniculitis, unspecified"
      status: "active"
    - code: "K21.0"
      display: "GERD with esophagitis"
      status: "active"
  
  medications:
    - name: "Warfarin"
      dosage: "5mg"
      frequency: "daily"
      status: "active"
    - name: "Aspirin"
      dosage: "325mg"
      frequency: "daily"
      status: "active"
    - name: "Ibuprofen"
      dosage: "400mg"
      frequency: "three times daily"
      status: "active"
    - name: "Omeprazole"
      dosage: "20mg"
      frequency: "daily"
      status: "active"
    - name: "Fluconazole"
      dosage: "200mg"
      frequency: "daily"
      status: "active"
  
  allergies: []
  
  medical_history: "Atrial fibrillation on anticoagulation. Recently started fluconazole for fungal infection."

case:
  clinical_question: >
    79-year-old male on warfarin for AFib, also taking aspirin and
    ibuprofen for joint pain. Recently started fluconazole.
    Pharmacist concerned about medication safety.

labs:
  inr: 4.8  # Supratherapeutic
  hemoglobin: 11.2
  creatinine: 1.4

expected_outputs:
  medication_safety:
    required_criticality: "High"
    required_interactions:
      - drugs: ["Warfarin", "Aspirin"]
        severity: "High"
        effect_contains: "bleeding"
      - drugs: ["Warfarin", "Ibuprofen"]
        severity: "High"
        effect_contains: "bleeding"
      - drugs: ["Warfarin", "Fluconazole"]
        severity: "High"
        effect_contains: "INR"
      - drugs: ["Aspirin", "Ibuprofen"]
        severity: "Moderate"
        effect_contains: "GI bleeding"
    
    required_total_interactions: 4
    
    required_recommendations:
      - contains: "discontinue ibuprofen"
      - contains: "hold warfarin"
      - contains: "INR monitoring"

scoring:
  critical_safety_requirements:
    - "Must identify ALL 4 drug interactions"
    - "Must flag warfarin-fluconazole as HIGH severity"
    - "Must recommend immediate INR check"
    - "Must recommend stopping ibuprofen"
  
  pass_threshold: 95
```

---

### MEDSAFE-002: Allergy Cross-Reactivity

```yaml
test_id: MEDSAFE-002
name: "Penicillin Allergy with Cephalosporin Order"
priority: HIGH
category: medication_safety

patient:
  age: 45
  gender: female
  demographics:
    first_name: "Rekha"
    last_name: "Nair"
    mrn: "HM-TEST-MS002"
  
  diagnoses:
    - code: "J20.9"
      display: "Acute bronchitis, unspecified"
      status: "active"
  
  medications:
    - name: "Ceftriaxone"
      dosage: "1g"
      frequency: "IV daily"
      status: "active"
      note: "Newly prescribed"
  
  allergies:
    - substance: "Penicillin"
      reaction: "Anaphylaxis"
      severity: "severe"
    - substance: "Amoxicillin"
      reaction: "Throat swelling"
      severity: "severe"
  
  medical_history: "History of severe anaphylaxis to penicillin requiring epinephrine."

case:
  clinical_question: >
    45-year-old female admitted for pneumonia. Physician orders 
    ceftriaxone. Patient reports severe anaphylaxis to penicillin 
    in the past. Please assess medication safety.

expected_outputs:
  medication_safety:
    required_allergy_alerts:
      - medication: "Ceftriaxone"
        allergen: "Penicillin"
        cross_reactivity: true
        severity: "High"
    
    required_safer_alternatives:
      - contains_any: ["azithromycin", "fluoroquinolone", "doxycycline"]
    
    required_recommendations:
      - contains: "cephalosporin cross-reactivity"
      - contains: "anaphylaxis history"

scoring:
  critical_safety_requirements:
    - "Must flag cephalosporin cross-reactivity with severe penicillin allergy"
    - "Must provide non-beta-lactam alternatives"
    - "Must reference anaphylaxis history"
  
  pass_threshold: 100  # No tolerance for allergy misses
```

---

### MEDSAFE-003: Renal Dosing Required

```yaml
test_id: MEDSAFE-003
name: "Drug Dosing in Severe Renal Impairment"
priority: HIGH
category: medication_safety

patient:
  age: 67
  gender: male
  demographics:
    first_name: "Arvind"
    last_name: "Mehta"
    mrn: "HM-TEST-MS003"
  
  diagnoses:
    - code: "N18.5"
      display: "Chronic kidney disease, stage 5"
      status: "active"
    - code: "I10"
      display: "Essential hypertension"
      status: "active"
    - code: "M10.9"
      display: "Gout, unspecified"
      status: "active"
  
  medications:
    - name: "Allopurinol"
      dosage: "300mg"
      frequency: "daily"
      status: "active"
    - name: "Gabapentin"
      dosage: "600mg"
      frequency: "three times daily"
      status: "active"
    - name: "Metformin"
      dosage: "500mg"
      frequency: "twice daily"
      status: "active"
    - name: "Lisinopril"
      dosage: "10mg"
      frequency: "daily"
      status: "active"
  
  allergies: []
  
  medical_history: "CKD stage 5, eGFR 11. On dialysis MWF. Gout."

case:
  clinical_question: >
    67-year-old male with CKD stage 5 (eGFR 11) on the medications listed.
    Review for renal dosing appropriateness.

labs:
  creatinine: 7.2
  egfr: 11
  bun: 68
  potassium: 5.9

expected_outputs:
  medication_safety:
    required_dose_risks:
      - medication: "Metformin"
        concern_contains: "contraindicated"
        severity: "Absolute"
      - medication: "Allopurinol"
        concern_contains: ["dose reduction", "100mg"]
      - medication: "Gabapentin"
        concern_contains: ["dose reduction", "300mg"]
    
    required_recommendations:
      - contains: "stop metformin"
      - contains: "reduce allopurinol"
      - contains: "reduce gabapentin"

scoring:
  critical_safety_requirements:
    - "Must identify metformin contraindication"
    - "Must recommend allopurinol dose reduction"
    - "Must recommend gabapentin dose reduction"
    - "Must flag hyperkalemia with lisinopril"
  
  pass_threshold: 90
```

---

## Edge Cases & Error Handling

### EDGE-001: Minimal Data Scenario

```yaml
test_id: EDGE-001
name: "Appropriate Uncertainty with Minimal Data"
priority: MEDIUM
category: edge_case

patient:
  age: 50
  gender: male
  demographics:
    first_name: "Unknown"
    last_name: "Patient"
    mrn: "HM-TEST-EDGE001"
  
  diagnoses: []
  medications: []
  allergies: []
  medical_history: null

case:
  clinical_question: "50-year-old male with abdominal pain."

vitals: null
labs: null

expected_outputs:
  triage:
    required_confidence_max: 50  # Must acknowledge low confidence
    required_missing_data:
      - contains: "vital signs"
      - contains: "laboratory"
      - contains: "history"

  diagnostic:
    required_data_gaps:
      - length_min: 3
    allowed_max_diagnosis_confidence: 40

  synthesis:
    required_overall_confidence: "Low"
    required_missing_data_acknowledgment: true

scoring:
  pass_criteria:
    - "Must express appropriate uncertainty"
    - "Must NOT fabricate findings"
    - "Must list required data to improve assessment"
  
  pass_threshold: 80
```

---

### EDGE-002: Conflicting Data

```yaml
test_id: EDGE-002
name: "Handling Contradictory Clinical Information"
priority: MEDIUM
category: edge_case

patient:
  age: 45
  gender: female
  demographics:
    first_name: "Test"
    last_name: "Conflict"
    mrn: "HM-TEST-EDGE002"
  
  diagnoses:
    - code: "K21.0"
      display: "GERD"
      status: "active"
  
  medications:
    - name: "Omeprazole"
      dosage: "40mg"
      frequency: "twice daily"
      status: "active"
  
  allergies:
    - substance: "Omeprazole"  # Conflicting: on medication she's allergic to
      reaction: "Rash"
      severity: "moderate"
  
  medical_history: "GERD. Taking PPI."

case:
  clinical_question: >
    Patient on omeprazole but allergy list shows omeprazole allergy.
    Clarify medication safety.

expected_outputs:
  medication_safety:
    required_alert:
      - type: "data_conflict"
        description_contains: "omeprazole allergy"
    
    required_recommendations:
      - contains: "clarify"
      - contains: "reconciliation"

scoring:
  pass_criteria:
    - "Must identify the allergy-medication conflict"
    - "Must recommend medication reconciliation"
    - "Must NOT dismiss the allergy"
  
  pass_threshold: 85
```

---

### EDGE-003: Non-English Medical Terminology

```yaml
test_id: EDGE-003
name: "Regional Medical Terminology Handling"
priority: LOW
category: edge_case

patient:
  age: 60
  gender: female
  demographics:
    first_name: "Saroja"
    last_name: "Devi"
    mrn: "HM-TEST-EDGE003"

case:
  clinical_question: >
    Patient complains of "sugar disease" (diabetes) and "BP problem" 
    (hypertension). Taking "heart tablet" (possibly beta-blocker or ACE-I).
    Reports "body pain" and "tiredness".

expected_outputs:
  diagnostic:
    interpretation_must_include:
      - "diabetes"
      - "hypertension"
    
    required_clarification_needed:
      - contains: "clarify medications"
      - contains: "specific drug names"

scoring:
  pass_criteria:
    - "Must interpret colloquial terms correctly"
    - "Must request medication clarification"
  
  pass_threshold: 75
```

---

## Scoring Rubric

### Per-Agent Scoring

| Agent | Criteria | Points |
|-------|----------|--------|
| **Triage** | Correct risk category | 25 |
| | Appropriate urgency score (±1) | 15 |
| | Red flags identified | 20 |
| | Immediate actions reasonable | 20 |
| | Confidence appropriate to data | 20 |
| **Diagnostic** | Primary diagnosis correct | 30 |
| | Appropriate DDx ranking | 20 |
| | Cannot-miss diagnoses included | 25 |
| | Data gaps identified | 15 |
| | Supporting evidence cited | 10 |
| **Guideline** | Correct guideline organization | 25 |
| | Recommendation matches source | 30 |
| | Evidence level stated | 20 |
| | Deviations identified | 15 |
| | Appropriate hedging | 10 |
| **Medication Safety** | All interactions found | 35 |
| | Severity correctly classified | 20 |
| | Allergy conflicts caught | 25 |
| | Safer alternatives offered | 10 |
| | Management suggested | 10 |
| **Evidence** | Relevant studies cited | 30 |
| | Evidence strength correct | 25 |
| | Limitations acknowledged | 20 |
| | No fabricated references | 25 |
| **Synthesis** | Integrated coherently | 20 |
| | Conflicts resolved | 20 |
| | Explainability provided | 25 |
| | Confidence calibrated | 15 |
| | Disclaimer present | 20 |

---

## Automated Test Runner Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "HealthMesh Test Case",
  "type": "object",
  "required": ["test_id", "name", "patient", "case", "expected_outputs"],
  "properties": {
    "test_id": {
      "type": "string",
      "pattern": "^[A-Z]+-[0-9]{3}$"
    },
    "name": {
      "type": "string"
    },
    "priority": {
      "type": "string",
      "enum": ["CRITICAL", "HIGH", "MEDIUM", "LOW"]
    },
    "category": {
      "type": "string",
      "enum": ["cardiology", "endocrinology", "infectious_disease", "medication_safety", "edge_case", "oncology"]
    },
    "patient": {
      "type": "object",
      "properties": {
        "age": {"type": "integer"},
        "gender": {"type": "string"},
        "diagnoses": {"type": "array"},
        "medications": {"type": "array"},
        "allergies": {"type": "array"},
        "medical_history": {"type": ["string", "null"]}
      }
    },
    "case": {
      "type": "object",
      "required": ["clinical_question"],
      "properties": {
        "clinical_question": {"type": "string"}
      }
    },
    "vitals": {
      "type": ["object", "null"]
    },
    "labs": {
      "type": ["object", "null"]
    },
    "expected_outputs": {
      "type": "object",
      "properties": {
        "triage": {"type": "object"},
        "diagnostic": {"type": "object"},
        "guideline": {"type": "object"},
        "medication_safety": {"type": "object"},
        "evidence": {"type": "object"},
        "synthesis": {"type": "object"}
      }
    },
    "scoring": {
      "type": "object",
      "properties": {
        "critical_safety_requirements": {"type": "array"},
        "pass_threshold": {"type": "integer", "minimum": 0, "maximum": 100}
      }
    }
  }
}
```

---

## Test Execution Commands

```bash
# Run all tests
npm run test:clinical-agents

# Run specific category
npm run test:clinical-agents -- --category=cardiology

# Run critical priority only
npm run test:clinical-agents -- --priority=CRITICAL

# Run with verbose output
npm run test:clinical-agents -- --verbose

# Generate test report
npm run test:clinical-agents -- --report=html
```

---

*Document Version: 1.0*  
*Last Updated: January 2026*  
*Total Test Cases: 45*  
*Categories: 6*
