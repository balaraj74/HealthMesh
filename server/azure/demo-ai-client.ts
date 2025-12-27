/**
 * HealthMesh - Demo AI Client
 * Provides intelligent mock responses when Azure OpenAI is unavailable
 * Used for Azure for Students subscriptions or when OpenAI quota is exhausted
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
  agentName?: string;
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
    const { messages, jsonMode, agentName } = options;
    const lastMessage = messages[messages.length - 1];
    const systemPrompt = messages.find(m => m.role === 'system')?.content || '';
    const userPrompt = lastMessage?.content || '';

    // Detect agent type from system prompt or agent name
    let response = '';

    if (systemPrompt.includes('TRIAGE AGENT') || agentName?.includes('Triage')) {
      response = this.generateTriageResponse(userPrompt);
    } else if (systemPrompt.includes('DIAGNOSTIC AGENT') || agentName?.includes('Diagnostic')) {
      response = this.generateDiagnosticResponse(userPrompt);
    } else if (systemPrompt.includes('GUIDELINE AGENT') || agentName?.includes('Guideline')) {
      response = this.generateGuidelineResponse(userPrompt);
    } else if (systemPrompt.includes('MEDICATION SAFETY AGENT') || agentName?.includes('Medication')) {
      response = this.generateMedicationSafetyResponse(userPrompt);
    } else if (systemPrompt.includes('EVIDENCE AGENT') || agentName?.includes('Evidence')) {
      response = this.generateEvidenceResponse(userPrompt);
    } else if (systemPrompt.includes('synthesize') || agentName?.includes('Synthesis')) {
      response = this.generateSynthesisResponse(userPrompt);
    } else if (systemPrompt.includes('Patient Context Agent')) {
      response = this.generatePatientContextResponse(userPrompt);
    } else if (systemPrompt.includes('Labs & Reports Agent')) {
      response = this.generateLabsResponse(userPrompt);
    } else if (systemPrompt.includes('Research Agent')) {
      response = this.generateResearchResponse(userPrompt);
    } else if (systemPrompt.includes('Risk & Safety Agent')) {
      response = this.generateRiskResponse(userPrompt);
    } else if (systemPrompt.includes('Clinician Chat')) {
      response = this.generateChatResponse(userPrompt);
    } else {
      response = this.generateGenericResponse(userPrompt);
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
        promptTokens: Math.floor(messages.reduce((sum, m) => sum + m.content.length / 4, 0)),
        completionTokens: Math.floor(response.length / 4),
        totalTokens: Math.floor((messages.reduce((sum, m) => sum + m.content.length / 4, 0)) + (response.length / 4))
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

  // ============================================================
  // Triage Agent - NEWS2/SOFA-lite scoring
  // ============================================================
  private generateTriageResponse(query: string): string {
    // Extract patient context from query to generate relevant response
    const isBreastCancer = query.toLowerCase().includes('breast cancer') || query.toLowerCase().includes('oncology');
    const hasDiabetes = query.toLowerCase().includes('diabetes') || query.toLowerCase().includes('metformin');
    const hasHypertension = query.toLowerCase().includes('hypertension') || query.toLowerCase().includes('lisinopril');

    const urgencyScore = isBreastCancer ? 5 : 3;
    const riskCategory = isBreastCancer ? "Moderate" : "Low";

    return JSON.stringify({
      urgencyScore: urgencyScore,
      riskCategory: riskCategory,
      news2Score: hasDiabetes ? 2 : 1,
      sofaScore: 0,
      rationale: [
        isBreastCancer ? "Patient has active oncology case requiring tumor board review" : "Patient presents for routine evaluation",
        hasDiabetes ? "Type 2 diabetes requires ongoing monitoring during treatment" : "No metabolic concerns identified",
        hasHypertension ? "Hypertension well-controlled on current medication" : "Blood pressure within normal limits",
        "Vital signs stable, no acute distress",
        "Patient is ambulatory with good functional status"
      ],
      redFlags: isBreastCancer ? [
        "Active malignancy requiring treatment decision",
        "Multiple comorbidities may affect treatment tolerance"
      ] : [],
      immediateActions: isBreastCancer ? [
        "Complete tumor board review for treatment planning",
        "Verify medication interactions before chemotherapy decision",
        "Assess bone health due to aromatase inhibitor therapy"
      ] : [
        "Continue routine monitoring",
        "Schedule follow-up as appropriate"
      ],
      confidence: 85
    });
  }

  // ============================================================
  // Diagnostic Agent - Differential Diagnosis
  // ============================================================
  private generateDiagnosticResponse(query: string): string {
    const isBreastCancer = query.toLowerCase().includes('breast cancer') || query.toLowerCase().includes('lumpectomy');

    if (isBreastCancer) {
      return JSON.stringify({
        differentialDiagnoses: [
          {
            diagnosis: "Invasive Ductal Carcinoma, ER+/PR+/HER2-",
            icdCode: "C50.911",
            confidence: 95,
            supportingFindings: [
              "Pathology confirmed invasive ductal carcinoma",
              "Grade 2, 2.3 cm tumor",
              "ER+/PR+/HER2- receptor status",
              "Clear surgical margins",
              "Sentinel node negative"
            ],
            contradictoryFindings: [],
            missingDataToConfirm: []
          },
          {
            diagnosis: "Type 2 Diabetes Mellitus, controlled",
            icdCode: "E11.9",
            confidence: 90,
            supportingFindings: [
              "HbA1c 6.8% indicates good glycemic control",
              "Currently on metformin therapy",
              "No diabetic complications documented"
            ],
            contradictoryFindings: [],
            missingDataToConfirm: []
          }
        ],
        clinicalPictureSummary: "62-year-old female with Stage IIA breast cancer (T2N0M0) post-lumpectomy with intermediate Oncotype DX score (18), requiring adjuvant treatment decision. Multiple comorbidities including controlled T2DM, hypertension, and osteoporosis.",
        primarySuspicion: "Hormone receptor-positive breast cancer requiring adjuvant endocrine therapy with consideration for chemotherapy based on Oncotype score",
        dataGaps: [
          "Complete metabolic panel for treatment planning",
          "Bone density scan results for osteoporosis staging",
          "Cardiac evaluation if chemotherapy considered"
        ],
        confidence: 90
      });
    }

    return JSON.stringify({
      differentialDiagnoses: [
        {
          diagnosis: "Primary diagnosis under investigation",
          confidence: 75,
          supportingFindings: ["Clinical presentation consistent with diagnosis"],
          contradictoryFindings: [],
          missingDataToConfirm: ["Additional diagnostic workup"]
        }
      ],
      clinicalPictureSummary: "Patient presenting for clinical evaluation",
      primarySuspicion: "Further workup required",
      dataGaps: ["Complete history and physical"],
      confidence: 75
    });
  }

  // ============================================================
  // Guideline Agent - Clinical Guidelines Mapping
  // ============================================================
  private generateGuidelineResponse(query: string): string {
    const isBreastCancer = query.toLowerCase().includes('breast cancer') || query.toLowerCase().includes('oncotype');

    if (isBreastCancer) {
      return JSON.stringify({
        applicableGuidelines: [
          {
            name: "NCCN Guidelines for Breast Cancer Version 2.2024",
            organization: "NCCN",
            version: "2.2024",
            recommendationClass: "Category 1",
            evidenceLevel: "Level I",
            recommendation: "For ER+/PR+/HER2- breast cancer with Oncotype score 16-25, consider adjuvant chemotherapy followed by endocrine therapy, particularly if high clinical risk features present",
            conditionalRules: [
              "Patient age and comorbidities should be considered",
              "Clinical risk assessment (tumor size >2cm, high grade) may favor chemotherapy"
            ]
          },
          {
            name: "ASCO Breast Cancer Adjuvant Systemic Therapy Guidelines",
            organization: "Other",
            version: "2024",
            recommendationClass: "Strong Recommendation",
            evidenceLevel: "High Quality Evidence",
            recommendation: "Aromatase inhibitor therapy is preferred over tamoxifen in postmenopausal women with HR+ breast cancer",
            conditionalRules: [
              "Monitor bone health with DXA scans",
              "Consider bisphosphonate therapy for bone protection"
            ]
          },
          {
            name: "ADA Standards of Medical Care in Diabetes 2024",
            organization: "ADA",
            version: "2024",
            recommendationClass: "Strong Recommendation",
            evidenceLevel: "Level A",
            recommendation: "Maintain glycemic control during cancer treatment; metformin can be continued unless renal function is impaired",
            conditionalRules: [
              "Hold metformin if receiving iodinated contrast",
              "Monitor closely if adding cytotoxic chemotherapy"
            ]
          }
        ],
        deviations: [],
        grayAreas: [
          "Oncotype score of 18 falls in intermediate range where guidelines allow for clinical judgment",
          "Patient age (62) with comorbidities may affect chemotherapy benefit-risk ratio"
        ],
        recommendedActions: [
          "Discuss chemotherapy benefit vs risk with patient considering Oncotype score and comorbidities",
          "Initiate aromatase inhibitor therapy as adjuvant endocrine treatment",
          "Order DXA scan for bone health baseline",
          "Continue metformin for diabetes management",
          "Initiate bisphosphonate therapy for bone protection"
        ],
        confidence: 88
      });
    }

    return JSON.stringify({
      applicableGuidelines: [],
      deviations: [],
      grayAreas: [],
      recommendedActions: ["Review applicable clinical guidelines for this condition"],
      confidence: 70
    });
  }

  // ============================================================
  // Medication Safety Agent
  // ============================================================
  private generateMedicationSafetyResponse(query: string): string {
    const hasAnastrozole = query.toLowerCase().includes('anastrozole');
    const hasMetformin = query.toLowerCase().includes('metformin');
    const hasAlendronate = query.toLowerCase().includes('alendronate');
    const hasPenicillinAllergy = query.toLowerCase().includes('penicillin');
    const hasPeanutAllergy = query.toLowerCase().includes('peanut');

    return JSON.stringify({
      interactions: [
        {
          drugs: ["Anastrozole", "Calcium supplements"],
          severity: "Low",
          mechanism: "Calcium may slightly reduce anastrozole absorption",
          clinicalEffect: "Minimal impact - take 2 hours apart",
          management: "Separate administration times by 2 hours"
        },
        hasAlendronate ? {
          drugs: ["Alendronate", "Calcium supplements"],
          severity: "Moderate",
          mechanism: "Calcium reduces bisphosphonate absorption significantly",
          clinicalEffect: "Reduced efficacy of osteoporosis treatment",
          management: "Take alendronate on empty stomach, wait 30 minutes before calcium"
        } : null
      ].filter(Boolean),
      allergyConflicts: [
        hasPenicillinAllergy ? {
          medication: "Cephalosporins",
          allergen: "Penicillin",
          crossReactivity: true,
          recommendation: "Avoid cephalosporin antibiotics due to potential cross-reactivity with penicillin allergy"
        } : null
      ].filter(Boolean),
      doseRisks: [
        hasMetformin ? {
          medication: "Metformin",
          concern: "Renal function should be monitored",
          adjustment: "Verify eGFR before continuing; hold if <30 mL/min/1.73m²"
        } : null
      ].filter(Boolean),
      contraindications: [],
      saferAlternatives: [
        hasPenicillinAllergy ? "For infections: Consider fluoroquinolones or macrolides instead of beta-lactams" : null
      ].filter(Boolean),
      monitoringRecommendations: [
        "Monitor bone density annually while on aromatase inhibitor",
        "Check HbA1c every 3 months during cancer treatment",
        "Regular CBC if chemotherapy is initiated",
        "Monitor renal function for metformin safety"
      ],
      overallSafetyRisk: "Moderate",
      confidence: 88
    });
  }

  // ============================================================
  // Evidence Agent
  // ============================================================
  private generateEvidenceResponse(query: string): string {
    const isBreastCancer = query.toLowerCase().includes('breast cancer') || query.toLowerCase().includes('oncotype');

    if (isBreastCancer) {
      return JSON.stringify({
        keyStudies: [
          {
            title: "TAILORx Trial: Adjuvant Chemotherapy Guided by a 21-Gene Expression Assay",
            year: 2018,
            type: "RCT",
            journal: "New England Journal of Medicine",
            summary: "In HR+/HER2- breast cancer, patients with Oncotype scores 11-25 did not benefit from chemotherapy unless high clinical risk",
            relevance: "Directly applicable - patient's score of 18 falls in this intermediate range"
          },
          {
            title: "RxPONDER Trial: Chemotherapy in Node-Positive HR+/HER2- Breast Cancer",
            year: 2021,
            type: "RCT",
            journal: "New England Journal of Medicine",
            summary: "Postmenopausal women with low Oncotype scores and 1-3 positive nodes do not benefit from chemotherapy",
            relevance: "Supports endocrine-only approach in node-negative postmenopausal patients"
          },
          {
            title: "ATAC Trial: Anastrozole vs Tamoxifen in Postmenopausal Breast Cancer",
            year: 2010,
            type: "RCT",
            journal: "Lancet Oncology",
            summary: "Anastrozole superior to tamoxifen in reducing recurrence in postmenopausal HR+ breast cancer",
            relevance: "Supports current anastrozole therapy choice"
          },
          {
            title: "AZURE Trial: Zoledronic Acid and Breast Cancer Outcomes",
            year: 2017,
            type: "Meta-analysis",
            journal: "Lancet",
            summary: "Bisphosphonates reduce bone recurrence and improve survival in postmenopausal breast cancer",
            relevance: "Supports adding bisphosphonate for bone protection and anti-cancer benefit"
          }
        ],
        evidenceSummary: "Strong evidence supports aromatase inhibitor therapy for this patient. The TAILORx trial data suggests limited chemotherapy benefit for intermediate Oncotype scores in postmenopausal women, though clinical risk factors should be considered. Bisphosphonate therapy has dual benefit for osteoporosis and cancer outcomes.",
        strengthOfEvidence: "Strong",
        limitations: [
          "TAILORx excluded patients with significant comorbidities",
          "Long-term data on anastrozole plus bisphosphonate combination limited",
          "Diabetes may affect tolerance to chemotherapy if chosen"
        ],
        confidence: 85
      });
    }

    return JSON.stringify({
      keyStudies: [],
      evidenceSummary: "Evidence review pending",
      strengthOfEvidence: "Limited",
      limitations: ["Specific literature search required"],
      confidence: 60
    });
  }

  // ============================================================
  // Synthesis Orchestrator - Final Summary
  // ============================================================
  private generateSynthesisResponse(query: string): string {
    const isOncology = query.toLowerCase().includes('breast cancer') || query.toLowerCase().includes('oncology') || query.toLowerCase().includes('tumor');

    if (isOncology) {
      return JSON.stringify({
        caseSummary: "62-year-old postmenopausal female with Stage IIA ER+/PR+/HER2- breast cancer (T2N0M0), intermediate Oncotype DX score of 18, post-lumpectomy with clear margins and negative sentinel nodes. Multiple comorbidities including well-controlled T2DM and osteoporosis requiring integrated management approach.",
        riskAndUrgency: {
          urgencyScore: 5,
          riskCategory: "Moderate",
          rationale: "Active oncology case requiring timely treatment decision. Patient is clinically stable but needs adjuvant therapy initiation. Comorbidities require consideration in treatment planning.",
          immediateActions: [
            "Initiate adjuvant endocrine therapy with anastrozole",
            "Complete radiation therapy planning post-lumpectomy",
            "Assess bone health with DXA scan",
            "Discuss chemotherapy benefit vs risk with patient"
          ]
        },
        differentialDiagnosis: [
          {
            diagnosis: "Invasive Ductal Carcinoma, Stage IIA, ER+/PR+/HER2-",
            confidence: 95,
            supportingEvidence: ["Confirmed pathology", "Complete staging workup", "Genomic testing completed"]
          }
        ],
        guidelineRecommendations: [
          {
            guideline: "NCCN Breast Cancer Guidelines 2024",
            recommendation: "Adjuvant endocrine therapy with aromatase inhibitor for 5-10 years",
            evidenceLevel: "Category 1"
          },
          {
            guideline: "NCCN Breast Cancer Guidelines 2024",
            recommendation: "Consider adjuvant chemotherapy for intermediate Oncotype score with high clinical risk",
            evidenceLevel: "Category 2A"
          },
          {
            guideline: "Whole breast radiation therapy post-lumpectomy",
            recommendation: "Standard fractionation or hypofractionated regimen",
            evidenceLevel: "Category 1"
          }
        ],
        medicationSafety: {
          overallRisk: "Moderate",
          criticalAlerts: [
            "Severe penicillin allergy - avoid beta-lactam antibiotics",
            "Severe peanut allergy - ensure emergency medications available"
          ],
          recommendations: [
            "Continue metformin with regular renal monitoring",
            "Separate calcium from anastrozole by 2 hours",
            "Add bisphosphonate for bone protection"
          ]
        },
        supportingEvidence: {
          keyFindings: [
            "TAILORx trial: Limited chemotherapy benefit for intermediate Oncotype in postmenopausal women",
            "RxPONDER confirms endocrine-alone approach in low-risk node-negative patients",
            "Bisphosphonates improve outcomes in postmenopausal breast cancer"
          ],
          strengthOfEvidence: "Strong"
        },
        explainabilityPanel: {
          whyThisRecommendation: [
            "Patient is postmenopausal with HR+ breast cancer - aromatase inhibitor preferred over tamoxifen",
            "Oncotype score of 18 suggests limited chemotherapy benefit per TAILORx data",
            "Node-negative status supports endocrine-only approach",
            "Comorbidities (osteoporosis, diabetes) favor avoiding chemotherapy toxicity"
          ],
          keyInfluencingData: [
            "Oncotype DX score: 18 (intermediate)",
            "Tumor stage: T2N0M0 (no nodal involvement)",
            "Receptor status: ER+/PR+/HER2-",
            "Patient age: 62 years, postmenopausal",
            "Comorbidities: T2DM, hypertension, osteoporosis"
          ],
          missingData: [
            "Current bone density measurements",
            "Cardiac function assessment (if chemotherapy considered)",
            "Patient preference regarding chemotherapy"
          ]
        },
        overallConfidence: "High",
        clinicalDisclaimer: "This is clinical decision support only. All recommendations must be reviewed and validated by qualified healthcare professionals. The treating physician maintains full responsibility for patient care decisions."
      });
    }

    return JSON.stringify({
      caseSummary: "Clinical case analysis completed",
      riskAndUrgency: {
        urgencyScore: 3,
        riskCategory: "Low",
        rationale: "Patient appears stable",
        immediateActions: ["Continue routine care"]
      },
      differentialDiagnosis: [],
      guidelineRecommendations: [],
      medicationSafety: {
        overallRisk: "Low",
        criticalAlerts: [],
        recommendations: []
      },
      supportingEvidence: {
        keyFindings: [],
        strengthOfEvidence: "Limited"
      },
      explainabilityPanel: {
        whyThisRecommendation: [],
        keyInfluencingData: [],
        missingData: ["Complete clinical data required"]
      },
      overallConfidence: "Low",
      clinicalDisclaimer: "This is clinical decision support only. All recommendations must be reviewed and validated by qualified healthcare professionals."
    });
  }

  // ============================================================
  // Legacy Response Generators
  // ============================================================
  private generatePatientContextResponse(query: string): string {
    return JSON.stringify({
      demographics: {
        summary: "Patient demographics retrieved successfully",
        age: "62 years",
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
          name: "Anastrozole 1mg",
          frequency: "Once daily",
          indication: "Breast cancer hormone therapy"
        },
        {
          name: "Metformin 500mg",
          frequency: "Twice daily",
          indication: "Diabetes management"
        }
      ],
      allergies: ["Penicillin (severe)", "Sulfonamides", "Peanuts (severe)"],
      recentEncounters: [
        {
          date: "2024-08-25",
          type: "Surgery - Lumpectomy",
          summary: "Successful lumpectomy with sentinel node biopsy"
        }
      ],
      confidence: 95
    });
  }

  private generateLabsResponse(query: string): string {
    return JSON.stringify({
      documentType: "Lab Report",
      findings: [
        {
          test: "CA 15-3 (Cancer Antigen)",
          value: "24 U/mL",
          normalRange: "<30 U/mL",
          status: "Normal",
          significance: "Baseline tumor marker within normal limits"
        },
        {
          test: "Hemoglobin A1C",
          value: "6.8%",
          normalRange: "<7.0%",
          status: "Normal",
          significance: "Good diabetic control"
        },
        {
          test: "Complete Blood Count",
          value: "WBC: 6.5 K/uL, Hgb: 12.8 g/dL, Plt: 245 K/uL",
          normalRange: "WBC: 4.5-11.0, Hgb: 12-16, Plt: 150-400",
          status: "Normal",
          significance: "No hematologic abnormalities, suitable for treatment"
        }
      ],
      criticalFindings: [],
      recommendedActions: [
        "Continue current treatment and monitoring",
        "Repeat tumor markers in 3 months",
        "Check A1C quarterly during cancer treatment"
      ],
      confidence: 92
    });
  }

  private generateResearchResponse(query: string): string {
    return JSON.stringify({
      guidelines: [
        {
          title: "NCCN Guidelines for Breast Cancer",
          summary: "ER+/PR+/HER2- breast cancer with intermediate Oncotype score warrants discussion of chemotherapy vs endocrine-only approach",
          relevance: 0.95,
          source: "National Comprehensive Cancer Network"
        },
        {
          title: "ADA Standards of Medical Care in Diabetes",
          summary: "Maintain A1C <7% during cancer treatment when safely achievable",
          relevance: 0.85,
          source: "American Diabetes Association"
        }
      ],
      clinicalTrials: [],
      evidenceSummary: "Current guidelines support individualized treatment decision for intermediate Oncotype scores based on clinical risk factors and patient preference.",
      confidence: 88
    });
  }

  private generateRiskResponse(query: string): string {
    return JSON.stringify({
      riskLevel: "MODERATE",
      alerts: [
        {
          type: "Allergy Alert",
          severity: "High",
          message: "Severe penicillin allergy - avoid all beta-lactam antibiotics",
          status: "Active"
        },
        {
          type: "Allergy Alert",
          severity: "High",
          message: "Severe peanut allergy - ensure EpiPen available",
          status: "Active"
        },
        {
          type: "Drug Interaction",
          severity: "Low",
          message: "Calcium may reduce anastrozole absorption - separate by 2 hours",
          status: "Active"
        }
      ],
      recommendations: [
        {
          action: "Review antibiotic alternatives before any infection treatment",
          priority: "High",
          rationale: "Severe penicillin allergy with cephalosporin cross-reactivity risk"
        },
        {
          action: "Monitor bone density on aromatase inhibitor therapy",
          priority: "Standard",
          rationale: "AI therapy increases osteoporosis risk in patient with pre-existing osteoporosis"
        }
      ],
      contraindications: ["Penicillins", "Cephalosporins", "Peanut-containing products"],
      confidence: 90
    });
  }

  private generateChatResponse(query: string): string {
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.includes('chemotherapy') || lowerQuery.includes('chemo')) {
      return "Based on the TAILORx trial data, patients with ER+/PR+/HER2- breast cancer and intermediate Oncotype scores (11-25) like this patient (score 18) have limited benefit from chemotherapy when postmenopausal. However, clinical risk factors such as tumor size >2cm may warrant discussion of chemotherapy. I recommend discussing the risks and benefits with the patient considering her comorbidities.";
    }

    if (lowerQuery.includes('radiation')) {
      return "Post-lumpectomy radiation therapy is standard of care for this patient. Given her Stage IIA disease with clear margins, either conventional fractionation or hypofractionated whole breast radiation would be appropriate per NCCN guidelines. Hypofractionation (typically 40-42.5 Gy in 15-16 fractions) is non-inferior and more convenient for patients.";
    }

    if (lowerQuery.includes('osteoporosis') || lowerQuery.includes('bone')) {
      return "This patient has pre-existing osteoporosis and is now on anastrozole, which further increases bone loss risk. I recommend: 1) Baseline DXA scan if not done recently, 2) Initiate bisphosphonate therapy (e.g., zoledronic acid) which has dual benefit for osteoporosis and may reduce bone metastases, 3) Adequate calcium and vitamin D supplementation, 4) Annual bone density monitoring.";
    }

    return "I've completed my analysis of Maria Santos. She's a 62-year-old with Stage IIA breast cancer (ER+/PR+/HER2-) with an intermediate Oncotype score of 18. Key recommendations include: aromatase inhibitor therapy, radiation post-lumpectomy, bone health monitoring, and a shared decision-making discussion about chemotherapy benefit. Her diabetes and other comorbidities are well-controlled. What specific aspect would you like to discuss?";
  }

  private generateGenericResponse(query: string): string {
    // Try to detect context and provide relevant response
    if (query.toLowerCase().includes('cancer') || query.toLowerCase().includes('oncolog')) {
      return JSON.stringify({
        analysis: "Oncology case requiring comprehensive review",
        recommendations: ["Complete tumor board evaluation", "Review staging and molecular markers", "Assess treatment options"],
        confidence: 75
      });
    }

    return JSON.stringify({
      analysis: "Clinical analysis in progress. Based on the available patient data, I can provide insights on diagnosis, treatment options, and monitoring recommendations.",
      recommendations: ["Review complete patient history", "Assess current medications", "Identify potential interactions"],
      confidence: 70
    });
  }
}

export const demoAI = new DemoAIClient();
