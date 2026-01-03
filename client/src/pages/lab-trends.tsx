/**
 * Lab Trends Analysis Page
 * =========================
 * 
 * Intelligent Lab Trend Interpretation Engine UI
 * Displays lab trends, clinical patterns, and actionable insights
 */

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
    Activity,
    AlertTriangle,
    ArrowDown,
    ArrowRight,
    ArrowUp,
    Beaker,
    Brain,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Clock,
    FileText,
    FlaskConical,
    Info,
    LineChart,
    RefreshCw,
    Shield,
    TrendingDown,
    TrendingUp,
    Zap,
} from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
    Alert,
    AlertDescription,
    AlertTitle,
} from "@/components/ui/alert";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Patient } from "@shared/schema";

// ============================================================================
// TYPES
// ============================================================================

interface LabTrend {
    labCode: string;
    labName: string;
    currentValue: number;
    previousValue: number;
    unit: string;
    deltaValue: number;
    deltaPercent: number;
    trend: {
        direction: "increasing" | "decreasing" | "stable" | "fluctuating";
        slope: number;
        velocity: "rapid" | "gradual" | "slow";
        persistence: number;
    };
    timeWindowHours: number;
    readings: Array<{ value: number; timestamp: string }>;
    isAbnormal: boolean;
    referenceRange?: { low: number; high: number };
}

interface ClinicalPattern {
    type: string;
    confidence: number;
    supportingLabs: string[];
    description: string;
    clinicalSignificance: "high" | "moderate" | "low";
    timeWindowHours: number;
    evidence: string[];
}

interface LabTrendResult {
    agent: string;
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
// STYLE MAPPINGS
// ============================================================================

const statusStyles: Record<string, { bg: string; text: string; border: string; icon: React.ReactNode }> = {
    Improving: {
        bg: "bg-green-500/10",
        text: "text-green-600",
        border: "border-green-500",
        icon: <TrendingDown className="h-6 w-6 text-green-500" />,
    },
    Stable: {
        bg: "bg-blue-500/10",
        text: "text-blue-600",
        border: "border-blue-500",
        icon: <ArrowRight className="h-6 w-6 text-blue-500" />,
    },
    Worsening: {
        bg: "bg-red-500/10",
        text: "text-red-600",
        border: "border-red-500",
        icon: <TrendingUp className="h-6 w-6 text-red-500" />,
    },
    Mixed: {
        bg: "bg-yellow-500/10",
        text: "text-yellow-600",
        border: "border-yellow-500",
        icon: <Activity className="h-6 w-6 text-yellow-500" />,
    },
    "Insufficient Data": {
        bg: "bg-gray-500/10",
        text: "text-gray-600",
        border: "border-gray-500",
        icon: <Info className="h-6 w-6 text-gray-500" />,
    },
};

const significanceColors: Record<string, string> = {
    high: "bg-red-500/10 text-red-600 border-red-300",
    moderate: "bg-yellow-500/10 text-yellow-600 border-yellow-300",
    low: "bg-blue-500/10 text-blue-600 border-blue-300",
};

const urgencyColors: Record<string, string> = {
    immediate: "bg-red-500 text-white",
    "within-4-hours": "bg-orange-500 text-white",
    routine: "bg-gray-500 text-white",
};

// ============================================================================
// SPARKLINE COMPONENT
// ============================================================================

function Sparkline({ readings, isAbnormal, referenceRange }: {
    readings: Array<{ value: number; timestamp: string }>;
    isAbnormal: boolean;
    referenceRange?: { low: number; high: number };
}) {
    if (readings.length < 2) return null;

    const values = readings.map(r => r.value);
    const min = Math.min(...values) * 0.9;
    const max = Math.max(...values) * 1.1;
    const range = max - min || 1;

    const width = 120;
    const height = 32;
    const padding = 2;

    const points = values.map((v, i) => {
        const x = padding + (i / (values.length - 1)) * (width - 2 * padding);
        const y = height - padding - ((v - min) / range) * (height - 2 * padding);
        return `${x},${y}`;
    }).join(" ");

    const color = isAbnormal ? "#ef4444" : "#22c55e";

    return (
        <svg width={width} height={height} className="inline-block">
            {/* Reference range band */}
            {referenceRange && (
                <rect
                    x={padding}
                    y={height - padding - ((referenceRange.high - min) / range) * (height - 2 * padding)}
                    width={width - 2 * padding}
                    height={((referenceRange.high - referenceRange.low) / range) * (height - 2 * padding)}
                    fill="#22c55e"
                    opacity={0.1}
                />
            )}
            {/* Trend line */}
            <polyline
                points={points}
                fill="none"
                stroke={color}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            {/* Data points */}
            {values.map((v, i) => {
                const x = padding + (i / (values.length - 1)) * (width - 2 * padding);
                const y = height - padding - ((v - min) / range) * (height - 2 * padding);
                return (
                    <circle
                        key={i}
                        cx={x}
                        cy={y}
                        r={3}
                        fill={i === values.length - 1 ? color : "white"}
                        stroke={color}
                        strokeWidth={1.5}
                    />
                );
            })}
        </svg>
    );
}

// ============================================================================
// TREND DIRECTION ICON
// ============================================================================

function TrendIcon({ direction, velocity }: { direction: string; velocity: string }) {
    const isRapid = velocity === "rapid";

    switch (direction) {
        case "increasing":
            return <ArrowUp className={`h-4 w-4 ${isRapid ? "text-red-500" : "text-orange-500"}`} />;
        case "decreasing":
            return <ArrowDown className={`h-4 w-4 ${isRapid ? "text-green-500" : "text-blue-500"}`} />;
        case "fluctuating":
            return <Activity className="h-4 w-4 text-yellow-500" />;
        default:
            return <ArrowRight className="h-4 w-4 text-gray-500" />;
    }
}

// ============================================================================
// LAB TREND CARD
// ============================================================================

function LabTrendCard({ trend }: { trend: LabTrend }) {
    const [expanded, setExpanded] = useState(false);

    const deltaColor = trend.deltaValue > 0
        ? (trend.isAbnormal ? "text-red-500" : "text-orange-500")
        : (trend.deltaValue < 0 ? "text-green-500" : "text-gray-500");

    return (
        <div className={`p-3 rounded-lg border ${trend.isAbnormal ? "border-red-200 bg-red-50/30 dark:bg-red-950/10" : "border-border bg-card"}`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${trend.isAbnormal ? "bg-red-100 dark:bg-red-900/30" : "bg-muted"}`}>
                        <Beaker className={`h-4 w-4 ${trend.isAbnormal ? "text-red-500" : "text-muted-foreground"}`} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-medium">{trend.labName}</span>
                            <TrendIcon direction={trend.trend.direction} velocity={trend.trend.velocity} />
                            {trend.isAbnormal && <Badge variant="destructive" className="text-xs">Abnormal</Badge>}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="font-mono font-semibold text-foreground">
                                {trend.currentValue} {trend.unit}
                            </span>
                            <span className={deltaColor}>
                                ({trend.deltaValue > 0 ? "+" : ""}{trend.deltaValue} / {trend.deltaPercent > 0 ? "+" : ""}{trend.deltaPercent}%)
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Sparkline
                        readings={trend.readings}
                        isAbnormal={trend.isAbnormal}
                        referenceRange={trend.referenceRange}
                    />
                    <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)}>
                        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                </div>
            </div>

            {expanded && (
                <div className="mt-3 pt-3 border-t text-sm">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                            <span className="text-muted-foreground">Previous:</span>
                            <span className="ml-2 font-mono">{trend.previousValue} {trend.unit}</span>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Trend:</span>
                            <span className="ml-2 capitalize">{trend.trend.direction} ({trend.trend.velocity})</span>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Duration:</span>
                            <span className="ml-2">{Math.round(trend.trend.persistence)}h consistent</span>
                        </div>
                        {trend.referenceRange && (
                            <div>
                                <span className="text-muted-foreground">Reference:</span>
                                <span className="ml-2 font-mono">{trend.referenceRange.low} - {trend.referenceRange.high}</span>
                            </div>
                        )}
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                        {trend.readings.length} readings over {trend.timeWindowHours}h window
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================================================
// PATTERN CARD
// ============================================================================

function PatternCard({ pattern }: { pattern: ClinicalPattern }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className={`rounded-lg border-l-4 p-4 ${significanceColors[pattern.clinicalSignificance]}`}>
            <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-background">
                        {pattern.clinicalSignificance === "high" ? (
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                        ) : pattern.clinicalSignificance === "moderate" ? (
                            <Zap className="h-5 w-5 text-yellow-500" />
                        ) : (
                            <Info className="h-5 w-5 text-blue-500" />
                        )}
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold">{pattern.type}</h4>
                            <Badge variant="secondary" className="text-xs">
                                {Math.round(pattern.confidence * 100)}% confidence
                            </Badge>
                            <Badge variant="outline" className="text-xs capitalize">
                                {pattern.clinicalSignificance} significance
                            </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{pattern.description}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                            {pattern.supportingLabs.map((lab, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                    {lab}
                                </Badge>
                            ))}
                        </div>
                    </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)}>
                    {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
            </div>

            {expanded && pattern.evidence.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                    <h5 className="text-sm font-medium mb-2">Supporting Evidence:</h5>
                    <ul className="space-y-1">
                        {pattern.evidence.map((e, i) => (
                            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                                {e}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function LabTrends() {
    const { toast } = useToast();
    const [selectedPatientId, setSelectedPatientId] = useState<string>("");
    const [windowHours, setWindowHours] = useState<number>(48);
    const [result, setResult] = useState<LabTrendResult | null>(null);
    const [sectionsOpen, setSectionsOpen] = useState({
        patterns: true,
        trends: true,
        recommendations: true,
        monitoring: true,
        explainability: false,
    });

    // Fetch patients
    const { data: patientsData, isLoading: patientsLoading } = useQuery({
        queryKey: ["/api/patients"],
        queryFn: async () => {
            const res = await apiRequest("GET", "/api/patients");
            return res.json();
        },
    });

    const patients: Patient[] = patientsData?.data || [];
    const selectedPatient = patients.find(p => p.id === selectedPatientId);

    // Analysis mutation
    const analyzeMutation = useMutation({
        mutationFn: async () => {
            if (!selectedPatient) throw new Error("No patient selected");

            const res = await apiRequest("POST", "/api/lab-trends/analyze-real", {
                patientId: selectedPatient.id,
                windowHours,
            });
            return res.json();
        },
        onSuccess: (data) => {
            if (data.success && data.data) {
                setResult(data.data);
                toast({
                    title: "Analysis Complete",
                    description: `Status: ${data.data.overallStatus} | ${data.data.patterns.length} patterns detected`,
                });
            }
        },
        onError: (error: any) => {
            toast({
                title: "Analysis Failed",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    // Demo analysis mutation
    const demoMutation = useMutation({
        mutationFn: async (scenario: string) => {
            const res = await apiRequest("POST", "/api/lab-trends/demo", { scenario });
            return res.json();
        },
        onSuccess: (data) => {
            if (data.success && data.data) {
                setResult(data.data);
                toast({
                    title: "Demo Analysis Complete",
                    description: `Scenario: ${data.scenario} | ${data.data.patterns.length} patterns`,
                });
            }
        },
        onError: (error: any) => {
            toast({
                title: "Demo Failed",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const toggleSection = (section: keyof typeof sectionsOpen) => {
        setSectionsOpen(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const statusStyle = result ? statusStyles[result.overallStatus] || statusStyles["Stable"] : null;

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <div className="flex items-center gap-3">
                        <LineChart className="h-8 w-8 text-primary" />
                        <div>
                            <h1 className="text-3xl font-semibold">Lab Trends</h1>
                            <p className="text-muted-foreground">Intelligent Lab Trend Interpretation Engine</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="gap-1.5">
                        <Brain className="h-3 w-3" />
                        AI-Powered
                    </Badge>
                    <Badge variant="outline" className="gap-1.5">
                        <Activity className="h-3 w-3" />
                        Pattern Detection
                    </Badge>
                </div>
            </div>

            {/* Patient Selection */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Analysis Configuration</CardTitle>
                    <CardDescription>
                        Select a patient and time window to analyze lab trends
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-4 items-end">
                        <div className="flex-1 min-w-[300px]">
                            <label className="text-sm font-medium mb-2 block">Patient</label>
                            <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
                                <SelectTrigger>
                                    <SelectValue placeholder={patientsLoading ? "Loading..." : "Select a patient..."} />
                                </SelectTrigger>
                                <SelectContent>
                                    {patients.map((patient) => (
                                        <SelectItem key={patient.id} value={patient.id}>
                                            {patient.demographics.firstName} {patient.demographics.lastName} (MRN: {patient.demographics.mrn})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="w-40">
                            <label className="text-sm font-medium mb-2 block">Time Window</label>
                            <Select value={windowHours.toString()} onValueChange={(v) => setWindowHours(parseInt(v))}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="24">24 hours</SelectItem>
                                    <SelectItem value="48">48 hours</SelectItem>
                                    <SelectItem value="72">72 hours</SelectItem>
                                    <SelectItem value="168">7 days</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <Button
                            onClick={() => analyzeMutation.mutate()}
                            disabled={!selectedPatientId || analyzeMutation.isPending}
                            className="gap-2"
                            size="lg"
                        >
                            {analyzeMutation.isPending ? (
                                <>
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                    Analyzing...
                                </>
                            ) : (
                                <>
                                    <LineChart className="h-4 w-4" />
                                    Analyze Trends
                                </>
                            )}
                        </Button>
                    </div>

                    {/* Demo Scenarios */}
                    <div className="mt-4 pt-4 border-t">
                        <span className="text-sm text-muted-foreground mr-3">Demo scenarios:</span>
                        {["inflammatory", "sepsis", "recovery", "aki"].map((scenario) => (
                            <Button
                                key={scenario}
                                variant="outline"
                                size="sm"
                                className="mr-2 capitalize"
                                onClick={() => demoMutation.mutate(scenario)}
                                disabled={demoMutation.isPending}
                            >
                                {scenario}
                            </Button>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Results */}
            {result && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Results Panel */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Overall Status */}
                        <Card className={`border-l-4 ${statusStyle?.border}`}>
                            <CardHeader>
                                <div className="flex items-center justify-between flex-wrap gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-lg ${statusStyle?.bg}`}>
                                            {statusStyle?.icon}
                                        </div>
                                        <div>
                                            <CardTitle className="flex items-center gap-2">
                                                <span className={statusStyle?.text}>{result.overallStatus}</span>
                                                <Badge variant="secondary">
                                                    {Math.round(result.confidence * 100)}% confidence
                                                </Badge>
                                            </CardTitle>
                                            <CardDescription>
                                                {result.timeWindowAnalyzed.hours}h analysis window • {result.analysisTime}ms
                                            </CardDescription>
                                        </div>
                                    </div>
                                    <Badge variant="outline">
                                        <Clock className="h-3 w-3 mr-1" />
                                        {new Date(result.timestamp).toLocaleTimeString()}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm">{result.summary}</p>

                                {/* Quick Stats */}
                                <div className="grid grid-cols-3 gap-4 mt-4">
                                    <div className="text-center p-3 rounded-lg bg-muted/50">
                                        <div className="text-2xl font-bold text-primary">
                                            {result.trends.length}
                                        </div>
                                        <div className="text-xs text-muted-foreground">Labs Tracked</div>
                                    </div>
                                    <div className="text-center p-3 rounded-lg bg-muted/50">
                                        <div className="text-2xl font-bold text-orange-500">
                                            {result.patterns.length}
                                        </div>
                                        <div className="text-xs text-muted-foreground">Patterns Found</div>
                                    </div>
                                    <div className="text-center p-3 rounded-lg bg-muted/50">
                                        <div className="text-2xl font-bold text-red-500">
                                            {result.trends.filter(t => t.isAbnormal).length}
                                        </div>
                                        <div className="text-xs text-muted-foreground">Abnormal Labs</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Clinical Patterns */}
                        {result.patterns.length > 0 && (
                            <Collapsible open={sectionsOpen.patterns} onOpenChange={() => toggleSection("patterns")}>
                                <Card>
                                    <CollapsibleTrigger asChild>
                                        <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                                            <div className="flex items-center justify-between">
                                                <CardTitle className="text-base flex items-center gap-2">
                                                    <Zap className="h-5 w-5 text-orange-500" />
                                                    Clinical Patterns Detected
                                                    <Badge variant="secondary">{result.patterns.length}</Badge>
                                                </CardTitle>
                                                {sectionsOpen.patterns ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                            </div>
                                        </CardHeader>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                        <CardContent className="space-y-3">
                                            {result.patterns.map((pattern, i) => (
                                                <PatternCard key={i} pattern={pattern} />
                                            ))}
                                        </CardContent>
                                    </CollapsibleContent>
                                </Card>
                            </Collapsible>
                        )}

                        {/* Lab Trends */}
                        <Collapsible open={sectionsOpen.trends} onOpenChange={() => toggleSection("trends")}>
                            <Card>
                                <CollapsibleTrigger asChild>
                                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-base flex items-center gap-2">
                                                <FlaskConical className="h-5 w-5 text-blue-500" />
                                                Individual Lab Trends
                                                <Badge variant="secondary">{result.trends.length}</Badge>
                                            </CardTitle>
                                            {sectionsOpen.trends ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                        </div>
                                    </CardHeader>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <CardContent className="space-y-3">
                                        {result.trends.length > 0 ? (
                                            result.trends.map((trend, i) => (
                                                <LabTrendCard key={i} trend={trend} />
                                            ))
                                        ) : (
                                            <div className="text-center py-8 text-muted-foreground">
                                                <FlaskConical className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                                <p>No lab trends available for analysis</p>
                                            </div>
                                        )}
                                    </CardContent>
                                </CollapsibleContent>
                            </Card>
                        </Collapsible>

                        {/* Recommendations */}
                        <Collapsible open={sectionsOpen.recommendations} onOpenChange={() => toggleSection("recommendations")}>
                            <Card>
                                <CollapsibleTrigger asChild>
                                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-base flex items-center gap-2">
                                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                                                Recommendations
                                            </CardTitle>
                                            {sectionsOpen.recommendations ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                        </div>
                                    </CardHeader>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <CardContent>
                                        <ul className="space-y-2">
                                            {result.recommendations.map((rec, i) => (
                                                <li key={i} className="flex items-start gap-2 text-sm">
                                                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                                                    <span>{rec}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </CardContent>
                                </CollapsibleContent>
                            </Card>
                        </Collapsible>

                        {/* Explainability */}
                        <Collapsible open={sectionsOpen.explainability} onOpenChange={() => toggleSection("explainability")}>
                            <Card>
                                <CollapsibleTrigger asChild>
                                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-base flex items-center gap-2">
                                                <FileText className="h-5 w-5 text-purple-500" />
                                                Explainability & Data Quality
                                            </CardTitle>
                                            {sectionsOpen.explainability ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                        </div>
                                    </CardHeader>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <CardContent className="space-y-4">
                                        <div>
                                            <h5 className="text-sm font-medium mb-2">Reasoning Chain</h5>
                                            <ul className="space-y-1">
                                                {result.explainability.reasoning.map((step, i) => (
                                                    <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                                                        <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center">
                                                            {i + 1}
                                                        </span>
                                                        {step}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        <Separator />

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                            <div>
                                                <span className="text-muted-foreground">Total Readings:</span>
                                                <span className="ml-2 font-medium">{result.explainability.dataQuality.totalReadings}</span>
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground">Unique Labs:</span>
                                                <span className="ml-2 font-medium">{result.explainability.dataQuality.uniqueLabs}</span>
                                            </div>
                                        </div>

                                        {result.explainability.limitations.length > 0 && (
                                            <>
                                                <Separator />
                                                <div>
                                                    <h5 className="text-sm font-medium mb-2 text-amber-600">Limitations</h5>
                                                    <ul className="space-y-1">
                                                        {result.explainability.limitations.map((lim, i) => (
                                                            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                                                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                                                                {lim}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </>
                                        )}
                                    </CardContent>
                                </CollapsibleContent>
                            </Card>
                        </Collapsible>

                        {/* Clinical Disclaimer */}
                        <Alert>
                            <Shield className="h-4 w-4" />
                            <AlertTitle>Decision Support Only</AlertTitle>
                            <AlertDescription>
                                This analysis provides pattern interpretation, NOT diagnosis. All findings must be
                                correlated with clinical presentation and verified by qualified healthcare professionals.
                            </AlertDescription>
                        </Alert>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Monitoring Priorities */}
                        {result.monitoringPriorities.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-sm flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-orange-500" />
                                        Monitoring Priorities
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    {result.monitoringPriorities.map((priority, i) => (
                                        <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-muted/50">
                                            <Badge className={`${urgencyColors[priority.urgency]} text-xs shrink-0`}>
                                                {priority.urgency === "immediate" ? "STAT" : priority.urgency === "within-4-hours" ? "4h" : ""}
                                            </Badge>
                                            <div>
                                                <div className="font-medium text-sm">{priority.labName}</div>
                                                <div className="text-xs text-muted-foreground">{priority.reason}</div>
                                            </div>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        )}

                        {/* Data Quality */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <Info className="h-4 w-4 text-blue-500" />
                                    Data Quality
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Readings Analyzed:</span>
                                    <span className="font-medium">{result.explainability.dataQuality.totalReadings}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Unique Labs:</span>
                                    <span className="font-medium">{result.explainability.dataQuality.uniqueLabs}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Window:</span>
                                    <span className="font-medium">{result.timeWindowAnalyzed.hours}h</span>
                                </div>
                                {result.explainability.dataQuality.missingData.length > 0 && (
                                    <div>
                                        <span className="text-muted-foreground">Missing Labs:</span>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {result.explainability.dataQuality.missingData.map((lab, i) => (
                                                <Badge key={i} variant="outline" className="text-xs">{lab}</Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Quick Actions */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm">Quick Actions</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <Button variant="outline" className="w-full justify-start gap-2" size="sm">
                                    <FileText className="h-4 w-4" />
                                    Export Report
                                </Button>
                                <Button variant="outline" className="w-full justify-start gap-2" size="sm">
                                    <RefreshCw className="h-4 w-4" />
                                    Re-analyze
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!result && (
                <Card>
                    <CardContent className="py-16 text-center">
                        <LineChart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2">No Analysis Results</h3>
                        <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
                            Select a patient and time window to analyze lab trends, or try a demo scenario
                            to see the Lab Trend Interpretation Engine in action.
                        </p>
                        <div className="flex justify-center gap-2 flex-wrap">
                            {["inflammatory", "sepsis", "recovery", "aki"].map((scenario) => (
                                <Button
                                    key={scenario}
                                    variant="outline"
                                    onClick={() => demoMutation.mutate(scenario)}
                                    disabled={demoMutation.isPending}
                                    className="capitalize"
                                >
                                    Demo: {scenario}
                                </Button>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
