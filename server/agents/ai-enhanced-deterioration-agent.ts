/**
 * AI-Enhanced Early Deterioration Detection Agent
 * Uses Azure OpenAI / Gemini for intelligent pattern recognition
 * 
 * This enhanced version combines:
 * 1. Traditional clinical scoring (NEWS2, qSOFA)
 * 2. AI trend analysis and pattern recognition
 * 3. Explainable clinical reasoning
 */

import { randomUUID } from "crypto";
import {
    VitalObservation,
    LabObservation,
    OxygenSupport,
    MedicationEvent,
    PatientContext,
    DeteriorationInput,
    DeteriorationAlert,
    DeteriorationSignal,
    ClinicalRecommendation,
    RiskLevel,
    Trajectory,
    earlyDeteriorationAgent,
} from "./early-deterioration-agent";

// ============================================================================
// AI-ENHANCED DETERIORATION ANALYZER
// ============================================================================

export interface AIEnhancedAnalysisResult extends DeteriorationAlert {
    aiInsights: {
        patternRecognition: string;
        predictedTrajectory: string;
        urgencyAssessment: string;
        differentialConsiderations: string[];
        recommendedInterventions: string[];
        confidenceExplanation: string;
    };
    aiModelUsed: string;
    aiAnalysisTime: number;
}

export class AIEnhancedDeteriorationAgent {
    private baseAgent = earlyDeteriorationAgent;

    async analyzeWithAI(
        input: DeteriorationInput,
        useAI: boolean = true
    ): Promise<AIEnhancedAnalysisResult> {
        const startTime = Date.now();

        // Step 1: Run base clinical analysis
        const baseAlert = await this.baseAgent.analyze(input);

        // Step 2: Enhance with AI if enabled
        let aiInsights = {
            patternRecognition: "",
            predictedTrajectory: "",
            urgencyAssessment: "",
            differentialConsiderations: [] as string[],
            recommendedInterventions: [] as string[],
            confidenceExplanation: "",
        };

        let aiModelUsed = "None";

        if (useAI) {
            try {
                const aiResult = await this.getAIAnalysis(input, baseAlert);
                aiInsights = aiResult.insights;
                aiModelUsed = aiResult.model;
            } catch (error) {
                console.warn("[AI Deterioration] AI analysis failed, using base only:", error);
                aiInsights = this.getFallbackInsights(baseAlert);
                aiModelUsed = "Fallback (deterministic)";
            }
        } else {
            aiInsights = this.getFallbackInsights(baseAlert);
            aiModelUsed = "Disabled";
        }

        const analysisTime = Date.now() - startTime;

        return {
            ...baseAlert,
            aiInsights,
            aiModelUsed,
            aiAnalysisTime: analysisTime,
        };
    }

    private async getAIAnalysis(
        input: DeteriorationInput,
        baseAlert: DeteriorationAlert
    ): Promise<{ insights: AIEnhancedAnalysisResult["aiInsights"]; model: string }> {
        // Determine which AI provider to use
        const aiProvider = process.env.AI_PROVIDER || "azure";

        let aiClient: any;
        let modelName: string;

        if (aiProvider === "gemini") {
            const { getGeminiClient } = await import("../ai/gemini-client");
            aiClient = getGeminiClient();
            modelName = "gemini-1.5-flash";
        } else {
            const { getAzureOpenAI } = await import("../azure/openai-client");
            aiClient = getAzureOpenAI();
            modelName = "gpt-4o";
        }

        // Build the clinical context for AI
        const clinicalContext = this.buildClinicalContext(input, baseAlert);

        const systemPrompt = `You are a Clinical Deterioration Analysis AI, specialized in early detection of patient deterioration in hospital settings.

Your role is to analyze vital signs, lab values, and clinical trends to identify concerning patterns that may indicate impending deterioration.

You are an expert in:
- NEWS2 (National Early Warning Score 2)
- qSOFA (Quick Sequential Organ Failure Assessment)
- Sepsis recognition and early warning
- Respiratory failure patterns
- Cardiac decompensation
- Multi-organ dysfunction

IMPORTANT RULES:
1. Be specific and actionable in your analysis
2. Cite the clinical indicators that support your assessment
3. Prioritize patient safety
4. Acknowledge uncertainty when data is limited
5. This is DECISION SUPPORT - final decisions are made by clinicians

Respond in JSON format with the following structure:
{
  "patternRecognition": "Describe the overall clinical pattern you observe",
  "predictedTrajectory": "Predict the likely course if current trends continue",
  "urgencyAssessment": "Assess the urgency of clinical review required",
  "differentialConsiderations": ["List possible underlying causes"],
  "recommendedInterventions": ["List specific clinical actions to consider"],
  "confidenceExplanation": "Explain the basis for your confidence level"
}`;

        const userPrompt = `Analyze this patient's clinical deterioration data:

${clinicalContext}

CURRENT SCORING:
- NEWS2 Score: ${baseAlert.scores.news2Score}/20
- qSOFA Score: ${baseAlert.scores.qsofaScore}/3
- Risk Level: ${baseAlert.riskLevel}
- Trajectory: ${baseAlert.trajectory}
- Base Confidence: ${(baseAlert.confidence * 100).toFixed(0)}%

KEY SIGNALS DETECTED:
${baseAlert.keySignals.map(s => `- ${s.description}: ${s.values.baseline} → ${s.values.current} (${s.severity})`).join('\n')}

Provide your AI-enhanced clinical analysis in JSON format.`;

        try {
            const response = await aiClient.chatCompletion({
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt },
                ],
                temperature: 0.3, // Lower for more consistent clinical analysis
                maxTokens: 1024,
            });

            // Parse the AI response
            const content = response.content;

            // Try to extract JSON from the response
            let jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    insights: {
                        patternRecognition: parsed.patternRecognition || "",
                        predictedTrajectory: parsed.predictedTrajectory || "",
                        urgencyAssessment: parsed.urgencyAssessment || "",
                        differentialConsiderations: parsed.differentialConsiderations || [],
                        recommendedInterventions: parsed.recommendedInterventions || [],
                        confidenceExplanation: parsed.confidenceExplanation || "",
                    },
                    model: modelName,
                };
            }

            // If JSON parsing fails, use the raw response
            return {
                insights: {
                    patternRecognition: content.substring(0, 200),
                    predictedTrajectory: "Unable to parse structured response",
                    urgencyAssessment: baseAlert.riskLevel === "CRITICAL" ? "Immediate review required" : "Clinical review recommended",
                    differentialConsiderations: [],
                    recommendedInterventions: baseAlert.recommendations.map(r => r.action),
                    confidenceExplanation: "AI analysis completed with unstructured output",
                },
                model: modelName,
            };

        } catch (error) {
            console.error("[AI Deterioration] AI call failed:", error);
            throw error;
        }
    }

    private buildClinicalContext(
        input: DeteriorationInput,
        baseAlert: DeteriorationAlert
    ): string {
        const lines: string[] = [];

        // Patient info
        lines.push(`PATIENT:
- Age: ${input.patient.age || "Unknown"}
- Gender: ${input.patient.gender || "Unknown"}
- Comorbidities: ${input.patient.comorbidities?.join(", ") || "None documented"}
- Current Diagnoses: ${input.patient.currentDiagnoses?.join(", ") || "None documented"}
- Ward: ${input.patient.ward || "Unknown"}
`);

        // Vital signs timeline
        if (input.vitals.length > 0) {
            lines.push("VITAL SIGNS TREND:");
            const vitalsByCode: Record<string, VitalObservation[]> = {};
            input.vitals.forEach(v => {
                if (!vitalsByCode[v.code]) vitalsByCode[v.code] = [];
                vitalsByCode[v.code].push(v);
            });

            for (const [code, readings] of Object.entries(vitalsByCode)) {
                const sorted = readings.sort((a, b) =>
                    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                );
                const values = sorted.map(r => `${r.value}${r.unit}`).join(" → ");
                lines.push(`- ${code}: ${values}`);
            }
            lines.push("");
        }

        // Lab values timeline
        if (input.labs.length > 0) {
            lines.push("LAB VALUES TREND:");
            const labsByCode: Record<string, LabObservation[]> = {};
            input.labs.forEach(l => {
                if (!labsByCode[l.code]) labsByCode[l.code] = [];
                labsByCode[l.code].push(l);
            });

            for (const [code, readings] of Object.entries(labsByCode)) {
                const sorted = readings.sort((a, b) =>
                    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                );
                const values = sorted.map(r => `${r.value}${r.unit}`).join(" → ");
                lines.push(`- ${code}: ${values}`);
            }
            lines.push("");
        }

        // Oxygen support
        if (input.oxygenSupport.length > 0) {
            lines.push("OXYGEN SUPPORT:");
            const sorted = input.oxygenSupport.sort((a, b) =>
                new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );
            const types = sorted.map(o => o.type + (o.fio2 ? ` (FiO2 ${(o.fio2 * 100).toFixed(0)}%)` : "")).join(" → ");
            lines.push(`- Progression: ${types}`);
            lines.push("");
        }

        // Medications
        if (input.medications.length > 0) {
            lines.push("MEDICATION CHANGES:");
            input.medications.forEach(m => {
                lines.push(`- ${m.action.toUpperCase()}: ${m.medicationName} (${m.category})`);
            });
            lines.push("");
        }

        return lines.join("\n");
    }

    private getFallbackInsights(baseAlert: DeteriorationAlert): AIEnhancedAnalysisResult["aiInsights"] {
        // Generate insights based on rule-based analysis when AI is unavailable
        const signals = baseAlert.keySignals;

        let patternRecognition = "Clinical pattern detected based on vital sign trends and scoring.";
        if (signals.some(s => s.code === "respiratory-rate" && s.trend === "WORSENING")) {
            patternRecognition = "Respiratory distress pattern identified with increasing work of breathing.";
        } else if (signals.some(s => s.code === "oxygen-escalation")) {
            patternRecognition = "Progressive hypoxemia pattern with escalating oxygen requirements.";
        } else if (signals.some(s => s.code === "lactate")) {
            patternRecognition = "Possible tissue hypoperfusion pattern with rising lactate levels.";
        }

        let predictedTrajectory = "Continued monitoring required to assess trajectory.";
        if (baseAlert.trajectory === "RAPIDLY_WORSENING") {
            predictedTrajectory = "Rapid deterioration likely without intervention. Risk of requiring higher level of care within hours.";
        } else if (baseAlert.trajectory === "WORSENING") {
            predictedTrajectory = "Progressive deterioration expected if current trends continue. Early intervention may prevent escalation.";
        }

        let urgencyAssessment = "Routine clinical review recommended.";
        if (baseAlert.riskLevel === "CRITICAL") {
            urgencyAssessment = "IMMEDIATE senior clinician review required. Consider escalation to critical care.";
        } else if (baseAlert.riskLevel === "HIGH") {
            urgencyAssessment = "URGENT clinical review within 30-60 minutes. Reassess response to any interventions.";
        } else if (baseAlert.riskLevel === "MODERATE") {
            urgencyAssessment = "Increased monitoring recommended. Review within 2-4 hours.";
        }

        const differentialConsiderations: string[] = [];
        if (signals.some(s => s.type === "vital" && s.code.includes("respiratory"))) {
            differentialConsiderations.push("Pneumonia", "COPD exacerbation", "Pulmonary embolism", "Heart failure");
        }
        if (signals.some(s => s.code === "lactate" || s.code === "crp")) {
            differentialConsiderations.push("Sepsis", "Hypovolemia", "Cardiogenic shock");
        }
        if (signals.some(s => s.code === "creatinine")) {
            differentialConsiderations.push("Acute kidney injury", "Volume depletion", "Nephrotoxic medications");
        }

        return {
            patternRecognition,
            predictedTrajectory,
            urgencyAssessment,
            differentialConsiderations: differentialConsiderations.length > 0
                ? differentialConsiderations
                : ["Insufficient data for differential considerations"],
            recommendedInterventions: baseAlert.recommendations.map(r => r.action),
            confidenceExplanation: `Based on ${baseAlert.analysisWindow.dataPointsEvaluated} data points over ${baseAlert.analysisWindow.hoursAnalyzed} hours. ${baseAlert.explainability.confidenceFactors.join(" ")}`,
        };
    }
}

// Export singleton
export const aiEnhancedDeteriorationAgent = new AIEnhancedDeteriorationAgent();
