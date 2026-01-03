/**
 * Intelligent Lab Trend Interpretation Engine
 * ============================================
 * 
 * Analyzes lab results in context by detecting meaningful trends, patterns,
 * and inconsistencies over time - NOT isolated abnormal values.
 * 
 * Core Capabilities:
 * - Rolling window analysis (24-72 hours)
 * - Delta and slope calculation
 * - Pattern persistence detection
 * - Cross-lab correlation
 * - Explainable clinical summaries
 * 
 * IMPORTANT: This is DECISION SUPPORT ONLY - interpretation, not diagnosis.
 */

import { randomUUID } from "crypto";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface LabValue {
    id: string;
    code: string;          // LOINC code or lab name
    displayName: string;   // Human readable name
    value: number;
    unit: string;
    timestamp: Date;
    referenceRangeLow?: number;
    referenceRangeHigh?: number;
    status?: "normal" | "low" | "high" | "critical";
}

export interface LabSeriesData {
    patientId: string;
    encounterId?: string;
    labs: LabValue[];
    demographics?: {
        age: number;
        gender: string;
    };
    currentDiagnoses?: string[];
}

export interface TrendDirection {
    direction: "increasing" | "decreasing" | "stable" | "fluctuating";
    slope: number;         // Rate of change per hour
    velocity: "rapid" | "gradual" | "slow";
    persistence: number;   // Hours the trend has been consistent
}

export interface LabTrend {
    labCode: string;
    labName: string;
    currentValue: number;
    previousValue: number;
    unit: string;
    deltaValue: number;
    deltaPercent: number;
    trend: TrendDirection;
    timeWindowHours: number;
    readings: Array<{ value: number; timestamp: Date }>;
    isAbnormal: boolean;
    referenceRange?: { low: number; high: number };
}

export interface ClinicalPattern {
    type: string;
    confidence: number;
    supportingLabs: string[];
    description: string;
    clinicalSignificance: "high" | "moderate" | "low";
    timeWindowHours: number;
    evidence: string[];
}

export interface LabTrendInterpretation {
    agent: "LabTrendInterpretationAgent";
    analysisId: string;
    patientId: string;
    timestamp: string;
    timeWindowAnalyzed: {
        start: string;
        end: string;
        hours: number;
    };
    overallStatus: "Improving" | "Stable" | "Worsening" | "Mixed" | "Insufficient Data";
    summary: string;
    confidence: number;
    trends: LabTrend[];
    patterns: ClinicalPattern[];
    recommendations: string[];
    monitoringPriorities: Array<{
        labName: string;
        urgency: "immediate" | "within-4-hours" | "routine";
        reason: string;
    }>;
    explainability: {
        reasoning: string[];
        evidence: string[];
        limitations: string[];
        dataQuality: {
            totalReadings: number;
            uniqueLabs: number;
            missingData: string[];
            timeGaps: string[];
        };
    };
    analysisTime: number;
}

// ============================================================================
// LAB REFERENCE RANGES & CLINICAL THRESHOLDS
// ============================================================================

const LAB_REFERENCE_RANGES: Record<string, { low: number; high: number; unit: string; criticalLow?: number; criticalHigh?: number }> = {
    // Inflammatory Markers
    "CRP": { low: 0, high: 10, unit: "mg/L", criticalHigh: 100 },
    "C-Reactive Protein": { low: 0, high: 10, unit: "mg/L", criticalHigh: 100 },
    "ESR": { low: 0, high: 20, unit: "mm/hr" },
    "Procalcitonin": { low: 0, high: 0.5, unit: "ng/mL", criticalHigh: 2 },
    "Ferritin": { low: 20, high: 300, unit: "ng/mL" },

    // Complete Blood Count
    "WBC": { low: 4.5, high: 11.0, unit: "x10^9/L", criticalLow: 2, criticalHigh: 30 },
    "Hemoglobin": { low: 12, high: 17, unit: "g/dL", criticalLow: 7 },
    "Platelets": { low: 150, high: 400, unit: "x10^9/L", criticalLow: 50, criticalHigh: 1000 },
    "Neutrophils": { low: 2.0, high: 7.5, unit: "x10^9/L" },
    "Lymphocytes": { low: 1.0, high: 4.0, unit: "x10^9/L", criticalLow: 0.5 },

    // Renal Function
    "Creatinine": { low: 0.6, high: 1.2, unit: "mg/dL", criticalHigh: 4 },
    "BUN": { low: 7, high: 20, unit: "mg/dL", criticalHigh: 50 },
    "eGFR": { low: 90, high: 120, unit: "mL/min/1.73m²", criticalLow: 15 },

    // Hepatic Function
    "AST": { low: 10, high: 40, unit: "U/L", criticalHigh: 200 },
    "ALT": { low: 7, high: 56, unit: "U/L", criticalHigh: 200 },
    "Bilirubin": { low: 0.1, high: 1.2, unit: "mg/dL", criticalHigh: 5 },
    "Albumin": { low: 3.5, high: 5.0, unit: "g/dL", criticalLow: 2.5 },

    // Electrolytes
    "Sodium": { low: 136, high: 145, unit: "mEq/L", criticalLow: 125, criticalHigh: 155 },
    "Potassium": { low: 3.5, high: 5.0, unit: "mEq/L", criticalLow: 2.5, criticalHigh: 6.5 },
    "Chloride": { low: 98, high: 106, unit: "mEq/L" },
    "Bicarbonate": { low: 22, high: 28, unit: "mEq/L", criticalLow: 15 },
    "Calcium": { low: 8.5, high: 10.5, unit: "mg/dL", criticalLow: 7, criticalHigh: 12 },
    "Magnesium": { low: 1.7, high: 2.2, unit: "mg/dL" },
    "Phosphate": { low: 2.5, high: 4.5, unit: "mg/dL" },

    // Metabolic
    "Glucose": { low: 70, high: 100, unit: "mg/dL", criticalLow: 50, criticalHigh: 400 },
    "HbA1c": { low: 4.0, high: 5.6, unit: "%" },
    "Lactate": { low: 0.5, high: 2.0, unit: "mmol/L", criticalHigh: 4 },

    // Coagulation
    "PT": { low: 11, high: 13.5, unit: "seconds" },
    "INR": { low: 0.9, high: 1.1, unit: "ratio" },
    "PTT": { low: 25, high: 35, unit: "seconds" },
    "D-Dimer": { low: 0, high: 500, unit: "ng/mL", criticalHigh: 2000 },

    // Cardiac
    "Troponin": { low: 0, high: 0.04, unit: "ng/mL", criticalHigh: 0.1 },
    "BNP": { low: 0, high: 100, unit: "pg/mL", criticalHigh: 400 },
    "NT-proBNP": { low: 0, high: 300, unit: "pg/mL" },
};

// ============================================================================
// CLINICAL PATTERN DEFINITIONS
// ============================================================================

interface PatternDefinition {
    name: string;
    description: string;
    labCriteria: Array<{
        lab: string;
        condition: "rising" | "falling" | "abnormal_high" | "abnormal_low" | "any_abnormal";
    }>;
    minLabsRequired: number;
    clinicalSignificance: "high" | "moderate" | "low";
    recommendations: string[];
}

const CLINICAL_PATTERNS: PatternDefinition[] = [
    {
        name: "Inflammatory Progression",
        description: "Rising inflammatory markers suggesting ongoing or worsening inflammation",
        labCriteria: [
            { lab: "CRP", condition: "rising" },
            { lab: "Lymphocytes", condition: "falling" },
            { lab: "WBC", condition: "rising" },
            { lab: "Procalcitonin", condition: "rising" },
            { lab: "ESR", condition: "rising" },
        ],
        minLabsRequired: 2,
        clinicalSignificance: "high",
        recommendations: [
            "Review ongoing infection management",
            "Consider repeat cultures if indicated",
            "Assess source control adequacy",
            "Monitor inflammatory markers closely (q6-12h)",
        ],
    },
    {
        name: "Sepsis Warning Pattern",
        description: "Lab constellation suggesting possible sepsis evolution",
        labCriteria: [
            { lab: "WBC", condition: "any_abnormal" },
            { lab: "Lactate", condition: "rising" },
            { lab: "Platelets", condition: "falling" },
            { lab: "Creatinine", condition: "rising" },
            { lab: "Bilirubin", condition: "rising" },
        ],
        minLabsRequired: 3,
        clinicalSignificance: "high",
        recommendations: [
            "Urgent clinical reassessment required",
            "Consider sepsis bundle initiation",
            "Ensure adequate fluid resuscitation",
            "Review antibiotic coverage",
            "Monitor lactate clearance",
        ],
    },
    {
        name: "Acute Kidney Injury Progression",
        description: "Rising renal markers suggesting worsening kidney function",
        labCriteria: [
            { lab: "Creatinine", condition: "rising" },
            { lab: "BUN", condition: "rising" },
            { lab: "eGFR", condition: "falling" },
            { lab: "Potassium", condition: "rising" },
        ],
        minLabsRequired: 2,
        clinicalSignificance: "high",
        recommendations: [
            "Review nephrotoxic medications",
            "Assess volume status",
            "Consider renal consult if progressive",
            "Monitor urine output",
            "Hold ACE-I/ARBs if appropriate",
        ],
    },
    {
        name: "Hepatic Stress Pattern",
        description: "Liver enzyme elevation suggesting hepatic injury or stress",
        labCriteria: [
            { lab: "AST", condition: "rising" },
            { lab: "ALT", condition: "rising" },
            { lab: "Bilirubin", condition: "rising" },
            { lab: "Albumin", condition: "falling" },
        ],
        minLabsRequired: 2,
        clinicalSignificance: "moderate",
        recommendations: [
            "Review hepatotoxic medications",
            "Consider hepatology consult",
            "Assess for biliary obstruction",
            "Monitor coagulation parameters",
        ],
    },
    {
        name: "Coagulation Instability",
        description: "Abnormal coagulation markers suggesting bleeding risk or DIC",
        labCriteria: [
            { lab: "Platelets", condition: "falling" },
            { lab: "INR", condition: "rising" },
            { lab: "PT", condition: "rising" },
            { lab: "D-Dimer", condition: "rising" },
        ],
        minLabsRequired: 2,
        clinicalSignificance: "high",
        recommendations: [
            "Assess for active bleeding",
            "Review anticoagulation therapy",
            "Consider DIC workup",
            "Prepare for possible transfusion",
        ],
    },
    {
        name: "Electrolyte Instability",
        description: "Multiple electrolyte abnormalities requiring correction",
        labCriteria: [
            { lab: "Sodium", condition: "any_abnormal" },
            { lab: "Potassium", condition: "any_abnormal" },
            { lab: "Calcium", condition: "any_abnormal" },
            { lab: "Magnesium", condition: "any_abnormal" },
            { lab: "Phosphate", condition: "any_abnormal" },
        ],
        minLabsRequired: 2,
        clinicalSignificance: "moderate",
        recommendations: [
            "Systematic electrolyte replacement",
            "Review diuretic therapy",
            "Consider cardiac monitoring for K/Ca abnormalities",
            "Assess renal function impact",
        ],
    },
    {
        name: "Treatment Failure Pattern",
        description: "Labs not improving as expected despite therapy",
        labCriteria: [
            { lab: "CRP", condition: "rising" },
            { lab: "WBC", condition: "any_abnormal" },
            { lab: "Lactate", condition: "abnormal_high" },
        ],
        minLabsRequired: 2,
        clinicalSignificance: "high",
        recommendations: [
            "Reassess treatment adequacy",
            "Consider culture-directed changes",
            "Look for missed source of infection",
            "Escalate clinical review",
        ],
    },
    {
        name: "Metabolic Acidosis Pattern",
        description: "Lab findings consistent with metabolic acidosis",
        labCriteria: [
            { lab: "Bicarbonate", condition: "falling" },
            { lab: "Lactate", condition: "rising" },
            { lab: "pH", condition: "falling" },
        ],
        minLabsRequired: 2,
        clinicalSignificance: "high",
        recommendations: [
            "Identify cause of acidosis (MUDPILES)",
            "Check anion gap",
            "Assess tissue perfusion",
            "Monitor respiratory compensation",
        ],
    },
    {
        name: "Recovery Pattern",
        description: "Labs trending toward normalization indicating clinical improvement",
        labCriteria: [
            { lab: "CRP", condition: "falling" },
            { lab: "WBC", condition: "falling" },
            { lab: "Lactate", condition: "falling" },
        ],
        minLabsRequired: 2,
        clinicalSignificance: "low",
        recommendations: [
            "Continue current management",
            "Consider de-escalation if appropriate",
            "Plan for transition of care",
        ],
    },
];

// ============================================================================
// LAB TREND INTERPRETATION AGENT
// ============================================================================

export class LabTrendInterpretationAgent {
    private readonly defaultWindowHours = 48;
    private readonly minReadingsForTrend = 2;

    constructor() {
        console.log("[LabTrendAgent] Lab Trend Interpretation Agent initialized");
    }

    /**
     * Main analysis method
     */
    async analyze(data: LabSeriesData, windowHours?: number): Promise<LabTrendInterpretation> {
        const startTime = Date.now();
        const analysisId = randomUUID();
        const timeWindow = windowHours || this.defaultWindowHours;

        console.log(`[LabTrendAgent] Starting analysis for patient ${data.patientId.substring(0, 8)}...`);
        console.log(`[LabTrendAgent] Total lab values: ${data.labs.length}, Window: ${timeWindow}h`);

        // Group labs by type
        const labGroups = this.groupLabsByType(data.labs);
        const windowEnd = new Date();
        const windowStart = new Date(windowEnd.getTime() - timeWindow * 60 * 60 * 1000);

        // Calculate trends for each lab type
        const trends: LabTrend[] = [];
        for (const [labCode, values] of Object.entries(labGroups)) {
            const labsInWindow = values.filter(v => new Date(v.timestamp) >= windowStart);
            if (labsInWindow.length >= this.minReadingsForTrend) {
                const trend = this.calculateTrend(labCode, labsInWindow, timeWindow);
                if (trend) trends.push(trend);
            }
        }

        // Detect clinical patterns
        const patterns = this.detectPatterns(trends, data.labs);

        // Determine overall status
        const overallStatus = this.determineOverallStatus(trends, patterns);

        // Generate recommendations
        const recommendations = this.generateRecommendations(patterns, trends);

        // Identify monitoring priorities
        const monitoringPriorities = this.identifyMonitoringPriorities(trends, patterns);

        // Build explanation
        const explainability = this.buildExplainability(data, trends, patterns, timeWindow);

        // Generate summary
        const summary = this.generateSummary(overallStatus, trends, patterns, timeWindow);

        const result: LabTrendInterpretation = {
            agent: "LabTrendInterpretationAgent",
            analysisId,
            patientId: data.patientId,
            timestamp: new Date().toISOString(),
            timeWindowAnalyzed: {
                start: windowStart.toISOString(),
                end: windowEnd.toISOString(),
                hours: timeWindow,
            },
            overallStatus,
            summary,
            confidence: this.calculateConfidence(trends, patterns, data.labs.length),
            trends,
            patterns,
            recommendations,
            monitoringPriorities,
            explainability,
            analysisTime: Date.now() - startTime,
        };

        console.log(`[LabTrendAgent] Analysis complete: ${overallStatus}, ${patterns.length} patterns, ${trends.length} trends`);
        return result;
    }

    /**
     * Group labs by their type/code
     */
    private groupLabsByType(labs: LabValue[]): Record<string, LabValue[]> {
        const groups: Record<string, LabValue[]> = {};

        for (const lab of labs) {
            const key = this.normalizeLabName(lab.displayName || lab.code);
            if (!groups[key]) groups[key] = [];
            groups[key].push(lab);
        }

        // Sort each group by timestamp
        for (const key of Object.keys(groups)) {
            groups[key].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        }

        return groups;
    }

    /**
     * Normalize lab names for matching
     */
    private normalizeLabName(name: string): string {
        return name.trim()
            .replace(/\s+/g, " ")
            .split(" ")[0]; // Take first word for common labs
    }

    /**
     * Calculate trend for a specific lab
     */
    private calculateTrend(labCode: string, values: LabValue[], windowHours: number): LabTrend | null {
        if (values.length < 2) return null;

        const sortedValues = [...values].sort(
            (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        const firstValue = sortedValues[0];
        const lastValue = sortedValues[sortedValues.length - 1];
        const deltaValue = lastValue.value - firstValue.value;
        const deltaPercent = firstValue.value !== 0
            ? (deltaValue / firstValue.value) * 100
            : 0;

        // Calculate slope (change per hour)
        const timeDiffHours = (new Date(lastValue.timestamp).getTime() - new Date(firstValue.timestamp).getTime()) / (1000 * 60 * 60);
        const slope = timeDiffHours > 0 ? deltaValue / timeDiffHours : 0;

        // Determine trend direction
        const trend = this.determineTrendDirection(sortedValues, slope);

        // Get reference range
        const refRange = LAB_REFERENCE_RANGES[labCode] || LAB_REFERENCE_RANGES[lastValue.displayName];

        // Check if abnormal
        const isAbnormal = refRange
            ? (lastValue.value < refRange.low || lastValue.value > refRange.high)
            : false;

        return {
            labCode: lastValue.code || labCode,
            labName: lastValue.displayName || labCode,
            currentValue: lastValue.value,
            previousValue: firstValue.value,
            unit: lastValue.unit,
            deltaValue: Math.round(deltaValue * 100) / 100,
            deltaPercent: Math.round(deltaPercent * 10) / 10,
            trend,
            timeWindowHours: windowHours,
            readings: sortedValues.map(v => ({ value: v.value, timestamp: v.timestamp })),
            isAbnormal,
            referenceRange: refRange ? { low: refRange.low, high: refRange.high } : undefined,
        };
    }

    /**
     * Determine trend direction and velocity
     */
    private determineTrendDirection(values: LabValue[], slope: number): TrendDirection {
        const absSlope = Math.abs(slope);

        // Count direction changes
        let increases = 0;
        let decreases = 0;
        for (let i = 1; i < values.length; i++) {
            if (values[i].value > values[i - 1].value) increases++;
            else if (values[i].value < values[i - 1].value) decreases++;
        }

        const totalChanges = increases + decreases;
        const consistencyRatio = totalChanges > 0
            ? Math.max(increases, decreases) / totalChanges
            : 1;

        // Determine direction
        let direction: "increasing" | "decreasing" | "stable" | "fluctuating";
        if (consistencyRatio < 0.6 && totalChanges > 2) {
            direction = "fluctuating";
        } else if (absSlope < 0.01) {
            direction = "stable";
        } else if (slope > 0) {
            direction = "increasing";
        } else {
            direction = "decreasing";
        }

        // Determine velocity
        let velocity: "rapid" | "gradual" | "slow";
        if (absSlope > 1) velocity = "rapid";
        else if (absSlope > 0.1) velocity = "gradual";
        else velocity = "slow";

        // Calculate persistence (hours of consistent trend)
        const firstTime = new Date(values[0].timestamp).getTime();
        const lastTime = new Date(values[values.length - 1].timestamp).getTime();
        const persistence = (lastTime - firstTime) / (1000 * 60 * 60);

        return { direction, slope: Math.round(slope * 1000) / 1000, velocity, persistence };
    }

    /**
     * Detect clinical patterns from trends
     */
    private detectPatterns(trends: LabTrend[], allLabs: LabValue[]): ClinicalPattern[] {
        const detectedPatterns: ClinicalPattern[] = [];

        for (const patternDef of CLINICAL_PATTERNS) {
            const matchingLabs: string[] = [];
            const evidence: string[] = [];

            for (const criteria of patternDef.labCriteria) {
                const trend = trends.find(t =>
                    t.labName.toLowerCase().includes(criteria.lab.toLowerCase()) ||
                    t.labCode.toLowerCase().includes(criteria.lab.toLowerCase())
                );

                if (!trend) continue;

                let matches = false;
                switch (criteria.condition) {
                    case "rising":
                        matches = trend.trend.direction === "increasing" && trend.deltaPercent > 10;
                        if (matches) evidence.push(`${trend.labName} rising: ${trend.previousValue} → ${trend.currentValue} (+${trend.deltaPercent}%)`);
                        break;
                    case "falling":
                        matches = trend.trend.direction === "decreasing" && trend.deltaPercent < -10;
                        if (matches) evidence.push(`${trend.labName} falling: ${trend.previousValue} → ${trend.currentValue} (${trend.deltaPercent}%)`);
                        break;
                    case "abnormal_high":
                        matches = trend.isAbnormal && trend.referenceRange && trend.currentValue > trend.referenceRange.high;
                        if (matches) evidence.push(`${trend.labName} elevated: ${trend.currentValue} (ref: <${trend.referenceRange?.high})`);
                        break;
                    case "abnormal_low":
                        matches = trend.isAbnormal && trend.referenceRange && trend.currentValue < trend.referenceRange.low;
                        if (matches) evidence.push(`${trend.labName} low: ${trend.currentValue} (ref: >${trend.referenceRange?.low})`);
                        break;
                    case "any_abnormal":
                        matches = trend.isAbnormal;
                        if (matches) evidence.push(`${trend.labName} abnormal: ${trend.currentValue}`);
                        break;
                }

                if (matches) matchingLabs.push(criteria.lab);
            }

            if (matchingLabs.length >= patternDef.minLabsRequired) {
                // Calculate confidence based on evidence strength
                const baseConfidence = 0.6;
                const labBonus = Math.min(0.3, (matchingLabs.length - patternDef.minLabsRequired) * 0.1);
                const confidence = Math.min(0.95, baseConfidence + labBonus + 0.1);

                detectedPatterns.push({
                    type: patternDef.name,
                    confidence: Math.round(confidence * 100) / 100,
                    supportingLabs: matchingLabs,
                    description: patternDef.description,
                    clinicalSignificance: patternDef.clinicalSignificance,
                    timeWindowHours: this.defaultWindowHours,
                    evidence,
                });
            }
        }

        // Sort by clinical significance
        return detectedPatterns.sort((a, b) => {
            const sigOrder = { high: 0, moderate: 1, low: 2 };
            return sigOrder[a.clinicalSignificance] - sigOrder[b.clinicalSignificance];
        });
    }

    /**
     * Determine overall status
     */
    private determineOverallStatus(trends: LabTrend[], patterns: ClinicalPattern[]): LabTrendInterpretation["overallStatus"] {
        if (trends.length === 0) return "Insufficient Data";

        // Check for high-significance worsening patterns
        const highSigPatterns = patterns.filter(p => p.clinicalSignificance === "high");
        if (highSigPatterns.some(p => p.type.includes("Progression") || p.type.includes("Warning") || p.type.includes("Failure"))) {
            return "Worsening";
        }

        // Check for recovery pattern
        if (patterns.some(p => p.type === "Recovery Pattern")) {
            return "Improving";
        }

        // Count trend directions
        const increasing = trends.filter(t => t.trend.direction === "increasing" && t.isAbnormal).length;
        const decreasing = trends.filter(t => t.trend.direction === "decreasing" &&
            t.referenceRange && t.currentValue < t.referenceRange.low).length;
        const worsening = increasing + decreasing;
        const stable = trends.filter(t => t.trend.direction === "stable").length;
        const improving = trends.filter(t =>
            (t.trend.direction === "decreasing" && t.previousValue > (t.referenceRange?.high || 999)) ||
            (t.trend.direction === "increasing" && t.previousValue < (t.referenceRange?.low || 0))
        ).length;

        if (worsening > improving && worsening > stable) return "Worsening";
        if (improving > worsening && improving >= stable) return "Improving";
        if (worsening > 0 && improving > 0) return "Mixed";
        return "Stable";
    }

    /**
     * Generate clinical recommendations
     */
    private generateRecommendations(patterns: ClinicalPattern[], trends: LabTrend[]): string[] {
        const recommendations = new Set<string>();

        // Add pattern-specific recommendations
        for (const pattern of patterns) {
            const patternDef = CLINICAL_PATTERNS.find(p => p.name === pattern.type);
            if (patternDef) {
                for (const rec of patternDef.recommendations) {
                    recommendations.add(rec);
                }
            }
        }

        // Add general recommendations for critical values
        for (const trend of trends) {
            if (trend.isAbnormal && trend.trend.direction === "increasing" && trend.trend.velocity === "rapid") {
                recommendations.add(`Urgent: ${trend.labName} rising rapidly - consider immediate intervention`);
            }
        }

        // Default if no specific recommendations
        if (recommendations.size === 0) {
            recommendations.add("Continue routine monitoring");
            recommendations.add("Reassess if clinical status changes");
        }

        return Array.from(recommendations).slice(0, 6); // Limit to top 6
    }

    /**
     * Identify labs that need priority monitoring
     */
    private identifyMonitoringPriorities(trends: LabTrend[], patterns: ClinicalPattern[]): LabTrendInterpretation["monitoringPriorities"] {
        const priorities: LabTrendInterpretation["monitoringPriorities"] = [];

        // Labs from high-significance patterns get immediate priority
        const highSigLabs = new Set<string>();
        for (const pattern of patterns.filter(p => p.clinicalSignificance === "high")) {
            for (const lab of pattern.supportingLabs) {
                highSigLabs.add(lab);
            }
        }

        for (const trend of trends) {
            const labInHighSig = Array.from(highSigLabs).some(l =>
                trend.labName.toLowerCase().includes(l.toLowerCase())
            );

            let urgency: "immediate" | "within-4-hours" | "routine" = "routine";
            let reason = "Routine monitoring";

            if (labInHighSig && trend.trend.velocity === "rapid") {
                urgency = "immediate";
                reason = `Part of ${patterns[0]?.type || "concerning pattern"}, changing rapidly`;
            } else if (labInHighSig || (trend.isAbnormal && trend.trend.velocity !== "slow")) {
                urgency = "within-4-hours";
                reason = trend.isAbnormal
                    ? `Abnormal with ${trend.trend.direction} trend`
                    : `Monitoring for ${patterns[0]?.type || "pattern progression"}`;
            } else if (trend.isAbnormal) {
                urgency = "within-4-hours";
                reason = `Abnormal value: ${trend.currentValue} ${trend.unit}`;
            }

            if (urgency !== "routine") {
                priorities.push({
                    labName: trend.labName,
                    urgency,
                    reason,
                });
            }
        }

        // Sort by urgency
        return priorities.sort((a, b) => {
            const urgencyOrder = { immediate: 0, "within-4-hours": 1, routine: 2 };
            return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
        }).slice(0, 5); // Top 5 priorities
    }

    /**
     * Build explainability section
     */
    private buildExplainability(
        data: LabSeriesData,
        trends: LabTrend[],
        patterns: ClinicalPattern[],
        windowHours: number
    ): LabTrendInterpretation["explainability"] {
        const reasoning: string[] = [];
        const evidence: string[] = [
            "FHIR R4 Observation resources",
            "Clinical laboratory interpretation standards",
            "Time-series trend analysis algorithms",
        ];
        const limitations: string[] = [];

        // Build reasoning chain
        reasoning.push(`Analyzed ${data.labs.length} lab values over ${windowHours}-hour window`);
        reasoning.push(`Identified ${trends.length} labs with sufficient data for trend analysis`);

        if (patterns.length > 0) {
            reasoning.push(`Detected ${patterns.length} clinical pattern(s) based on correlated lab changes`);
            for (const pattern of patterns.slice(0, 2)) {
                reasoning.push(`- "${pattern.type}": ${pattern.supportingLabs.join(", ")} (${Math.round(pattern.confidence * 100)}% confidence)`);
            }
        } else {
            reasoning.push("No significant clinical patterns detected in current data");
        }

        // Identify limitations
        const uniqueLabs = new Set(data.labs.map(l => l.displayName || l.code));
        if (uniqueLabs.size < 5) {
            limitations.push("Limited lab panel - some patterns may not be detectable");
        }

        const missingCritical = ["Lactate", "CRP", "Creatinine"].filter(
            lab => !Array.from(uniqueLabs).some(l => l.toLowerCase().includes(lab.toLowerCase()))
        );
        if (missingCritical.length > 0) {
            limitations.push(`Missing critical labs: ${missingCritical.join(", ")}`);
        }

        // Check for time gaps
        const timestamps = data.labs.map(l => new Date(l.timestamp).getTime()).sort();
        const gaps: string[] = [];
        for (let i = 1; i < timestamps.length; i++) {
            const gapHours = (timestamps[i] - timestamps[i - 1]) / (1000 * 60 * 60);
            if (gapHours > 12) {
                gaps.push(`${Math.round(gapHours)}h gap detected`);
            }
        }

        if (gaps.length > 0) {
            limitations.push("Significant time gaps in lab data may affect trend accuracy");
        }

        limitations.push("This is decision support only - clinical judgment required");

        return {
            reasoning,
            evidence,
            limitations,
            dataQuality: {
                totalReadings: data.labs.length,
                uniqueLabs: uniqueLabs.size,
                missingData: missingCritical,
                timeGaps: gaps.slice(0, 3),
            },
        };
    }

    /**
     * Calculate overall confidence
     */
    private calculateConfidence(trends: LabTrend[], patterns: ClinicalPattern[], totalReadings: number): number {
        let confidence = 0.5; // Base

        // More readings = higher confidence
        if (totalReadings >= 10) confidence += 0.2;
        else if (totalReadings >= 5) confidence += 0.1;

        // More trends = higher confidence
        if (trends.length >= 5) confidence += 0.15;
        else if (trends.length >= 3) confidence += 0.1;

        // Pattern detection adds confidence
        if (patterns.length > 0) {
            confidence += 0.1;
            // High confidence patterns boost overall
            const avgPatternConfidence = patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length;
            confidence += (avgPatternConfidence - 0.5) * 0.2;
        }

        return Math.min(0.95, Math.max(0.3, Math.round(confidence * 100) / 100));
    }

    /**
     * Generate natural language summary
     */
    private generateSummary(
        status: LabTrendInterpretation["overallStatus"],
        trends: LabTrend[],
        patterns: ClinicalPattern[],
        windowHours: number
    ): string {
        if (status === "Insufficient Data") {
            return `Insufficient lab data available for comprehensive trend analysis. At least 2 readings per lab over ${windowHours} hours are needed.`;
        }

        const parts: string[] = [];

        // Overall status
        switch (status) {
            case "Worsening":
                parts.push(`Laboratory trends show concerning worsening over the last ${windowHours} hours.`);
                break;
            case "Improving":
                parts.push(`Laboratory trends show positive improvement over the last ${windowHours} hours.`);
                break;
            case "Stable":
                parts.push(`Laboratory values remain stable over the last ${windowHours} hours.`);
                break;
            case "Mixed":
                parts.push(`Laboratory trends show mixed patterns over the last ${windowHours} hours with some improving and some worsening.`);
                break;
        }

        // Key patterns
        if (patterns.length > 0) {
            const topPattern = patterns[0];
            parts.push(`${topPattern.type} detected (${Math.round(topPattern.confidence * 100)}% confidence) involving ${topPattern.supportingLabs.join(", ")}.`);
        }

        // Key trends
        const worseningTrends = trends.filter(t => t.trend.direction === "increasing" && t.isAbnormal);
        if (worseningTrends.length > 0 && worseningTrends.length <= 3) {
            const names = worseningTrends.map(t => t.labName).join(", ");
            parts.push(`Notable: ${names} showing upward trend.`);
        }

        return parts.join(" ");
    }
}

// Export singleton instance
export const labTrendAgent = new LabTrendInterpretationAgent();
