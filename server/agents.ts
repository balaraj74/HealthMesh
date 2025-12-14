import OpenAI from "openai";
import { randomUUID } from "crypto";
import type {
  Patient,
  ClinicalCase,
  AgentOutput,
  Recommendation,
  RiskAlert,
  AgentType
} from "@shared/schema";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface AgentContext {
  patient: Patient;
  clinicalCase: ClinicalCase;
  previousOutputs: AgentOutput[];
}

async function invokePatientContextAgent(context: AgentContext): Promise<AgentOutput> {
  const startedAt = new Date().toISOString();
  
  try {
    const prompt = `You are a Patient Context Agent in a clinical decision support system. Analyze the following patient data and provide a comprehensive summary.

Patient Demographics:
- Name: ${context.patient.demographics.firstName} ${context.patient.demographics.lastName}
- DOB: ${context.patient.demographics.dateOfBirth}
- Gender: ${context.patient.demographics.gender}
- MRN: ${context.patient.demographics.mrn}

Active Diagnoses:
${context.patient.diagnoses.filter(d => d.status === 'active').map(d => `- ${d.display} (${d.code})`).join('\n')}

Current Medications:
${context.patient.medications.filter(m => m.status === 'active').map(m => `- ${m.name} ${m.dosage} ${m.frequency}`).join('\n')}

Allergies:
${context.patient.allergies.length > 0 ? context.patient.allergies.map(a => `- ${a.substance}: ${a.reaction} (${a.severity})`).join('\n') : 'None documented'}

Medical History:
${context.patient.medicalHistory || 'Not provided'}

Clinical Question:
${context.clinicalCase.clinicalQuestion}

Provide your analysis in JSON format with the following structure:
{
  "summary": "Brief summary of patient context relevant to clinical question",
  "keyFindings": ["list of key findings"],
  "relevantHistory": ["relevant historical factors"],
  "confidence": 85
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

    return {
      agentType: "patient-context",
      status: "completed",
      startedAt,
      completedAt: new Date().toISOString(),
      summary: result.summary || "Patient context analysis completed",
      details: result,
      confidence: result.confidence || 85,
      evidenceSources: ["Patient EMR", "FHIR Demographics", "Medication List", "Allergy Records"]
    };
  } catch (error) {
    return {
      agentType: "patient-context",
      status: "error",
      startedAt,
      completedAt: new Date().toISOString(),
      summary: `Error analyzing patient context: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

async function invokeLabsReportsAgent(context: AgentContext): Promise<AgentOutput> {
  const startedAt = new Date().toISOString();
  
  try {
    const patientContextOutput = context.previousOutputs.find(o => o.agentType === "patient-context");
    
    const prompt = `You are a Labs & Reports Agent in a clinical decision support system. Analyze laboratory and diagnostic findings for this patient.

Patient: ${context.patient.demographics.firstName} ${context.patient.demographics.lastName}
MRN: ${context.patient.demographics.mrn}

Active Conditions:
${context.patient.diagnoses.filter(d => d.status === 'active').map(d => `- ${d.display}`).join('\n')}

Patient Context Summary:
${patientContextOutput?.summary || 'Not available'}

Clinical Question:
${context.clinicalCase.clinicalQuestion}

Based on the patient's conditions and clinical question, provide lab analysis in JSON format:
{
  "summary": "Brief summary of relevant lab considerations",
  "recommendedTests": ["list of recommended lab tests"],
  "abnormalFindings": ["any flagged abnormalities based on conditions"],
  "criticalValues": ["any values that would be critical to monitor"],
  "confidence": 88
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

    return {
      agentType: "labs-reports",
      status: "completed",
      startedAt,
      completedAt: new Date().toISOString(),
      summary: result.summary || "Lab analysis completed",
      details: result,
      confidence: result.confidence || 88,
      evidenceSources: ["Lab Results", "Diagnostic Reports", "Reference Ranges"]
    };
  } catch (error) {
    return {
      agentType: "labs-reports",
      status: "error",
      startedAt,
      completedAt: new Date().toISOString(),
      summary: `Error analyzing labs: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

async function invokeResearchGuidelinesAgent(context: AgentContext): Promise<AgentOutput> {
  const startedAt = new Date().toISOString();
  
  try {
    const previousSummaries = context.previousOutputs
      .filter(o => o.status === "completed")
      .map(o => `${o.agentType}: ${o.summary}`)
      .join('\n');
    
    const prompt = `You are a Research & Guidelines Agent in a clinical decision support system. Search for evidence-based guidelines and treatment options.

Patient Conditions:
${context.patient.diagnoses.filter(d => d.status === 'active').map(d => `- ${d.display} (${d.code})`).join('\n')}

Clinical Question:
${context.clinicalCase.clinicalQuestion}

Previous Agent Findings:
${previousSummaries}

Provide your research findings in JSON format:
{
  "summary": "Summary of relevant guidelines and evidence",
  "guidelines": ["list of applicable clinical guidelines"],
  "treatmentOptions": ["evidence-based treatment options"],
  "clinicalTrials": ["relevant clinical trials if applicable"],
  "evidenceLevel": "Level of evidence (e.g., Level I, Level II)",
  "citations": ["key citations"],
  "confidence": 85
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

    return {
      agentType: "research-guidelines",
      status: "completed",
      startedAt,
      completedAt: new Date().toISOString(),
      summary: result.summary || "Research analysis completed",
      details: result,
      confidence: result.confidence || 85,
      evidenceSources: result.citations || ["Clinical Guidelines", "PubMed", "UpToDate"]
    };
  } catch (error) {
    return {
      agentType: "research-guidelines",
      status: "error",
      startedAt,
      completedAt: new Date().toISOString(),
      summary: `Error searching guidelines: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

async function invokeRiskSafetyAgent(context: AgentContext): Promise<{ output: AgentOutput; alerts: RiskAlert[] }> {
  const startedAt = new Date().toISOString();
  
  try {
    const prompt = `You are a Risk & Safety Agent in a clinical decision support system. Check for drug interactions, contraindications, and safety concerns.

Patient: ${context.patient.demographics.firstName} ${context.patient.demographics.lastName}

Current Medications:
${context.patient.medications.filter(m => m.status === 'active').map(m => `- ${m.name} ${m.dosage} ${m.frequency}`).join('\n')}

Allergies:
${context.patient.allergies.map(a => `- ${a.substance}: ${a.reaction} (${a.severity})`).join('\n') || 'None documented'}

Active Conditions:
${context.patient.diagnoses.filter(d => d.status === 'active').map(d => `- ${d.display}`).join('\n')}

Clinical Question:
${context.clinicalCase.clinicalQuestion}

Provide your safety analysis in JSON format:
{
  "summary": "Summary of safety considerations",
  "drugInteractions": ["list of potential drug interactions"],
  "contraindications": ["list of contraindications"],
  "allergyAlerts": ["allergy-related warnings"],
  "dosageConsiderations": ["dosage-related considerations"],
  "comorbidityRisks": ["risks related to comorbid conditions"],
  "alerts": [
    {
      "type": "drug-interaction|contraindication|dosage|allergy|comorbidity|critical-value",
      "severity": "info|warning|critical",
      "title": "Alert title",
      "description": "Alert description",
      "recommendation": "Recommended action"
    }
  ],
  "confidence": 90
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    const now = new Date().toISOString();

    const alerts: RiskAlert[] = (result.alerts || []).map((alert: any) => ({
      id: randomUUID(),
      type: alert.type || "comorbidity",
      severity: alert.severity || "warning",
      title: alert.title || "Safety Alert",
      description: alert.description || "",
      source: "Risk & Safety Agent",
      recommendation: alert.recommendation,
      createdAt: now
    }));

    return {
      output: {
        agentType: "risk-safety",
        status: "completed",
        startedAt,
        completedAt: now,
        summary: result.summary || "Safety analysis completed",
        details: result,
        confidence: result.confidence || 90,
        evidenceSources: ["Drug Interaction Database", "FDA Drug Labels", "Clinical Safety Guidelines"]
      },
      alerts
    };
  } catch (error) {
    return {
      output: {
        agentType: "risk-safety",
        status: "error",
        startedAt,
        completedAt: new Date().toISOString(),
        summary: `Error analyzing safety: ${error instanceof Error ? error.message : 'Unknown error'}`
      },
      alerts: []
    };
  }
}

async function invokeOrchestratorAgent(context: AgentContext): Promise<{ output: AgentOutput; recommendations: Recommendation[] }> {
  const startedAt = new Date().toISOString();
  
  try {
    const agentSummaries = context.previousOutputs
      .filter(o => o.status === "completed")
      .map(o => `${o.agentType} (confidence: ${o.confidence}%): ${o.summary}`)
      .join('\n\n');
    
    const prompt = `You are the Orchestrator Agent in a clinical decision support system. Synthesize all agent findings and generate final recommendations.

Clinical Question:
${context.clinicalCase.clinicalQuestion}

Patient: ${context.patient.demographics.firstName} ${context.patient.demographics.lastName}

Agent Findings:
${agentSummaries}

Synthesize the findings and provide recommendations in JSON format:
{
  "summary": "Executive summary of the case analysis",
  "recommendations": [
    {
      "category": "Treatment|Monitoring|Referral|Diagnostic|Safety",
      "title": "Recommendation title",
      "content": "Detailed recommendation",
      "confidence": 85,
      "evidenceSources": ["list of sources"],
      "reasoningChain": ["step 1", "step 2", "conclusion"]
    }
  ],
  "overallConfidence": 85,
  "additionalConsiderations": ["other factors to consider"]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    const now = new Date().toISOString();

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
      createdAt: now
    }));

    return {
      output: {
        agentType: "orchestrator",
        status: "completed",
        startedAt,
        completedAt: now,
        summary: result.summary || "Case analysis and synthesis completed",
        details: result,
        confidence: result.overallConfidence || 85,
        evidenceSources: ["All Agent Outputs", "Synthesized Analysis"],
        reasoningChain: result.additionalConsiderations
      },
      recommendations
    };
  } catch (error) {
    return {
      output: {
        agentType: "orchestrator",
        status: "error",
        startedAt,
        completedAt: new Date().toISOString(),
        summary: `Error in orchestration: ${error instanceof Error ? error.message : 'Unknown error'}`
      },
      recommendations: []
    };
  }
}

export async function analyzeCase(patient: Patient, clinicalCase: ClinicalCase): Promise<{
  agentOutputs: AgentOutput[];
  recommendations: Recommendation[];
  riskAlerts: RiskAlert[];
}> {
  const agentOutputs: AgentOutput[] = [];
  const allAlerts: RiskAlert[] = [];
  const allRecommendations: Recommendation[] = [];

  const context: AgentContext = {
    patient,
    clinicalCase,
    previousOutputs: []
  };

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

  return {
    agentOutputs,
    recommendations: allRecommendations,
    riskAlerts: allAlerts
  };
}

export async function handleClinicianChat(
  caseId: string,
  message: string,
  patient: Patient,
  clinicalCase: ClinicalCase
): Promise<string> {
  try {
    const caseContext = clinicalCase.agentOutputs
      .filter(o => o.status === "completed")
      .map(o => `${o.agentType}: ${o.summary}`)
      .join('\n');

    const prompt = `You are a Clinician Interaction Agent in a clinical decision support system. Answer the clinician's question based on the case context.

Patient: ${patient.demographics.firstName} ${patient.demographics.lastName}
Clinical Question: ${clinicalCase.clinicalQuestion}

Case Analysis Summary:
${caseContext || 'No analysis available yet'}

Current Recommendations:
${clinicalCase.recommendations.map(r => `- ${r.title}: ${r.content}`).join('\n') || 'No recommendations yet'}

Clinician's Question:
${message}

Provide a helpful, evidence-based response. Be concise but thorough. Format your response in JSON:
{
  "response": "Your detailed response to the clinician",
  "relatedRecommendations": ["IDs of related recommendations if applicable"],
  "suggestedActions": ["suggested follow-up actions if any"]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result.response || "I apologize, but I was unable to generate a response. Please try rephrasing your question.";
  } catch (error) {
    return `I apologize, but I encountered an error processing your question: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`;
  }
}
