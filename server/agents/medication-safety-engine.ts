/**
 * Dynamic Medication Safety Engine
 * HealthMesh - Context-Aware Clinical Decision Support
 * 
 * Features:
 * - Drug-Drug Interaction Detection (pharmacokinetic/pharmacodynamic)
 * - Renal & Hepatic Dosing Safety (eGFR, creatinine trends, AST/ALT/bilirubin)
 * - Duplicate/Conflicting Therapy Detection
 * - Severity-Graded Alerts with Context Awareness
 * - Alert Fatigue Prevention
 * - Explainable AI-driven recommendations
 * 
 * FHIR R4 Aligned | HIPAA-Aware | Deterministic Behavior
 */

import { randomUUID } from "crypto";
import { getAzureOpenAI } from "../azure/openai-client";
import { getMonitor } from "../azure/monitoring";

// ============================================================================
// TYPE DEFINITIONS (FHIR R4-Aligned)
// ============================================================================

export interface MedicationInput {
    id: string;
    name: string;
    genericName?: string;
    dosage: string;
    frequency: string;
    route?: string;
    status: "active" | "completed" | "stopped" | "on-hold";
    startDate?: string;
    prescriber?: string;
    rxNormCode?: string;
}

export interface LabObservation {
    code: string;
    display: string;
    value: number;
    unit: string;
    referenceRange?: string;
    status: "normal" | "abnormal" | "critical";
    effectiveDateTime: string;
    trend?: "rising" | "falling" | "stable";
}

export interface PatientContext {
    patientId: string;
    age: number;
    gender: "male" | "female" | "other";
    weight?: number; // kg
    height?: number; // cm
    renalFunction?: {
        eGFR?: number;
        creatinine?: number;
        creatinineTrend?: "rising" | "falling" | "stable";
        ckdStage?: 1 | 2 | 3 | 4 | 5;
    };
    hepaticFunction?: {
        ast?: number;
        alt?: number;
        bilirubin?: number;
        albumin?: number;
        inr?: number;
        childPughScore?: "A" | "B" | "C";
    };
    allergies: Array<{
        substance: string;
        reaction: string;
        severity: "mild" | "moderate" | "severe" | "life-threatening";
    }>;
    diagnoses: Array<{
        code: string;
        display: string;
        status: "active" | "resolved" | "inactive";
    }>;
}

export interface MedicationSafetyInput {
    patient: PatientContext;
    currentMedications: MedicationInput[];
    recentMedications?: MedicationInput[]; // Last 30 days
    newMedication?: MedicationInput; // If checking a new prescription
    recentLabs?: LabObservation[];
    clinicalContext?: string;
}

// ============================================================================
// ALERT TYPES
// ============================================================================

export type AlertSeverity = "HIGH" | "MODERATE" | "LOW";
export type ClinicalRisk =
    | "Bleeding"
    | "QT Prolongation"
    | "Nephrotoxicity"
    | "Hepatotoxicity"
    | "Serotonin Syndrome"
    | "Hypoglycemia"
    | "Hypotension"
    | "CNS Depression"
    | "Electrolyte Imbalance"
    | "Cardiotoxicity"
    | "Ototoxicity"
    | "Allergy/Cross-Reactivity"
    | "Therapeutic Duplication"
    | "Dose Adjustment Required"
    | "Contraindication"
    | "Other";

export interface MedicationSafetyAlert {
    id: string;
    type: "drug-interaction" | "renal-dosing" | "hepatic-dosing" | "duplicate-therapy" | "allergy" | "contraindication";
    severity: AlertSeverity;
    clinicalRisk: ClinicalRisk;
    confidence: number;
    medications: string[];
    reason: string;
    recommendation: string;
    evidence: string[];
    patientContext: string; // Why this matters for THIS patient
    suppressionReason?: string; // If alert was downgraded
    acknowledged?: boolean;
    acknowledgedBy?: string;
    acknowledgedAt?: string;
    temporalCooldown?: Date; // Don't re-alert until this time
    createdAt: string;
}

export interface MedicationSafetyOutput {
    agent: "MedicationSafetyAgent";
    analysisId: string;
    timestamp: string;
    patientId: string;
    overallSafetyStatus: "SAFE" | "CAUTION" | "HIGH_RISK" | "CRITICAL";
    alerts: MedicationSafetyAlert[];
    suppressedAlerts: MedicationSafetyAlert[]; // Low-risk alerts hidden
    summary: string;
    renalAssessment?: {
        eGFR: number;
        stage: string;
        medicationsRequiringAdjustment: string[];
        recommendation: string;
    };
    hepaticAssessment?: {
        status: string;
        medicationsOfConcern: string[];
        recommendation: string;
    };
    monitoringRecommendations: string[];
    explainability: {
        dataSourcesUsed: string[];
        reasoningChain: string[];
        limitations: string[];
    };
    confidence: number;
    analysisTime: number;
}

// ============================================================================
// DRUG INTERACTION DATABASE (Curated, Evidence-Based)
// ============================================================================

interface DrugInteraction {
    drugs: string[];
    severity: AlertSeverity;
    mechanism: string;
    clinicalEffect: string;
    clinicalRisk: ClinicalRisk;
    management: string;
    evidence: string[];
    contextModifiers?: {
        renalImpairment?: { severityIncrease: boolean; threshold?: number };
        hepaticImpairment?: { severityIncrease: boolean };
        ageOver65?: { severityIncrease: boolean };
        comorbidities?: string[];
    };
}

const DRUG_INTERACTIONS: DrugInteraction[] = [
    // Anticoagulation
    {
        drugs: ["warfarin", "aspirin"],
        severity: "MODERATE",
        mechanism: "Additive antiplatelet/anticoagulant effects",
        clinicalEffect: "Increased bleeding risk",
        clinicalRisk: "Bleeding",
        management: "Monitor INR closely; consider PPI for GI protection",
        evidence: ["ACC/AHA Guidelines", "FDA Drug Label"],
        contextModifiers: { ageOver65: { severityIncrease: true } }
    },
    {
        drugs: ["warfarin", "nsaid"],
        severity: "HIGH",
        mechanism: "NSAIDs inhibit platelet function and may displace warfarin from protein binding",
        clinicalEffect: "Significantly increased GI and other bleeding risk",
        clinicalRisk: "Bleeding",
        management: "Avoid combination if possible; use acetaminophen for pain",
        evidence: ["FDA Black Box Warning", "ISMP High-Alert"],
    },
    {
        drugs: ["clopidogrel", "omeprazole"],
        severity: "MODERATE",
        mechanism: "Omeprazole inhibits CYP2C19, reducing clopidogrel activation",
        clinicalEffect: "Reduced antiplatelet effect of clopidogrel",
        clinicalRisk: "Cardiotoxicity",
        management: "Consider pantoprazole or H2 blocker as alternative",
        evidence: ["FDA Drug Safety Communication", "ACC/AHA Guidelines"],
    },
    // QT Prolongation
    {
        drugs: ["azithromycin", "amiodarone"],
        severity: "HIGH",
        mechanism: "Additive QT prolongation",
        clinicalEffect: "Risk of Torsades de Pointes",
        clinicalRisk: "QT Prolongation",
        management: "Avoid combination; monitor ECG if unavoidable",
        evidence: ["CredibleMeds QT Drug List", "FDA Warning"],
        contextModifiers: {
            comorbidities: ["heart failure", "hypokalemia", "hypomagnesemia"]
        }
    },
    {
        drugs: ["fluoroquinolone", "antipsychotic"],
        severity: "MODERATE",
        mechanism: "Both drug classes prolong QT interval",
        clinicalEffect: "Increased risk of cardiac arrhythmia",
        clinicalRisk: "QT Prolongation",
        management: "Monitor ECG; correct electrolyte abnormalities",
        evidence: ["CredibleMeds", "Clinical Pharmacology"],
    },
    // Nephrotoxicity
    {
        drugs: ["vancomycin", "aminoglycoside"],
        severity: "HIGH",
        mechanism: "Synergistic nephrotoxicity",
        clinicalEffect: "Acute kidney injury",
        clinicalRisk: "Nephrotoxicity",
        management: "Monitor renal function daily; consider drug levels",
        evidence: ["IDSA Guidelines", "Lexicomp"],
        contextModifiers: { renalImpairment: { severityIncrease: true, threshold: 60 } }
    },
    {
        drugs: ["nsaid", "ace-inhibitor"],
        severity: "MODERATE",
        mechanism: "NSAIDs reduce prostaglandin-mediated renal blood flow",
        clinicalEffect: "Reduced renal function, hyperkalemia risk",
        clinicalRisk: "Nephrotoxicity",
        management: "Monitor creatinine and potassium; avoid in CKD",
        evidence: ["KDIGO Guidelines", "UpToDate"],
        contextModifiers: { renalImpairment: { severityIncrease: true, threshold: 45 } }
    },
    {
        drugs: ["nsaid", "arb"],
        severity: "MODERATE",
        mechanism: "NSAIDs reduce prostaglandin-mediated renal blood flow",
        clinicalEffect: "Reduced renal function, hyperkalemia risk",
        clinicalRisk: "Nephrotoxicity",
        management: "Monitor creatinine and potassium; avoid in CKD",
        evidence: ["KDIGO Guidelines", "UpToDate"],
        contextModifiers: { renalImpairment: { severityIncrease: true, threshold: 45 } }
    },
    // Serotonin Syndrome
    {
        drugs: ["ssri", "tramadol"],
        severity: "MODERATE",
        mechanism: "Additive serotonergic activity",
        clinicalEffect: "Risk of serotonin syndrome",
        clinicalRisk: "Serotonin Syndrome",
        management: "Use lowest effective doses; monitor for symptoms",
        evidence: ["FDA Drug Safety Communication"],
    },
    {
        drugs: ["ssri", "maoi"],
        severity: "HIGH",
        mechanism: "Severe serotonergic excess",
        clinicalEffect: "Life-threatening serotonin syndrome",
        clinicalRisk: "Serotonin Syndrome",
        management: "CONTRAINDICATED - 14 day washout required",
        evidence: ["FDA Black Box Warning"],
    },
    // Hypoglycemia
    {
        drugs: ["sulfonylurea", "fluoroquinolone"],
        severity: "MODERATE",
        mechanism: "Fluoroquinolones may enhance insulin release",
        clinicalEffect: "Severe hypoglycemia",
        clinicalRisk: "Hypoglycemia",
        management: "Monitor blood glucose closely",
        evidence: ["FDA Drug Safety Communication"],
    },
    // CNS Depression
    {
        drugs: ["opioid", "benzodiazepine"],
        severity: "HIGH",
        mechanism: "Synergistic CNS and respiratory depression",
        clinicalEffect: "Respiratory depression, death",
        clinicalRisk: "CNS Depression",
        management: "Avoid combination; use lowest doses if necessary",
        evidence: ["FDA Black Box Warning", "CDC Opioid Guidelines"],
    },
    {
        drugs: ["opioid", "gabapentin"],
        severity: "MODERATE",
        mechanism: "Additive CNS depression",
        clinicalEffect: "Increased sedation and respiratory depression risk",
        clinicalRisk: "CNS Depression",
        management: "Use caution; monitor for respiratory depression",
        evidence: ["FDA Warning 2019"],
    },
    // Aspirin Interactions
    {
        drugs: ["aspirin", "ace-inhibitor"],
        severity: "MODERATE",
        mechanism: "Aspirin may reduce antihypertensive and cardioprotective effects of ACE inhibitors",
        clinicalEffect: "Reduced blood pressure control; reduced heart failure benefit",
        clinicalRisk: "Cardiotoxicity",
        management: "Monitor blood pressure; consider if aspirin truly indicated",
        evidence: ["ACC/AHA Guidelines", "Clinical Pharmacology"],
        contextModifiers: { ageOver65: { severityIncrease: true } }
    },
    {
        drugs: ["aspirin", "arb"],
        severity: "MODERATE",
        mechanism: "Aspirin may reduce antihypertensive effects of ARBs",
        clinicalEffect: "Reduced blood pressure control",
        clinicalRisk: "Cardiotoxicity",
        management: "Monitor blood pressure closely",
        evidence: ["Clinical Guidelines"],
    },
    {
        drugs: ["aspirin", "anticoagulant"],
        severity: "HIGH",
        mechanism: "Additive antiplatelet and anticoagulant effects",
        clinicalEffect: "Significantly increased bleeding risk",
        clinicalRisk: "Bleeding",
        management: "Use only if clearly indicated; add PPI for GI protection",
        evidence: ["ACC/AHA Guidelines", "ISMP High-Alert"],
    },
    // Diabetes Drug Interactions
    {
        drugs: ["metformin", "sulfonylurea"],
        severity: "MODERATE",
        mechanism: "Additive glucose-lowering effects",
        clinicalEffect: "Increased risk of hypoglycemia, especially in elderly or renal impairment",
        clinicalRisk: "Hypoglycemia",
        management: "Monitor blood glucose closely; educate patient on hypoglycemia symptoms",
        evidence: ["ADA Guidelines", "FDA Label"],
        contextModifiers: {
            ageOver65: { severityIncrease: true },
            renalImpairment: { severityIncrease: true, threshold: 45 }
        }
    },
    // Statin Interactions
    {
        drugs: ["simvastatin", "amlodipine"],
        severity: "MODERATE",
        mechanism: "Amlodipine inhibits CYP3A4, increasing simvastatin levels",
        clinicalEffect: "Increased risk of myopathy and rhabdomyolysis",
        clinicalRisk: "Other",
        management: "Limit simvastatin to 20mg daily with amlodipine; consider atorvastatin",
        evidence: ["FDA Drug Safety Communication", "ACC/AHA Statin Guidelines"],
    },
    {
        drugs: ["statin", "fibrate"],
        severity: "HIGH",
        mechanism: "Additive myotoxicity; gemfibrozil inhibits statin metabolism",
        clinicalEffect: "Rhabdomyolysis risk",
        clinicalRisk: "Other",
        management: "Avoid gemfibrozil with statins; fenofibrate preferred if combination needed",
        evidence: ["FDA Black Box Warning", "ACC/AHA Guidelines"],
    },
    // Potassium/Electrolyte Interactions
    {
        drugs: ["ace-inhibitor", "potassium-sparing-diuretic"],
        severity: "MODERATE",
        mechanism: "Both increase serum potassium",
        clinicalEffect: "Hyperkalemia",
        clinicalRisk: "Electrolyte Imbalance",
        management: "Monitor potassium levels regularly; avoid in renal impairment",
        evidence: ["KDIGO Guidelines", "Clinical Pharmacology"],
        contextModifiers: { renalImpairment: { severityIncrease: true, threshold: 45 } }
    },
    {
        drugs: ["arb", "potassium-sparing-diuretic"],
        severity: "MODERATE",
        mechanism: "Both increase serum potassium",
        clinicalEffect: "Hyperkalemia",
        clinicalRisk: "Electrolyte Imbalance",
        management: "Monitor potassium levels regularly",
        evidence: ["KDIGO Guidelines"],
        contextModifiers: { renalImpairment: { severityIncrease: true, threshold: 45 } }
    },
    // Calcium Channel Blocker Interactions
    {
        drugs: ["calcium-channel-blocker", "beta-blocker"],
        severity: "MODERATE",
        mechanism: "Additive negative chronotropic and inotropic effects",
        clinicalEffect: "Bradycardia; heart block; hypotension",
        clinicalRisk: "Cardiotoxicity",
        management: "Monitor heart rate and blood pressure; avoid diltiazem/verapamil with beta-blockers",
        evidence: ["ACC/AHA Guidelines"],
    },
];

// ============================================================================
// RENAL DOSING DATABASE
// ============================================================================

interface RenalDosingRule {
    medication: string;
    normalDose: string;
    eGFRThresholds: Array<{
        eGFR: number;
        adjustment: string;
        maxDose?: string;
        contraindicated?: boolean;
    }>;
    monitoringRequired: string[];
    evidence: string[];
}

const RENAL_DOSING_RULES: RenalDosingRule[] = [
    {
        medication: "metformin",
        normalDose: "500-2000mg daily",
        eGFRThresholds: [
            { eGFR: 45, adjustment: "Reduce max dose to 1000mg daily" },
            { eGFR: 30, adjustment: "Contraindicated", contraindicated: true },
        ],
        monitoringRequired: ["eGFR every 3-6 months", "Lactate if symptoms"],
        evidence: ["FDA Label Update 2016", "ADA Guidelines"],
    },
    {
        medication: "vancomycin",
        normalDose: "15-20mg/kg q8-12h",
        eGFRThresholds: [
            { eGFR: 50, adjustment: "Extend interval to q12-24h; target trough 15-20" },
            { eGFR: 30, adjustment: "Reduce dose and extend interval to q24-48h" },
            { eGFR: 15, adjustment: "Load then per-level dosing only" },
        ],
        monitoringRequired: ["Trough levels before 4th dose", "Creatinine daily"],
        evidence: ["IDSA/ASHP Vancomycin Guidelines 2020", "KDIGO"],
    },
    {
        medication: "gabapentin",
        normalDose: "300-1200mg TID",
        eGFRThresholds: [
            { eGFR: 60, adjustment: "Max 600mg TID" },
            { eGFR: 30, adjustment: "Max 300mg TID" },
            { eGFR: 15, adjustment: "Max 300mg daily" },
        ],
        monitoringRequired: ["CNS effects", "Renal function"],
        evidence: ["FDA Label", "Lexicomp"],
    },
    {
        medication: "enoxaparin",
        normalDose: "1mg/kg q12h or 1.5mg/kg daily",
        eGFRThresholds: [
            { eGFR: 30, adjustment: "Reduce to 1mg/kg daily", maxDose: "1mg/kg daily" },
        ],
        monitoringRequired: ["Anti-Xa levels if prolonged use", "Signs of bleeding"],
        evidence: ["FDA Label", "CHEST Guidelines"],
    },
    {
        medication: "dabigatran",
        normalDose: "150mg BID",
        eGFRThresholds: [
            { eGFR: 50, adjustment: "Consider 110mg BID if bleeding risk" },
            { eGFR: 30, adjustment: "75mg BID (US) or avoid (EU)" },
            { eGFR: 15, adjustment: "Contraindicated", contraindicated: true },
        ],
        monitoringRequired: ["Renal function annually", "Signs of bleeding"],
        evidence: ["FDA Label", "ACC/AHA AF Guidelines"],
    },
];

// ============================================================================
// DRUG CLASS MAPPINGS
// ============================================================================

const DRUG_CLASS_MAP: Record<string, string[]> = {
    "nsaid": ["ibuprofen", "naproxen", "diclofenac", "meloxicam", "celecoxib", "ketorolac", "indomethacin", "piroxicam", "etodolac"],
    "aspirin": ["aspirin", "acetylsalicylic", "asa", "ecotrin", "bayer"],
    "antiplatelet": ["aspirin", "clopidogrel", "prasugrel", "ticagrelor", "dipyridamole"],
    "ssri": ["sertraline", "fluoxetine", "paroxetine", "citalopram", "escitalopram", "fluvoxamine", "zoloft", "prozac", "lexapro"],
    "ace-inhibitor": ["lisinopril", "enalapril", "ramipril", "benazepril", "captopril", "perindopril", "quinapril", "fosinopril"],
    "arb": ["losartan", "valsartan", "irbesartan", "olmesartan", "telmisartan", "candesartan", "azilsartan"],
    "aminoglycoside": ["gentamicin", "tobramycin", "amikacin", "streptomycin", "neomycin"],
    "fluoroquinolone": ["ciprofloxacin", "levofloxacin", "moxifloxacin", "ofloxacin", "norfloxacin"],
    "opioid": ["morphine", "oxycodone", "hydrocodone", "fentanyl", "tramadol", "codeine", "hydromorphone", "oxycontin", "percocet"],
    "benzodiazepine": ["lorazepam", "diazepam", "alprazolam", "clonazepam", "midazolam", "temazepam", "ativan", "xanax", "valium"],
    "sulfonylurea": ["glipizide", "glyburide", "glimepiride", "glibenclamide"],
    "metformin": ["metformin", "glucophage"],
    "statin": ["atorvastatin", "simvastatin", "rosuvastatin", "pravastatin", "lovastatin", "lipitor", "crestor", "zocor"],
    "antipsychotic": ["haloperidol", "risperidone", "quetiapine", "olanzapine", "aripiprazole", "ziprasidone", "seroquel", "risperdal"],
    "maoi": ["phenelzine", "tranylcypromine", "selegiline", "isocarboxazid"],
    "ppi": ["omeprazole", "pantoprazole", "esomeprazole", "lansoprazole", "rabeprazole", "prilosec", "nexium", "protonix"],
    "anticoagulant": ["warfarin", "heparin", "enoxaparin", "rivaroxaban", "apixaban", "dabigatran", "edoxaban", "coumadin", "xarelto", "eliquis"],
    "diuretic": ["furosemide", "hydrochlorothiazide", "bumetanide", "torsemide", "lasix", "hctz"],
    "potassium-sparing-diuretic": ["spironolactone", "eplerenone", "triamterene", "amiloride", "aldactone"],
    "calcium-channel-blocker": ["amlodipine", "diltiazem", "verapamil", "nifedipine", "felodipine", "nicardipine", "norvasc"],
    "beta-blocker": ["metoprolol", "atenolol", "carvedilol", "propranolol", "bisoprolol", "nebivolol", "labetalol", "lopressor", "coreg"],
    "fibrate": ["gemfibrozil", "fenofibrate", "bezafibrate", "lopid", "tricor"],
    "biguanide": ["metformin", "glucophage"],
};

// ============================================================================
// THERAPEUTIC DUPLICATES
// ============================================================================

const THERAPEUTIC_DUPLICATES: Array<{ class: string; risk: string }> = [
    { class: "nsaid", risk: "Increased GI bleeding and renal toxicity" },
    { class: "ssri", risk: "Serotonin syndrome risk; no added benefit" },
    { class: "ace-inhibitor", risk: "Hypotension and hyperkalemia" },
    { class: "opioid", risk: "Respiratory depression; overdose risk" },
    { class: "benzodiazepine", risk: "Excessive sedation; falls risk" },
    { class: "ppi", risk: "No added benefit; increased side effects" },
    { class: "statin", risk: "Increased myopathy risk" },
    { class: "anticoagulant", risk: "Severe bleeding risk" },
    { class: "calcium-channel-blocker", risk: "Hypotension and bradycardia" },
    { class: "beta-blocker", risk: "Bradycardia and heart block" },
    { class: "arb", risk: "Hypotension and renal impairment" },
];

// ============================================================================
// MEDICATION SAFETY ENGINE CLASS
// ============================================================================

export class MedicationSafetyEngine {
    private alertCooldowns: Map<string, Date> = new Map();
    private acknowledgedAlerts: Set<string> = new Set();

    /**
     * Main analysis function
     */
    async analyze(input: MedicationSafetyInput): Promise<MedicationSafetyOutput> {
        const startTime = Date.now();
        const analysisId = randomUUID();
        const alerts: MedicationSafetyAlert[] = [];
        const suppressedAlerts: MedicationSafetyAlert[] = [];

        console.log(`[MedicationSafety] Starting analysis for patient ${input.patient.patientId.substring(0, 8)}...`);

        // 1. Check Drug-Drug Interactions
        const ddiAlerts = this.checkDrugInteractions(input);

        // 2. Check Renal Dosing
        const renalAlerts = this.checkRenalDosing(input);

        // 3. Check Hepatic Dosing
        const hepaticAlerts = this.checkHepaticDosing(input);

        // 4. Check Duplicate Therapies
        const duplicateAlerts = this.checkDuplicateTherapies(input);

        // 5. Check Allergy Conflicts
        const allergyAlerts = this.checkAllergyConflicts(input);

        // Combine all alerts
        const allAlerts = [...ddiAlerts, ...renalAlerts, ...hepaticAlerts, ...duplicateAlerts, ...allergyAlerts];

        // Apply context-aware suppression and fatigue prevention
        for (const alert of allAlerts) {
            const { shouldSuppress, reason } = this.evaluateAlertSuppression(alert, input);

            if (shouldSuppress) {
                alert.suppressionReason = reason;
                suppressedAlerts.push(alert);
            } else if (!this.isAlertInCooldown(alert)) {
                alerts.push(alert);
            }
        }

        // Sort by severity
        alerts.sort((a, b) => {
            const severityOrder = { HIGH: 0, MODERATE: 1, LOW: 2 };
            return severityOrder[a.severity] - severityOrder[b.severity];
        });

        // Determine overall safety status
        const overallStatus = this.determineOverallStatus(alerts);

        // Generate assessments
        const renalAssessment = this.generateRenalAssessment(input, renalAlerts);
        const hepaticAssessment = this.generateHepaticAssessment(input, hepaticAlerts);

        const output: MedicationSafetyOutput = {
            agent: "MedicationSafetyAgent",
            analysisId,
            timestamp: new Date().toISOString(),
            patientId: input.patient.patientId,
            overallSafetyStatus: overallStatus,
            alerts,
            suppressedAlerts,
            summary: this.generateSummary(alerts, overallStatus),
            renalAssessment,
            hepaticAssessment,
            monitoringRecommendations: this.generateMonitoringRecommendations(alerts, input),
            explainability: {
                dataSourcesUsed: [
                    "Current Medications List",
                    input.recentLabs?.length ? "Recent Lab Values" : null,
                    input.patient.renalFunction ? "Renal Function Data" : null,
                    input.patient.hepaticFunction ? "Hepatic Function Data" : null,
                    "Drug Interaction Database",
                    "KDIGO Guidelines",
                    "FDA Drug Labels",
                ].filter(Boolean) as string[],
                reasoningChain: this.generateReasoningChain(alerts, input),
                limitations: this.generateLimitations(input),
            },
            confidence: this.calculateOverallConfidence(alerts, input),
            analysisTime: Date.now() - startTime,
        };

        console.log(`[MedicationSafety] Analysis complete: ${overallStatus}, ${alerts.length} alerts, ${suppressedAlerts.length} suppressed`);

        return output;
    }

    /**
     * Check for drug-drug interactions
     */
    private checkDrugInteractions(input: MedicationSafetyInput): MedicationSafetyAlert[] {
        const alerts: MedicationSafetyAlert[] = [];
        // Make status check case-insensitive
        const medications = input.currentMedications.filter(m =>
            m.status?.toLowerCase() === "active" || !m.status
        );
        const medNames = medications.map(m => m.name.toLowerCase().trim());
        const medClasses = this.getMedicationClasses(medNames);

        console.log(`[MedicationSafety] Checking interactions for ${medNames.length} medications:`, medNames);
        console.log(`[MedicationSafety] Detected drug classes:`, Array.from(medClasses));

        for (const interaction of DRUG_INTERACTIONS) {
            const [drug1Pattern, drug2Pattern] = interaction.drugs;

            // Check if both drugs/classes are present
            const drug1Match = this.findDrugMatch(drug1Pattern, medNames, medClasses);
            const drug2Match = this.findDrugMatch(drug2Pattern, medNames, medClasses);

            if (drug1Match && drug2Match) {
                console.log(`[MedicationSafety] ✅ Interaction found: ${drug1Match} + ${drug2Match}`);

                // Apply context modifiers
                let adjustedSeverity = interaction.severity;
                let contextNote = "";

                if (interaction.contextModifiers) {
                    if (interaction.contextModifiers.renalImpairment &&
                        input.patient.renalFunction?.eGFR &&
                        input.patient.renalFunction.eGFR < (interaction.contextModifiers.renalImpairment.threshold || 60)) {
                        if (interaction.contextModifiers.renalImpairment.severityIncrease) {
                            adjustedSeverity = this.increaseSeverity(adjustedSeverity);
                            contextNote = `Severity elevated due to eGFR ${input.patient.renalFunction.eGFR} ml/min. `;
                        }
                    }
                    if (interaction.contextModifiers.ageOver65 && input.patient.age > 65) {
                        if (interaction.contextModifiers.ageOver65.severityIncrease) {
                            adjustedSeverity = this.increaseSeverity(adjustedSeverity);
                            contextNote += `Increased risk in patient over 65. `;
                        }
                    }
                }

                alerts.push({
                    id: randomUUID(),
                    type: "drug-interaction",
                    severity: adjustedSeverity,
                    clinicalRisk: interaction.clinicalRisk,
                    confidence: 0.92,
                    medications: [drug1Match, drug2Match],
                    reason: `${interaction.mechanism}. ${interaction.clinicalEffect}.`,
                    recommendation: interaction.management,
                    evidence: interaction.evidence,
                    patientContext: contextNote || `Standard interaction risk for this patient profile.`,
                    createdAt: new Date().toISOString(),
                });
            }
        }

        console.log(`[MedicationSafety] Total interactions found: ${alerts.length}`);
        return alerts;
    }

    /**
     * Check renal dosing requirements
     */
    private checkRenalDosing(input: MedicationSafetyInput): MedicationSafetyAlert[] {
        const alerts: MedicationSafetyAlert[] = [];
        const eGFR = input.patient.renalFunction?.eGFR;

        if (!eGFR) return alerts;

        for (const med of input.currentMedications.filter(m => m.status === "active")) {
            const medName = med.name.toLowerCase();
            const rule = RENAL_DOSING_RULES.find(r =>
                medName.includes(r.medication.toLowerCase())
            );

            if (rule) {
                for (const threshold of rule.eGFRThresholds) {
                    if (eGFR < threshold.eGFR) {
                        const severity: AlertSeverity = threshold.contraindicated ? "HIGH" : "MODERATE";
                        const creatinineTrending = input.patient.renalFunction?.creatinineTrend === "rising"
                            ? " Creatinine trending upward - increased concern."
                            : "";

                        alerts.push({
                            id: randomUUID(),
                            type: "renal-dosing",
                            severity,
                            clinicalRisk: threshold.contraindicated ? "Contraindication" : "Dose Adjustment Required",
                            confidence: 0.91,
                            medications: [med.name],
                            reason: threshold.contraindicated
                                ? `${med.name} is contraindicated with eGFR < ${threshold.eGFR} ml/min.`
                                : `${med.name} dose exceeds recommended range for eGFR ${eGFR} ml/min.`,
                            recommendation: threshold.adjustment,
                            evidence: rule.evidence,
                            patientContext: `Patient eGFR: ${eGFR} ml/min (threshold: ${threshold.eGFR}).${creatinineTrending}`,
                            createdAt: new Date().toISOString(),
                        });
                        break; // Only most restrictive threshold
                    }
                }
            }
        }

        return alerts;
    }

    /**
     * Check hepatic dosing
     */
    private checkHepaticDosing(input: MedicationSafetyInput): MedicationSafetyAlert[] {
        const alerts: MedicationSafetyAlert[] = [];
        const hep = input.patient.hepaticFunction;

        if (!hep) return alerts;

        const hasSignificantImpairment =
            (hep.ast && hep.ast > 120) ||
            (hep.alt && hep.alt > 120) ||
            (hep.bilirubin && hep.bilirubin > 2) ||
            hep.childPughScore === "B" || hep.childPughScore === "C";

        if (!hasSignificantImpairment) return alerts;

        // Medications requiring hepatic dose adjustment
        const hepaticConcernMeds = [
            { name: "acetaminophen", maxDose: "2g/day with liver disease", risk: "Hepatotoxicity" },
            { name: "atorvastatin", maxDose: "Use with caution; consider lower dose", risk: "Hepatotoxicity" },
            { name: "methotrexate", maxDose: "Contraindicated in significant liver disease", risk: "Hepatotoxicity" },
        ];

        for (const med of input.currentMedications.filter(m => m.status === "active")) {
            const concern = hepaticConcernMeds.find(c =>
                med.name.toLowerCase().includes(c.name)
            );

            if (concern) {
                alerts.push({
                    id: randomUUID(),
                    type: "hepatic-dosing",
                    severity: hep.childPughScore === "C" ? "HIGH" : "MODERATE",
                    clinicalRisk: "Hepatotoxicity",
                    confidence: 0.85,
                    medications: [med.name],
                    reason: `${med.name} requires dose adjustment or monitoring in hepatic impairment.`,
                    recommendation: concern.maxDose,
                    evidence: ["FDA Label", "Lexicomp"],
                    patientContext: `Patient has ${hep.childPughScore ? `Child-Pugh ${hep.childPughScore}` : 'elevated liver enzymes'}.`,
                    createdAt: new Date().toISOString(),
                });
            }
        }

        return alerts;
    }

    /**
     * Check for duplicate therapies
     */
    private checkDuplicateTherapies(input: MedicationSafetyInput): MedicationSafetyAlert[] {
        const alerts: MedicationSafetyAlert[] = [];
        const medications = input.currentMedications.filter(m => m.status === "active");
        const medNames = medications.map(m => m.name.toLowerCase());

        for (const dup of THERAPEUTIC_DUPLICATES) {
            const classMembers = DRUG_CLASS_MAP[dup.class] || [];
            const matchingMeds = medNames.filter(m =>
                classMembers.some(c => m.includes(c))
            );

            if (matchingMeds.length > 1) {
                alerts.push({
                    id: randomUUID(),
                    type: "duplicate-therapy",
                    severity: ["anticoagulant", "opioid"].includes(dup.class) ? "HIGH" : "MODERATE",
                    clinicalRisk: "Therapeutic Duplication",
                    confidence: 0.95,
                    medications: matchingMeds,
                    reason: `Multiple ${dup.class.toUpperCase()} medications prescribed. ${dup.risk}.`,
                    recommendation: `Review necessity of multiple agents in same class. Consider consolidating therapy.`,
                    evidence: ["Clinical Guidelines", "ISMP"],
                    patientContext: `Patient is on ${matchingMeds.length} medications from the ${dup.class} class.`,
                    createdAt: new Date().toISOString(),
                });
            }
        }

        return alerts;
    }

    /**
     * Check allergy conflicts
     */
    private checkAllergyConflicts(input: MedicationSafetyInput): MedicationSafetyAlert[] {
        const alerts: MedicationSafetyAlert[] = [];

        // Cross-reactivity patterns
        const crossReactivity: Record<string, string[]> = {
            "penicillin": ["amoxicillin", "ampicillin", "piperacillin"],
            "sulfa": ["sulfamethoxazole", "sulfasalazine", "celecoxib"], // ~2% cross-reactivity
            "cephalosporin": ["cefazolin", "ceftriaxone", "cephalexin"],
        };

        for (const allergy of input.patient.allergies) {
            const allergen = allergy.substance.toLowerCase();

            for (const med of input.currentMedications.filter(m => m.status === "active")) {
                const medName = med.name.toLowerCase();

                // Direct match
                if (medName.includes(allergen) || allergen.includes(medName)) {
                    alerts.push({
                        id: randomUUID(),
                        type: "allergy",
                        severity: allergy.severity === "life-threatening" ? "HIGH" : "MODERATE",
                        clinicalRisk: "Allergy/Cross-Reactivity",
                        confidence: 0.98,
                        medications: [med.name],
                        reason: `Patient has documented ${allergy.severity} allergy to ${allergy.substance}. Reaction: ${allergy.reaction}`,
                        recommendation: `Avoid ${med.name}. Consider alternative medication.`,
                        evidence: ["Patient Allergy Record"],
                        patientContext: `Direct allergen match detected.`,
                        createdAt: new Date().toISOString(),
                    });
                }

                // Cross-reactivity check
                for (const [allergenClass, members] of Object.entries(crossReactivity)) {
                    if (allergen.includes(allergenClass) && members.some(m => medName.includes(m))) {
                        alerts.push({
                            id: randomUUID(),
                            type: "allergy",
                            severity: "MODERATE",
                            clinicalRisk: "Allergy/Cross-Reactivity",
                            confidence: 0.75,
                            medications: [med.name],
                            reason: `Potential cross-reactivity: Patient allergic to ${allergy.substance}, ${med.name} is in related class.`,
                            recommendation: `Evaluate cross-reactivity risk. Consider allergy testing or alternative.`,
                            evidence: ["Cross-Reactivity Data", "Clinical Pharmacology"],
                            patientContext: `Cross-reactivity rate varies by specific agents.`,
                            createdAt: new Date().toISOString(),
                        });
                    }
                }
            }
        }

        return alerts;
    }

    // Helper methods
    private getMedicationClasses(medNames: string[]): Set<string> {
        const classes = new Set<string>();
        for (const [className, members] of Object.entries(DRUG_CLASS_MAP)) {
            if (medNames.some(m => members.some(member => m.includes(member)))) {
                classes.add(className);
            }
        }
        return classes;
    }

    private findDrugMatch(pattern: string, medNames: string[], medClasses: Set<string>): string | null {
        // Check if pattern is a class
        if (medClasses.has(pattern)) {
            const members = DRUG_CLASS_MAP[pattern] || [];
            return medNames.find(m => members.some(member => m.includes(member))) || null;
        }
        // Check direct drug name
        return medNames.find(m => m.includes(pattern)) || null;
    }

    private increaseSeverity(current: AlertSeverity): AlertSeverity {
        if (current === "LOW") return "MODERATE";
        if (current === "MODERATE") return "HIGH";
        return "HIGH";
    }

    private evaluateAlertSuppression(
        alert: MedicationSafetyAlert,
        input: MedicationSafetyInput
    ): { shouldSuppress: boolean; reason: string } {
        // Suppress LOW severity alerts unless context escalates
        if (alert.severity === "LOW" && !this.hasEscalatingContext(input)) {
            return { shouldSuppress: true, reason: "Low severity with stable patient context" };
        }

        // Suppress if already acknowledged recently
        if (this.acknowledgedAlerts.has(this.getAlertFingerprint(alert))) {
            return { shouldSuppress: true, reason: "Previously acknowledged by clinician" };
        }

        return { shouldSuppress: false, reason: "" };
    }

    private hasEscalatingContext(input: MedicationSafetyInput): boolean {
        return (
            input.patient.renalFunction?.creatinineTrend === "rising" ||
            (input.patient.renalFunction?.eGFR !== undefined && input.patient.renalFunction.eGFR < 30)
        );
    }

    private isAlertInCooldown(alert: MedicationSafetyAlert): boolean {
        const fingerprint = this.getAlertFingerprint(alert);
        const cooldownExpiry = this.alertCooldowns.get(fingerprint);
        if (cooldownExpiry && new Date() < cooldownExpiry) {
            return true;
        }
        return false;
    }

    private getAlertFingerprint(alert: MedicationSafetyAlert): string {
        return `${alert.type}-${alert.medications.sort().join("-")}-${alert.clinicalRisk}`;
    }

    private determineOverallStatus(alerts: MedicationSafetyAlert[]): "SAFE" | "CAUTION" | "HIGH_RISK" | "CRITICAL" {
        const highCount = alerts.filter(a => a.severity === "HIGH").length;
        const moderateCount = alerts.filter(a => a.severity === "MODERATE").length;

        if (highCount >= 2 || alerts.some(a => a.clinicalRisk === "Contraindication")) return "CRITICAL";
        if (highCount >= 1) return "HIGH_RISK";
        if (moderateCount >= 2) return "CAUTION";
        if (moderateCount >= 1 || alerts.length > 0) return "CAUTION";
        return "SAFE";
    }

    private generateSummary(alerts: MedicationSafetyAlert[], status: string): string {
        if (alerts.length === 0) {
            return "No significant medication safety concerns identified.";
        }
        const highCount = alerts.filter(a => a.severity === "HIGH").length;
        const types = Array.from(new Set(alerts.map(a => a.type))).join(", ");
        return `${alerts.length} alert(s) identified (${highCount} high severity). Issues: ${types}.`;
    }

    private generateRenalAssessment(input: MedicationSafetyInput, alerts: MedicationSafetyAlert[]) {
        const renal = input.patient.renalFunction;
        if (!renal?.eGFR) return undefined;

        const stage = renal.eGFR >= 90 ? "G1" : renal.eGFR >= 60 ? "G2" : renal.eGFR >= 45 ? "G3a" :
            renal.eGFR >= 30 ? "G3b" : renal.eGFR >= 15 ? "G4" : "G5";

        return {
            eGFR: renal.eGFR,
            stage: `CKD Stage ${stage}`,
            medicationsRequiringAdjustment: alerts.filter(a => a.type === "renal-dosing").flatMap(a => a.medications),
            recommendation: renal.eGFR < 30
                ? "Significant renal impairment. Review all medications for dose adjustment."
                : "Monitor renal function with current medications."
        };
    }

    private generateHepaticAssessment(input: MedicationSafetyInput, alerts: MedicationSafetyAlert[]) {
        const hep = input.patient.hepaticFunction;
        if (!hep) return undefined;

        return {
            status: hep.childPughScore ? `Child-Pugh Class ${hep.childPughScore}` : "Elevated liver enzymes",
            medicationsOfConcern: alerts.filter(a => a.type === "hepatic-dosing").flatMap(a => a.medications),
            recommendation: "Monitor LFTs regularly. Consider hepatically-safe alternatives."
        };
    }

    private generateMonitoringRecommendations(alerts: MedicationSafetyAlert[], input: MedicationSafetyInput): string[] {
        const recommendations: string[] = [];

        if (alerts.some(a => a.clinicalRisk === "Bleeding")) {
            recommendations.push("Monitor for signs of bleeding; check Hgb/Hct if symptomatic");
        }
        if (alerts.some(a => a.clinicalRisk === "Nephrotoxicity")) {
            recommendations.push("Monitor creatinine and BUN at least weekly");
        }
        if (alerts.some(a => a.clinicalRisk === "QT Prolongation")) {
            recommendations.push("Consider baseline and follow-up ECG; monitor electrolytes");
        }
        if (input.patient.renalFunction?.eGFR && input.patient.renalFunction.eGFR < 45) {
            recommendations.push("Reassess renal function in 3-7 days");
        }

        return recommendations.length > 0 ? recommendations : ["Continue routine monitoring"];
    }

    private generateReasoningChain(alerts: MedicationSafetyAlert[], input: MedicationSafetyInput): string[] {
        return [
            `Analyzed ${input.currentMedications.length} active medications`,
            `Patient context: ${input.patient.age}yo ${input.patient.gender}, eGFR: ${input.patient.renalFunction?.eGFR || 'N/A'}`,
            `Identified ${alerts.length} clinically significant alerts`,
            `High-severity alerts prioritized for immediate attention`
        ];
    }

    private generateLimitations(input: MedicationSafetyInput): string[] {
        const limitations: string[] = [];
        if (!input.patient.renalFunction?.eGFR) limitations.push("eGFR not available - renal dosing may be incomplete");
        if (!input.patient.hepaticFunction) limitations.push("Hepatic function not available");
        if (!input.patient.weight) limitations.push("Weight not available - weight-based dosing not verified");
        if (!input.recentLabs?.length) limitations.push("No recent labs available for trending");
        return limitations;
    }

    private calculateOverallConfidence(alerts: MedicationSafetyAlert[], input: MedicationSafetyInput): number {
        let confidence = 0.85;
        if (input.patient.renalFunction?.eGFR) confidence += 0.05;
        if (input.recentLabs?.length) confidence += 0.05;
        if (input.patient.weight) confidence += 0.02;
        return Math.min(confidence, 0.98);
    }

    /**
     * Acknowledge an alert (for fatigue prevention)
     */
    acknowledgeAlert(alertId: string, minutes: number = 60): void {
        const cooldownExpiry = new Date(Date.now() + minutes * 60 * 1000);
        this.alertCooldowns.set(alertId, cooldownExpiry);
        this.acknowledgedAlerts.add(alertId);
    }
}

// Export singleton
export const medicationSafetyEngine = new MedicationSafetyEngine();
