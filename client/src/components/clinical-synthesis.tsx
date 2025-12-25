/**
 * Clinical Synthesis Display Component
 * Renders the structured output from the 5-agent clinical analysis pipeline
 * With defensive null-safety checks for all nested properties
 */

import {
    AlertTriangle,
    CheckCircle,
    FileText,
    Shield,
    BookOpen,
    Brain,
    AlertCircle,
    Info,
    ChevronDown,
    ChevronRight,
    Stethoscope,
    Pill,
    FlaskConical,
    ScrollText
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";
import { cn } from "@/lib/utils";

// ==========================================
// Type Definitions
// ==========================================

interface RiskAndUrgency {
    urgencyScore?: number;
    riskCategory?: string;
    rationale?: string;
    immediateActions?: string[];
}

interface DifferentialDiagnosis {
    diagnosis?: string;
    confidence?: number;
    supportingEvidence?: string[];
}

interface GuidelineRecommendation {
    guideline?: string;
    recommendation?: string;
    evidenceLevel?: string;
}

interface MedicationSafety {
    overallRisk?: string;
    criticalAlerts?: string[];
    recommendations?: string[];
}

interface SupportingEvidence {
    keyFindings?: string[];
    strengthOfEvidence?: string;
}

interface ExplainabilityPanel {
    whyThisRecommendation?: string[];
    keyInfluencingData?: string[];
    missingData?: string[];
}

interface ClinicalSynthesis {
    caseSummary?: string;
    riskAndUrgency?: RiskAndUrgency;
    differentialDiagnosis?: DifferentialDiagnosis[];
    guidelineRecommendations?: GuidelineRecommendation[];
    medicationSafety?: MedicationSafety;
    supportingEvidence?: SupportingEvidence;
    explainabilityPanel?: ExplainabilityPanel;
    overallConfidence?: "Low" | "Medium" | "High" | string;
    clinicalDisclaimer?: string;
}

interface ClinicalSynthesisProps {
    synthesis: ClinicalSynthesis | null | undefined;
    isLoading?: boolean;
}

// ==========================================
// Helper Components
// ==========================================

function RiskBadge({ category }: { category?: string }) {
    if (!category) return null;

    const colors: Record<string, string> = {
        "Low": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
        "Moderate": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
        "High": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
        "Critical": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    };

    return (
        <Badge className={cn("font-semibold", colors[category] || "bg-gray-100 text-gray-800")}>
            {category}
        </Badge>
    );
}

function ConfidenceBadge({ level }: { level?: string }) {
    if (!level) return null;

    const colors: Record<string, string> = {
        "Low": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
        "Medium": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
        "High": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    };

    return (
        <Badge className={cn("font-semibold", colors[level] || "bg-gray-100 text-gray-800")}>
            {level} Confidence
        </Badge>
    );
}

function UrgencyMeter({ score }: { score?: number }) {
    const safeScore = score ?? 5;

    const getColor = (s: number) => {
        if (s <= 3) return "bg-green-500";
        if (s <= 5) return "bg-yellow-500";
        if (s <= 7) return "bg-orange-500";
        return "bg-red-500";
    };

    return (
        <div className="flex items-center gap-3">
            <div className="flex-1">
                <Progress value={safeScore * 10} className={cn("h-3", getColor(safeScore))} />
            </div>
            <span className="font-bold text-lg min-w-[3rem] text-right">{safeScore}/10</span>
        </div>
    );
}

function CollapsibleSection({
    title,
    icon: Icon,
    children,
    defaultOpen = true,
    badge,
}: {
    title: string;
    icon: React.ElementType;
    children: React.ReactNode;
    defaultOpen?: boolean;
    badge?: React.ReactNode;
}) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/50 rounded-lg transition-colors">
                <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-primary" />
                    <span className="font-semibold text-lg">{title}</span>
                    {badge}
                </div>
                {isOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="px-4 pb-4">
                {children}
            </CollapsibleContent>
        </Collapsible>
    );
}

// ==========================================
// Main Component
// ==========================================

export function ClinicalSynthesisDisplay({ synthesis, isLoading }: ClinicalSynthesisProps) {
    if (isLoading) {
        return (
            <Card className="border-primary/20">
                <CardContent className="p-8">
                    <div className="flex flex-col items-center justify-center gap-4">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                        <p className="text-muted-foreground">Analyzing case with clinical agents...</p>
                        <div className="flex gap-2 text-sm text-muted-foreground">
                            <span>Triage</span>
                            <span>→</span>
                            <span>Diagnostic</span>
                            <span>→</span>
                            <span>Guideline</span>
                            <span>→</span>
                            <span>Safety</span>
                            <span>→</span>
                            <span>Evidence</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!synthesis) {
        return (
            <Card className="border-dashed border-2">
                <CardContent className="p-8">
                    <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
                        <Brain className="h-12 w-12" />
                        <p>No clinical analysis available yet</p>
                        <p className="text-sm">Click "AI Clinical Analysis" to run the clinical intelligence pipeline</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Safe access to nested properties with defaults
    const riskAndUrgency = synthesis.riskAndUrgency || {};
    const differentialDiagnosis = synthesis.differentialDiagnosis || [];
    const guidelineRecommendations = synthesis.guidelineRecommendations || [];
    const medicationSafety = synthesis.medicationSafety || {};
    const supportingEvidence = synthesis.supportingEvidence || {};
    const explainabilityPanel = synthesis.explainabilityPanel || {};

    return (
        <div className="space-y-4">
            {/* Header with Case Summary and Confidence */}
            <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
                <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <Brain className="h-6 w-6 text-primary" />
                            <CardTitle className="text-xl">Clinical Intelligence Synthesis</CardTitle>
                        </div>
                        <ConfidenceBadge level={synthesis.overallConfidence} />
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground leading-relaxed">
                        {synthesis.caseSummary || "Analysis complete. See detailed findings below."}
                    </p>
                </CardContent>
            </Card>

            {/* Risk & Urgency Assessment */}
            <Card>
                <CollapsibleSection
                    title="Risk & Urgency Assessment"
                    icon={AlertTriangle}
                    badge={<RiskBadge category={riskAndUrgency.riskCategory} />}
                >
                    <div className="space-y-4">
                        <div>
                            <p className="text-sm text-muted-foreground mb-2">Urgency Score</p>
                            <UrgencyMeter score={riskAndUrgency.urgencyScore} />
                        </div>

                        {riskAndUrgency.rationale && (
                            <div>
                                <p className="text-sm text-muted-foreground mb-2">Rationale</p>
                                <p className="text-foreground">{riskAndUrgency.rationale}</p>
                            </div>
                        )}

                        {(riskAndUrgency.immediateActions?.length ?? 0) > 0 && (
                            <div>
                                <p className="text-sm text-muted-foreground mb-2">Immediate Actions</p>
                                <ul className="space-y-2">
                                    {riskAndUrgency.immediateActions?.map((action, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                                            <span>{action}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </CollapsibleSection>
            </Card>

            {/* Differential Diagnosis */}
            {differentialDiagnosis.length > 0 && (
                <Card>
                    <CollapsibleSection
                        title="Differential Diagnosis"
                        icon={Stethoscope}
                        badge={<Badge variant="outline">{differentialDiagnosis.length} conditions</Badge>}
                    >
                        <div className="space-y-4">
                            {differentialDiagnosis.map((dx, i) => (
                                <div key={i} className="border rounded-lg p-4 bg-muted/30">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-semibold flex items-center gap-2">
                                            <span className="bg-primary/10 text-primary rounded-full w-6 h-6 flex items-center justify-center text-sm">
                                                {i + 1}
                                            </span>
                                            {dx.diagnosis || "Unknown condition"}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <Progress value={dx.confidence || 0} className="w-20 h-2" />
                                            <span className="text-sm text-muted-foreground">{dx.confidence || 0}%</span>
                                        </div>
                                    </div>
                                    {(dx.supportingEvidence?.length ?? 0) > 0 && (
                                        <div className="mt-2">
                                            <p className="text-xs text-muted-foreground mb-1">Supporting Evidence:</p>
                                            <ul className="text-sm text-muted-foreground">
                                                {dx.supportingEvidence?.map((evidence, j) => (
                                                    <li key={j} className="flex items-start gap-2">
                                                        <CheckCircle className="h-3 w-3 text-green-500 mt-1 flex-shrink-0" />
                                                        {evidence}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </CollapsibleSection>
                </Card>
            )}

            {/* Guideline Recommendations */}
            {guidelineRecommendations.length > 0 && (
                <Card>
                    <CollapsibleSection
                        title="Guideline-Aligned Recommendations"
                        icon={ScrollText}
                        badge={<Badge variant="outline">{guidelineRecommendations.length} guidelines</Badge>}
                    >
                        <div className="space-y-4">
                            {guidelineRecommendations.map((rec, i) => (
                                <div key={i} className="border rounded-lg p-4 bg-muted/30">
                                    <div className="flex items-start justify-between mb-2">
                                        <span className="font-semibold text-primary">{rec.guideline || "Clinical Guideline"}</span>
                                        {rec.evidenceLevel && <Badge variant="secondary">{rec.evidenceLevel}</Badge>}
                                    </div>
                                    <p className="text-foreground">{rec.recommendation || "No specific recommendation"}</p>
                                </div>
                            ))}
                        </div>
                    </CollapsibleSection>
                </Card>
            )}

            {/* Medication Safety */}
            <Card>
                <CollapsibleSection
                    title="Medication Safety Considerations"
                    icon={Pill}
                    badge={<RiskBadge category={medicationSafety.overallRisk} />}
                >
                    <div className="space-y-4">
                        {(medicationSafety.criticalAlerts?.length ?? 0) > 0 && (
                            <div>
                                <p className="text-sm font-semibold text-red-600 dark:text-red-400 mb-2 flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4" />
                                    Critical Alerts
                                </p>
                                <ul className="space-y-2">
                                    {medicationSafety.criticalAlerts?.map((alert, i) => (
                                        <li key={i} className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                                            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                                            <span className="text-red-700 dark:text-red-300">{alert}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {(medicationSafety.recommendations?.length ?? 0) > 0 && (
                            <div>
                                <p className="text-sm text-muted-foreground mb-2">Recommendations</p>
                                <ul className="space-y-2">
                                    {medicationSafety.recommendations?.map((rec, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <Shield className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                                            <span>{rec}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {(medicationSafety.criticalAlerts?.length ?? 0) === 0 &&
                            (medicationSafety.recommendations?.length ?? 0) === 0 && (
                                <p className="text-muted-foreground text-sm">No medication safety concerns identified.</p>
                            )}
                    </div>
                </CollapsibleSection>
            </Card>

            {/* Supporting Evidence */}
            <Card>
                <CollapsibleSection
                    title="Supporting Evidence"
                    icon={FlaskConical}
                    badge={supportingEvidence.strengthOfEvidence && <Badge variant="outline">{supportingEvidence.strengthOfEvidence}</Badge>}
                >
                    <div className="space-y-4">
                        {supportingEvidence.strengthOfEvidence && (
                            <div>
                                <p className="text-sm text-muted-foreground mb-2">Strength of Evidence</p>
                                <Badge
                                    className={cn(
                                        supportingEvidence.strengthOfEvidence === "Strong" && "bg-green-100 text-green-800",
                                        supportingEvidence.strengthOfEvidence === "Moderate" && "bg-yellow-100 text-yellow-800",
                                        supportingEvidence.strengthOfEvidence === "Limited" && "bg-orange-100 text-orange-800",
                                        supportingEvidence.strengthOfEvidence === "Conflicting" && "bg-red-100 text-red-800",
                                    )}
                                >
                                    {supportingEvidence.strengthOfEvidence}
                                </Badge>
                            </div>
                        )}

                        {(supportingEvidence.keyFindings?.length ?? 0) > 0 && (
                            <div>
                                <p className="text-sm text-muted-foreground mb-2">Key Findings</p>
                                <ul className="space-y-2">
                                    {supportingEvidence.keyFindings?.map((finding, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <BookOpen className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                                            <span>{finding}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {!supportingEvidence.strengthOfEvidence && (supportingEvidence.keyFindings?.length ?? 0) === 0 && (
                            <p className="text-muted-foreground text-sm">No supporting evidence data available.</p>
                        )}
                    </div>
                </CollapsibleSection>
            </Card>

            {/* Explainability Panel */}
            <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10">
                <CollapsibleSection
                    title="Explainability Panel"
                    icon={Info}
                    defaultOpen={false}
                >
                    <div className="space-y-6">
                        {(explainabilityPanel.whyThisRecommendation?.length ?? 0) > 0 && (
                            <div>
                                <p className="text-sm font-semibold text-blue-700 dark:text-blue-400 mb-2">
                                    Why This Recommendation?
                                </p>
                                <ul className="space-y-1">
                                    {explainabilityPanel.whyThisRecommendation?.map((reason, i) => (
                                        <li key={i} className="text-sm flex items-start gap-2">
                                            <span className="text-blue-500">•</span>
                                            {reason}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {(explainabilityPanel.keyInfluencingData?.length ?? 0) > 0 && (
                            <div>
                                <p className="text-sm font-semibold text-blue-700 dark:text-blue-400 mb-2">
                                    Key Influencing Data
                                </p>
                                <ul className="space-y-1">
                                    {explainabilityPanel.keyInfluencingData?.map((data, i) => (
                                        <li key={i} className="text-sm flex items-start gap-2">
                                            <span className="text-blue-500">•</span>
                                            {data}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {(explainabilityPanel.missingData?.length ?? 0) > 0 && (
                            <div>
                                <p className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-2">
                                    Missing Data
                                </p>
                                <ul className="space-y-1">
                                    {explainabilityPanel.missingData?.map((data, i) => (
                                        <li key={i} className="text-sm flex items-start gap-2 text-amber-600 dark:text-amber-400">
                                            <span>⚠</span>
                                            {data}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {(explainabilityPanel.whyThisRecommendation?.length ?? 0) === 0 &&
                            (explainabilityPanel.keyInfluencingData?.length ?? 0) === 0 &&
                            (explainabilityPanel.missingData?.length ?? 0) === 0 && (
                                <p className="text-muted-foreground text-sm">No explainability data available.</p>
                            )}
                    </div>
                </CollapsibleSection>
            </Card>

            {/* Clinical Disclaimer */}
            <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10">
                <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-semibold text-amber-800 dark:text-amber-400 mb-1">Clinical Disclaimer</p>
                            <p className="text-sm text-amber-700 dark:text-amber-300">
                                {synthesis.clinicalDisclaimer ||
                                    "This AI-generated analysis is for clinical decision support only. All recommendations must be reviewed and validated by qualified healthcare professionals before implementation. The treating physician maintains full responsibility for patient care decisions."}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default ClinicalSynthesisDisplay;
