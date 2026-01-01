/**
 * Clinical Deterioration Panel Component
 * HealthMesh - Early Warning Detection UI
 * 
 * DESIGN PRINCIPLES:
 * - At-a-glance risk assessment
 * - Avoid alarm fatigue
 * - Explainable AI outputs
 * - Clinical workflow integration
 */

import React, { useState, useEffect } from "react";
import {
    AlertTriangle,
    TrendingUp,
    TrendingDown,
    Minus,
    Clock,
    Activity,
    Heart,
    Thermometer,
    Droplets,
    ChevronDown,
    ChevronUp,
    Info,
    CheckCircle2,
    AlertCircle,
    XCircle,
    Zap,
    FileText,
    Shield,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

type RiskLevel = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
type Trajectory = "IMPROVING" | "STABLE" | "WORSENING" | "RAPIDLY_WORSENING";

interface DeteriorationSignal {
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

interface ClinicalRecommendation {
    priority: "routine" | "urgent" | "immediate";
    action: string;
    rationale: string;
    evidenceLevel: "A" | "B" | "C" | "expert-opinion";
    timeframe: string;
}

interface DeteriorationAlert {
    id: string;
    timestamp: Date;
    riskLevel: RiskLevel;
    trajectory: Trajectory;
    confidence: number;
    scores: {
        news2Score: number;
        news2Trend: Trajectory;
        qsofaScore: number;
        customRiskScore: number;
        trendAcceleration: number;
    };
    keySignals: DeteriorationSignal[];
    recommendations: ClinicalRecommendation[];
    explainability: {
        reasoning: string;
        clinicalRationale: string[];
        evidenceSources: string[];
        confidenceFactors: string[];
        limitations: string[];
    };
    analysisWindow: {
        startTime: Date;
        endTime: Date;
        hoursAnalyzed: number;
        dataPointsEvaluated: number;
    };
}

interface ClinicalDeteriorationPanelProps {
    alert?: DeteriorationAlert;
    isLoading?: boolean;
    onAcknowledge?: (alertId: string, notes?: string) => void;
    onEscalate?: (alertId: string) => void;
    onDismiss?: (alertId: string, reason: string) => void;
    compact?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ClinicalDeteriorationPanel({
    alert,
    isLoading = false,
    onAcknowledge,
    onEscalate,
    onDismiss,
    compact = false,
}: ClinicalDeteriorationPanelProps) {
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        signals: true,
        recommendations: true,
        reasoning: false,
        evidence: false,
    });

    const toggleSection = (section: string) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    if (isLoading) {
        return <LoadingSkeleton />;
    }

    if (!alert) {
        return <NoAlertState />;
    }

    return (
        <div className="deterioration-panel">
            {/* Header with Risk Badge */}
            <div className="panel-header">
                <RiskBadge
                    riskLevel={alert.riskLevel}
                    trajectory={alert.trajectory}
                    confidence={alert.confidence}
                />

                <div className="header-meta">
                    <div className="analysis-time">
                        <Clock size={14} />
                        <span>
                            {formatTime(alert.timestamp)} • {alert.analysisWindow.hoursAnalyzed}h window
                        </span>
                    </div>
                    <div className="data-points">
                        <Activity size={14} />
                        <span>{alert.analysisWindow.dataPointsEvaluated} data points analyzed</span>
                    </div>
                </div>
            </div>

            {/* Quick Scores */}
            <div className="scores-row">
                <ScoreCard
                    label="NEWS2"
                    value={alert.scores.news2Score}
                    max={20}
                    trend={alert.scores.news2Trend}
                    riskThresholds={{ low: 4, medium: 6, high: 7 }}
                />
                <ScoreCard
                    label="qSOFA"
                    value={alert.scores.qsofaScore}
                    max={3}
                    riskThresholds={{ low: 1, medium: 2, high: 2 }}
                />
                <ScoreCard
                    label="Risk Score"
                    value={alert.scores.customRiskScore}
                    max={100}
                    suffix="/100"
                    riskThresholds={{ low: 30, medium: 50, high: 70 }}
                />
            </div>

            {/* Key Signals */}
            <CollapsibleSection
                title="Key Deterioration Signals"
                icon={<AlertTriangle size={16} />}
                isExpanded={expandedSections.signals}
                onToggle={() => toggleSection("signals")}
                badge={alert.keySignals.length}
            >
                <div className="signals-list">
                    {alert.keySignals.map((signal, idx) => (
                        <SignalCard key={idx} signal={signal} />
                    ))}
                </div>
            </CollapsibleSection>

            {/* Recommendations */}
            <CollapsibleSection
                title="Clinical Recommendations"
                icon={<CheckCircle2 size={16} />}
                isExpanded={expandedSections.recommendations}
                onToggle={() => toggleSection("recommendations")}
                badge={alert.recommendations.length}
            >
                <div className="recommendations-list">
                    {alert.recommendations.map((rec, idx) => (
                        <RecommendationCard key={idx} recommendation={rec} />
                    ))}
                </div>
            </CollapsibleSection>

            {/* Clinical Reasoning (Explainability) */}
            <CollapsibleSection
                title="Why This Alert Was Triggered"
                icon={<Info size={16} />}
                isExpanded={expandedSections.reasoning}
                onToggle={() => toggleSection("reasoning")}
            >
                <div className="reasoning-section">
                    <p className="reasoning-narrative">
                        {alert.explainability.reasoning}
                    </p>

                    <div className="rationale-list">
                        <h5>Clinical Rationale:</h5>
                        <ul>
                            {alert.explainability.clinicalRationale.map((point, idx) => (
                                <li key={idx}>{point}</li>
                            ))}
                        </ul>
                    </div>

                    <div className="confidence-factors">
                        <h5>Confidence Factors:</h5>
                        <ul>
                            {alert.explainability.confidenceFactors.map((factor, idx) => (
                                <li key={idx}>{factor}</li>
                            ))}
                        </ul>
                    </div>

                    <div className="limitations">
                        <h5>Limitations:</h5>
                        <ul>
                            {alert.explainability.limitations.map((limitation, idx) => (
                                <li key={idx}>{limitation}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            </CollapsibleSection>

            {/* Evidence Sources */}
            <CollapsibleSection
                title="Evidence Sources"
                icon={<FileText size={16} />}
                isExpanded={expandedSections.evidence}
                onToggle={() => toggleSection("evidence")}
            >
                <div className="evidence-sources">
                    {alert.explainability.evidenceSources.map((source, idx) => (
                        <div key={idx} className="evidence-item">
                            <Shield size={14} />
                            <span>{source}</span>
                        </div>
                    ))}
                </div>
            </CollapsibleSection>

            {/* Action Buttons */}
            <div className="action-buttons">
                <button
                    className="btn-acknowledge"
                    onClick={() => onAcknowledge?.(alert.id)}
                >
                    <CheckCircle2 size={16} />
                    Acknowledge
                </button>

                {alert.riskLevel !== "LOW" && (
                    <button
                        className="btn-escalate"
                        onClick={() => onEscalate?.(alert.id)}
                    >
                        <Zap size={16} />
                        Escalate
                    </button>
                )}
            </div>

            {/* Clinical Disclaimer */}
            <div className="clinical-disclaimer">
                <AlertCircle size={14} />
                <span>
                    This is decision support, not diagnosis. All alerts must be validated
                    by a qualified clinician before action.
                </span>
            </div>

            <style>{styles}</style>
        </div>
    );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function RiskBadge({
    riskLevel,
    trajectory,
    confidence
}: {
    riskLevel: RiskLevel;
    trajectory: Trajectory;
    confidence: number;
}) {
    const riskColors: Record<RiskLevel, string> = {
        LOW: "#22c55e",
        MODERATE: "#f59e0b",
        HIGH: "#ef4444",
        CRITICAL: "#dc2626",
    };

    const trajectoryIcons: Record<Trajectory, React.ReactNode> = {
        IMPROVING: <TrendingDown className="trajectory-icon improving" />,
        STABLE: <Minus className="trajectory-icon stable" />,
        WORSENING: <TrendingUp className="trajectory-icon worsening" />,
        RAPIDLY_WORSENING: <TrendingUp className="trajectory-icon critical" />,
    };

    const trajectoryLabels: Record<Trajectory, string> = {
        IMPROVING: "Improving",
        STABLE: "Stable",
        WORSENING: "Worsening",
        RAPIDLY_WORSENING: "Rapidly Worsening",
    };

    return (
        <div className="risk-badge-container">
            <div
                className={`risk-badge risk-${riskLevel.toLowerCase()}`}
                style={{ backgroundColor: riskColors[riskLevel] }}
            >
                <AlertTriangle size={20} />
                <span className="risk-label">{riskLevel}</span>
            </div>

            <div className="trajectory-badge">
                {trajectoryIcons[trajectory]}
                <span>{trajectoryLabels[trajectory]}</span>
            </div>

            <div className="confidence-badge">
                <span>Confidence: {(confidence * 100).toFixed(0)}%</span>
            </div>
        </div>
    );
}

function ScoreCard({
    label,
    value,
    max,
    trend,
    suffix = "",
    riskThresholds
}: {
    label: string;
    value: number;
    max: number;
    trend?: Trajectory;
    suffix?: string;
    riskThresholds: { low: number; medium: number; high: number };
}) {
    const getRiskClass = () => {
        if (value >= riskThresholds.high) return "score-critical";
        if (value >= riskThresholds.medium) return "score-high";
        if (value >= riskThresholds.low) return "score-moderate";
        return "score-low";
    };

    const trajectoryIcon = trend && {
        IMPROVING: <TrendingDown size={12} className="trend-improving" />,
        STABLE: <Minus size={12} className="trend-stable" />,
        WORSENING: <TrendingUp size={12} className="trend-worsening" />,
        RAPIDLY_WORSENING: <TrendingUp size={12} className="trend-critical" />,
    }[trend];

    return (
        <div className={`score-card ${getRiskClass()}`}>
            <div className="score-label">{label}</div>
            <div className="score-value">
                {value}{suffix}
                {trajectoryIcon && <span className="score-trend">{trajectoryIcon}</span>}
            </div>
            <div className="score-bar">
                <div
                    className="score-fill"
                    style={{ width: `${(value / max) * 100}%` }}
                />
            </div>
        </div>
    );
}

function SignalCard({ signal }: { signal: DeteriorationSignal }) {
    const severityColors: Record<string, string> = {
        low: "#22c55e",
        moderate: "#f59e0b",
        high: "#ef4444",
        critical: "#dc2626",
    };

    const typeIcons: Record<string, React.ReactNode> = {
        vital: <Heart size={16} />,
        lab: <Droplets size={16} />,
        oxygen: <Activity size={16} />,
        medication: <Thermometer size={16} />,
        composite: <AlertTriangle size={16} />,
    };

    return (
        <div className={`signal-card severity-${signal.severity}`}>
            <div className="signal-header">
                <div className="signal-icon" style={{ color: severityColors[signal.severity] }}>
                    {typeIcons[signal.type]}
                </div>
                <div className="signal-title">
                    <span className="signal-description">{signal.description}</span>
                    <span className="signal-severity-badge" style={{ backgroundColor: severityColors[signal.severity] }}>
                        {signal.severity.toUpperCase()}
                    </span>
                </div>
            </div>

            <div className="signal-values">
                <div className="value-item">
                    <span className="value-label">Baseline:</span>
                    <span className="value-data">{signal.values.baseline}</span>
                </div>
                <div className="value-arrow">→</div>
                <div className="value-item">
                    <span className="value-label">Current:</span>
                    <span className="value-data">{signal.values.current}</span>
                </div>
                <div className="value-change">
                    ({signal.values.change}
                    {signal.values.changePercent && `, ${signal.values.changePercent.toFixed(0)}%`})
                </div>
            </div>

            <div className="signal-significance">
                {signal.clinicalSignificance}
            </div>

            <div className="signal-timespan">
                <Clock size={12} />
                {signal.timeSpan}
            </div>
        </div>
    );
}

function RecommendationCard({ recommendation }: { recommendation: ClinicalRecommendation }) {
    const priorityColors: Record<string, string> = {
        routine: "#22c55e",
        urgent: "#f59e0b",
        immediate: "#dc2626",
    };

    const priorityIcons: Record<string, React.ReactNode> = {
        routine: <CheckCircle2 size={16} />,
        urgent: <AlertCircle size={16} />,
        immediate: <XCircle size={16} />,
    };

    return (
        <div className={`recommendation-card priority-${recommendation.priority}`}>
            <div className="rec-header">
                <div className="rec-priority" style={{ backgroundColor: priorityColors[recommendation.priority] }}>
                    {priorityIcons[recommendation.priority]}
                    <span>{recommendation.priority.toUpperCase()}</span>
                </div>
                <div className="rec-timeframe">
                    <Clock size={12} />
                    {recommendation.timeframe}
                </div>
            </div>

            <div className="rec-action">{recommendation.action}</div>
            <div className="rec-rationale">{recommendation.rationale}</div>

            <div className="rec-evidence">
                Evidence Level: {recommendation.evidenceLevel}
            </div>
        </div>
    );
}

function CollapsibleSection({
    title,
    icon,
    isExpanded,
    onToggle,
    badge,
    children,
}: {
    title: string;
    icon: React.ReactNode;
    isExpanded: boolean;
    onToggle: () => void;
    badge?: number;
    children: React.ReactNode;
}) {
    return (
        <div className={`collapsible-section ${isExpanded ? "expanded" : ""}`}>
            <button className="section-header" onClick={onToggle}>
                <div className="section-title">
                    {icon}
                    <span>{title}</span>
                    {badge !== undefined && <span className="section-badge">{badge}</span>}
                </div>
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {isExpanded && (
                <div className="section-content">
                    {children}
                </div>
            )}
        </div>
    );
}

function LoadingSkeleton() {
    return (
        <div className="deterioration-panel loading">
            <div className="skeleton-header" />
            <div className="skeleton-scores">
                <div className="skeleton-score" />
                <div className="skeleton-score" />
                <div className="skeleton-score" />
            </div>
            <div className="skeleton-section" />
            <div className="skeleton-section" />
            <style>{styles}</style>
        </div>
    );
}

function NoAlertState() {
    return (
        <div className="deterioration-panel no-alert">
            <div className="no-alert-content">
                <CheckCircle2 size={48} className="no-alert-icon" />
                <h3>No Active Deterioration Alerts</h3>
                <p>
                    The Early Deterioration Detection Agent has not identified any
                    concerning trends in the current analysis window.
                </p>
                <p className="subtle">
                    Continuous monitoring is active. Alerts will appear here if
                    deterioration patterns are detected.
                </p>
            </div>
            <style>{styles}</style>
        </div>
    );
}

// ============================================================================
// UTILITIES
// ============================================================================

function formatTime(date: Date): string {
    return new Date(date).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
}

// ============================================================================
// STYLES
// ============================================================================

const styles = `
  .deterioration-panel {
    background: linear-gradient(145deg, #1a1f2e, #0f1219);
    border-radius: 16px;
    padding: 24px;
    color: #e5e7eb;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 24px;
    flex-wrap: wrap;
    gap: 16px;
  }

  .header-meta {
    display: flex;
    flex-direction: column;
    gap: 8px;
    color: #9ca3af;
    font-size: 13px;
  }

  .header-meta > div {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  /* Risk Badge */
  .risk-badge-container {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .risk-badge {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    border-radius: 12px;
    font-weight: 700;
    font-size: 14px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: white;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  .trajectory-badge {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    font-size: 13px;
  }

  .trajectory-icon.improving { color: #22c55e; }
  .trajectory-icon.stable { color: #f59e0b; }
  .trajectory-icon.worsening { color: #ef4444; }
  .trajectory-icon.critical { color: #dc2626; animation: pulse 1s infinite; }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .confidence-badge {
    font-size: 12px;
    color: #9ca3af;
    padding: 4px 10px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 6px;
  }

  /* Score Cards */
  .scores-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 16px;
    margin-bottom: 24px;
  }

  .score-card {
    background: rgba(255, 255, 255, 0.04);
    border-radius: 12px;
    padding: 16px;
    text-align: center;
    border: 1px solid rgba(255, 255, 255, 0.06);
    transition: all 0.2s ease;
  }

  .score-card:hover {
    background: rgba(255, 255, 255, 0.06);
    transform: translateY(-2px);
  }

  .score-label {
    font-size: 12px;
    color: #9ca3af;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 8px;
  }

  .score-value {
    font-size: 28px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }

  .score-card.score-low .score-value { color: #22c55e; }
  .score-card.score-moderate .score-value { color: #f59e0b; }
  .score-card.score-high .score-value { color: #ef4444; }
  .score-card.score-critical .score-value { color: #dc2626; }

  .score-bar {
    height: 4px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 2px;
    margin-top: 12px;
    overflow: hidden;
  }

  .score-fill {
    height: 100%;
    border-radius: 2px;
    transition: width 0.5s ease;
  }

  .score-card.score-low .score-fill { background: #22c55e; }
  .score-card.score-moderate .score-fill { background: #f59e0b; }
  .score-card.score-high .score-fill { background: #ef4444; }
  .score-card.score-critical .score-fill { background: #dc2626; }

  .score-trend { display: flex; }
  .trend-improving { color: #22c55e; }
  .trend-stable { color: #f59e0b; }
  .trend-worsening { color: #ef4444; }
  .trend-critical { color: #dc2626; }

  /* Collapsible Sections */
  .collapsible-section {
    margin-bottom: 16px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    overflow: hidden;
  }

  .section-header {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 16px;
    background: rgba(255, 255, 255, 0.04);
    border: none;
    color: #e5e7eb;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s ease;
  }

  .section-header:hover {
    background: rgba(255, 255, 255, 0.08);
  }

  .section-title {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .section-badge {
    background: rgba(59, 130, 246, 0.2);
    color: #60a5fa;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 12px;
    font-weight: 600;
  }

  .section-content {
    padding: 16px;
    background: rgba(0, 0, 0, 0.2);
  }

  /* Signal Cards */
  .signals-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .signal-card {
    background: rgba(255, 255, 255, 0.03);
    border-radius: 10px;
    padding: 14px;
    border-left: 3px solid;
  }

  .signal-card.severity-low { border-left-color: #22c55e; }
  .signal-card.severity-moderate { border-left-color: #f59e0b; }
  .signal-card.severity-high { border-left-color: #ef4444; }
  .signal-card.severity-critical { border-left-color: #dc2626; }

  .signal-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
  }

  .signal-title {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
  }

  .signal-description {
    font-weight: 600;
    font-size: 14px;
  }

  .signal-severity-badge {
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 4px;
    color: white;
    font-weight: 600;
    letter-spacing: 0.5px;
  }

  .signal-values {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: #d1d5db;
    margin-bottom: 8px;
    flex-wrap: wrap;
  }

  .value-item {
    display: flex;
    gap: 4px;
  }

  .value-label {
    color: #9ca3af;
  }

  .value-data {
    font-weight: 600;
    color: #fff;
  }

  .value-arrow {
    color: #6b7280;
  }

  .value-change {
    color: #9ca3af;
    font-size: 12px;
  }

  .signal-significance {
    font-size: 13px;
    color: #9ca3af;
    font-style: italic;
    margin-bottom: 8px;
    line-height: 1.5;
  }

  .signal-timespan {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: #6b7280;
  }

  /* Recommendation Cards */
  .recommendations-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .recommendation-card {
    background: rgba(255, 255, 255, 0.03);
    border-radius: 10px;
    padding: 14px;
    border: 1px solid rgba(255, 255, 255, 0.06);
  }

  .rec-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }

  .rec-priority {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 700;
    color: white;
    letter-spacing: 0.5px;
  }

  .rec-timeframe {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: #9ca3af;
  }

  .rec-action {
    font-weight: 600;
    font-size: 14px;
    margin-bottom: 6px;
  }

  .rec-rationale {
    font-size: 13px;
    color: #9ca3af;
    line-height: 1.5;
    margin-bottom: 8px;
  }

  .rec-evidence {
    font-size: 11px;
    color: #6b7280;
    padding: 4px 8px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
    display: inline-block;
  }

  /* Reasoning Section */
  .reasoning-section {
    font-size: 13px;
    line-height: 1.6;
  }

  .reasoning-narrative {
    background: rgba(59, 130, 246, 0.1);
    border-left: 3px solid #3b82f6;
    padding: 12px;
    border-radius: 0 8px 8px 0;
    margin-bottom: 16px;
    color: #d1d5db;
  }

  .rationale-list, .confidence-factors, .limitations {
    margin-bottom: 12px;
  }

  .rationale-list h5, .confidence-factors h5, .limitations h5 {
    font-size: 12px;
    text-transform: uppercase;
    color: #9ca3af;
    margin-bottom: 8px;
    letter-spacing: 0.5px;
  }

  .rationale-list ul, .confidence-factors ul, .limitations ul {
    margin: 0;
    padding-left: 20px;
  }

  .rationale-list li, .confidence-factors li, .limitations li {
    margin-bottom: 4px;
    color: #d1d5db;
  }

  .limitations li {
    color: #9ca3af;
  }

  /* Evidence Sources */
  .evidence-sources {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .evidence-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: #9ca3af;
    padding: 8px 12px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 6px;
  }

  .evidence-item svg {
    color: #60a5fa;
  }

  /* Action Buttons */
  .action-buttons {
    display: flex;
    gap: 12px;
    margin-top: 20px;
    padding-top: 16px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }

  .btn-acknowledge, .btn-escalate {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    border: none;
  }

  .btn-acknowledge {
    background: linear-gradient(135deg, #22c55e, #16a34a);
    color: white;
  }

  .btn-acknowledge:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
  }

  .btn-escalate {
    background: linear-gradient(135deg, #ef4444, #dc2626);
    color: white;
  }

  .btn-escalate:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
  }

  /* Clinical Disclaimer */
  .clinical-disclaimer {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin-top: 16px;
    padding: 12px;
    background: rgba(234, 179, 8, 0.1);
    border-radius: 8px;
    font-size: 12px;
    color: #fbbf24;
    border: 1px solid rgba(234, 179, 8, 0.2);
  }

  .clinical-disclaimer svg {
    flex-shrink: 0;
    margin-top: 2px;
  }

  /* No Alert State */
  .deterioration-panel.no-alert {
    padding: 48px 24px;
  }

  .no-alert-content {
    text-align: center;
  }

  .no-alert-icon {
    color: #22c55e;
    margin-bottom: 16px;
  }

  .no-alert-content h3 {
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 8px;
  }

  .no-alert-content p {
    color: #9ca3af;
    font-size: 14px;
    max-width: 400px;
    margin: 0 auto;
    line-height: 1.5;
  }

  .no-alert-content .subtle {
    margin-top: 12px;
    font-size: 12px;
    color: #6b7280;
  }

  /* Loading Skeleton */
  .deterioration-panel.loading {
    min-height: 400px;
  }

  .skeleton-header {
    height: 48px;
    background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 12px;
    margin-bottom: 24px;
  }

  .skeleton-scores {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    margin-bottom: 24px;
  }

  .skeleton-score {
    height: 100px;
    background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 12px;
  }

  .skeleton-section {
    height: 60px;
    background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 12px;
    margin-bottom: 12px;
  }

  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }

  /* Responsive */
  @media (max-width: 640px) {
    .panel-header {
      flex-direction: column;
    }

    .scores-row {
      grid-template-columns: 1fr;
    }

    .action-buttons {
      flex-direction: column;
    }

    .btn-acknowledge, .btn-escalate {
      justify-content: center;
    }
  }
`;

export default ClinicalDeteriorationPanel;
