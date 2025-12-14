/**
 * HealthMesh - Azure-Powered Clinical Agents
 * Multi-agent AI system using Azure OpenAI, FHIR, Document Intelligence, and Cognitive Search
 */

import { randomUUID } from "crypto";
import type {
  Patient,
  ClinicalCase,
  AgentOutput,
  Recommendation,
  RiskAlert,
  AgentType,
  LabReport,
  LabResult
} from "@shared/schema";
import { getAzureOpenAI } from "./azure/openai-client";
import { getCognitiveSearch } from "./azure/cognitive-search";
import { getDocumentIntelligence } from "./azure/document-intelligence";
import { getMonitor } from "./azure/monitoring";

// ==========================================
// Agent Context Types
// ==========================================

interface AgentContext {
  patient: Patient;
  clinicalCase: ClinicalCase;
  previousOutputs: AgentOutput[];
}

// ==========================================
// System Prompts for Clinical Agents
// ==========================================

const SYSTEM_PROMPTS = {
  patientContext: `You are a Patient Context Agent in the HealthMesh clinical decision support system.
Your role is to analyze patient demographics, medical history, diagnoses, medications, and allergies to provide a comprehensive clinical context.

CRITICAL RULES:
1. Extract and summarize relevant patient information
2. Identify key risk factors and comorbidities
3. Highlight medication considerations
4. Note any gaps in patient information
5. This is DECISION SUPPORT only - never provide diagnoses

Always respond in valid JSON format.`,

  labsReports: `You are a Labs & Reports Agent in the HealthMesh clinical decision support system.
Your role is to analyze laboratory results, identify abnormalities, and provide clinical interpretation.

CRITICAL RULES:
1. Flag abnormal and critical values clearly
2. Correlate lab findings with patient conditions
3. Suggest additional tests if warranted
4. Reference standard reference ranges
5. This is DECISION SUPPORT only - never provide diagnoses

Always respond in valid JSON format.`,

  researchGuidelines: `You are a Research & Guidelines Agent in the HealthMesh clinical decision support system.
Your role is to provide evidence-based medical information and cite clinical guidelines.

CRITICAL RULES:
1. Only cite information from provided sources
2. Indicate evidence levels (Level I, II, III, etc.)
3. Reference specific guidelines (NCCN, ADA, ACC/AHA, etc.)
4. Acknowledge limitations and uncertainties
5. This is DECISION SUPPORT only - never provide diagnoses

Use [Source N] format for citations. Always respond in valid JSON format.`,

  riskSafety: `You are a Risk & Safety Agent in the HealthMesh clinical decision support system.
Your role is to identify drug interactions, contraindications, dosage concerns, and safety risks.

CRITICAL RULES:
1. Check all medications for interactions
2. Verify contraindications against patient conditions
3. Flag dosage concerns for renal/hepatic impairment
4. Identify allergy cross-reactivity risks
5. Classify severity: info, warning, critical
6. This is DECISION SUPPORT only - never provide diagnoses

Always respond in valid JSON format.`,

  orchestrator: `You are the Orchestrator Agent in the HealthMesh clinical decision support system.
Your role is to synthesize findings from all other agents and generate actionable recommendations.

CRITICAL RULES:
1. Integrate findings from Patient Context, Labs, Research, and Safety agents
2. Resolve conflicting information with reasoning
3. Prioritize recommendations by clinical importance
4. Provide clear evidence chains for each recommendation
5. Calculate overall confidence based on agent agreement
6. This is DECISION SUPPORT only - never provide diagnoses

Always respond in valid JSON format.`,

  clinicianChat: `You are a Clinician Interaction Agent in the HealthMesh clinical decision support system.
Your role is to answer clinician questions about patient cases using case context and agent findings.

CRITICAL RULES:
1. Use only information from the provided case context
2. Acknowledge uncertainty when information is incomplete
3. Reference specific agent findings when applicable
4. Suggest additional considerations when relevant
5. Be concise but thorough
6. This is DECISION SUPPORT only - never provide diagnoses

Always respond in valid JSON format.`,
};

// ==========================================
// Patient Context Agent (with FHIR support)
// ==========================================

async function invokePatientContextAgent(context: AgentContext): Promise<AgentOutput> {
  const startTime = new Date();
  const monitor = getMonitor();
  
  try {
    const openai = getAzureOpenAI();

    const userPrompt = `Analyze the following patient data and provide a comprehensive clinical context summary.

Patient Demographics:
- Name: ${context.patient.demographics.firstName} ${context.patient.demographics.lastName}
- DOB: ${context.patient.demographics.dateOfBirth}
- Gender: ${context.patient.demographics.gender}
- MRN: ${context.patient.demographics.mrn}

Active Diagnoses:
${context.patient.diagnoses.filter(d => d.status === 'active').map(d => `- ${d.display} (${d.codeSystem}: ${d.code})`).join('\n') || 'None documented'}

Current Medications:
${context.patient.medications.filter(m => m.status === 'active').map(m => `- ${m.name} ${m.dosage} ${m.frequency}${m.route ? ` via ${m.route}` : ''}`).join('\n') || 'None documented'}

Allergies:
${context.patient.allergies.length > 0 ? context.patient.allergies.map(a => `- ${a.substance}: ${a.reaction} (Severity: ${a.severity})`).join('\n') : 'None documented'}

Medical History:
${context.patient.medicalHistory || 'Not provided'}

Clinical Question:
${context.clinicalCase.clinicalQuestion}

Provide your analysis in JSON format:
{
  "summary": "Brief summary of patient context relevant to clinical question",
  "keyFindings": ["list of key clinical findings"],
  "riskFactors": ["identified risk factors"],
  "relevantHistory": ["relevant historical factors"],
  "medicationConsiderations": ["medication-related considerations"],
  "informationGaps": ["any missing or incomplete information"],
  "confidence": 85
}`;

    const result = await openai.clinicalCompletion(SYSTEM_PROMPTS.patientContext, userPrompt);
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

    return {
      agentType: "patient-context",
      status: "completed",
      startedAt: startTime.toISOString(),
      completedAt: endTime.toISOString(),
      summary: result.summary || "Patient context analysis completed",
      details: result,
      confidence: result.confidence || 85,
      evidenceSources: ["Patient EMR", "FHIR Demographics", "Medication List", "Allergy Records"]
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
      summary: `Error analyzing patient context: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// ==========================================
// Labs & Reports Agent (with Document Intelligence)
// ==========================================

async function invokeLabsReportsAgent(context: AgentContext): Promise<AgentOutput> {
  const startTime = new Date();
  const monitor = getMonitor();
  
  try {
    const openai = getAzureOpenAI();
    const patientContextOutput = context.previousOutputs.find(o => o.agentType === "patient-context");

    // Get lab data from case if available
    const labData = context.clinicalCase.labReports?.length > 0
      ? `Uploaded lab reports: ${context.clinicalCase.labReports.length} documents processed`
      : 'No lab reports uploaded';

    const userPrompt = `Analyze laboratory and diagnostic findings for this patient.

Patient: ${context.patient.demographics.firstName} ${context.patient.demographics.lastName}
MRN: ${context.patient.demographics.mrn}

Active Conditions:
${context.patient.diagnoses.filter(d => d.status === 'active').map(d => `- ${d.display}`).join('\n') || 'None documented'}

Patient Context Summary:
${patientContextOutput?.summary || 'Not available'}

Lab Data Status:
${labData}

Clinical Question:
${context.clinicalCase.clinicalQuestion}

Based on the patient's conditions and clinical question, provide lab analysis in JSON format:
{
  "summary": "Brief summary of relevant lab considerations",
  "currentLabFindings": ["list of known lab findings if any"],
  "recommendedTests": [
    {
      "testName": "Test name",
      "rationale": "Why this test is recommended",
      "priority": "routine|urgent|stat"
    }
  ],
  "abnormalFindings": ["any flagged abnormalities based on conditions"],
  "criticalValues": ["any values that would be critical to monitor"],
  "labPatterns": ["identified patterns suggesting specific conditions"],
  "confidence": 88
}`;

    const result = await openai.clinicalCompletion(SYSTEM_PROMPTS.labsReports, userPrompt);
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
      agentType: "labs-reports",
      status: "completed",
      startedAt: startTime.toISOString(),
      completedAt: endTime.toISOString(),
      summary: result.summary || "Lab analysis completed",
      details: result,
      confidence: result.confidence || 88,
      evidenceSources: ["Lab Results", "Diagnostic Reports", "Reference Ranges", "Azure Document Intelligence"]
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
      summary: `Error analyzing labs: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// ==========================================
// Research & Guidelines Agent (with Cognitive Search RAG)
// ==========================================

async function invokeResearchGuidelinesAgent(context: AgentContext): Promise<AgentOutput> {
  const startTime = new Date();
  const monitor = getMonitor();
  
  try {
    const openai = getAzureOpenAI();
    const cognitiveSearch = getCognitiveSearch();

    const previousSummaries = context.previousOutputs
      .filter(o => o.status === "completed")
      .map(o => `${o.agentType}: ${o.summary}`)
      .join('\n');

    // Build search query from patient conditions and clinical question
    const searchTerms = [
      context.clinicalCase.clinicalQuestion,
      ...context.patient.diagnoses.filter(d => d.status === 'active').map(d => d.display),
    ].join(' ');

    // Try to use Azure Cognitive Search for RAG
    let retrievedGuidelines = '';
    let citations: string[] = [];

    try {
      const ragResult = await cognitiveSearch.ragQuery(searchTerms, {
        patientContext: previousSummaries,
        clinicalQuestion: context.clinicalCase.clinicalQuestion,
        maxSources: 5,
      });

      if (ragResult.sources.length > 0) {
        retrievedGuidelines = ragResult.answer;
        citations = ragResult.sources.map(s => `${s.title} (${s.source})`);
      }
    } catch (searchError) {
      // Fallback to base knowledge if search fails
      console.log('Cognitive Search not available, using base knowledge');
    }

    const userPrompt = `Search for evidence-based guidelines and treatment options.

Patient Conditions:
${context.patient.diagnoses.filter(d => d.status === 'active').map(d => `- ${d.display} (${d.code})`).join('\n') || 'None documented'}

Clinical Question:
${context.clinicalCase.clinicalQuestion}

Previous Agent Findings:
${previousSummaries}

${retrievedGuidelines ? `Retrieved Guidelines (from Azure Cognitive Search):
${retrievedGuidelines}

` : ''}Provide your research findings in JSON format:
{
  "summary": "Summary of relevant guidelines and evidence",
  "guidelines": [
    {
      "name": "Guideline name (e.g., NCCN Breast Cancer 2024)",
      "recommendation": "Key recommendation",
      "evidenceLevel": "Level I/II/III/IV/V",
      "source": "Organization name"
    }
  ],
  "treatmentOptions": [
    {
      "option": "Treatment option",
      "indication": "When to consider",
      "evidenceLevel": "Level of evidence"
    }
  ],
  "clinicalTrials": ["relevant clinical trials if applicable"],
  "contraindications": ["conditions or factors that may contraindicate certain treatments"],
  "citations": ${JSON.stringify(citations.length > 0 ? citations : ["Clinical guidelines databases"])},
  "confidence": 85
}`;

    const result = await openai.clinicalCompletion(SYSTEM_PROMPTS.researchGuidelines, userPrompt);
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

    return {
      agentType: "research-guidelines",
      status: "completed",
      startedAt: startTime.toISOString(),
      completedAt: endTime.toISOString(),
      summary: result.summary || "Research analysis completed",
      details: result,
      confidence: result.confidence || 85,
      evidenceSources: result.citations || citations || ["Clinical Guidelines", "Azure Cognitive Search", "Medical Literature"]
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
      summary: `Error searching guidelines: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// ==========================================
// Risk & Safety Agent (Drug Interactions & Contraindications)
// ==========================================

async function invokeRiskSafetyAgent(context: AgentContext): Promise<{ output: AgentOutput; alerts: RiskAlert[] }> {
  const startTime = new Date();
  const monitor = getMonitor();
  
  try {
    const openai = getAzureOpenAI();

    const userPrompt = `Check for drug interactions, contraindications, and safety concerns.

Patient: ${context.patient.demographics.firstName} ${context.patient.demographics.lastName}
Age: ${calculateAge(context.patient.demographics.dateOfBirth)} years
Gender: ${context.patient.demographics.gender}

Current Medications:
${context.patient.medications.filter(m => m.status === 'active').map(m => `- ${m.name} ${m.dosage} ${m.frequency}`).join('\n') || 'None documented'}

Allergies:
${context.patient.allergies.map(a => `- ${a.substance}: ${a.reaction} (Severity: ${a.severity})`).join('\n') || 'None documented'}

Active Conditions:
${context.patient.diagnoses.filter(d => d.status === 'active').map(d => `- ${d.display}`).join('\n') || 'None documented'}

Clinical Question:
${context.clinicalCase.clinicalQuestion}

Provide your safety analysis in JSON format:
{
  "summary": "Summary of safety considerations",
  "drugInteractions": [
    {
      "drugs": ["Drug A", "Drug B"],
      "severity": "major|moderate|minor",
      "effect": "Description of interaction effect",
      "management": "How to manage"
    }
  ],
  "contraindications": [
    {
      "medication": "Drug name",
      "condition": "Condition that contraindicates",
      "severity": "absolute|relative",
      "recommendation": "What to do"
    }
  ],
  "allergyAlerts": [
    {
      "allergen": "Substance",
      "crossReactivity": ["related substances"],
      "recommendation": "Avoid or monitor"
    }
  ],
  "dosageConsiderations": [
    {
      "medication": "Drug name",
      "concern": "e.g., renal adjustment needed",
      "recommendation": "Specific dosage guidance"
    }
  ],
  "alerts": [
    {
      "type": "drug-interaction|contraindication|dosage|allergy|comorbidity|critical-value",
      "severity": "info|warning|critical",
      "title": "Alert title",
      "description": "Alert description",
      "recommendation": "Recommended action"
    }
  ],
  "overallRiskLevel": "low|moderate|high",
  "confidence": 90
}`;

    const result = await openai.clinicalCompletion(SYSTEM_PROMPTS.riskSafety, userPrompt);
    const endTime = new Date();

    const alerts: RiskAlert[] = (result.alerts || []).map((alert: any) => ({
      id: randomUUID(),
      type: alert.type || "comorbidity",
      severity: alert.severity || "warning",
      title: alert.title || "Safety Alert",
      description: alert.description || "",
      source: "Risk & Safety Agent (Azure OpenAI)",
      recommendation: alert.recommendation,
      createdAt: endTime.toISOString()
    }));

    // Track each alert in monitoring
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
        summary: result.summary || "Safety analysis completed",
        details: result,
        confidence: result.confidence || 90,
        evidenceSources: ["Drug Interaction Database", "FDA Drug Labels", "Clinical Safety Guidelines"]
      },
      alerts
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
        summary: `Error analyzing safety: ${error instanceof Error ? error.message : 'Unknown error'}`
      },
      alerts: []
    };
  }
}

// ==========================================
// Orchestrator Agent (Synthesis & Recommendations)
// ==========================================

async function invokeOrchestratorAgent(context: AgentContext): Promise<{ output: AgentOutput; recommendations: Recommendation[] }> {
  const startTime = new Date();
  const monitor = getMonitor();
  
  try {
    const openai = getAzureOpenAI();

    const agentSummaries = context.previousOutputs
      .filter(o => o.status === "completed")
      .map(o => `**${o.agentType}** (Confidence: ${o.confidence}%):
Summary: ${o.summary}
Key Details: ${JSON.stringify(o.details, null, 2)}`)
      .join('\n\n---\n\n');

    const userPrompt = `Synthesize all agent findings and generate final clinical recommendations.

Clinical Question:
${context.clinicalCase.clinicalQuestion}

Patient: ${context.patient.demographics.firstName} ${context.patient.demographics.lastName}
MRN: ${context.patient.demographics.mrn}

Agent Findings:
${agentSummaries}

Synthesize the findings and provide recommendations in JSON format:
{
  "executiveSummary": "2-3 sentence executive summary of the case analysis",
  "keyFindings": [
    {
      "finding": "Key finding",
      "source": "Which agent(s) identified this",
      "confidence": 85
    }
  ],
  "recommendations": [
    {
      "category": "Treatment|Monitoring|Referral|Diagnostic|Safety|Lifestyle",
      "priority": "high|medium|low",
      "title": "Recommendation title",
      "content": "Detailed recommendation with specific actions",
      "rationale": "Why this is recommended",
      "confidence": 85,
      "evidenceSources": ["list of sources supporting this recommendation"],
      "reasoningChain": ["step 1 of reasoning", "step 2", "conclusion"]
    }
  ],
  "risksAndConsiderations": ["factors to consider or monitor"],
  "followUpActions": ["specific follow-up actions"],
  "overallConfidence": 85,
  "agentAgreement": "high|moderate|low",
  "limitationsAndUncertainties": ["areas of uncertainty or incomplete information"]
}`;

    const result = await openai.clinicalCompletion(SYSTEM_PROMPTS.orchestrator, userPrompt);
    const endTime = new Date();

    const recommendations: Recommendation[] = (result.recommendations || []).map((rec: any) => ({
      id: randomUUID(),
      caseId: context.clinicalCase.id,
      agentType: "orchestrator" as AgentType,
      category: rec.category || "Treatment",
      title: rec.title || "Recommendation",
      content: rec.content || "",
      confidence: rec.confidence || 80,
      evidenceSources: rec.evidenceSources || [],
      reasoningChain: rec.reasoningChain || [],
      status: "pending",
      createdAt: endTime.toISOString()
    }));

    // Track each recommendation
    for (const rec of recommendations) {
      await monitor.trackRecommendation(rec, context.patient.id);
    }

    await monitor.trackAgentExecution({
      agentType: 'orchestrator',
      caseId: context.clinicalCase.id,
      patientId: context.patient.id,
      startTime,
      endTime,
      success: true,
      confidence: result.overallConfidence,
    });

    return {
      output: {
        agentType: "orchestrator",
        status: "completed",
        startedAt: startTime.toISOString(),
        completedAt: endTime.toISOString(),
        summary: result.executiveSummary || "Case analysis and synthesis completed",
        details: result,
        confidence: result.overallConfidence || 85,
        evidenceSources: ["All Agent Outputs", "Synthesized Analysis"],
        reasoningChain: result.limitationsAndUncertainties
      },
      recommendations
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
      output: {
        agentType: "orchestrator",
        status: "error",
        startedAt: startTime.toISOString(),
        completedAt: endTime.toISOString(),
        summary: `Error in orchestration: ${error instanceof Error ? error.message : 'Unknown error'}`
      },
      recommendations: []
    };
  }
}

// ==========================================
// Main Case Analysis Function
// ==========================================

export async function analyzeCase(patient: Patient, clinicalCase: ClinicalCase): Promise<{
  agentOutputs: AgentOutput[];
  recommendations: Recommendation[];
  riskAlerts: RiskAlert[];
}> {
  const analysisStartTime = Date.now();
  const agentOutputs: AgentOutput[] = [];
  const allAlerts: RiskAlert[] = [];
  const allRecommendations: Recommendation[] = [];
  const monitor = getMonitor();

  const context: AgentContext = {
    patient,
    clinicalCase,
    previousOutputs: []
  };

  try {
    // Run Patient Context Agent
    const patientContextOutput = await invokePatientContextAgent(context);
    agentOutputs.push(patientContextOutput);
    context.previousOutputs = [...agentOutputs];

    // Run Labs & Reports Agent
    const labsOutput = await invokeLabsReportsAgent(context);
    agentOutputs.push(labsOutput);
    context.previousOutputs = [...agentOutputs];

    // Run Research & Guidelines Agent
    const researchOutput = await invokeResearchGuidelinesAgent(context);
    agentOutputs.push(researchOutput);
    context.previousOutputs = [...agentOutputs];

    // Run Risk & Safety Agent
    const { output: riskOutput, alerts } = await invokeRiskSafetyAgent(context);
    agentOutputs.push(riskOutput);
    allAlerts.push(...alerts);
    context.previousOutputs = [...agentOutputs];

    // Run Orchestrator Agent
    const { output: orchestratorOutput, recommendations } = await invokeOrchestratorAgent(context);
    agentOutputs.push(orchestratorOutput);
    allRecommendations.push(...recommendations);

    // Track overall case analysis
    await monitor.trackCaseAnalysis(
      clinicalCase.id,
      patient.id,
      agentOutputs,
      Date.now() - analysisStartTime
    );

  } catch (error) {
    console.error('Error during case analysis:', error);
  }

  return {
    agentOutputs,
    recommendations: allRecommendations,
    riskAlerts: allAlerts
  };
}

// ==========================================
// Clinician Chat Function
// ==========================================

export async function handleClinicianChat(
  caseId: string,
  message: string,
  patient: Patient,
  clinicalCase: ClinicalCase
): Promise<string> {
  try {
    const openai = getAzureOpenAI();

    const caseContext = clinicalCase.agentOutputs
      .filter(o => o.status === "completed")
      .map(o => `**${o.agentType}**: ${o.summary}`)
      .join('\n\n');

    const userPrompt = `Answer the clinician's question based on the case context.

Patient: ${patient.demographics.firstName} ${patient.demographics.lastName}
MRN: ${patient.demographics.mrn}
Clinical Question: ${clinicalCase.clinicalQuestion}

Case Analysis Summary:
${caseContext || 'No analysis available yet'}

Current Recommendations:
${clinicalCase.recommendations.map(r => `- [${r.category}] ${r.title}: ${r.content}`).join('\n') || 'No recommendations yet'}

Risk Alerts:
${clinicalCase.riskAlerts.map(a => `- [${a.severity.toUpperCase()}] ${a.title}: ${a.description}`).join('\n') || 'No alerts'}

Clinician's Question:
${message}

Provide a helpful, evidence-based response in JSON format:
{
  "response": "Your detailed response to the clinician (use markdown formatting)",
  "relatedFindings": ["relevant findings from case analysis"],
  "suggestedActions": ["suggested follow-up actions if any"],
  "limitations": ["any limitations in the available information"]
}`;

    const result = await openai.clinicalCompletion(SYSTEM_PROMPTS.clinicianChat, userPrompt);
    return result.response || "I apologize, but I was unable to generate a response. Please try rephrasing your question.";
  } catch (error) {
    return `I apologize, but I encountered an error processing your question: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`;
  }
}

// ==========================================
// Lab Report Processing Function
// ==========================================

export async function processLabReport(
  documentBuffer: Buffer,
  contentType: string,
  caseId: string
): Promise<{
  success: boolean;
  labResults: LabResult[];
  documentType: string;
  confidence: number;
  rawText: string;
}> {
  const monitor = getMonitor();
  const startTime = Date.now();

  try {
    const docIntelligence = getDocumentIntelligence();
    const extractionResult = await docIntelligence.analyzeDocument(documentBuffer, contentType);

    const labResults = docIntelligence.toLabResults(
      extractionResult.labResults,
      new Date().toISOString()
    );

    const abnormalCount = labResults.filter(r => r.status !== 'normal').length;

    await monitor.trackLabReportProcessing(
      randomUUID(),
      caseId,
      extractionResult.documentType,
      labResults.length,
      abnormalCount,
      extractionResult.processingTime
    );

    return {
      success: extractionResult.success,
      labResults,
      documentType: extractionResult.documentType,
      confidence: extractionResult.confidence,
      rawText: extractionResult.extractedText,
    };
  } catch (error) {
    console.error('Error processing lab report:', error);
    return {
      success: false,
      labResults: [],
      documentType: 'unknown',
      confidence: 0,
      rawText: '',
    };
  }
}

// ==========================================
// Utility Functions
// ==========================================

function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}
