/**
 * Early Deterioration Detection Page
 * PRODUCTION-GRADE - Uses real patient data from database
 * 
 * Features:
 * - Real-time analysis using actual patient clinical data
 * - AI-enhanced pattern recognition
 * - No demo/simulated scenarios - production ready
 */

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  AlertTriangle,
  Activity,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Zap,
  Brain,
  Shield,
  FileText,
  Users,
  Play,
  User,
  Calendar,
  Pill,
  Stethoscope,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
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
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Patient, ClinicalCase } from "@shared/schema";

// ============================================================================
// TYPES
// ============================================================================

type RiskLevel = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
type Trajectory = "IMPROVING" | "STABLE" | "WORSENING" | "RAPIDLY_WORSENING";

interface DeteriorationSignal {
  type: "vital" | "lab" | "oxygen" | "medication" | "composite" | "clinical";
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
  timestamp: string;
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
    startTime: string;
    endTime: string;
    hoursAnalyzed: number;
    dataPointsEvaluated: number;
  };
  aiInsights?: {
    patternRecognition: string;
    predictedTrajectory: string;
    urgencyAssessment: string;
    differentialConsiderations: string[];
    recommendedInterventions: string[];
    confidenceExplanation: string;
  };
  aiModelUsed?: string;
  aiAnalysisTime?: number;
  dataSource: string;
}

// ============================================================================
// RISK LEVEL STYLES
// ============================================================================

const riskLevelStyles: Record<RiskLevel, { bg: string; text: string; border: string }> = {
  LOW: { bg: "bg-green-500/10", text: "text-green-600", border: "border-green-500" },
  MODERATE: { bg: "bg-yellow-500/10", text: "text-yellow-600", border: "border-yellow-500" },
  HIGH: { bg: "bg-orange-500/10", text: "text-orange-600", border: "border-orange-500" },
  CRITICAL: { bg: "bg-red-500/10", text: "text-red-600", border: "border-red-500" },
};

const severityStyles: Record<string, { bg: string; text: string }> = {
  low: { bg: "bg-green-500", text: "text-green-600" },
  moderate: { bg: "bg-yellow-500", text: "text-yellow-600" },
  high: { bg: "bg-orange-500", text: "text-orange-600" },
  critical: { bg: "bg-red-500", text: "text-red-600" },
};

const priorityStyles: Record<string, { variant: "default" | "secondary" | "destructive" | "outline" }> = {
  routine: { variant: "secondary" },
  urgent: { variant: "default" },
  immediate: { variant: "destructive" },
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function EarlyDeterioration() {
  const { toast } = useToast();

  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [currentAlert, setCurrentAlert] = useState<DeteriorationAlert | null>(null);
  const [sectionsOpen, setSectionsOpen] = useState({
    aiInsights: true,
    signals: true,
    recommendations: true,
    reasoning: false,
  });

  // Fetch patients from database
  const { data: patientsData, isLoading: patientsLoading } = useQuery({
    queryKey: ["/api/patients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/patients");
      return res.json();
    },
  });

  const patients: Patient[] = patientsData?.data || [];
  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  // Fetch patient's cases for clinical context
  const { data: casesData } = useQuery({
    queryKey: ["/api/cases", selectedPatientId],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/cases");
      return res.json();
    },
    enabled: !!selectedPatientId,
  });

  const patientCases: ClinicalCase[] = (casesData?.data || []).filter(
    (c: ClinicalCase) => c.patientId === selectedPatientId
  );

  // Fetch lab reports for the patient's cases
  const { data: labReportsData } = useQuery({
    queryKey: ["/api/labs", selectedPatientId],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/labs");
      return res.json();
    },
    enabled: !!selectedPatientId,
  });

  // Run Production AI Analysis - uses REAL patient data
  const analyzeMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPatient) throw new Error("No patient selected");

      // Build comprehensive patient context from real database data
      const patientContext = {
        patientId: selectedPatient.id,
        age: calculateAge(selectedPatient.demographics.dateOfBirth),
        gender: selectedPatient.demographics.gender,
        // Real diagnoses from database
        comorbidities: selectedPatient.diagnoses
          ?.filter((d: any) => d.status === "active")
          ?.map((d: any) => d.display) || [],
        currentDiagnoses: selectedPatient.diagnoses
          ?.map((d: any) => ({
            code: d.code,
            display: d.display,
            status: d.status,
            onsetDate: d.onsetDate
          })) || [],
        // Real medications from database
        medications: selectedPatient.medications
          ?.filter((m: any) => m.status === "active")
          ?.map((m: any) => ({
            name: m.name,
            dosage: m.dosage,
            frequency: m.frequency,
            route: m.route,
          })) || [],
        // Real allergies from database
        allergies: selectedPatient.allergies?.map((a: any) => ({
          substance: a.substance,
          severity: a.severity,
          reaction: a.reaction,
        })) || [],
      };

      // Get clinical case data if available
      const caseData = patientCases.length > 0 ? {
        activeCases: patientCases.filter(c => c.status !== "closed").length,
        latestCaseType: patientCases[0]?.caseType,
        riskAlerts: patientCases.flatMap(c => c.riskAlerts || []),
        agentOutputs: patientCases.flatMap(c => c.agentOutputs || []),
      } : null;

      // Get lab data if available
      const labData = labReportsData?.data || [];

      const res = await apiRequest("POST", "/api/deterioration/analyze-real", {
        patientId: selectedPatientId,
        patientContext,
        caseData,
        labData,
        analysisWindowHours: 24,
        useAI: true,
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success && data.data) {
        setCurrentAlert(data.data);
        toast({
          title: "Analysis Complete",
          description: `Risk Level: ${data.data.riskLevel} | ${data.data.keySignals.length} signals detected`,
        });
      } else {
        toast({
          title: "Analysis Note",
          description: data.message || "Analysis completed with limited data",
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

  // Acknowledge mutation
  const acknowledgeMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const res = await apiRequest("POST", `/api/deterioration/alert/${alertId}/acknowledge`, {
        notes: "Alert reviewed and acknowledged by clinician",
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Alert Acknowledged",
        description: "The alert has been marked as reviewed.",
      });
      setCurrentAlert(null);
    },
  });

  // Escalate mutation
  const escalateMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const res = await apiRequest("POST", `/api/deterioration/alert/${alertId}/escalate`, {
        escalationTarget: "Senior Clinician / ICU",
        notes: "Patient requires immediate clinical review",
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Alert Escalated",
        description: "Senior clinician has been notified.",
      });
    },
  });

  const toggleSection = (section: keyof typeof sectionsOpen) => {
    setSectionsOpen(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const getTrajectoryIcon = (trajectory: Trajectory) => {
    switch (trajectory) {
      case "IMPROVING": return <TrendingDown className="h-4 w-4 text-green-500" />;
      case "STABLE": return <Minus className="h-4 w-4 text-yellow-500" />;
      case "WORSENING": return <TrendingUp className="h-4 w-4 text-orange-500" />;
      case "RAPIDLY_WORSENING": return <TrendingUp className="h-4 w-4 text-red-500 animate-pulse" />;
    }
  };

  // Calculate data availability for the selected patient
  const dataAvailability = selectedPatient ? {
    hasDiagnoses: (selectedPatient.diagnoses?.length || 0) > 0,
    hasMedications: (selectedPatient.medications?.length || 0) > 0,
    hasAllergies: (selectedPatient.allergies?.length || 0) > 0,
    hasCases: patientCases.length > 0,
    hasLabReports: (labReportsData?.data?.length || 0) > 0,
  } : null;

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-orange-500" />
            <div>
              <h1 className="text-3xl font-semibold">Early Deterioration Detection</h1>
              <p className="text-muted-foreground">AI-Enhanced Clinical Monitoring</p>
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
            Real-Time
          </Badge>
          <Badge variant="outline" className="gap-1.5 text-green-600 border-green-600">
            <Stethoscope className="h-3 w-3" />
            Production
          </Badge>
        </div>
      </div>

      {/* Controls Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Patient Selection</CardTitle>
          <CardDescription>
            Select a patient to analyze their clinical data for early signs of deterioration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[300px]">
              <label className="text-sm font-medium mb-2 block">Patient</label>
              <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
                <SelectTrigger>
                  <SelectValue placeholder={patientsLoading ? "Loading patients..." : "Select a patient..."} />
                </SelectTrigger>
                <SelectContent>
                  {patients.length === 0 && !patientsLoading ? (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                      No patients found
                    </div>
                  ) : (
                    patients.map((patient) => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {patient.demographics.firstName} {patient.demographics.lastName} (MRN: {patient.demographics.mrn})
                      </SelectItem>
                    ))
                  )}
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
                  Analyzing Patient Data...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4" />
                  Analyze Patient
                </>
              )}
            </Button>
          </div>

          {/* Data Availability Indicators */}
          {selectedPatient && dataAvailability && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-muted-foreground mb-2">Available Clinical Data:</p>
              <div className="flex flex-wrap gap-2">
                <DataBadge
                  label="Diagnoses"
                  count={selectedPatient.diagnoses?.length || 0}
                  available={dataAvailability.hasDiagnoses}
                />
                <DataBadge
                  label="Medications"
                  count={selectedPatient.medications?.length || 0}
                  available={dataAvailability.hasMedications}
                />
                <DataBadge
                  label="Allergies"
                  count={selectedPatient.allergies?.length || 0}
                  available={dataAvailability.hasAllergies}
                />
                <DataBadge
                  label="Cases"
                  count={patientCases.length}
                  available={dataAvailability.hasCases}
                />
                <DataBadge
                  label="Lab Reports"
                  count={labReportsData?.data?.length || 0}
                  available={dataAvailability.hasLabReports}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Results Panel */}
        <div className="lg:col-span-2 space-y-6">
          {currentAlert ? (
            <>
              {/* Risk Summary Card */}
              <Card className={`border-l-4 ${riskLevelStyles[currentAlert.riskLevel].border}`}>
                <CardHeader>
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-lg ${riskLevelStyles[currentAlert.riskLevel].bg}`}>
                        <AlertTriangle className={`h-6 w-6 ${riskLevelStyles[currentAlert.riskLevel].text}`} />
                      </div>
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {currentAlert.riskLevel} Risk
                          {getTrajectoryIcon(currentAlert.trajectory)}
                          <span className="text-sm font-normal text-muted-foreground">
                            ({currentAlert.trajectory.replace("_", " ")})
                          </span>
                        </CardTitle>
                        <CardDescription>
                          Confidence: {(currentAlert.confidence * 100).toFixed(0)}% •
                          {currentAlert.aiModelUsed && ` Model: ${currentAlert.aiModelUsed}`} •
                          <span className="text-green-600 ml-1">Using Real Patient Data</span>
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => acknowledgeMutation.mutate(currentAlert.id)}
                        className="gap-1.5"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Acknowledge
                      </Button>
                      {currentAlert.riskLevel !== "LOW" && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => escalateMutation.mutate(currentAlert.id)}
                          className="gap-1.5"
                        >
                          <Zap className="h-4 w-4" />
                          Escalate
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Score Cards */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <ScoreCard
                      label="NEWS2"
                      value={currentAlert.scores.news2Score}
                      max={20}
                      scoreClass={getScoreClass(currentAlert.scores.news2Score, 5, 7)}
                    />
                    <ScoreCard
                      label="qSOFA"
                      value={currentAlert.scores.qsofaScore}
                      max={3}
                      scoreClass={getScoreClass(currentAlert.scores.qsofaScore, 1, 2)}
                    />
                    <ScoreCard
                      label="Risk Score"
                      value={currentAlert.scores.customRiskScore}
                      max={100}
                      scoreClass={getScoreClass(currentAlert.scores.customRiskScore, 30, 50)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* AI Insights */}
              {currentAlert.aiInsights && (
                <Collapsible open={sectionsOpen.aiInsights} onOpenChange={() => toggleSection("aiInsights")}>
                  <Card>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Brain className="h-5 w-5 text-purple-500" />
                            AI Clinical Insights
                            {currentAlert.aiModelUsed && (
                              <Badge variant="secondary" className="ml-2">{currentAlert.aiModelUsed}</Badge>
                            )}
                          </CardTitle>
                          {sectionsOpen.aiInsights ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="space-y-4">
                        <div className="grid gap-4">
                          <AIInsightCard
                            icon="🔍"
                            title="Pattern Recognition"
                            content={currentAlert.aiInsights.patternRecognition}
                          />
                          <AIInsightCard
                            icon="📈"
                            title="Predicted Trajectory"
                            content={currentAlert.aiInsights.predictedTrajectory}
                          />
                          <AIInsightCard
                            icon="⚡"
                            title="Urgency Assessment"
                            content={currentAlert.aiInsights.urgencyAssessment}
                            isUrgent={currentAlert.riskLevel === "HIGH" || currentAlert.riskLevel === "CRITICAL"}
                          />
                        </div>

                        {currentAlert.aiInsights.differentialConsiderations.length > 0 && (
                          <div>
                            <h5 className="text-sm font-medium mb-2">🩺 Differential Considerations</h5>
                            <div className="flex flex-wrap gap-2">
                              {currentAlert.aiInsights.differentialConsiderations.map((d, i) => (
                                <Badge key={i} variant="outline">{d}</Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        <p className="text-xs text-muted-foreground">
                          Analysis time: {currentAlert.aiAnalysisTime}ms
                        </p>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              )}

              {/* Key Signals */}
              <Collapsible open={sectionsOpen.signals} onOpenChange={() => toggleSection("signals")}>
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Activity className="h-5 w-5 text-blue-500" />
                          Detected Clinical Signals
                          <Badge variant="secondary">{currentAlert.keySignals.length}</Badge>
                        </CardTitle>
                        {sectionsOpen.signals ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="space-y-3">
                      {currentAlert.keySignals.length > 0 ? (
                        currentAlert.keySignals.map((signal, idx) => (
                          <SignalCard key={idx} signal={signal} />
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No concerning signals detected based on available data.
                        </p>
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
                          Clinical Recommendations
                          <Badge variant="secondary">{currentAlert.recommendations.length}</Badge>
                        </CardTitle>
                        {sectionsOpen.recommendations ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="space-y-3">
                      {currentAlert.recommendations.map((rec, idx) => (
                        <RecommendationCard key={idx} recommendation={rec} />
                      ))}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              {/* Clinical Reasoning */}
              <Collapsible open={sectionsOpen.reasoning} onOpenChange={() => toggleSection("reasoning")}>
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <FileText className="h-5 w-5 text-gray-500" />
                          Clinical Reasoning & Evidence
                        </CardTitle>
                        {sectionsOpen.reasoning ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="space-y-4">
                      <div className="p-4 bg-muted/50 rounded-lg border-l-4 border-blue-500">
                        <p className="text-sm">{currentAlert.explainability.reasoning}</p>
                      </div>

                      <div>
                        <h5 className="text-sm font-medium mb-2">Evidence Sources</h5>
                        <div className="space-y-2">
                          {currentAlert.explainability.evidenceSources.map((source, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Shield className="h-4 w-4 text-blue-500" />
                              {source}
                            </div>
                          ))}
                        </div>
                      </div>

                      {currentAlert.explainability.limitations.length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium mb-2">Analysis Limitations</h5>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            {currentAlert.explainability.limitations.map((limitation, i) => (
                              <li key={i}>• {limitation}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              {/* Clinical Disclaimer */}
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Decision Support Only</AlertTitle>
                <AlertDescription>
                  This AI-generated analysis is based on available patient data and must be reviewed
                  and validated by qualified healthcare professionals before any clinical action is taken.
                </AlertDescription>
              </Alert>
            </>
          ) : (
            <Card>
              <CardContent className="py-16 text-center">
                <Activity className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Analysis Results</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
                  Select a patient and click "Analyze Patient" to run AI-powered deterioration
                  detection using real clinical data from the database.
                </p>
                {selectedPatientId && (
                  <Button onClick={() => analyzeMutation.mutate()} className="gap-2">
                    <Play className="h-4 w-4" />
                    Analyze {selectedPatient?.demographics.firstName}'s Data
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Sidebar - Patient Context */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-5 w-5" />
                Patient Context
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedPatient ? (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold">
                      {selectedPatient.demographics.firstName} {selectedPatient.demographics.lastName}
                    </h4>
                    <div className="text-sm text-muted-foreground space-y-1 mt-1">
                      <div className="flex items-center gap-2">
                        <User className="h-3.5 w-3.5" />
                        MRN: {selectedPatient.demographics.mrn}
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5" />
                        Age: {calculateAge(selectedPatient.demographics.dateOfBirth)} years
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3.5" />
                        {selectedPatient.demographics.gender}
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Activity className="h-4 w-4 text-blue-500" />
                      Active Conditions ({selectedPatient.diagnoses?.length || 0})
                    </h5>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedPatient.diagnoses?.map((dx: any, i: number) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {dx.display}
                        </Badge>
                      ))}
                      {(!selectedPatient.diagnoses || selectedPatient.diagnoses.length === 0) && (
                        <p className="text-xs text-muted-foreground">None recorded</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Pill className="h-4 w-4 text-purple-500" />
                      Medications ({selectedPatient.medications?.length || 0})
                    </h5>
                    <div className="space-y-1">
                      {selectedPatient.medications?.slice(0, 5).map((med: any, i: number) => (
                        <div key={i} className="text-xs p-1.5 rounded bg-muted/50">
                          <span className="font-medium">{med.name}</span>
                          <span className="text-muted-foreground ml-1">{med.dosage}</span>
                        </div>
                      ))}
                      {(selectedPatient.medications?.length || 0) > 5 && (
                        <p className="text-xs text-muted-foreground">
                          +{selectedPatient.medications.length - 5} more
                        </p>
                      )}
                      {(!selectedPatient.medications || selectedPatient.medications.length === 0) && (
                        <p className="text-xs text-muted-foreground">None recorded</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      Allergies ({selectedPatient.allergies?.length || 0})
                    </h5>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedPatient.allergies?.map((allergy: any, i: number) => (
                        <Badge
                          key={i}
                          variant={allergy.severity === "severe" || allergy.severity === "life-threatening" ? "destructive" : "outline"}
                          className="text-xs"
                        >
                          {allergy.substance}
                        </Badge>
                      ))}
                      {(!selectedPatient.allergies || selectedPatient.allergies.length === 0) && (
                        <p className="text-xs text-muted-foreground">No known allergies</p>
                      )}
                    </div>
                  </div>

                  {patientCases.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h5 className="text-sm font-medium mb-2">Active Cases ({patientCases.length})</h5>
                        <div className="space-y-2">
                          {patientCases.slice(0, 3).map((c) => (
                            <Link key={c.id} href={`/cases/${c.id}`}>
                              <div className="text-xs p-2 rounded border hover:bg-muted/50 cursor-pointer">
                                <span className="font-mono text-primary">#{c.id.slice(0, 8)}</span>
                                <span className="ml-2 text-muted-foreground">{c.caseType}</span>
                                <Badge variant="outline" className="ml-2 text-[10px]">{c.status}</Badge>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Select a patient to view context</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Analysis Window Info */}
          {currentAlert && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Analysis Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Window</span>
                  <span>{currentAlert.analysisWindow.hoursAnalyzed} hours</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Data Points</span>
                  <span>{currentAlert.analysisWindow.dataPointsEvaluated}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Analyzed At</span>
                  <span>{new Date(currentAlert.timestamp).toLocaleTimeString()}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Data Source</span>
                  <Badge variant="outline" className="text-green-600 text-xs">
                    Real Patient Data
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function DataBadge({ label, count, available }: { label: string; count: number; available: boolean }) {
  return (
    <Badge
      variant={available ? "secondary" : "outline"}
      className={`text-xs ${available ? "" : "opacity-50"}`}
    >
      {label}: {count}
      {available && <CheckCircle2 className="h-3 w-3 ml-1" />}
    </Badge>
  );
}

function ScoreCard({ label, value, max, scoreClass }: {
  label: string;
  value: number;
  max: number;
  scoreClass: string;
}) {
  return (
    <div className="text-center p-4 border rounded-lg">
      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-2xl font-bold ${scoreClass}`}>{value}<span className="text-sm text-muted-foreground">/{max}</span></p>
      <Progress value={(value / max) * 100} className="h-1 mt-2" />
    </div>
  );
}

function AIInsightCard({ icon, title, content, isUrgent }: {
  icon: string;
  title: string;
  content: string;
  isUrgent?: boolean;
}) {
  return (
    <div className={`p-3 rounded-lg border ${isUrgent ? "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900" : "bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-900"}`}>
      <h5 className="text-sm font-medium mb-1">{icon} {title}</h5>
      <p className="text-sm text-muted-foreground">{content}</p>
    </div>
  );
}

function SignalCard({ signal }: { signal: DeteriorationSignal }) {
  return (
    <div
      className="p-3 rounded-lg border border-l-4"
      style={{
        borderLeftColor: signal.severity === "critical" ? "#ef4444" :
          signal.severity === "high" ? "#f97316" :
            signal.severity === "moderate" ? "#eab308" : "#22c55e"
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-foreground">{signal.description}</span>
        <Badge variant={signal.severity === "critical" ? "destructive" : signal.severity === "high" ? "default" : "secondary"}>
          {signal.severity.toUpperCase()}
        </Badge>
      </div>
      <div className="text-sm text-muted-foreground">
        <span>{signal.values.baseline}</span>
        <span className="mx-2">→</span>
        <span className="font-medium text-foreground">{signal.values.current}</span>
        <span className="ml-2">
          ({signal.values.change}
          {signal.values.changePercent && `, ${signal.values.changePercent.toFixed(0)}%`})
        </span>
      </div>
      <p className="text-xs text-muted-foreground mt-2 italic">{signal.clinicalSignificance}</p>
    </div>
  );
}

function RecommendationCard({ recommendation }: { recommendation: ClinicalRecommendation }) {
  return (
    <div className="p-3 rounded-lg border">
      <div className="flex items-center justify-between mb-2">
        <Badge variant={priorityStyles[recommendation.priority].variant}>
          {recommendation.priority.toUpperCase()}
        </Badge>
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {recommendation.timeframe}
        </span>
      </div>
      <p className="font-medium text-sm">{recommendation.action}</p>
      <p className="text-xs text-muted-foreground mt-1">{recommendation.rationale}</p>
    </div>
  );
}

// ============================================================================
// UTILITIES
// ============================================================================

function calculateAge(birthDate: string): number {
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

function getScoreClass(value: number, lowThreshold: number, highThreshold: number): string {
  if (value >= highThreshold) return "text-red-600";
  if (value >= lowThreshold) return "text-yellow-600";
  return "text-green-600";
}
