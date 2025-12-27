/**
 * HealthMesh - Clinical Intelligence Orchestrator
 * Production-grade multi-agent AI system for healthcare decision support
 * 
 * Architecture: 5 Specialized Agents + 1 Synthesis Orchestrator
 * - Triage Agent (NEWS2/SOFA-lite urgency scoring)
 * - Diagnostic Agent (Differential diagnosis generation)
 * - Guideline Agent (NCCN/WHO/ICMR alignment)
 * - Medication Safety Agent (Drug interactions & contraindications)
 * - Evidence Agent (Clinical research retrieval)
 * - Synthesis Orchestrator (Final unified output)
 */

import { randomUUID } from "crypto";
import type {
    Patient,
    ClinicalCase,
    AgentOutput,
    Recommendation,
    RiskAlert,
    AgentType,
} from "@shared/schema";
import { getAzureOpenAI } from "./azure/openai-client";
import { getCognitiveSearch } from "./azure/cognitive-search";
import { getMonitor } from "./azure/monitoring";

// ==========================================
// Type Definitions
// ==========================================

interface AgentContext {
    patient: Patient;
    clinicalCase: ClinicalCase;
    previousOutputs: AgentOutput[];
    vitals?: VitalSigns;
    labValues?: LabValues;
}

interface VitalSigns {
    respiratoryRate?: number;
    oxygenSaturation?: number;
    supplementalOxygen?: boolean;
    systolicBP?: number;
    heartRate?: number;
    consciousness?: "alert" | "verbal" | "pain" | "unresponsive";
    temperature?: number;
}

interface LabValues {
    creatinine?: number;
    bilirubin?: number;
    platelets?: number;
    pao2?: number;
    fio2?: number;
    lactate?: number;
    gcs?: number;
}

interface TriageOutput {
    urgencyScore: number;
    riskCategory: "Low" | "Moderate" | "High" | "Critical";
    news2Score?: number;
    sofaScore?: number;
    rationale: string[];
    redFlags: string[];
    immediateActions: string[];
    confidence: number;
}

interface DiagnosticOutput {
    differentialDiagnoses: Array<{
        diagnosis: string;
        icdCode?: string;
        confidence: number;
        supportingFindings: string[];
        contradictoryFindings: string[];
        missingDataToConfirm: string[];
    }>;
    clinicalPictureSummary: string;
    primarySuspicion: string;
    dataGaps: string[];
    confidence: number;
}

interface GuidelineOutput {
    applicableGuidelines: Array<{
        name: string;
        organization: "NCCN" | "WHO" | "ICMR" | "ADA" | "ACC/AHA" | "IDSA" | "Other";
        version?: string;
        recommendationClass?: string;
        evidenceLevel?: string;
        recommendation: string;
        conditionalRules?: string[];
    }>;
    deviations: string[];
    grayAreas: string[];
    recommendedActions: string[];
    confidence: number;
}

interface MedicationSafetyOutput {
    interactions: Array<{
        drugs: string[];
        severity: "Low" | "Moderate" | "High";
        mechanism: string;
        clinicalEffect: string;
        management: string;
    }>;
    allergyConflicts: Array<{
        medication: string;
        allergen: string;
        crossReactivity: boolean;
        recommendation: string;
    }>;
    doseRisks: Array<{
        medication: string;
        concern: string;
        adjustment: string;
    }>;
    contraindications: Array<{
        medication: string;
        condition: string;
        severity: "Absolute" | "Relative";
        alternative?: string;
    }>;
    saferAlternatives: string[];
    monitoringRecommendations: string[];
    overallSafetyRisk: "Low" | "Moderate" | "High";
    confidence: number;
}

interface EvidenceOutput {
    keyStudies: Array<{
        title: string;
        year: number;
        type: "RCT" | "Meta-analysis" | "Cohort" | "Case-control" | "Case report" | "Guideline";
        journal?: string;
        summary: string;
        relevance: string;
    }>;
    evidenceSummary: string;
    strengthOfEvidence: "Strong" | "Moderate" | "Limited" | "Conflicting";
    limitations: string[];
    confidence: number;
}

interface FinalSynthesis {
    caseSummary: string;
    riskAndUrgency: {
        urgencyScore: number;
        riskCategory: string;
        rationale: string;
        immediateActions: string[];
    };
    differentialDiagnosis: Array<{
        diagnosis: string;
        confidence: number;
        supportingEvidence: string[];
    }>;
    guidelineRecommendations: Array<{
        guideline: string;
        recommendation: string;
        evidenceLevel: string;
    }>;
    medicationSafety: {
        overallRisk: string;
        criticalAlerts: string[];
        recommendations: string[];
    };
    supportingEvidence: {
        keyFindings: string[];
        strengthOfEvidence: string;
    };
    explainabilityPanel: {
        whyThisRecommendation: string[];
        keyInfluencingData: string[];
        missingData: string[];
    };
    overallConfidence: "Low" | "Medium" | "High";
    clinicalDisclaimer: string;
}

// ==========================================
// System Prompts for Clinical Agents
// ==========================================

const SYSTEM_PROMPTS = {
    triage: `You are the TRIAGE AGENT in HealthMesh, a clinical decision support system.

PURPOSE: Assess urgency and risk level of the clinical case.

YOUR RESPONSIBILITIES:
1. Analyze vitals, symptoms, labs, and demographics
2. Compute urgency using NEWS2 (if vitals available) or clinical judgment
3. Compute SOFA-lite (if organ dysfunction indicators exist)
4. Classify risk as: Low / Moderate / High / Critical
5. Identify immediate red flags requiring urgent action

CRITICAL RULES:
- You are NOT a diagnostic authority; you assist licensed clinicians
- Explain your scoring logic in plain language
- If data is insufficient, explicitly state uncertainty
- Never hallucinate facts or scores

OUTPUT: JSON with urgencyScore, riskCategory, rationale, redFlags, and immediateActions.`,

    diagnostic: `You are the DIAGNOSTIC AGENT in HealthMesh, a clinical decision support system.

PURPOSE: Generate ranked differential diagnoses based on clinical presentation.

YOUR RESPONSIBILITIES:
1. Convert symptoms, history, and findings into structured clinical features
2. Generate ranked differential diagnoses (most likely first)
3. Clearly explain WHY each diagnosis is considered
4. Identify supporting AND contradictory findings for each
5. Highlight missing data that would improve diagnostic confidence

CRITICAL RULES:
- You are NOT making a diagnosis; you are suggesting differentials for clinician review
- Be explicit about uncertainty
- Do not hallucinate conditions or findings
- Separate clinical facts from reasoning

OUTPUT: JSON with ranked differentialDiagnoses, supportingFindings, contradictoryFindings, and confidence levels.`,

    guideline: `You are the GUIDELINE AGENT in HealthMesh, a clinical decision support system.

PURPOSE: Align clinical decisions with established medical guidelines.

YOUR RESPONSIBILITIES:
1. Map diagnostic and treatment options to relevant guidelines:
   - NCCN (oncology)
   - WHO (global health standards)
   - ICMR (Indian clinical guidelines)
   - ADA (diabetes)
   - ACC/AHA (cardiology)
   - IDSA (infectious disease)
2. Clearly state which guideline applies
3. Note recommendation class/strength (Class I/II/III, Level A/B/C)
4. Flag deviations from guidelines or gray areas

CRITICAL RULES:
- Only cite guidelines you are confident exist
- If no specific guideline applies, state this clearly
- Note when guidelines may conflict with patient-specific factors
- Never fabricate guideline recommendations

OUTPUT: JSON with applicableGuidelines, recommendationClass, deviations, and grayAreas.`,

    medicationSafety: `You are the MEDICATION SAFETY AGENT in HealthMesh, a clinical decision support system.

PURPOSE: Ensure treatment safety by checking for drug-related risks.

YOUR RESPONSIBILITIES:
1. Check for drug-drug interactions (DDIs)
2. Identify drug-allergy conflicts and cross-reactivity
3. Assess dose risks based on renal/hepatic function
4. Identify absolute and relative contraindications
5. Suggest safer alternatives when risks are identified
6. Recommend monitoring parameters

SEVERITY CLASSIFICATION:
- Low: Minor interaction, no action needed but document
- Moderate: Consider alternative or adjust dose/timing
- High: Avoid combination or requires close monitoring

CRITICAL RULES:
- Do not minimize safety risks
- Be specific about mechanisms and clinical effects
- Always suggest management strategies
- If insufficient medication data, state explicitly

OUTPUT: JSON with interactions, allergyConflicts, doseRisks, contraindications, and recommendations.`,

    evidence: `You are the EVIDENCE AGENT in HealthMesh, a clinical decision support system.

PURPOSE: Support clinical decisions with the latest research evidence.

YOUR RESPONSIBILITIES:
1. Identify relevant clinical trials, meta-analyses, and observational studies
2. Prefer recent evidence (within 5 years) and high-impact publications
3. Summarize findings in clinician-friendly language
4. Grade the strength of evidence
5. Note limitations and potential biases

EVIDENCE HIERARCHY:
1. Meta-analyses and Systematic Reviews
2. Randomized Controlled Trials (RCTs)
3. Cohort Studies
4. Case-Control Studies
5. Case Reports/Expert Opinion

CRITICAL RULES:
- Only cite evidence you are confident exists
- Do not fabricate study names, years, or findings
- Acknowledge when evidence is limited or conflicting
- Be explicit about the limitations of cited evidence

OUTPUT: JSON with keyStudies, evidenceSummary, strengthOfEvidence, and limitations.`,

    synthesisOrchestrator: `You are the SYNTHESIS ORCHESTRATOR in HealthMesh, a clinical decision support system.

PURPOSE: Synthesize all agent outputs into a unified, actionable clinical summary.

YOUR RESPONSIBILITIES:
1. Integrate findings from Triage, Diagnostic, Guideline, Medication Safety, and Evidence agents
2. Resolve conflicting information with clear reasoning
3. Prioritize recommendations by clinical urgency
4. Provide transparent explainability (why each recommendation was made)
5. Calculate overall confidence based on data completeness and agent agreement

OUTPUT FORMAT:
1. Case Summary (concise)
2. Risk & Urgency Assessment
3. Differential Diagnosis (ranked)
4. Guideline-Aligned Recommendations
5. Medication Safety Considerations
6. Supporting Evidence
7. Explainability Panel (why, what influenced, what's missing)
8. Confidence Level (Low/Medium/High)
9. Clinical Disclaimer

CRITICAL RULES:
- This is DECISION SUPPORT, not a diagnosis
- Be transparent about uncertainty
- Never make absolute clinical statements
- The clinician makes the final decision

OUTPUT: JSON matching the structured synthesis format.`,
};

// ==========================================
// Utility Functions
// ==========================================

function calculateAge(dateOfBirth: string): number {
    const dob = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
    }
    return age;
}

function calculateNEWS2(vitals: VitalSigns): number {
    let score = 0;

    // Respiratory rate
    if (vitals.respiratoryRate !== undefined) {
        const rr = vitals.respiratoryRate;
        if (rr <= 8) score += 3;
        else if (rr >= 9 && rr <= 11) score += 1;
        else if (rr >= 12 && rr <= 20) score += 0;
        else if (rr >= 21 && rr <= 24) score += 2;
        else if (rr >= 25) score += 3;
    }

    // Oxygen saturation
    if (vitals.oxygenSaturation !== undefined) {
        const spo2 = vitals.oxygenSaturation;
        if (spo2 <= 91) score += 3;
        else if (spo2 >= 92 && spo2 <= 93) score += 2;
        else if (spo2 >= 94 && spo2 <= 95) score += 1;
        else if (spo2 >= 96) score += 0;
    }

    // Supplemental oxygen
    if (vitals.supplementalOxygen) score += 2;

    // Systolic BP
    if (vitals.systolicBP !== undefined) {
        const sbp = vitals.systolicBP;
        if (sbp <= 90) score += 3;
        else if (sbp >= 91 && sbp <= 100) score += 2;
        else if (sbp >= 101 && sbp <= 110) score += 1;
        else if (sbp >= 111 && sbp <= 219) score += 0;
        else if (sbp >= 220) score += 3;
    }

    // Heart rate
    if (vitals.heartRate !== undefined) {
        const hr = vitals.heartRate;
        if (hr <= 40) score += 3;
        else if (hr >= 41 && hr <= 50) score += 1;
        else if (hr >= 51 && hr <= 90) score += 0;
        else if (hr >= 91 && hr <= 110) score += 1;
        else if (hr >= 111 && hr <= 130) score += 2;
        else if (hr >= 131) score += 3;
    }

    // Consciousness (AVPU)
    if (vitals.consciousness !== undefined) {
        if (vitals.consciousness !== "alert") score += 3;
    }

    // Temperature
    if (vitals.temperature !== undefined) {
        const temp = vitals.temperature;
        if (temp <= 35.0) score += 3;
        else if (temp >= 35.1 && temp <= 36.0) score += 1;
        else if (temp >= 36.1 && temp <= 38.0) score += 0;
        else if (temp >= 38.1 && temp <= 39.0) score += 1;
        else if (temp >= 39.1) score += 2;
    }

    return score;
}

function calculateSOFALite(labs: LabValues): number {
    let score = 0;

    // Respiratory (PaO2/FiO2)
    if (labs.pao2 !== undefined && labs.fio2 !== undefined) {
        const pf = labs.pao2 / labs.fio2;
        if (pf < 100) score += 4;
        else if (pf < 200) score += 3;
        else if (pf < 300) score += 2;
        else if (pf < 400) score += 1;
    }

    // Coagulation (Platelets)
    if (labs.platelets !== undefined) {
        if (labs.platelets < 20) score += 4;
        else if (labs.platelets < 50) score += 3;
        else if (labs.platelets < 100) score += 2;
        else if (labs.platelets < 150) score += 1;
    }

    // Liver (Bilirubin)
    if (labs.bilirubin !== undefined) {
        if (labs.bilirubin >= 12) score += 4;
        else if (labs.bilirubin >= 6) score += 3;
        else if (labs.bilirubin >= 2) score += 2;
        else if (labs.bilirubin >= 1.2) score += 1;
    }

    // Renal (Creatinine)
    if (labs.creatinine !== undefined) {
        if (labs.creatinine >= 5) score += 4;
        else if (labs.creatinine >= 3.5) score += 3;
        else if (labs.creatinine >= 2) score += 2;
        else if (labs.creatinine >= 1.2) score += 1;
    }

    // CNS (GCS)
    if (labs.gcs !== undefined) {
        if (labs.gcs < 6) score += 4;
        else if (labs.gcs < 10) score += 3;
        else if (labs.gcs < 13) score += 2;
        else if (labs.gcs < 15) score += 1;
    }

    return score;
}

function getRiskCategory(news2: number, sofa: number): "Low" | "Moderate" | "High" | "Critical" {
    // Combined risk assessment
    if (news2 >= 7 || sofa >= 6) return "Critical";
    if (news2 >= 5 || sofa >= 4) return "High";
    if (news2 >= 3 || sofa >= 2) return "Moderate";
    return "Low";
}

// ==========================================
// AGENT 1: Triage Agent
// ==========================================

async function invokeTriageAgent(context: AgentContext): Promise<AgentOutput> {
    const startTime = new Date();
    const monitor = getMonitor();

    try {
        const openai = getAzureOpenAI();
        const age = calculateAge(context.patient.demographics.dateOfBirth);

        // Calculate NEWS2 and SOFA if vitals/labs available
        const news2Score = context.vitals ? calculateNEWS2(context.vitals) : undefined;
        const sofaScore = context.labValues ? calculateSOFALite(context.labValues) : undefined;

        const userPrompt = `Assess the urgency and risk level for this patient case.

PATIENT DEMOGRAPHICS:
- Name: ${context.patient.demographics.firstName} ${context.patient.demographics.lastName}
- Age: ${age} years
- Gender: ${context.patient.demographics.gender}
- MRN: ${context.patient.demographics.mrn}

ACTIVE DIAGNOSES:
${context.patient.diagnoses.filter(d => d.status === 'active').map(d => `- ${d.display} (ICD-10: ${d.code})`).join('\n') || '- None documented'}

CURRENT MEDICATIONS:
${context.patient.medications.filter(m => m.status === 'active').map(m => `- ${m.name} ${m.dosage} ${m.frequency}`).join('\n') || '- None documented'}

ALLERGIES:
${context.patient.allergies.length > 0 ? context.patient.allergies.map(a => `- ${a.substance}: ${a.reaction} (Severity: ${a.severity})`).join('\n') : '- None documented'}

MEDICAL HISTORY:
${context.patient.medicalHistory || 'Not provided'}

CLINICAL QUESTION/PRESENTING CONCERN:
${context.clinicalCase.clinicalQuestion}

${context.vitals ? `VITAL SIGNS (if calculated NEWS2 = ${news2Score}):
- Respiratory Rate: ${context.vitals.respiratoryRate || 'N/A'} /min
- SpO2: ${context.vitals.oxygenSaturation || 'N/A'}%
- Supplemental O2: ${context.vitals.supplementalOxygen ? 'Yes' : 'No'}
- Systolic BP: ${context.vitals.systolicBP || 'N/A'} mmHg
- Heart Rate: ${context.vitals.heartRate || 'N/A'} bpm
- Consciousness: ${context.vitals.consciousness || 'N/A'}
- Temperature: ${context.vitals.temperature || 'N/A'}°C` : 'VITAL SIGNS: Not provided'}

${context.labValues ? `LAB VALUES (if calculated SOFA-lite = ${sofaScore}):
- Creatinine: ${context.labValues.creatinine || 'N/A'} mg/dL
- Bilirubin: ${context.labValues.bilirubin || 'N/A'} mg/dL
- Platelets: ${context.labValues.platelets || 'N/A'} x10^9/L
- GCS: ${context.labValues.gcs || 'N/A'}` : 'LAB VALUES: Not provided for SOFA calculation'}

Provide your triage assessment in JSON format:
{
  "urgencyScore": <1-10 scale>,
  "riskCategory": "Low|Moderate|High|Critical",
  "news2Score": ${news2Score !== undefined ? news2Score : 'null'},
  "sofaScore": ${sofaScore !== undefined ? sofaScore : 'null'},
  "rationale": ["reason 1 for risk classification", "reason 2", ...],
  "redFlags": ["immediate concern 1", "immediate concern 2", ...],
  "immediateActions": ["action 1", "action 2", ...],
  "confidence": <0-100>
}`;

        const result = await openai.clinicalCompletion(SYSTEM_PROMPTS.triage, userPrompt, 'triage') as TriageOutput;
        const endTime = new Date();

        await monitor.trackAgentExecution({
            agentType: 'orchestrator', // Using orchestrator type as fallback
            caseId: context.clinicalCase.id,
            patientId: context.patient.id,
            startTime,
            endTime,
            success: true,
            confidence: result.confidence,
        });

        return {
            agentType: "orchestrator", // Triage maps to orchestrator for now
            status: "completed",
            startedAt: startTime.toISOString(),
            completedAt: endTime.toISOString(),
            summary: `Risk: ${result.riskCategory} | Urgency: ${result.urgencyScore}/10${result.news2Score !== undefined ? ` | NEWS2: ${result.news2Score}` : ''}${result.redFlags?.length > 0 ? ` | Red Flags: ${result.redFlags.length}` : ''}`,
            details: {
                agentName: "Triage Agent",
                ...result,
            },
            confidence: result.confidence || 85,
            evidenceSources: ["Patient vitals", "Lab values", "NEWS2 scoring", "SOFA-lite scoring"],
            reasoningChain: result.rationale || [],
        };
    } catch (error) {
        const endTime = new Date();

        await monitor.trackAgentExecution({
            agentType: 'orchestrator',
            caseId: context.clinicalCase.id,
            patientId: context.patient.id,
            startTime,
            endTime,
            success: false,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
        });

        return {
            agentType: "orchestrator",
            status: "error",
            startedAt: startTime.toISOString(),
            completedAt: endTime.toISOString(),
            summary: `Triage Agent Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            details: { agentName: "Triage Agent" },
        };
    }
}

// ==========================================
// AGENT 2: Diagnostic Agent
// ==========================================

async function invokeDiagnosticAgent(context: AgentContext): Promise<AgentOutput> {
    const startTime = new Date();
    const monitor = getMonitor();

    try {
        const openai = getAzureOpenAI();
        const triageOutput = context.previousOutputs.find(o => o.details?.agentName === "Triage Agent");

        const userPrompt = `Generate ranked differential diagnoses for this patient.

PATIENT OVERVIEW:
- Age: ${calculateAge(context.patient.demographics.dateOfBirth)} years
- Gender: ${context.patient.demographics.gender}

PRESENTING CONCERN:
${context.clinicalCase.clinicalQuestion}

ACTIVE CONDITIONS:
${context.patient.diagnoses.filter(d => d.status === 'active').map(d => `- ${d.display} (${d.codeSystem}: ${d.code})`).join('\n') || '- None documented'}

CURRENT MEDICATIONS:
${context.patient.medications.filter(m => m.status === 'active').map(m => `- ${m.name} ${m.dosage}`).join('\n') || '- None documented'}

ALLERGIES:
${context.patient.allergies.map(a => `- ${a.substance} (${a.severity})`).join('\n') || '- None documented'}

MEDICAL HISTORY:
${context.patient.medicalHistory || 'Not provided'}

${triageOutput ? `TRIAGE ASSESSMENT:
${triageOutput.summary}
Red Flags: ${triageOutput.details?.redFlags?.join(', ') || 'None identified'}` : ''}

Generate differential diagnoses in JSON format:
{
  "differentialDiagnoses": [
    {
      "diagnosis": "Most likely diagnosis",
      "icdCode": "ICD-10 code if known",
      "confidence": <0-100>,
      "supportingFindings": ["finding 1", "finding 2"],
      "contradictoryFindings": ["finding that argues against"],
      "missingDataToConfirm": ["test or info needed"]
    },
    // ... more diagnoses ranked by likelihood
  ],
  "clinicalPictureSummary": "Brief synthesis of the clinical presentation",
  "primarySuspicion": "Single most likely diagnosis",
  "dataGaps": ["overall missing information that limits diagnostic confidence"],
  "confidence": <0-100 overall confidence>
}`;

        const result = await openai.clinicalCompletion(SYSTEM_PROMPTS.diagnostic, userPrompt, 'diagnostic') as DiagnosticOutput;
        const endTime = new Date();

        await monitor.trackAgentExecution({
            agentType: 'patient-context',
            caseId: context.clinicalCase.id,
            patientId: context.patient.id,
            startTime,
            endTime,
            success: true,
            confidence: result.confidence,
        });

        const topDiagnoses = result.differentialDiagnoses?.slice(0, 3).map(d => d.diagnosis).join(', ') || 'Unable to determine';

        return {
            agentType: "patient-context",
            status: "completed",
            startedAt: startTime.toISOString(),
            completedAt: endTime.toISOString(),
            summary: `Primary: ${result.primarySuspicion || 'Undetermined'} | Top DDx: ${topDiagnoses}`,
            details: {
                agentName: "Diagnostic Agent",
                ...result,
            },
            confidence: result.confidence || 75,
            evidenceSources: ["Clinical presentation", "Medical history", "Symptom analysis"],
            reasoningChain: result.dataGaps,
        };
    } catch (error) {
        const endTime = new Date();

        await monitor.trackAgentExecution({
            agentType: 'patient-context',
            caseId: context.clinicalCase.id,
            patientId: context.patient.id,
            startTime,
            endTime,
            success: false,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
        });

        return {
            agentType: "patient-context",
            status: "error",
            startedAt: startTime.toISOString(),
            completedAt: endTime.toISOString(),
            summary: `Diagnostic Agent Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            details: { agentName: "Diagnostic Agent" },
        };
    }
}

// ==========================================
// AGENT 3: Guideline Agent
// ==========================================

async function invokeGuidelineAgent(context: AgentContext): Promise<AgentOutput> {
    const startTime = new Date();
    const monitor = getMonitor();

    try {
        const openai = getAzureOpenAI();
        const cognitiveSearch = getCognitiveSearch();

        const diagnosticOutput = context.previousOutputs.find(o => o.details?.agentName === "Diagnostic Agent");
        const diagnoses = diagnosticOutput?.details?.differentialDiagnoses || [];

        // Try to retrieve guidelines from Azure Cognitive Search
        let retrievedGuidelines = '';
        try {
            const searchTerms = [
                context.clinicalCase.clinicalQuestion,
                ...diagnoses.slice(0, 3).map((d: any) => d.diagnosis),
                ...context.patient.diagnoses.filter(d => d.status === 'active').map(d => d.display),
            ].join(' ');

            const ragResult = await cognitiveSearch.ragQuery(searchTerms, {
                clinicalQuestion: context.clinicalCase.clinicalQuestion,
                maxSources: 5,
            });

            if (ragResult.sources.length > 0) {
                retrievedGuidelines = `\nRETRIEVED GUIDELINES FROM KNOWLEDGE BASE:\n${ragResult.answer}\n\nSources: ${ragResult.sources.map(s => s.title).join(', ')}`;
            }
        } catch (searchError) {
            console.log('Cognitive Search not available for guidelines, using base knowledge');
        }

        const userPrompt = `Map this clinical case to relevant medical guidelines.

CLINICAL QUESTION:
${context.clinicalCase.clinicalQuestion}

PATIENT CONDITIONS:
${context.patient.diagnoses.filter(d => d.status === 'active').map(d => `- ${d.display} (${d.code})`).join('\n') || '- None documented'}

DIFFERENTIAL DIAGNOSES UNDER CONSIDERATION:
${diagnoses.slice(0, 5).map((d: any, i: number) => `${i + 1}. ${d.diagnosis} (Confidence: ${d.confidence}%)`).join('\n') || '- Not yet determined'}

CURRENT MEDICATIONS:
${context.patient.medications.filter(m => m.status === 'active').map(m => `- ${m.name}`).join('\n') || '- None'}
${retrievedGuidelines}

Map to guidelines and provide in JSON format:
{
  "applicableGuidelines": [
    {
      "name": "Guideline name (e.g., NCCN Breast Cancer Guidelines v2.2024)",
      "organization": "NCCN|WHO|ICMR|ADA|ACC/AHA|IDSA|Other",
      "version": "version if known",
      "recommendationClass": "Class I/IIa/IIb/III (if applicable)",
      "evidenceLevel": "Level A/B/C (if applicable)",
      "recommendation": "Specific recommendation from the guideline",
      "conditionalRules": ["conditions under which this applies"]
    }
  ],
  "deviations": ["any deviations from standard guidelines based on patient factors"],
  "grayAreas": ["areas where guidelines are unclear or conflicting"],
  "recommendedActions": ["specific actions based on guidelines"],
  "confidence": <0-100>
}`;

        const result = await openai.clinicalCompletion(SYSTEM_PROMPTS.guideline, userPrompt, 'guideline') as GuidelineOutput;
        const endTime = new Date();

        await monitor.trackAgentExecution({
            agentType: 'research-guidelines',
            caseId: context.clinicalCase.id,
            patientId: context.patient.id,
            startTime,
            endTime,
            success: true,
            confidence: result.confidence,
        });

        const guidelineOrgs = Array.from(new Set(result.applicableGuidelines?.map(g => g.organization) || []));

        return {
            agentType: "research-guidelines",
            status: "completed",
            startedAt: startTime.toISOString(),
            completedAt: endTime.toISOString(),
            summary: `Guidelines: ${guidelineOrgs.join(', ') || 'None identified'} | ${result.applicableGuidelines?.length || 0} recommendations | ${result.grayAreas?.length || 0} gray areas`,
            details: {
                agentName: "Guideline Agent",
                ...result,
            },
            confidence: result.confidence || 80,
            evidenceSources: guidelineOrgs.map(org => `${org} Guidelines`),
            reasoningChain: result.recommendedActions,
        };
    } catch (error) {
        const endTime = new Date();

        await monitor.trackAgentExecution({
            agentType: 'research-guidelines',
            caseId: context.clinicalCase.id,
            patientId: context.patient.id,
            startTime,
            endTime,
            success: false,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
        });

        return {
            agentType: "research-guidelines",
            status: "error",
            startedAt: startTime.toISOString(),
            completedAt: endTime.toISOString(),
            summary: `Guideline Agent Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            details: { agentName: "Guideline Agent" },
        };
    }
}

// ==========================================
// AGENT 4: Medication Safety Agent
// ==========================================

async function invokeMedicationSafetyAgent(context: AgentContext): Promise<{ output: AgentOutput; alerts: RiskAlert[] }> {
    const startTime = new Date();
    const monitor = getMonitor();

    try {
        const openai = getAzureOpenAI();
        const age = calculateAge(context.patient.demographics.dateOfBirth);

        const userPrompt = `Perform comprehensive medication safety analysis.

PATIENT PROFILE:
- Age: ${age} years
- Gender: ${context.patient.demographics.gender}

CURRENT MEDICATIONS:
${context.patient.medications.filter(m => m.status === 'active').map(m => `- ${m.name} ${m.dosage} ${m.frequency}${m.route ? ` via ${m.route}` : ''}`).join('\n') || '- None documented'}

ALLERGIES:
${context.patient.allergies.map(a => `- ${a.substance}: ${a.reaction} (Severity: ${a.severity})`).join('\n') || '- None documented'}

ACTIVE CONDITIONS (relevant to dosing):
${context.patient.diagnoses.filter(d => d.status === 'active').map(d => `- ${d.display}`).join('\n') || '- None documented'}

CLINICAL CONTEXT:
${context.clinicalCase.clinicalQuestion}

${context.labValues ? `LAB VALUES FOR DOSE ADJUSTMENTS:
- Creatinine: ${context.labValues.creatinine || 'N/A'} mg/dL (renal function)
- Bilirubin: ${context.labValues.bilirubin || 'N/A'} mg/dL (hepatic function)` : ''}

Provide medication safety analysis in JSON format:
{
  "interactions": [
    {
      "drugs": ["Drug A", "Drug B"],
      "severity": "Low|Moderate|High",
      "mechanism": "How they interact",
      "clinicalEffect": "What happens clinically",
      "management": "How to manage"
    }
  ],
  "allergyConflicts": [
    {
      "medication": "Drug name",
      "allergen": "Related allergen",
      "crossReactivity": true/false,
      "recommendation": "What to do"
    }
  ],
  "doseRisks": [
    {
      "medication": "Drug name",
      "concern": "e.g., needs renal adjustment",
      "adjustment": "Specific dose recommendation"
    }
  ],
  "contraindications": [
    {
      "medication": "Drug name",
      "condition": "Condition that contraindicates",
      "severity": "Absolute|Relative",
      "alternative": "Safer alternative if available"
    }
  ],
  "saferAlternatives": ["alternative drug suggestions"],
  "monitoringRecommendations": ["what to monitor"],
  "overallSafetyRisk": "Low|Moderate|High",
  "confidence": <0-100>
}`;

        const result = await openai.clinicalCompletion(SYSTEM_PROMPTS.medicationSafety, userPrompt, 'medication-safety') as MedicationSafetyOutput;
        const endTime = new Date();

        // Generate RiskAlerts from safety findings
        const alerts: RiskAlert[] = [];

        // Convert high-severity interactions to alerts
        for (const interaction of result.interactions?.filter(i => i.severity === "High") || []) {
            alerts.push({
                id: randomUUID(),
                type: "drug-interaction",
                severity: "critical",
                title: `Drug Interaction: ${interaction.drugs.join(' + ')}`,
                description: `${interaction.clinicalEffect}. Mechanism: ${interaction.mechanism}`,
                source: "Medication Safety Agent",
                recommendation: interaction.management,
                createdAt: endTime.toISOString(),
            });
        }

        // Convert allergy conflicts to alerts
        for (const allergy of result.allergyConflicts || []) {
            alerts.push({
                id: randomUUID(),
                type: "allergy",
                severity: allergy.crossReactivity ? "critical" : "warning",
                title: `Allergy Alert: ${allergy.medication}`,
                description: `Patient allergic to ${allergy.allergen}. Cross-reactivity: ${allergy.crossReactivity ? 'Yes' : 'Possible'}`,
                source: "Medication Safety Agent",
                recommendation: allergy.recommendation,
                createdAt: endTime.toISOString(),
            });
        }

        // Convert absolute contraindications to alerts
        for (const contra of result.contraindications?.filter(c => c.severity === "Absolute") || []) {
            alerts.push({
                id: randomUUID(),
                type: "contraindication",
                severity: "critical",
                title: `Contraindication: ${contra.medication}`,
                description: `Contraindicated due to ${contra.condition}`,
                source: "Medication Safety Agent",
                recommendation: contra.alternative ? `Consider alternative: ${contra.alternative}` : 'Avoid this medication',
                createdAt: endTime.toISOString(),
            });
        }

        // Track alerts
        for (const alert of alerts) {
            await monitor.trackRiskAlert(alert, context.clinicalCase.id, context.patient.id);
        }

        await monitor.trackAgentExecution({
            agentType: 'risk-safety',
            caseId: context.clinicalCase.id,
            patientId: context.patient.id,
            startTime,
            endTime,
            success: true,
            confidence: result.confidence,
        });

        return {
            output: {
                agentType: "risk-safety",
                status: "completed",
                startedAt: startTime.toISOString(),
                completedAt: endTime.toISOString(),
                summary: `Safety Risk: ${result.overallSafetyRisk} | ${result.interactions?.length || 0} interactions | ${alerts.length} critical alerts`,
                details: {
                    agentName: "Medication Safety Agent",
                    ...result,
                },
                confidence: result.confidence || 90,
                evidenceSources: ["Drug interaction databases", "FDA drug labels", "Allergy cross-reactivity data"],
                reasoningChain: result.monitoringRecommendations,
            },
            alerts,
        };
    } catch (error) {
        const endTime = new Date();

        await monitor.trackAgentExecution({
            agentType: 'risk-safety',
            caseId: context.clinicalCase.id,
            patientId: context.patient.id,
            startTime,
            endTime,
            success: false,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
        });

        return {
            output: {
                agentType: "risk-safety",
                status: "error",
                startedAt: startTime.toISOString(),
                completedAt: endTime.toISOString(),
                summary: `Medication Safety Agent Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                details: { agentName: "Medication Safety Agent" },
            },
            alerts: [],
        };
    }
}

// ==========================================
// AGENT 5: Evidence Agent
// ==========================================

async function invokeEvidenceAgent(context: AgentContext): Promise<AgentOutput> {
    const startTime = new Date();
    const monitor = getMonitor();

    try {
        const openai = getAzureOpenAI();
        const cognitiveSearch = getCognitiveSearch();

        const diagnosticOutput = context.previousOutputs.find(o => o.details?.agentName === "Diagnostic Agent");
        const guidelineOutput = context.previousOutputs.find(o => o.details?.agentName === "Guideline Agent");

        // Try to retrieve evidence from Azure Cognitive Search
        let retrievedEvidence = '';
        try {
            const searchTerms = [
                context.clinicalCase.clinicalQuestion,
                diagnosticOutput?.details?.primarySuspicion,
                ...guidelineOutput?.details?.recommendedActions?.slice(0, 2) || [],
            ].filter(Boolean).join(' ');

            const ragResult = await cognitiveSearch.ragQuery(searchTerms, {
                clinicalQuestion: context.clinicalCase.clinicalQuestion,
                maxSources: 5,
            });

            if (ragResult.sources.length > 0) {
                retrievedEvidence = `\nRETRIEVED EVIDENCE FROM LITERATURE DATABASE:\n${ragResult.answer}\n\nSources:\n${ragResult.sources.map(s => `- ${s.title} (${s.source})`).join('\n')}`;
            }
        } catch (searchError) {
            console.log('Cognitive Search not available for evidence, using base knowledge');
        }

        const userPrompt = `Retrieve supporting clinical evidence for this case.

CLINICAL QUESTION:
${context.clinicalCase.clinicalQuestion}

PRIMARY DIAGNOSTIC SUSPICION:
${diagnosticOutput?.details?.primarySuspicion || 'Not yet determined'}

DIFFERENTIAL DIAGNOSES:
${diagnosticOutput?.details?.differentialDiagnoses?.slice(0, 3).map((d: any) => `- ${d.diagnosis}`).join('\n') || '- Not available'}

GUIDELINE RECOMMENDATIONS:
${guidelineOutput?.details?.recommendedActions?.join('\n- ') || '- Not available'}

PATIENT CONDITIONS:
${context.patient.diagnoses.filter(d => d.status === 'active').map(d => `- ${d.display}`).join('\n') || '- None documented'}
${retrievedEvidence}

Provide evidence summary in JSON format:
{
  "keyStudies": [
    {
      "title": "Study title",
      "year": 2023,
      "type": "RCT|Meta-analysis|Cohort|Case-control|Case report|Guideline",
      "journal": "Journal name if known",
      "summary": "Key finding in 1-2 sentences",
      "relevance": "Why this is relevant to this case"
    }
  ],
  "evidenceSummary": "Overall summary of the evidence base",
  "strengthOfEvidence": "Strong|Moderate|Limited|Conflicting",
  "limitations": ["limitation 1", "limitation 2"],
  "confidence": <0-100>
}

IMPORTANT: Only cite studies you are confident exist. Do not fabricate study names, authors, or findings.`;

        const result = await openai.clinicalCompletion(SYSTEM_PROMPTS.evidence, userPrompt, 'evidence') as EvidenceOutput;
        const endTime = new Date();

        await monitor.trackAgentExecution({
            agentType: 'labs-reports',
            caseId: context.clinicalCase.id,
            patientId: context.patient.id,
            startTime,
            endTime,
            success: true,
            confidence: result.confidence,
        });

        return {
            agentType: "labs-reports", // Using labs-reports as proxy for evidence
            status: "completed",
            startedAt: startTime.toISOString(),
            completedAt: endTime.toISOString(),
            summary: `Evidence: ${result.strengthOfEvidence} | ${result.keyStudies?.length || 0} studies | ${result.limitations?.length || 0} limitations noted`,
            details: {
                agentName: "Evidence Agent",
                ...result,
            },
            confidence: result.confidence || 75,
            evidenceSources: result.keyStudies?.map(s => `${s.title} (${s.year})`) || ["Clinical literature"],
            reasoningChain: result.limitations,
        };
    } catch (error) {
        const endTime = new Date();

        await monitor.trackAgentExecution({
            agentType: 'labs-reports',
            caseId: context.clinicalCase.id,
            patientId: context.patient.id,
            startTime,
            endTime,
            success: false,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
        });

        return {
            agentType: "labs-reports",
            status: "error",
            startedAt: startTime.toISOString(),
            completedAt: endTime.toISOString(),
            summary: `Evidence Agent Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            details: { agentName: "Evidence Agent" },
        };
    }
}

// ==========================================
// SYNTHESIS ORCHESTRATOR
// ==========================================

async function invokeSynthesisOrchestrator(context: AgentContext): Promise<{ output: AgentOutput; recommendations: Recommendation[] }> {
    const startTime = new Date();
    const monitor = getMonitor();

    try {
        const openai = getAzureOpenAI();

        // Gather all agent outputs
        const triageOutput = context.previousOutputs.find(o => o.details?.agentName === "Triage Agent");
        const diagnosticOutput = context.previousOutputs.find(o => o.details?.agentName === "Diagnostic Agent");
        const guidelineOutput = context.previousOutputs.find(o => o.details?.agentName === "Guideline Agent");
        const safetyOutput = context.previousOutputs.find(o => o.details?.agentName === "Medication Safety Agent");
        const evidenceOutput = context.previousOutputs.find(o => o.details?.agentName === "Evidence Agent");

        const agentSummaries = context.previousOutputs
            .filter(o => o.status === "completed")
            .map(o => `### ${o.details?.agentName || o.agentType}
**Summary:** ${o.summary}
**Confidence:** ${o.confidence}%
**Key Details:** ${JSON.stringify(o.details, null, 2)}`)
            .join('\n\n---\n\n');

        const userPrompt = `Synthesize all agent findings into a unified clinical decision support output.

PATIENT: ${context.patient.demographics.firstName} ${context.patient.demographics.lastName}
MRN: ${context.patient.demographics.mrn}

CLINICAL QUESTION:
${context.clinicalCase.clinicalQuestion}

=== AGENT FINDINGS ===

${agentSummaries}

=== END AGENT FINDINGS ===

Generate the final synthesis in JSON format:
{
  "caseSummary": "Concise 2-3 sentence summary of the case",
  "riskAndUrgency": {
    "urgencyScore": ${triageOutput?.details?.urgencyScore || 5},
    "riskCategory": "${triageOutput?.details?.riskCategory || 'Moderate'}",
    "rationale": "Why this risk level was assigned",
    "immediateActions": ["action 1", "action 2"]
  },
  "differentialDiagnosis": [
    {
      "diagnosis": "Diagnosis name",
      "confidence": <0-100>,
      "supportingEvidence": ["evidence 1", "evidence 2"]
    }
  ],
  "guidelineRecommendations": [
    {
      "guideline": "Guideline name",
      "recommendation": "Specific recommendation",
      "evidenceLevel": "Level A/B/C"
    }
  ],
  "medicationSafety": {
    "overallRisk": "${safetyOutput?.details?.overallSafetyRisk || 'Unknown'}",
    "criticalAlerts": ["alert 1"],
    "recommendations": ["recommendation 1"]
  },
  "supportingEvidence": {
    "keyFindings": ["finding 1"],
    "strengthOfEvidence": "${evidenceOutput?.details?.strengthOfEvidence || 'Limited'}"
  },
  "explainabilityPanel": {
    "whyThisRecommendation": ["reason 1", "reason 2"],
    "keyInfluencingData": ["data point 1", "data point 2"],
    "missingData": ["missing info 1"]
  },
  "overallConfidence": "Low|Medium|High",
  "clinicalDisclaimer": "This is clinical decision support only. All recommendations must be reviewed and validated by a licensed clinician. The final clinical decision rests with the treating physician."
}`;

        const result = await openai.clinicalCompletion(SYSTEM_PROMPTS.synthesisOrchestrator, userPrompt, 'synthesis') as FinalSynthesis;
        const endTime = new Date();

        // Generate recommendations from synthesis
        const recommendations: Recommendation[] = [];

        // Add treatment recommendations from guidelines
        for (const guideline of result.guidelineRecommendations || []) {
            recommendations.push({
                id: randomUUID(),
                caseId: context.clinicalCase.id,
                agentType: "orchestrator",
                category: "Treatment",
                title: guideline.guideline,
                content: guideline.recommendation,
                confidence: result.overallConfidence === "High" ? 85 : result.overallConfidence === "Medium" ? 70 : 55,
                evidenceSources: [guideline.guideline, `Evidence Level: ${guideline.evidenceLevel}`],
                reasoningChain: result.explainabilityPanel?.whyThisRecommendation || [],
                status: "pending",
                createdAt: endTime.toISOString(),
            });
        }

        // Add safety recommendations
        for (const safetyRec of result.medicationSafety?.recommendations || []) {
            recommendations.push({
                id: randomUUID(),
                caseId: context.clinicalCase.id,
                agentType: "orchestrator",
                category: "Safety",
                title: "Medication Safety Recommendation",
                content: safetyRec,
                confidence: 90,
                evidenceSources: ["Medication Safety Analysis"],
                reasoningChain: [],
                status: "pending",
                createdAt: endTime.toISOString(),
            });
        }

        // Add immediate actions as recommendations
        for (const action of result.riskAndUrgency?.immediateActions || []) {
            recommendations.push({
                id: randomUUID(),
                caseId: context.clinicalCase.id,
                agentType: "orchestrator",
                category: "Monitoring",
                title: "Immediate Action Required",
                content: action,
                confidence: 85,
                evidenceSources: ["Triage Assessment"],
                reasoningChain: [],
                status: "pending",
                createdAt: endTime.toISOString(),
            });
        }

        // Track recommendations
        for (const rec of recommendations) {
            await monitor.trackRecommendation(rec, context.patient.id);
        }

        await monitor.trackAgentExecution({
            agentType: 'clinician-interaction',
            caseId: context.clinicalCase.id,
            patientId: context.patient.id,
            startTime,
            endTime,
            success: true,
            confidence: result.overallConfidence === "High" ? 85 : result.overallConfidence === "Medium" ? 70 : 55,
        });

        return {
            output: {
                agentType: "clinician-interaction",
                status: "completed",
                startedAt: startTime.toISOString(),
                completedAt: endTime.toISOString(),
                summary: `${result.caseSummary} | Confidence: ${result.overallConfidence} | ${recommendations.length} recommendations`,
                details: {
                    agentName: "Synthesis Orchestrator",
                    ...result,
                },
                confidence: result.overallConfidence === "High" ? 85 : result.overallConfidence === "Medium" ? 70 : 55,
                evidenceSources: ["All Agent Outputs", "Synthesized Analysis"],
                reasoningChain: result.explainabilityPanel?.whyThisRecommendation,
            },
            recommendations,
        };
    } catch (error) {
        const endTime = new Date();

        await monitor.trackAgentExecution({
            agentType: 'clinician-interaction',
            caseId: context.clinicalCase.id,
            patientId: context.patient.id,
            startTime,
            endTime,
            success: false,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
        });

        return {
            output: {
                agentType: "clinician-interaction",
                status: "error",
                startedAt: startTime.toISOString(),
                completedAt: endTime.toISOString(),
                summary: `Synthesis Orchestrator Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                details: { agentName: "Synthesis Orchestrator" },
            },
            recommendations: [],
        };
    }
}

// ==========================================
// MAIN ANALYSIS FUNCTION
// ==========================================

export async function analyzeCaseWithClinicalAgents(
    patient: Patient,
    clinicalCase: ClinicalCase,
    vitals?: VitalSigns,
    labValues?: LabValues
): Promise<{
    agentOutputs: AgentOutput[];
    recommendations: Recommendation[];
    riskAlerts: RiskAlert[];
    synthesis: FinalSynthesis | null;
}> {
    const analysisStartTime = Date.now();
    const agentOutputs: AgentOutput[] = [];
    const allAlerts: RiskAlert[] = [];
    const allRecommendations: Recommendation[] = [];
    let synthesis: FinalSynthesis | null = null;
    const monitor = getMonitor();

    const context: AgentContext = {
        patient,
        clinicalCase,
        previousOutputs: [],
        vitals,
        labValues,
    };

    try {
        console.log('[HealthMesh] Starting clinical analysis pipeline...');

        // STAGE 1: Triage Agent
        console.log('[HealthMesh] Running Triage Agent...');
        const triageOutput = await invokeTriageAgent(context);
        agentOutputs.push(triageOutput);
        context.previousOutputs = [...agentOutputs];

        // STAGE 2: Diagnostic Agent
        console.log('[HealthMesh] Running Diagnostic Agent...');
        const diagnosticOutput = await invokeDiagnosticAgent(context);
        agentOutputs.push(diagnosticOutput);
        context.previousOutputs = [...agentOutputs];

        // STAGE 3: Guideline Agent
        console.log('[HealthMesh] Running Guideline Agent...');
        const guidelineOutput = await invokeGuidelineAgent(context);
        agentOutputs.push(guidelineOutput);
        context.previousOutputs = [...agentOutputs];

        // STAGE 4: Medication Safety Agent
        console.log('[HealthMesh] Running Medication Safety Agent...');
        const { output: safetyOutput, alerts } = await invokeMedicationSafetyAgent(context);
        agentOutputs.push(safetyOutput);
        allAlerts.push(...alerts);
        context.previousOutputs = [...agentOutputs];

        // STAGE 5: Evidence Agent
        console.log('[HealthMesh] Running Evidence Agent...');
        const evidenceOutput = await invokeEvidenceAgent(context);
        agentOutputs.push(evidenceOutput);
        context.previousOutputs = [...agentOutputs];

        // FINAL STAGE: Synthesis Orchestrator
        console.log('[HealthMesh] Running Synthesis Orchestrator...');
        const { output: synthesisOutput, recommendations } = await invokeSynthesisOrchestrator(context);
        agentOutputs.push(synthesisOutput);
        allRecommendations.push(...recommendations);

        // Extract synthesis from output
        if (synthesisOutput.details && synthesisOutput.details.agentName === "Synthesis Orchestrator") {
            const { agentName, ...rest } = synthesisOutput.details;
            synthesis = rest as FinalSynthesis;
        }

        // Track overall case analysis
        await monitor.trackCaseAnalysis(
            clinicalCase.id,
            patient.id,
            agentOutputs,
            Date.now() - analysisStartTime
        );

        console.log(`[HealthMesh] Analysis complete in ${Date.now() - analysisStartTime}ms`);

    } catch (error) {
        console.error('[HealthMesh] Error during clinical analysis:', error);
    }

    return {
        agentOutputs,
        recommendations: allRecommendations,
        riskAlerts: allAlerts,
        synthesis,
    };
}

// ==========================================
// CLINICIAN CHAT FUNCTION
// ==========================================

export async function handleClinicalChat(
    caseId: string,
    message: string,
    patient: Patient,
    clinicalCase: ClinicalCase
): Promise<string> {
    try {
        const openai = getAzureOpenAI();

        const caseContext = clinicalCase.agentOutputs
            .filter(o => o.status === "completed")
            .map(o => `**${o.details?.agentName || o.agentType}**: ${o.summary}`)
            .join('\n\n');

        const userPrompt = `Answer the clinician's question about this case.

PATIENT: ${patient.demographics.firstName} ${patient.demographics.lastName}
MRN: ${patient.demographics.mrn}

CLINICAL QUESTION: ${clinicalCase.clinicalQuestion}

CASE ANALYSIS:
${caseContext || 'No analysis available yet'}

CURRENT RECOMMENDATIONS:
${clinicalCase.recommendations.map(r => `- [${r.category}] ${r.title}: ${r.content}`).join('\n') || 'No recommendations yet'}

RISK ALERTS:
${clinicalCase.riskAlerts.map(a => `- [${a.severity.toUpperCase()}] ${a.title}: ${a.description}`).join('\n') || 'No alerts'}

CLINICIAN'S QUESTION:
${message}

Respond in JSON format:
{
  "response": "Your detailed, evidence-based response",
  "relatedFindings": ["relevant findings from case analysis"],
  "suggestedFollowUp": ["suggested follow-up questions or actions"],
  "confidence": <0-100>
}`;

        const result = await openai.clinicalCompletion(SYSTEM_PROMPTS.synthesisOrchestrator, userPrompt);
        return result.response || "I apologize, but I was unable to generate a response. Please try rephrasing your question.";
    } catch (error) {
        return `I apologize, but I encountered an error processing your question: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`;
    }
}

// Re-export for backward compatibility
export { analyzeCaseWithClinicalAgents as analyzeCase };
