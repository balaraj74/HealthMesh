/**
 * HealthMesh - Demo AI Client
 * Provides intelligent mock responses when Azure OpenAI is unavailable
 * Used for Azure for Students subscriptions
 */

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionOptions {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

interface ChatCompletionResult {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export class DemoAIClient {
  async chatCompletion(options: ChatCompletionOptions): Promise<ChatCompletionResult> {
    const { messages, jsonMode } = options;
    const lastMessage = messages[messages.length - 1];
    const systemPrompt = messages.find(m => m.role === 'system')?.content || '';

    // Detect agent type from system prompt
    let response = '';

    if (systemPrompt.includes('Patient Context Agent')) {
      response = this.generatePatientContextResponse(lastMessage.content);
    } else if (systemPrompt.includes('Labs & Reports Agent')) {
      response = this.generateLabsResponse(lastMessage.content);
    } else if (systemPrompt.includes('Research Agent')) {
      response = this.generateResearchResponse(lastMessage.content);
    } else if (systemPrompt.includes('Risk & Safety Agent')) {
      response = this.generateRiskResponse(lastMessage.content);
    } else if (systemPrompt.includes('Clinician Chat')) {
      response = this.generateChatResponse(lastMessage.content);
    } else {
      response = this.generateGenericResponse(lastMessage.content);
    }

    if (jsonMode) {
      // Ensure response is valid JSON
      try {
        JSON.parse(response);
      } catch {
        response = JSON.stringify({ analysis: response });
      }
    }

    return {
      content: response,
      usage: {
        promptTokens: messages.reduce((sum, m) => sum + m.content.length / 4, 0),
        completionTokens: response.length / 4,
        totalTokens: (messages.reduce((sum, m) => sum + m.content.length / 4, 0)) + (response.length / 4)
      }
    };
  }

  async createEmbedding(text: string): Promise<number[]> {
    // Generate deterministic embedding from text hash
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash) + text.charCodeAt(i);
      hash = hash & hash;
    }
    
    const embedding: number[] = [];
    for (let i = 0; i < 1536; i++) {
      embedding.push(Math.sin(hash + i) * 0.5 + 0.5);
    }
    return embedding;
  }

  private generatePatientContextResponse(query: string): string {
    return JSON.stringify({
      demographics: {
        summary: "Patient demographics retrieved successfully",
        age: "58 years",
        gender: "Female"
      },
      activeConditions: [
        {
          condition: "Breast Cancer - Stage IIA",
          icdCode: "C50.911",
          status: "Active treatment",
          severity: "Moderate"
        },
        {
          condition: "Type 2 Diabetes",
          icdCode: "E11.9",
          status: "Controlled",
          severity: "Mild"
        }
      ],
      medications: [
        {
          name: "Tamoxifen 20mg",
          frequency: "Once daily",
          indication: "Breast cancer hormone therapy"
        },
        {
          name: "Metformin 500mg",
          frequency: "Twice daily",
          indication: "Diabetes management"
        }
      ],
      allergies: ["Penicillin (rash)", "Sulfa drugs (anaphylaxis)"],
      recentEncounters: [
        {
          date: "2024-12-10",
          type: "Oncology Follow-up",
          summary: "Treatment tolerating well, mild fatigue reported"
        }
      ],
      confidence: 0.95
    });
  }

  private generateLabsResponse(query: string): string {
    return JSON.stringify({
      documentType: "Lab Report",
      findings: [
        {
          test: "CA 15-3 (Cancer Antigen)",
          value: "28 U/mL",
          normalRange: "<30 U/mL",
          status: "Normal",
          significance: "Stable tumor marker"
        },
        {
          test: "Hemoglobin A1C",
          value: "6.8%",
          normalRange: "<7.0%",
          status: "Normal",
          significance: "Good diabetes control"
        },
        {
          test: "Complete Blood Count",
          value: "WBC: 6.2 K/uL",
          normalRange: "4.5-11.0 K/uL",
          status: "Normal",
          significance: "No signs of infection or treatment toxicity"
        }
      ],
      criticalFindings: [],
      recommendedActions: [
        "Continue current cancer treatment protocol",
        "Maintain current diabetes management",
        "Repeat CA 15-3 in 3 months"
      ],
      confidence: 0.92
    });
  }

  private generateResearchResponse(query: string): string {
    return JSON.stringify({
      guidelines: [
        {
          title: "NCCN Guidelines for Breast Cancer Treatment",
          summary: "Hormone receptor-positive breast cancer patients should receive endocrine therapy for 5-10 years",
          relevance: 0.94,
          source: "National Comprehensive Cancer Network"
        },
        {
          title: "ADA Standards of Medical Care in Diabetes",
          summary: "Target A1C <7% for most adults with diabetes to prevent complications",
          relevance: 0.88,
          source: "American Diabetes Association"
        }
      ],
      clinicalTrials: [
        {
          title: "Adjuvant Endocrine Therapy Duration Study",
          phase: "Phase III",
          status: "Recruiting",
          eligibility: "Hormone receptor-positive breast cancer",
          nctId: "NCT03456789"
        }
      ],
      evidenceSummary: "Current treatment aligns with evidence-based guidelines. Patient is responding well to hormone therapy with good diabetes control.",
      confidence: 0.89
    });
  }

  private generateRiskResponse(query: string): string {
    return JSON.stringify({
      riskLevel: "LOW-MODERATE",
      alerts: [
        {
          type: "Drug Interaction Check",
          severity: "Low",
          message: "No significant interactions between current medications",
          status: "Cleared"
        },
        {
          type: "Disease Progression Monitoring",
          severity: "Low",
          message: "Tumor markers stable, continue monitoring schedule",
          status: "Active"
        }
      ],
      recommendations: [
        {
          action: "Continue current treatment plan",
          priority: "Standard",
          rationale: "Patient stable on current regimen with no adverse findings"
        },
        {
          action: "Schedule 3-month follow-up",
          priority: "Standard",
          rationale: "Standard monitoring interval for stable cancer patients"
        }
      ],
      contraindications: [],
      confidence: 0.91
    });
  }

  private generateChatResponse(query: string): string {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('treatment') || lowerQuery.includes('therapy')) {
      return "Based on the patient's hormone receptor-positive breast cancer, the current Tamoxifen therapy is appropriate. The patient is tolerating the treatment well with only mild fatigue. Her diabetes is also well-controlled with an A1C of 6.8%. I recommend continuing the current treatment plan with regular monitoring.";
    }
    
    if (lowerQuery.includes('side effect') || lowerQuery.includes('adverse')) {
      return "The patient reports mild fatigue, which is a common side effect of Tamoxifen. This is generally manageable and doesn't require treatment modification. We should continue monitoring and ensure she's maintaining good nutrition and rest. Her lab values show no signs of concerning toxicity.";
    }
    
    if (lowerQuery.includes('prognosis') || lowerQuery.includes('outcome')) {
      return "The prognosis is favorable. Stage IIA hormone receptor-positive breast cancer with hormone therapy has good outcomes. Her stable tumor markers (CA 15-3 at 28 U/mL) and overall good health status are positive indicators. Continued adherence to treatment and monitoring is essential.";
    }
    
    return "I've reviewed the patient's complete medical record. She's a 58-year-old female with Stage IIA breast cancer currently on hormone therapy and well-controlled diabetes. Her recent labs show stable tumor markers and good metabolic control. The treatment plan is appropriate and she's responding well. Is there a specific aspect you'd like to discuss?";
  }

  private generateGenericResponse(query: string): string {
    return "I'm analyzing the available medical data. Based on the patient's current condition and treatment history, I can provide detailed insights about their care plan. What specific aspect would you like me to focus on?";
  }
}

export const demoAI = new DemoAIClient();
