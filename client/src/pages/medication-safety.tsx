/**
 * Medication Safety Page
 * Dynamic Medication Safety Engine - HealthMesh
 * 
 * Features:
 * - Real-time medication safety analysis
 * - Context-aware drug interaction detection
 * - Renal/hepatic dosing safety
 * - Severity-graded alerts with explainability
 * - Alert fatigue prevention
 */

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
    Shield,
    AlertTriangle,
    Pill,
    Activity,
    ChevronDown,
    ChevronUp,
    CheckCircle2,
    XCircle,
    Info,
    RefreshCw,
    Brain,
    Beaker,
    Heart,
    Zap,
    Clock,
    FileText,
    TrendingUp,
    TrendingDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
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

interface MedicationSafetyAlert {
    id: string;
    type: "drug-interaction" | "renal-dosing" | "hepatic-dosing" | "duplicate-therapy" | "allergy" | "contraindication";
    severity: "HIGH" | "MODERATE" | "LOW";
    clinicalRisk: string;
    confidence: number;
    medications: string[];
    reason: string;
    recommendation: string;
    evidence: string[];
    patientContext: string;
    suppressionReason?: string;
    acknowledged?: boolean;
    createdAt: string;
}

interface MedicationSafetyResult {
    agent: string;
    analysisId: string;
    timestamp: string;
    patientId: string;
    overallSafetyStatus: "SAFE" | "CAUTION" | "HIGH_RISK" | "CRITICAL";
    alerts: MedicationSafetyAlert[];
    suppressedAlerts: MedicationSafetyAlert[];
    summary: string;
    renalAssessment?: {
        eGFR: number;
        stage: string;
        medicationsRequiringAdjustment: string[];
        recommendation: string;
    };
    hepaticAssessment?: {
        status: string;
        medicationsOfConcern: string[];
        recommendation: string;
    };
    monitoringRecommendations: string[];
    explainability: {
        dataSourcesUsed: string[];
        reasoningChain: string[];
        limitations: string[];
    };
    confidence: number;
    analysisTime: number;
    aiModel?: string;
    cached?: boolean;
}

// ============================================================================
// STYLE MAPPINGS
// ============================================================================

const statusStyles: Record<string, { bg: string; text: string; border: string; icon: React.ReactNode }> = {
    SAFE: {
        bg: "bg-green-500/10",
        text: "text-green-600",
        border: "border-green-500",
        icon: <CheckCircle2 className="h-6 w-6 text-green-500" />,
    },
    CAUTION: {
        bg: "bg-yellow-500/10",
        text: "text-yellow-600",
        border: "border-yellow-500",
        icon: <AlertTriangle className="h-6 w-6 text-yellow-500" />,
    },
    HIGH_RISK: {
        bg: "bg-orange-500/10",
        text: "text-orange-600",
        border: "border-orange-500",
        icon: <AlertTriangle className="h-6 w-6 text-orange-500" />,
    },
    CRITICAL: {
        bg: "bg-red-500/10",
        text: "text-red-600",
        border: "border-red-500",
        icon: <XCircle className="h-6 w-6 text-red-500" />,
    },
};

const severityStyles: Record<string, { bg: string; text: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    HIGH: { bg: "bg-red-500/10", text: "text-red-600", variant: "destructive" },
    MODERATE: { bg: "bg-yellow-500/10", text: "text-yellow-600", variant: "default" },
    LOW: { bg: "bg-blue-500/10", text: "text-blue-600", variant: "secondary" },
};

const alertTypeIcons: Record<string, React.ReactNode> = {
    "drug-interaction": <Zap className="h-4 w-4" />,
    "renal-dosing": <Beaker className="h-4 w-4" />,
    "hepatic-dosing": <Activity className="h-4 w-4" />,
    "duplicate-therapy": <Pill className="h-4 w-4" />,
    "allergy": <AlertTriangle className="h-4 w-4" />,
    "contraindication": <XCircle className="h-4 w-4" />,
};

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function SafetyStatusBadge({ status }: { status: string }) {
    const style = statusStyles[status] || statusStyles.CAUTION;
    return (
        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${style.bg} ${style.border} border`}>
            {style.icon}
            <span className={`font-bold text-lg ${style.text}`}>{status.replace("_", " ")}</span>
        </div>
    );
}

function AlertCard({
    alert,
    onAcknowledge
}: {
    alert: MedicationSafetyAlert;
    onAcknowledge: (id: string) => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const style = severityStyles[alert.severity];

    return (
        <div className={`rounded-lg border-l-4 ${style.bg} border ${alert.severity === "HIGH" ? "border-red-300" : alert.severity === "MODERATE" ? "border-yellow-300" : "border-blue-300"}`}>
            <div className="p-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${style.bg}`}>
                            {alertTypeIcons[alert.type] || <AlertTriangle className="h-4 w-4" />}
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant={style.variant}>{alert.severity}</Badge>
                                <Badge variant="outline" className="capitalize">{alert.type.replace("-", " ")}</Badge>
                                <Badge variant="secondary">{alert.clinicalRisk}</Badge>
                            </div>
                            <h4 className="font-medium mt-2">{alert.medications.join(" + ")}</h4>
                            <p className="text-sm text-muted-foreground mt-1">{alert.reason}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="text-xs text-muted-foreground">
                                    {Math.round(alert.confidence * 100)}%
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>Confidence Score</TooltipContent>
                        </Tooltip>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpanded(!expanded)}
                        >
                            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>

                {expanded && (
                    <div className="mt-4 pt-4 border-t space-y-4">
                        <div>
                            <h5 className="text-sm font-medium flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                Recommendation
                            </h5>
                            <p className="text-sm mt-1 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg text-green-800 dark:text-green-200">
                                {alert.recommendation}
                            </p>
                        </div>

                        <div>
                            <h5 className="text-sm font-medium flex items-center gap-2">
                                <Info className="h-4 w-4 text-blue-500" />
                                Why This Matters for This Patient
                            </h5>
                            <p className="text-sm mt-1 text-muted-foreground">{alert.patientContext}</p>
                        </div>

                        <div>
                            <h5 className="text-sm font-medium flex items-center gap-2">
                                <FileText className="h-4 w-4 text-purple-500" />
                                Evidence Sources
                            </h5>
                            <div className="flex flex-wrap gap-1 mt-1">
                                {alert.evidence.map((e, i) => (
                                    <Badge key={i} variant="outline" className="text-xs">{e}</Badge>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onAcknowledge(alert.id)}
                                className="gap-2"
                            >
                                <CheckCircle2 className="h-4 w-4" />
                                Acknowledge Alert
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function OrganAssessmentCard({
    title,
    icon,
    assessment,
    type,
}: {
    title: string;
    icon: React.ReactNode;
    assessment: any;
    type: "renal" | "hepatic";
}) {
    if (!assessment) return null;

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                    {icon}
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {type === "renal" ? (
                    <>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">eGFR</span>
                            <span className="font-mono font-bold">{assessment.eGFR} ml/min</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Stage</span>
                            <Badge variant="outline">{assessment.stage}</Badge>
                        </div>
                        {assessment.medicationsRequiringAdjustment?.length > 0 && (
                            <div>
                                <span className="text-sm text-muted-foreground">Meds Needing Adjustment:</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {assessment.medicationsRequiringAdjustment.map((m: string, i: number) => (
                                        <Badge key={i} variant="secondary" className="text-xs">{m}</Badge>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Status</span>
                            <Badge variant="outline">{assessment.status}</Badge>
                        </div>
                        {assessment.medicationsOfConcern?.length > 0 && (
                            <div>
                                <span className="text-sm text-muted-foreground">Medications of Concern:</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {assessment.medicationsOfConcern.map((m: string, i: number) => (
                                        <Badge key={i} variant="secondary" className="text-xs">{m}</Badge>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
                <p className="text-xs text-muted-foreground italic">{assessment.recommendation}</p>
            </CardContent>
        </Card>
    );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function MedicationSafety() {
    const { toast } = useToast();
    const [selectedPatientId, setSelectedPatientId] = useState<string>("");
    const [result, setResult] = useState<MedicationSafetyResult | null>(null);
    const [sectionsOpen, setSectionsOpen] = useState({
        alerts: true,
        suppressed: false,
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

    // Fetch lab reports for the selected patient
    const { data: labReportsData } = useQuery({
        queryKey: ["/api/lab-reports/patient", selectedPatientId],
        queryFn: async () => {
            const res = await apiRequest("GET", `/api/lab-reports/patient/${selectedPatientId}`);
            return res.json();
        },
        enabled: !!selectedPatientId,
    });

    // Run analysis mutation
    const analyzeMutation = useMutation({
        mutationFn: async () => {
            if (!selectedPatient) throw new Error("No patient selected");

            const res = await apiRequest("POST", "/api/medication-safety/analyze-real", {
                patientId: selectedPatient.id,
                demographics: selectedPatient.demographics,
                medications: selectedPatient.medications,
                allergies: selectedPatient.allergies,
                diagnoses: selectedPatient.diagnoses,
                labReports: labReportsData?.data || [],
            });
            return res.json();
        },
        onSuccess: (data) => {
            if (data.success && data.data) {
                setResult(data.data);
                toast({
                    title: "Analysis Complete",
                    description: `Status: ${data.data.overallSafetyStatus} | ${data.data.alerts.length} alerts`,
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

    // Acknowledge alert mutation
    const acknowledgeMutation = useMutation({
        mutationFn: async (alertId: string) => {
            const res = await apiRequest("POST", `/api/medication-safety/alert/${alertId}/acknowledge`, {
                notes: "Reviewed and acknowledged by clinician",
                cooldownMinutes: 60,
            });
            return res.json();
        },
        onSuccess: () => {
            toast({
                title: "Alert Acknowledged",
                description: "Alert will not resurface for 60 minutes.",
            });
        },
    });

    const toggleSection = (section: keyof typeof sectionsOpen) => {
        setSectionsOpen(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const calculateAge = (dob: string): number => {
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
        return age;
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <div className="flex items-center gap-3">
                        <Shield className="h-8 w-8 text-primary" />
                        <div>
                            <h1 className="text-3xl font-semibold">Medication Safety</h1>
                            <p className="text-muted-foreground">Context-Aware Drug Interaction & Dosing Analysis</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="gap-1.5">
                        <Brain className="h-3 w-3" />
                        AI-Enhanced
                    </Badge>
                    <Badge variant="outline" className="gap-1.5">
                        <Activity className="h-3 w-3" />
                        Real-Time
                    </Badge>
                </div>
            </div>

            {/* Patient Selection */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Patient Selection</CardTitle>
                    <CardDescription>
                        Select a patient to analyze their medication regimen for safety concerns
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
                                    <Shield className="h-4 w-4" />
                                    Analyze Safety
                                </>
                            )}
                        </Button>
                    </div>

                    {/* Patient Context Preview */}
                    {selectedPatient && (
                        <div className="mt-4 pt-4 border-t grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                                <span className="text-muted-foreground">Age:</span>
                                <span className="ml-2 font-medium">{calculateAge(selectedPatient.demographics.dateOfBirth)} years</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Medications:</span>
                                <span className="ml-2 font-medium">{selectedPatient.medications?.filter(m => m.status === "active").length || 0}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Allergies:</span>
                                <span className="ml-2 font-medium">{selectedPatient.allergies?.length || 0}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Diagnoses:</span>
                                <span className="ml-2 font-medium">{selectedPatient.diagnoses?.filter(d => d.status === "active").length || 0}</span>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Results */}
            {result && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Results Panel */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Safety Status Overview */}
                        <Card className={`border-l-4 ${statusStyles[result.overallSafetyStatus]?.border || "border-muted"}`}>
                            <CardHeader>
                                <div className="flex items-center justify-between flex-wrap gap-4">
                                    <div className="flex items-center gap-4">
                                        <SafetyStatusBadge status={result.overallSafetyStatus} />
                                        <div>
                                            <CardTitle>Medication Safety Analysis</CardTitle>
                                            <CardDescription>
                                                Confidence: {Math.round(result.confidence * 100)}% • Analysis Time: {result.analysisTime}ms
                                            </CardDescription>
                                        </div>
                                    </div>
                                    <Badge variant="outline">
                                        <Clock className="h-3 w-3 mr-1" />
                                        {new Date(result.timestamp).toLocaleTimeString()}
                                    </Badge>
                                    <Badge variant={result.aiModel?.includes("gemini") ? "default" : "secondary"} className="gap-1">
                                        <Brain className="h-3 w-3" />
                                        {result.aiModel?.replace("-preview-05-20", "") || "AI Model"}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm">{result.summary}</p>

                                {/* Alert Counts */}
                                <div className="grid grid-cols-3 gap-4 mt-4">
                                    <div className="text-center p-3 rounded-lg bg-red-50 dark:bg-red-950/20">
                                        <div className="text-2xl font-bold text-red-600">
                                            {result.alerts.filter(a => a.severity === "HIGH").length}
                                        </div>
                                        <div className="text-xs text-muted-foreground">HIGH</div>
                                    </div>
                                    <div className="text-center p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/20">
                                        <div className="text-2xl font-bold text-yellow-600">
                                            {result.alerts.filter(a => a.severity === "MODERATE").length}
                                        </div>
                                        <div className="text-xs text-muted-foreground">MODERATE</div>
                                    </div>
                                    <div className="text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                                        <div className="text-2xl font-bold text-blue-600">
                                            {result.alerts.filter(a => a.severity === "LOW").length}
                                        </div>
                                        <div className="text-xs text-muted-foreground">LOW</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Active Alerts */}
                        <Collapsible open={sectionsOpen.alerts} onOpenChange={() => toggleSection("alerts")}>
                            <Card>
                                <CollapsibleTrigger asChild>
                                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-base flex items-center gap-2">
                                                <AlertTriangle className="h-5 w-5 text-orange-500" />
                                                Active Alerts
                                                <Badge variant="secondary">{result.alerts.length}</Badge>
                                            </CardTitle>
                                            {sectionsOpen.alerts ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                        </div>
                                    </CardHeader>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <CardContent className="space-y-3">
                                        {result.alerts.length > 0 ? (
                                            result.alerts.map((alert) => (
                                                <AlertCard
                                                    key={alert.id}
                                                    alert={alert}
                                                    onAcknowledge={(id) => acknowledgeMutation.mutate(id)}
                                                />
                                            ))
                                        ) : (
                                            <div className="text-center py-8 text-muted-foreground">
                                                <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
                                                <p>No active medication safety alerts</p>
                                            </div>
                                        )}
                                    </CardContent>
                                </CollapsibleContent>
                            </Card>
                        </Collapsible>

                        {/* Suppressed Alerts */}
                        {result.suppressedAlerts.length > 0 && (
                            <Collapsible open={sectionsOpen.suppressed} onOpenChange={() => toggleSection("suppressed")}>
                                <Card>
                                    <CollapsibleTrigger asChild>
                                        <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                                            <div className="flex items-center justify-between">
                                                <CardTitle className="text-base flex items-center gap-2">
                                                    <Info className="h-5 w-5 text-gray-500" />
                                                    Suppressed Alerts (Low Priority)
                                                    <Badge variant="outline">{result.suppressedAlerts.length}</Badge>
                                                </CardTitle>
                                                {sectionsOpen.suppressed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                            </div>
                                        </CardHeader>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                        <CardContent className="space-y-2">
                                            {result.suppressedAlerts.map((alert) => (
                                                <div key={alert.id} className="p-3 rounded-lg bg-muted/50 text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="outline" className="text-xs">{alert.type}</Badge>
                                                        <span>{alert.medications.join(" + ")}</span>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-1 italic">
                                                        Suppressed: {alert.suppressionReason}
                                                    </p>
                                                </div>
                                            ))}
                                        </CardContent>
                                    </CollapsibleContent>
                                </Card>
                            </Collapsible>
                        )}

                        {/* Monitoring Recommendations */}
                        <Collapsible open={sectionsOpen.monitoring} onOpenChange={() => toggleSection("monitoring")}>
                            <Card>
                                <CollapsibleTrigger asChild>
                                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-base flex items-center gap-2">
                                                <Activity className="h-5 w-5 text-blue-500" />
                                                Monitoring Recommendations
                                            </CardTitle>
                                            {sectionsOpen.monitoring ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                        </div>
                                    </CardHeader>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <CardContent>
                                        <ul className="space-y-2">
                                            {result.monitoringRecommendations.map((rec, i) => (
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

                        {/* Explainability Panel */}
                        <Collapsible open={sectionsOpen.explainability} onOpenChange={() => toggleSection("explainability")}>
                            <Card>
                                <CollapsibleTrigger asChild>
                                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-base flex items-center gap-2">
                                                <FileText className="h-5 w-5 text-purple-500" />
                                                Explainability & Data Sources
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
                                                {result.explainability.reasoningChain.map((step, i) => (
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

                                        <div>
                                            <h5 className="text-sm font-medium mb-2">Data Sources Used</h5>
                                            <div className="flex flex-wrap gap-1">
                                                {result.explainability.dataSourcesUsed.map((source, i) => (
                                                    <Badge key={i} variant="outline" className="text-xs">{source}</Badge>
                                                ))}
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
                                This analysis is generated by AI for clinical decision support. All alerts and recommendations
                                must be verified by qualified healthcare professionals before any clinical action is taken.
                            </AlertDescription>
                        </Alert>
                    </div>

                    {/* Sidebar - Organ Assessments */}
                    <div className="space-y-6">
                        <OrganAssessmentCard
                            title="Renal Function Assessment"
                            icon={<Beaker className="h-4 w-4 text-blue-500" />}
                            assessment={result.renalAssessment}
                            type="renal"
                        />

                        <OrganAssessmentCard
                            title="Hepatic Function Assessment"
                            icon={<Heart className="h-4 w-4 text-purple-500" />}
                            assessment={result.hepaticAssessment}
                            type="hepatic"
                        />

                        {/* Current Medications */}
                        {selectedPatient && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-sm flex items-center gap-2">
                                        <Pill className="h-4 w-4" />
                                        Current Medications
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    {selectedPatient.medications?.filter(m => m.status === "active").map((med, i) => (
                                        <div key={i} className="p-2 rounded-lg bg-muted/50 text-sm">
                                            <div className="font-medium">{med.name}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {med.dosage} {med.frequency}
                                            </div>
                                        </div>
                                    ))}
                                    {(!selectedPatient.medications || selectedPatient.medications.filter(m => m.status === "active").length === 0) && (
                                        <p className="text-sm text-muted-foreground text-center py-4">No active medications</p>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* Allergies */}
                        {selectedPatient && selectedPatient.allergies?.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-sm flex items-center gap-2">
                                        <AlertTriangle className="h-4 w-4 text-red-500" />
                                        Allergies
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-wrap gap-1">
                                        {selectedPatient.allergies.map((allergy, i) => (
                                            <Badge key={i} variant="destructive" className="text-xs">
                                                {allergy.substance}
                                            </Badge>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!result && (
                <Card>
                    <CardContent className="py-16 text-center">
                        <Shield className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2">No Analysis Results</h3>
                        <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
                            Select a patient and click "Analyze Safety" to run a comprehensive medication safety analysis
                            including drug interactions, dosing adjustments, and allergy checks.
                        </p>
                        {selectedPatientId && (
                            <Button onClick={() => analyzeMutation.mutate()} className="gap-2">
                                <Shield className="h-4 w-4" />
                                Analyze {selectedPatient?.demographics.firstName}'s Medications
                            </Button>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
