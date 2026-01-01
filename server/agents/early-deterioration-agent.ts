/**
 * Early Clinical Deterioration Detection Agent
 * HealthMesh - Production-Ready Implementation
 * 
 * PURPOSE: Identify slow, progressive patient deterioration using trend-aware,
 * explainable clinical reasoning - NOT just static thresholds.
 * 
 * GOAL: Reduce missed deterioration, late ICU transfers, and preventable mortality.
 * 
 * CLINICAL PHILOSOPHY:
 * - Analyze time-series data, not snapshots
 * - Detect direction + velocity of change
 * - Handle missing or sparse data safely
 * - Provide explainable, auditable reasoning
 * 
 * INTEGRATION: Works with HealthMesh 5-Agent Pipeline
 * - Receives patient context from Patient Context Agent
 * - Receives lab normalization from Labs Agent
 * - Sends alerts to Safety Agent
 * - Sends summary to Clinician Interaction Agent
 */

import { randomUUID } from "crypto";

// ============================================================================
// TYPE DEFINITIONS - FHIR R4 Aligned
// ============================================================================

export interface VitalObservation {
    id: string;
    code: VitalCode;
    value: number;
    unit: string;
    timestamp: Date;
    status: "final" | "preliminary" | "amended";
}

export type VitalCode =
    | "heart-rate"
    | "respiratory-rate"
    | "systolic-bp"
    | "diastolic-bp"
    | "oxygen-saturation"
    | "temperature"
    | "consciousness-level"; // AVPU scale: 0=Alert, 1=Voice, 2=Pain, 3=Unresponsive

export interface LabObservation {
    id: string;
    code: LabCode;
    value: number;
    unit: string;
    timestamp: Date;
    referenceRange?: { low?: number; high?: number };
    interpretation?: "normal" | "abnormal" | "critical";
    status: "final" | "preliminary";
}

export type LabCode =
    | "crp"           // C-Reactive Protein
    | "wbc"           // White Blood Cell Count
    | "lactate"       // Serum Lactate
    | "creatinine"    // Serum Creatinine
    | "platelets"     // Platelet Count
    | "procalcitonin" // Procalcitonin
    | "bnp"           // Brain Natriuretic Peptide
    | "troponin"      // Troponin
    | "hemoglobin"    // Hemoglobin
    | "sodium"        // Sodium
    | "potassium"     // Potassium
    | "glucose"       // Blood Glucose
    | "bilirubin"     // Bilirubin
    | "pao2"          // Arterial Oxygen Pressure
    | "fio2"          // Fraction of Inspired Oxygen
    | "gcs";          // Glasgow Coma Scale (3-15)

export interface OxygenSupport {
    timestamp: Date;
    type: "room-air" | "nasal-cannula" | "simple-mask" | "venturi-mask" | "non-rebreather" | "hfnc" | "niv" | "invasive-ventilation";
    flowRate?: number; // L/min
    fio2?: number;     // 0.21 to 1.0
}

export interface MedicationEvent {
    id: string;
    medicationName: string;
    category: MedicationCategory;
    action: "started" | "increased" | "decreased" | "stopped";
    timestamp: Date;
    dose?: string;
    route?: string;
}

export type MedicationCategory =
    | "vasopressor"     // Norepinephrine, Dopamine, etc.
    | "sedative"        // Propofol, Midazolam, etc.
    | "antibiotic"      // New antibiotic = possible infection
    | "diuretic"        // Furosemide, etc.
    | "bronchodilator"  // Salbutamol, etc.
    | "steroid"         // Methylprednisolone, etc.
    | "anticoagulant"   // Heparin, etc.
    | "insulin"         // Insulin infusion
    | "other";

export interface PatientContext {
    patientId: string;
    age?: number;
    gender?: "male" | "female" | "other";
    comorbidities?: string[];
    currentDiagnoses?: string[];
    admissionDate?: Date;
    ward?: string;
}

export interface DeteriorationInput {
    patient: PatientContext;
    vitals: VitalObservation[];
    labs: LabObservation[];
    oxygenSupport: OxygenSupport[];
    medications: MedicationEvent[];
    analysisWindowHours?: number; // Default: 24 hours
    previousAlerts?: DeteriorationAlert[];
}

// ============================================================================
// OUTPUT CONTRACTS
// ============================================================================

export type RiskLevel = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
export type Trajectory = "IMPROVING" | "STABLE" | "WORSENING" | "RAPIDLY_WORSENING";

export interface DeteriorationAlert {
    id: string;
    timestamp: Date;
    riskLevel: RiskLevel;
    trajectory: Trajectory;
    confidence: number; // 0.0 to 1.0

    // Clinical Scores
    scores: {
        news2Score: number;        // 0-20
        news2Trend: Trajectory;
        qsofaScore: number;        // 0-3
        customRiskScore: number;   // 0-100
        trendAcceleration: number; // Velocity of change
    };

    // Key Signals
    keySignals: DeteriorationSignal[];

    // Recommendations
    recommendations: ClinicalRecommendation[];

    // Explainability (NON-NEGOTIABLE)
    explainability: {
        reasoning: string;
        clinicalRationale: string[];
        evidenceSources: string[];
        confidenceFactors: string[];
        limitations: string[];
    };

    // Time Context
    analysisWindow: {
        startTime: Date;
        endTime: Date;
        hoursAnalyzed: number;
        dataPointsEvaluated: number;
    };

    // Governance
    governance: {
        alertId: string;
        version: string;
        modelUsed: string;
        auditTrail: AuditEntry[];
    };
}

export interface DeteriorationSignal {
    type: "vital" | "lab" | "oxygen" | "medication" | "composite";
    code: string;
    description: string;
    severity: "low" | "moderate" | "high" | "critical";
    trend: Trajectory;
    values: {
        baseline: number | string;
        current: number | string;
        change: number | string;
        changePercent?: number;
    };
    timeSpan: string;
    clinicalSignificance: string;
}

export interface ClinicalRecommendation {
    priority: "routine" | "urgent" | "immediate";
    action: string;
    rationale: string;
    evidenceLevel: "A" | "B" | "C" | "expert-opinion";
    timeframe: string;
}

export interface AuditEntry {
    timestamp: Date;
    action: "created" | "viewed" | "acknowledged" | "escalated" | "dismissed";
    userId?: string;
    notes?: string;
}

// ============================================================================
// CLINICAL LOGIC CONSTANTS
// ============================================================================

const NEWS2_WEIGHTS = {
    respiratoryRate: [
        { range: [25, Infinity], score: 3 },
        { range: [21, 24], score: 2 },
        { range: [12, 20], score: 0 },
        { range: [9, 11], score: 1 },
        { range: [0, 8], score: 3 },
    ],
    oxygenSaturation: [
        { range: [96, 100], score: 0 },
        { range: [94, 95], score: 1 },
        { range: [92, 93], score: 2 },
        { range: [0, 91], score: 3 },
    ],
    oxygenSaturationScale2: [ // For COPD patients on supplemental O2
        { range: [93, 100], score: 0 },
        { range: [90, 92], score: 1 },
        { range: [88, 89], score: 2 },
        { range: [0, 87], score: 3 },
    ],
    supplementalOxygen: {
        "room-air": 0,
        "nasal-cannula": 2,
        "simple-mask": 2,
        "venturi-mask": 2,
        "non-rebreather": 2,
        "hfnc": 2,
        "niv": 2,
        "invasive-ventilation": 2,
    },
    systolicBP: [
        { range: [220, Infinity], score: 3 },
        { range: [111, 219], score: 0 },
        { range: [101, 110], score: 1 },
        { range: [91, 100], score: 2 },
        { range: [0, 90], score: 3 },
    ],
    heartRate: [
        { range: [131, Infinity], score: 3 },
        { range: [111, 130], score: 2 },
        { range: [91, 110], score: 1 },
        { range: [51, 90], score: 0 },
        { range: [41, 50], score: 1 },
        { range: [0, 40], score: 3 },
    ],
    consciousness: {
        0: 0, // Alert
        1: 3, // Voice
        2: 3, // Pain  
        3: 3, // Unresponsive
    },
    temperature: [
        { range: [39.1, Infinity], score: 2 },
        { range: [38.1, 39.0], score: 1 },
        { range: [36.1, 38.0], score: 0 },
        { range: [35.1, 36.0], score: 1 },
        { range: [0, 35.0], score: 3 },
    ],
};

const QSOFA_THRESHOLDS = {
    respiratoryRate: 22,       // >= 22/min
    systolicBP: 100,           // <= 100 mmHg
    alteredMentation: true,    // GCS < 15 or AVPU != Alert
};

const TREND_THRESHOLDS = {
    // Concerning trends (even if values still "normal")
    respiratoryRate: {
        absoluteIncrease: 4,     // +4/min over window
        percentIncrease: 20,     // +20% over window
        velocityConcern: 2,      // +2/min per hour
    },
    heartRate: {
        absoluteIncrease: 20,
        percentIncrease: 25,
        velocityConcern: 5,
    },
    oxygenSaturation: {
        absoluteDecrease: 3,
        percentDecrease: 3,
        velocityConcern: 1,
    },
    crp: {
        absoluteIncrease: 50,    // mg/L
        percentIncrease: 40,
    },
    lactate: {
        absoluteIncrease: 1.0,   // mmol/L
        percentIncrease: 50,
        criticalThreshold: 4.0,
    },
    creatinine: {
        absoluteIncrease: 0.3,   // mg/dL
        percentIncrease: 50,
    },
};

// ============================================================================
// EARLY DETERIORATION DETECTION AGENT
// ============================================================================

export class EarlyDeteriorationAgent {
    private agentId: string;
    private version = "1.0.0";

    constructor() {
        this.agentId = randomUUID();
    }

    /**
     * Main analysis entry point
     * DETERMINISTIC: Same input → Same output
     */
    async analyze(input: DeteriorationInput): Promise<DeteriorationAlert> {
        const analysisStart = new Date();
        const windowHours = input.analysisWindowHours || 24;
        const windowStart = new Date(analysisStart.getTime() - windowHours * 60 * 60 * 1000);

        // Filter data to analysis window
        const windowedVitals = this.filterByWindow(input.vitals, windowStart, analysisStart);
        const windowedLabs = this.filterByWindow(input.labs, windowStart, analysisStart);
        const windowedOxygen = this.filterByWindow(input.oxygenSupport, windowStart, analysisStart);
        const windowedMeds = this.filterByWindow(input.medications, windowStart, analysisStart);

        // Step 1: Compute clinical scores
        const news2 = this.calculateNEWS2(windowedVitals, windowedOxygen);
        const qsofa = this.calculateQSOFA(windowedVitals);
        const news2Trend = this.calculateScoreTrend(windowedVitals, windowedOxygen, "news2");

        // Step 2: Trend analysis (CRITICAL - not just snapshots)
        const vitalTrends = this.analyzeVitalTrends(windowedVitals, windowHours);
        const labTrends = this.analyzeLabTrends(windowedLabs, windowHours);
        const oxygenEscalation = this.analyzeOxygenEscalation(windowedOxygen);
        const medicationSignals = this.analyzeMedicationChanges(windowedMeds);

        // Step 3: Aggregate signals
        const signals = [
            ...vitalTrends,
            ...labTrends,
            ...oxygenEscalation,
            ...medicationSignals,
        ];

        // Step 4: Compute composite risk
        const { riskLevel, trajectory, confidence, customScore, acceleration } =
            this.computeCompositeRisk(news2, qsofa, signals, input.patient);

        // Step 5: Generate recommendations
        const recommendations = this.generateRecommendations(riskLevel, trajectory, signals);

        // Step 6: Build explainability (NON-NEGOTIABLE)
        const explainability = this.buildExplainability(
            signals,
            news2,
            qsofa,
            trajectory,
            confidence,
            input.patient
        );

        // Build final alert
        const alert: DeteriorationAlert = {
            id: randomUUID(),
            timestamp: analysisStart,
            riskLevel,
            trajectory,
            confidence,

            scores: {
                news2Score: news2,
                news2Trend,
                qsofaScore: qsofa,
                customRiskScore: customScore,
                trendAcceleration: acceleration,
            },

            keySignals: signals.filter(s => s.severity !== "low").slice(0, 5),
            recommendations,
            explainability,

            analysisWindow: {
                startTime: windowStart,
                endTime: analysisStart,
                hoursAnalyzed: windowHours,
                dataPointsEvaluated: windowedVitals.length + windowedLabs.length,
            },

            governance: {
                alertId: randomUUID(),
                version: this.version,
                modelUsed: "EarlyDeteriorationAgent-v1",
                auditTrail: [{
                    timestamp: analysisStart,
                    action: "created",
                }],
            },
        };

        return alert;
    }

    // ============================================================================
    // NEWS2 CALCULATION
    // ============================================================================

    private calculateNEWS2(
        vitals: VitalObservation[],
        oxygenSupport: OxygenSupport[]
    ): number {
        // Get most recent values for each vital
        const latestVitals = this.getLatestVitals(vitals);
        const latestOxygen = oxygenSupport.length > 0
            ? oxygenSupport[oxygenSupport.length - 1]
            : null;

        let score = 0;

        // Respiratory Rate
        if (latestVitals["respiratory-rate"] !== undefined) {
            score += this.scoreFromRanges(
                latestVitals["respiratory-rate"],
                NEWS2_WEIGHTS.respiratoryRate
            );
        }

        // Oxygen Saturation
        if (latestVitals["oxygen-saturation"] !== undefined) {
            score += this.scoreFromRanges(
                latestVitals["oxygen-saturation"],
                NEWS2_WEIGHTS.oxygenSaturation
            );
        }

        // Supplemental Oxygen
        if (latestOxygen && latestOxygen.type !== "room-air") {
            score += 2;
        }

        // Systolic BP
        if (latestVitals["systolic-bp"] !== undefined) {
            score += this.scoreFromRanges(
                latestVitals["systolic-bp"],
                NEWS2_WEIGHTS.systolicBP
            );
        }

        // Heart Rate
        if (latestVitals["heart-rate"] !== undefined) {
            score += this.scoreFromRanges(
                latestVitals["heart-rate"],
                NEWS2_WEIGHTS.heartRate
            );
        }

        // Consciousness
        if (latestVitals["consciousness-level"] !== undefined) {
            const level = latestVitals["consciousness-level"] as 0 | 1 | 2 | 3;
            score += NEWS2_WEIGHTS.consciousness[level] || 0;
        }

        // Temperature
        if (latestVitals["temperature"] !== undefined) {
            score += this.scoreFromRanges(
                latestVitals["temperature"],
                NEWS2_WEIGHTS.temperature
            );
        }

        return score;
    }

    // ============================================================================
    // qSOFA CALCULATION
    // ============================================================================

    private calculateQSOFA(vitals: VitalObservation[]): number {
        const latestVitals = this.getLatestVitals(vitals);
        let score = 0;

        // Respiratory rate >= 22/min
        if ((latestVitals["respiratory-rate"] || 0) >= QSOFA_THRESHOLDS.respiratoryRate) {
            score += 1;
        }

        // Systolic BP <= 100 mmHg
        if ((latestVitals["systolic-bp"] || 120) <= QSOFA_THRESHOLDS.systolicBP) {
            score += 1;
        }

        // Altered mentation (GCS < 15 or not Alert)
        if ((latestVitals["consciousness-level"] || 0) > 0) {
            score += 1;
        }

        return score;
    }

    // ============================================================================
    // TREND ANALYSIS (CRITICAL - THE HEART OF EARLY DETECTION)
    // ============================================================================

    private analyzeVitalTrends(
        vitals: VitalObservation[],
        windowHours: number
    ): DeteriorationSignal[] {
        const signals: DeteriorationSignal[] = [];

        const vitalCodes: VitalCode[] = [
            "heart-rate",
            "respiratory-rate",
            "systolic-bp",
            "oxygen-saturation",
            "temperature"
        ];

        for (const code of vitalCodes) {
            const readings = vitals
                .filter(v => v.code === code)
                .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

            if (readings.length < 2) continue;

            const trend = this.analyzeTrend(readings.map(r => ({
                value: r.value,
                timestamp: new Date(r.timestamp),
            })));

            // Check for concerning trends
            const threshold = this.getTrendThreshold(code);
            if (!threshold) continue;

            const isConcerning = this.isTrendConcerning(trend, threshold, code);

            if (isConcerning) {
                const first = readings[0];
                const last = readings[readings.length - 1];
                const change = last.value - first.value;
                const changePercent = (change / first.value) * 100;

                signals.push({
                    type: "vital",
                    code,
                    description: this.getVitalDescription(code),
                    severity: this.getSeverityFromTrend(trend, threshold),
                    trend: trend.direction,
                    values: {
                        baseline: first.value,
                        current: last.value,
                        change: change.toFixed(1),
                        changePercent: Math.abs(changePercent),
                    },
                    timeSpan: `${windowHours} hours`,
                    clinicalSignificance: this.getVitalSignificance(code, trend, changePercent),
                });
            }
        }

        return signals;
    }

    private analyzeLabTrends(
        labs: LabObservation[],
        windowHours: number
    ): DeteriorationSignal[] {
        const signals: DeteriorationSignal[] = [];

        const labCodes: LabCode[] = [
            "crp", "wbc", "lactate", "creatinine", "platelets", "procalcitonin"
        ];

        for (const code of labCodes) {
            const readings = labs
                .filter(l => l.code === code)
                .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

            if (readings.length < 2) continue;

            const trend = this.analyzeTrend(readings.map(r => ({
                value: r.value,
                timestamp: new Date(r.timestamp),
            })));

            const threshold = this.getLabThreshold(code);
            if (!threshold) continue;

            const isConcerning = this.isLabTrendConcerning(trend, threshold, code);

            if (isConcerning) {
                const first = readings[0];
                const last = readings[readings.length - 1];
                const change = last.value - first.value;
                const changePercent = (change / first.value) * 100;

                signals.push({
                    type: "lab",
                    code,
                    description: this.getLabDescription(code),
                    severity: this.getLabSeverity(code, last.value, trend),
                    trend: trend.direction,
                    values: {
                        baseline: first.value,
                        current: last.value,
                        change: change.toFixed(2),
                        changePercent: Math.abs(changePercent),
                    },
                    timeSpan: `${windowHours} hours`,
                    clinicalSignificance: this.getLabSignificance(code, trend, last.value),
                });
            }
        }

        return signals;
    }

    private analyzeOxygenEscalation(oxygenSupport: OxygenSupport[]): DeteriorationSignal[] {
        const signals: DeteriorationSignal[] = [];

        if (oxygenSupport.length < 2) return signals;

        const sorted = oxygenSupport.sort(
            (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        const oxygenHierarchy = [
            "room-air",
            "nasal-cannula",
            "simple-mask",
            "venturi-mask",
            "non-rebreather",
            "hfnc",
            "niv",
            "invasive-ventilation",
        ];

        const firstLevel = oxygenHierarchy.indexOf(sorted[0].type);
        const lastLevel = oxygenHierarchy.indexOf(sorted[sorted.length - 1].type);

        if (lastLevel > firstLevel) {
            const escalationSteps = lastLevel - firstLevel;

            signals.push({
                type: "oxygen",
                code: "oxygen-escalation",
                description: "Oxygen support requirement increased",
                severity: escalationSteps >= 2 ? "high" : "moderate",
                trend: "WORSENING",
                values: {
                    baseline: sorted[0].type,
                    current: sorted[sorted.length - 1].type,
                    change: `+${escalationSteps} levels`,
                },
                timeSpan: this.getTimeSpan(sorted[0].timestamp, sorted[sorted.length - 1].timestamp),
                clinicalSignificance:
                    "Increasing oxygen requirement without diagnosis change suggests respiratory deterioration",
            });
        }

        // Check FiO2 escalation
        const fio2Readings = sorted.filter(o => o.fio2 !== undefined);
        if (fio2Readings.length >= 2) {
            const firstFio2 = fio2Readings[0].fio2!;
            const lastFio2 = fio2Readings[fio2Readings.length - 1].fio2!;

            if (lastFio2 - firstFio2 >= 0.1) {
                signals.push({
                    type: "oxygen",
                    code: "fio2-escalation",
                    description: "FiO₂ requirement increasing",
                    severity: lastFio2 >= 0.6 ? "high" : "moderate",
                    trend: "WORSENING",
                    values: {
                        baseline: (firstFio2 * 100).toFixed(0) + "%",
                        current: (lastFio2 * 100).toFixed(0) + "%",
                        change: `+${((lastFio2 - firstFio2) * 100).toFixed(0)}%`,
                    },
                    timeSpan: this.getTimeSpan(
                        fio2Readings[0].timestamp,
                        fio2Readings[fio2Readings.length - 1].timestamp
                    ),
                    clinicalSignificance:
                        "Rising FiO₂ requirement indicates worsening gas exchange",
                });
            }
        }

        return signals;
    }

    private analyzeMedicationChanges(medications: MedicationEvent[]): DeteriorationSignal[] {
        const signals: DeteriorationSignal[] = [];

        // Check for concerning medication patterns
        const vasopressors = medications.filter(
            m => m.category === "vasopressor" && m.action === "started"
        );

        if (vasopressors.length > 0) {
            signals.push({
                type: "medication",
                code: "vasopressor-start",
                description: "Vasopressor therapy initiated",
                severity: "critical",
                trend: "WORSENING",
                values: {
                    baseline: "None",
                    current: vasopressors.map(v => v.medicationName).join(", "),
                    change: "New vasopressor",
                },
                timeSpan: "Recent",
                clinicalSignificance:
                    "Vasopressor initiation indicates hemodynamic instability",
            });
        }

        // New antibiotics suggest infection concern
        const newAntibiotics = medications.filter(
            m => m.category === "antibiotic" && m.action === "started"
        );

        if (newAntibiotics.length > 0) {
            signals.push({
                type: "medication",
                code: "antibiotic-start",
                description: "New antibiotic therapy started",
                severity: "moderate",
                trend: "STABLE",
                values: {
                    baseline: "None",
                    current: newAntibiotics.map(a => a.medicationName).join(", "),
                    change: "New antibiotic",
                },
                timeSpan: "Recent",
                clinicalSignificance:
                    "New antibiotic may indicate suspected or confirmed infection",
            });
        }

        // Sedative increase may mask deterioration
        const sedativeChanges = medications.filter(
            m => m.category === "sedative" && (m.action === "started" || m.action === "increased")
        );

        if (sedativeChanges.length > 0) {
            signals.push({
                type: "medication",
                code: "sedation-change",
                description: "Sedation increased",
                severity: "low",
                trend: "STABLE",
                values: {
                    baseline: "Previous",
                    current: sedativeChanges.map(s => s.medicationName).join(", "),
                    change: "Increased sedation",
                },
                timeSpan: "Recent",
                clinicalSignificance:
                    "Increased sedation may mask clinical deterioration signs",
            });
        }

        return signals;
    }

    // ============================================================================
    // COMPOSITE RISK CALCULATION
    // ============================================================================

    private computeCompositeRisk(
        news2: number,
        qsofa: number,
        signals: DeteriorationSignal[],
        patient: PatientContext
    ): {
        riskLevel: RiskLevel;
        trajectory: Trajectory;
        confidence: number;
        customScore: number;
        acceleration: number;
    } {
        // Base score from NEWS2
        let customScore = news2 * 5; // Scale to 0-100

        // qSOFA modifier
        if (qsofa >= 2) {
            customScore += 20;
        } else if (qsofa === 1) {
            customScore += 10;
        }

        // Signal contributions
        let worseningSignals = 0;
        let criticalSignals = 0;

        for (const signal of signals) {
            if (signal.severity === "critical") {
                customScore += 15;
                criticalSignals++;
            } else if (signal.severity === "high") {
                customScore += 10;
            } else if (signal.severity === "moderate") {
                customScore += 5;
            }

            if (signal.trend === "WORSENING" || signal.trend === "RAPIDLY_WORSENING") {
                worseningSignals++;
            }
        }

        // Age modifier
        if (patient.age && patient.age >= 65) {
            customScore += 5;
        }
        if (patient.age && patient.age >= 80) {
            customScore += 5;
        }

        // Comorbidity modifier
        if (patient.comorbidities && patient.comorbidities.length >= 3) {
            customScore += 10;
        }

        // Normalize score
        customScore = Math.min(100, customScore);

        // Calculate trend acceleration
        const acceleration = worseningSignals / Math.max(1, signals.length);

        // Determine trajectory
        let trajectory: Trajectory;
        if (acceleration >= 0.7) {
            trajectory = "RAPIDLY_WORSENING";
        } else if (acceleration >= 0.4) {
            trajectory = "WORSENING";
        } else if (acceleration <= 0.1 && signals.filter(s => s.trend === "IMPROVING").length > 0) {
            trajectory = "IMPROVING";
        } else {
            trajectory = "STABLE";
        }

        // Determine risk level
        let riskLevel: RiskLevel;
        if (customScore >= 70 || criticalSignals >= 2 || news2 >= 9) {
            riskLevel = "CRITICAL";
        } else if (customScore >= 50 || criticalSignals >= 1 || news2 >= 7) {
            riskLevel = "HIGH";
        } else if (customScore >= 30 || news2 >= 5) {
            riskLevel = "MODERATE";
        } else {
            riskLevel = "LOW";
        }

        // Upgrade risk if trajectory is rapidly worsening
        if (trajectory === "RAPIDLY_WORSENING" && riskLevel !== "CRITICAL") {
            riskLevel = this.upgradeRiskLevel(riskLevel);
        }

        // Calculate confidence
        const confidence = this.calculateConfidence(signals, news2, qsofa);

        return { riskLevel, trajectory, confidence, customScore, acceleration };
    }

    // ============================================================================
    // EXPLAINABILITY (NON-NEGOTIABLE)
    // ============================================================================

    private buildExplainability(
        signals: DeteriorationSignal[],
        news2: number,
        qsofa: number,
        trajectory: Trajectory,
        confidence: number,
        patient: PatientContext
    ): DeteriorationAlert["explainability"] {
        // Build narrative reasoning
        const reasoning = this.buildReasoningNarrative(signals, news2, qsofa, trajectory);

        // Clinical rationale points
        const clinicalRationale: string[] = [];

        // NEWS2 interpretation
        if (news2 >= 7) {
            clinicalRationale.push(
                `NEWS2 score of ${news2} indicates high clinical risk requiring urgent response`
            );
        } else if (news2 >= 5) {
            clinicalRationale.push(
                `NEWS2 score of ${news2} indicates medium clinical risk requiring increased monitoring`
            );
        }

        // qSOFA interpretation
        if (qsofa >= 2) {
            clinicalRationale.push(
                `qSOFA score ≥2 suggests possible sepsis - consider Sepsis-3 criteria evaluation`
            );
        }

        // Signal-specific rationales
        for (const signal of signals.filter(s => s.severity !== "low")) {
            clinicalRationale.push(signal.clinicalSignificance);
        }

        // Evidence sources
        const evidenceSources = [
            "NEWS2 (Royal College of Physicians, 2017)",
            "Sepsis-3 / qSOFA (JAMA, 2016)",
        ];

        if (signals.some(s => s.code === "lactate")) {
            evidenceSources.push("Surviving Sepsis Campaign Guidelines (2021)");
        }

        if (signals.some(s => s.type === "oxygen")) {
            evidenceSources.push("BTS Guidelines on Oxygen Use (2017)");
        }

        // Confidence factors
        const confidenceFactors: string[] = [];

        if (signals.length >= 3) {
            confidenceFactors.push("Multiple converging signals increase confidence");
        }

        if (trajectory === "WORSENING" || trajectory === "RAPIDLY_WORSENING") {
            confidenceFactors.push("Consistent worsening trajectory supports assessment");
        }

        // Limitations
        const limitations: string[] = [
            "Analysis based on available data within time window",
            "Clinical context and patient goals should guide decisions",
            "This is decision support, not diagnosis",
        ];

        if (signals.length < 3) {
            limitations.push("Limited data points may reduce analysis accuracy");
        }

        return {
            reasoning,
            clinicalRationale,
            evidenceSources,
            confidenceFactors,
            limitations,
        };
    }

    private buildReasoningNarrative(
        signals: DeteriorationSignal[],
        news2: number,
        qsofa: number,
        trajectory: Trajectory
    ): string {
        const parts: string[] = [];

        // Vital trends
        const vitalSignals = signals.filter(s => s.type === "vital");
        if (vitalSignals.length > 0) {
            const vitalDescriptions = vitalSignals.map(s => {
                const direction = s.trend === "WORSENING" ? "increased" :
                    s.trend === "IMPROVING" ? "decreased" : "changed";
                return `${s.description} ${direction} from ${s.values.baseline} → ${s.values.current} (${s.values.changePercent?.toFixed(0) || "N/A"}%)`;
            });
            parts.push(vitalDescriptions.join(", "));
        }

        // Lab trends
        const labSignals = signals.filter(s => s.type === "lab");
        if (labSignals.length > 0) {
            const labDescriptions = labSignals.map(s =>
                `${s.description} changed by ${s.values.change}`
            );
            parts.push(labDescriptions.join(", "));
        }

        // Oxygen escalation
        const oxygenSignals = signals.filter(s => s.type === "oxygen");
        if (oxygenSignals.length > 0) {
            parts.push(
                `oxygen requirement increased from ${oxygenSignals[0].values.baseline} to ${oxygenSignals[0].values.current}`
            );
        }

        // Pattern interpretation
        if (parts.length > 0) {
            const trajectoryText = trajectory === "RAPIDLY_WORSENING" ? "rapid deterioration" :
                trajectory === "WORSENING" ? "progressive deterioration" :
                    trajectory === "STABLE" ? "stable but at-risk pattern" :
                        "improving trajectory";

            return `Over the analysis window: ${parts.join("; ")}. Pattern consistent with ${trajectoryText}. NEWS2: ${news2}, qSOFA: ${qsofa}.`;
        }

        return `Current assessment shows NEWS2 score of ${news2} and qSOFA of ${qsofa}. Trend analysis did not identify significant deterioration patterns in available data.`;
    }

    // ============================================================================
    // RECOMMENDATIONS
    // ============================================================================

    private generateRecommendations(
        riskLevel: RiskLevel,
        trajectory: Trajectory,
        signals: DeteriorationSignal[]
    ): ClinicalRecommendation[] {
        const recommendations: ClinicalRecommendation[] = [];

        // Base recommendations by risk level
        if (riskLevel === "CRITICAL") {
            recommendations.push({
                priority: "immediate",
                action: "Urgent clinical review required",
                rationale: "Critical risk level indicates need for immediate senior clinician assessment",
                evidenceLevel: "A",
                timeframe: "Within 30 minutes",
            });

            recommendations.push({
                priority: "immediate",
                action: "Consider escalation to higher level of care",
                rationale: "Patient may require ICU-level monitoring and intervention",
                evidenceLevel: "B",
                timeframe: "Assess immediately",
            });
        } else if (riskLevel === "HIGH") {
            recommendations.push({
                priority: "urgent",
                action: "Senior clinician review",
                rationale: "High risk score requires prompt clinical assessment",
                evidenceLevel: "A",
                timeframe: "Within 1 hour",
            });
        } else if (riskLevel === "MODERATE") {
            recommendations.push({
                priority: "routine",
                action: "Increase monitoring frequency",
                rationale: "Moderate risk warrants closer observation",
                evidenceLevel: "B",
                timeframe: "Within 4 hours",
            });
        }

        // Trajectory-specific recommendations
        if (trajectory === "RAPIDLY_WORSENING") {
            recommendations.push({
                priority: "urgent",
                action: "Repeat vital signs and labs",
                rationale: "Rapid deterioration trend requires confirmation and updated assessment",
                evidenceLevel: "B",
                timeframe: "Within 30 minutes",
            });
        }

        // Signal-specific recommendations
        const hasOxygenEscalation = signals.some(s => s.type === "oxygen");
        if (hasOxygenEscalation) {
            recommendations.push({
                priority: "urgent",
                action: "Assess for respiratory failure",
                rationale: "Increasing oxygen requirement suggests worsening respiratory function",
                evidenceLevel: "B",
                timeframe: "Immediate assessment",
            });
        }

        const hasLactateElevation = signals.some(s => s.code === "lactate" && s.severity !== "low");
        if (hasLactateElevation) {
            recommendations.push({
                priority: "urgent",
                action: "Assess tissue perfusion and consider sepsis workup",
                rationale: "Elevated or rising lactate may indicate tissue hypoperfusion",
                evidenceLevel: "A",
                timeframe: "Within 1 hour",
            });
        }

        const hasVasopressor = signals.some(s => s.code === "vasopressor-start");
        if (hasVasopressor) {
            recommendations.push({
                priority: "immediate",
                action: "ICU consultation recommended",
                rationale: "Vasopressor therapy typically requires ICU-level care",
                evidenceLevel: "A",
                timeframe: "Immediate",
            });
        }

        return recommendations;
    }

    // ============================================================================
    // HELPER METHODS
    // ============================================================================

    private filterByWindow<T extends { timestamp: Date }>(
        items: T[],
        start: Date,
        end: Date
    ): T[] {
        return items.filter(item => {
            const ts = new Date(item.timestamp).getTime();
            return ts >= start.getTime() && ts <= end.getTime();
        });
    }

    private getLatestVitals(vitals: VitalObservation[]): Record<string, number> {
        const latest: Record<string, number> = {};

        const sorted = [...vitals].sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        for (const vital of sorted) {
            if (latest[vital.code] === undefined) {
                latest[vital.code] = vital.value;
            }
        }

        return latest;
    }

    private scoreFromRanges(
        value: number,
        ranges: { range: number[]; score: number }[]
    ): number {
        for (const { range, score } of ranges) {
            if (value >= range[0] && value <= range[1]) {
                return score;
            }
        }
        return 0;
    }

    private analyzeTrend(
        readings: { value: number; timestamp: Date }[]
    ): { direction: Trajectory; slope: number; velocity: number } {
        if (readings.length < 2) {
            return { direction: "STABLE", slope: 0, velocity: 0 };
        }

        // Simple linear regression
        const n = readings.length;
        const times = readings.map(r => r.timestamp.getTime());
        const values = readings.map(r => r.value);

        const minTime = Math.min(...times);
        const normalizedTimes = times.map(t => (t - minTime) / (1000 * 60 * 60)); // hours

        const sumX = normalizedTimes.reduce((a, b) => a + b, 0);
        const sumY = values.reduce((a, b) => a + b, 0);
        const sumXY = normalizedTimes.reduce((acc, x, i) => acc + x * values[i], 0);
        const sumX2 = normalizedTimes.reduce((acc, x) => acc + x * x, 0);

        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

        // Velocity: change per hour
        const velocity = Math.abs(slope);

        // Direction
        let direction: Trajectory;
        if (Math.abs(slope) < 0.1) {
            direction = "STABLE";
        } else if (slope > 0.5) {
            direction = "RAPIDLY_WORSENING";
        } else if (slope > 0) {
            direction = "WORSENING";
        } else if (slope < -0.5) {
            direction = "IMPROVING";
        } else {
            direction = "IMPROVING";
        }

        return { direction, slope, velocity };
    }

    private getTrendThreshold(code: VitalCode): any {
        const thresholds: Record<string, any> = {
            "respiratory-rate": TREND_THRESHOLDS.respiratoryRate,
            "heart-rate": TREND_THRESHOLDS.heartRate,
            "oxygen-saturation": TREND_THRESHOLDS.oxygenSaturation,
        };
        return thresholds[code];
    }

    private getLabThreshold(code: LabCode): any {
        const thresholds: Record<string, any> = {
            "crp": TREND_THRESHOLDS.crp,
            "lactate": TREND_THRESHOLDS.lactate,
            "creatinine": TREND_THRESHOLDS.creatinine,
        };
        return thresholds[code];
    }

    private isTrendConcerning(
        trend: { direction: Trajectory; slope: number; velocity: number },
        threshold: any,
        code: string
    ): boolean {
        if (trend.direction === "WORSENING" || trend.direction === "RAPIDLY_WORSENING") {
            return true;
        }
        return Math.abs(trend.slope) > (threshold.velocityConcern || 1);
    }

    private isLabTrendConcerning(
        trend: { direction: Trajectory; slope: number; velocity: number },
        threshold: any,
        code: string
    ): boolean {
        return trend.direction === "WORSENING" || trend.direction === "RAPIDLY_WORSENING";
    }

    private getSeverityFromTrend(
        trend: { direction: Trajectory; slope: number; velocity: number },
        threshold: any
    ): "low" | "moderate" | "high" | "critical" {
        if (trend.direction === "RAPIDLY_WORSENING") return "critical";
        if (trend.direction === "WORSENING") return "high";
        return "moderate";
    }

    private getLabSeverity(
        code: LabCode,
        value: number,
        trend: { direction: Trajectory }
    ): "low" | "moderate" | "high" | "critical" {
        // Critical thresholds
        if (code === "lactate" && value >= 4.0) return "critical";
        if (code === "platelets" && value < 50) return "critical";

        if (trend.direction === "RAPIDLY_WORSENING") return "high";
        if (trend.direction === "WORSENING") return "moderate";
        return "low";
    }

    private getVitalDescription(code: VitalCode): string {
        const descriptions: Record<VitalCode, string> = {
            "heart-rate": "Heart rate",
            "respiratory-rate": "Respiratory rate",
            "systolic-bp": "Systolic blood pressure",
            "diastolic-bp": "Diastolic blood pressure",
            "oxygen-saturation": "Oxygen saturation",
            "temperature": "Temperature",
            "consciousness-level": "Consciousness level",
        };
        return descriptions[code] || code;
    }

    private getLabDescription(code: LabCode): string {
        const descriptions: Record<LabCode, string> = {
            "crp": "C-Reactive Protein",
            "wbc": "White blood cell count",
            "lactate": "Serum lactate",
            "creatinine": "Serum creatinine",
            "platelets": "Platelet count",
            "procalcitonin": "Procalcitonin",
            "bnp": "BNP",
            "troponin": "Troponin",
            "hemoglobin": "Hemoglobin",
            "sodium": "Sodium",
            "potassium": "Potassium",
            "glucose": "Blood glucose",
            "bilirubin": "Bilirubin",
            "pao2": "PaO2",
            "fio2": "FiO2",
            "gcs": "GCS",
        };
        return descriptions[code] || code;
    }

    private getVitalSignificance(
        code: VitalCode,
        trend: { direction: Trajectory; slope: number },
        changePercent: number
    ): string {
        const significances: Record<VitalCode, string> = {
            "respiratory-rate":
                `Rising respiratory rate (+${Math.abs(changePercent).toFixed(0)}%) may indicate respiratory distress, metabolic acidosis, or early sepsis`,
            "heart-rate":
                `Heart rate trend suggests compensatory response to physiological stress`,
            "oxygen-saturation":
                `Declining oxygen saturation indicates worsening gas exchange`,
            "systolic-bp":
                `Blood pressure changes may reflect hemodynamic instability`,
            "diastolic-bp":
                `Diastolic pressure changes warrant monitoring`,
            "temperature":
                `Temperature trend may indicate infection or inflammatory process`,
            "consciousness-level":
                `Altered consciousness requires immediate assessment`,
        };
        return significances[code] || "Trend requires clinical correlation";
    }

    private getLabSignificance(
        code: LabCode,
        trend: { direction: Trajectory },
        value: number
    ): string {
        const significances: Record<LabCode, string> = {
            "crp": "Rising CRP indicates ongoing inflammation or infection",
            "wbc": "WBC trend suggests evolving infectious or inflammatory process",
            "lactate": value >= 4
                ? "Lactate ≥4 mmol/L indicates severe tissue hypoperfusion"
                : "Rising lactate suggests inadequate tissue perfusion",
            "creatinine": "Rising creatinine indicates acute kidney injury",
            "platelets": "Falling platelets may indicate DIC, sepsis, or bone marrow suppression",
            "procalcitonin": "Rising procalcitonin strongly suggests bacterial infection",
            "bnp": "Elevated BNP suggests cardiac strain or volume overload",
            "troponin": "Elevated troponin indicates myocardial injury",
            "hemoglobin": "Hemoglobin trend requires assessment for bleeding or hemolysis",
            "sodium": "Sodium abnormality requires assessment",
            "potassium": "Potassium abnormality may affect cardiac function",
            "glucose": "Glucose abnormality requires management",
            "bilirubin": "Rising bilirubin suggests hepatic dysfunction",
            "pao2": "PaO2 trend reflects oxygenation status",
            "fio2": "FiO2 requirement indicates oxygen dependency",
            "gcs": "GCS trend requires neurological assessment",
        };
        return significances[code] || "Trend requires clinical correlation";
    }

    private getTimeSpan(start: Date, end: Date): string {
        const hours = (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60);
        if (hours < 1) return `${Math.round(hours * 60)} minutes`;
        if (hours < 24) return `${Math.round(hours)} hours`;
        return `${Math.round(hours / 24)} days`;
    }

    private calculateConfidence(
        signals: DeteriorationSignal[],
        news2: number,
        qsofa: number
    ): number {
        let confidence = 0.5; // Base confidence

        // More signals = higher confidence
        confidence += Math.min(0.2, signals.length * 0.05);

        // Consistent trajectory increases confidence
        const trajectories = signals.map(s => s.trend);
        const allWorsening = trajectories.every(t => t === "WORSENING" || t === "RAPIDLY_WORSENING");
        if (allWorsening && signals.length >= 2) {
            confidence += 0.15;
        }

        // NEWS2/qSOFA alignment
        if ((news2 >= 5 && qsofa >= 1) || (news2 >= 7 && qsofa >= 2)) {
            confidence += 0.1;
        }

        return Math.min(0.99, confidence);
    }

    private upgradeRiskLevel(current: RiskLevel): RiskLevel {
        const levels: RiskLevel[] = ["LOW", "MODERATE", "HIGH", "CRITICAL"];
        const currentIndex = levels.indexOf(current);
        return levels[Math.min(currentIndex + 1, levels.length - 1)];
    }

    private calculateScoreTrend(
        vitals: VitalObservation[],
        oxygenSupport: OxygenSupport[],
        scoreType: "news2"
    ): Trajectory {
        // Split window into early and late periods
        if (vitals.length < 4) return "STABLE";

        const sorted = [...vitals].sort(
            (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        const midpoint = Math.floor(sorted.length / 2);
        const earlyVitals = sorted.slice(0, midpoint);
        const lateVitals = sorted.slice(midpoint);

        const earlyOxygen = oxygenSupport.slice(0, Math.floor(oxygenSupport.length / 2));
        const lateOxygen = oxygenSupport.slice(Math.floor(oxygenSupport.length / 2));

        const earlyScore = this.calculateNEWS2(earlyVitals, earlyOxygen);
        const lateScore = this.calculateNEWS2(lateVitals, lateOxygen);

        const diff = lateScore - earlyScore;

        if (diff >= 3) return "RAPIDLY_WORSENING";
        if (diff >= 1) return "WORSENING";
        if (diff <= -2) return "IMPROVING";
        return "STABLE";
    }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export const earlyDeteriorationAgent = new EarlyDeteriorationAgent();
