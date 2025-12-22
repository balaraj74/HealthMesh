import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "wouter";
import {
  ArrowLeft,
  Brain,
  Users,
  Beaker,
  FileText,
  Shield,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  ThumbsUp,
  ThumbsDown,
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ClinicalCase, Patient, AgentType, AgentOutput, Recommendation, RiskAlert } from "@shared/schema";

const agentInfo: Record<AgentType, { name: string; icon: typeof Brain; color: string; description: string }> = {
  "patient-context": {
    name: "Patient Context Agent",
    icon: Users,
    color: "text-blue-500",
    description: "Analyzes patient demographics, medical history, and current conditions"
  },
  "labs-reports": {
    name: "Labs & Reports Agent",
    icon: Beaker,
    color: "text-green-500",
    description: "Processes lab results, identifies abnormalities and critical values"
  },
  "research-guidelines": {
    name: "Research & Guidelines Agent",
    icon: FileText,
    color: "text-purple-500",
    description: "Searches medical literature and clinical guidelines for evidence"
  },
  "risk-safety": {
    name: "Risk & Safety Agent",
    icon: Shield,
    color: "text-red-500",
    description: "Checks drug interactions, contraindications, and safety concerns"
  },
  "clinician-interaction": {
    name: "Clinician Interaction Agent",
    icon: MessageSquare,
    color: "text-orange-500",
    description: "Provides conversational interface for clarification and feedback"
  },
  "orchestrator": {
    name: "Central Orchestrator",
    icon: Brain,
    color: "text-primary",
    description: "Coordinates all agents and synthesizes final recommendations"
  },
};

function AgentOutputCard({ output }: { output: AgentOutput }) {
  const [isOpen, setIsOpen] = useState(false);
  const info = agentInfo[output.agentType];
  const Icon = info.icon;

  const statusColors = {
    idle: "bg-gray-500",
    processing: "bg-yellow-500 animate-pulse",
    completed: "bg-green-500",
    error: "bg-red-500",
  };

  return (
    <Card data-testid={`card-agent-output-${output.agentType}`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover-elevate">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                  <Icon className={`h-5 w-5 ${info.color}`} />
                </div>
                <div>
                  <CardTitle className="text-base">{info.name}</CardTitle>
                  <CardDescription className="text-xs">{info.description}</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${statusColors[output.status]}`} />
                  {output.status}
                </Badge>
                {output.confidence !== undefined && (
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Confidence</p>
                    <p className="font-medium">{output.confidence}%</p>
                  </div>
                )}
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <Separator className="mb-4" />

            {output.summary && (
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-2">Summary</h4>
                <p className="text-sm text-muted-foreground">{output.summary}</p>
              </div>
            )}

            {output.reasoningChain && output.reasoningChain.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-2">Reasoning Chain</h4>
                <ol className="list-decimal list-inside space-y-1">
                  {output.reasoningChain.map((step, i) => (
                    <li key={i} className="text-sm text-muted-foreground">{step}</li>
                  ))}
                </ol>
              </div>
            )}

            {output.evidenceSources && output.evidenceSources.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Evidence Sources</h4>
                <div className="space-y-1">
                  {output.evidenceSources.map((source, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <ExternalLink className="h-3 w-3" />
                      <span>{source}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function RecommendationCard({
  recommendation,
  onFeedback
}: {
  recommendation: Recommendation;
  onFeedback: (id: string, status: "accepted" | "rejected", feedback?: string) => void;
}) {
  const confidenceColor = recommendation.confidence >= 80 ? "text-green-500" :
    recommendation.confidence >= 50 ? "text-yellow-500" : "text-red-500";

  return (
    <Card data-testid={`card-recommendation-${recommendation.id}`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline">{recommendation.category}</Badge>
              <Badge variant="secondary" className={confidenceColor}>
                {recommendation.confidence}% confidence
              </Badge>
            </div>
            <CardTitle className="text-base">{recommendation.title}</CardTitle>
          </div>
          {recommendation.status === "pending" && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onFeedback(recommendation.id, "accepted")}
                data-testid={`button-accept-${recommendation.id}`}
              >
                <ThumbsUp className="h-4 w-4 mr-1" />
                Accept
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onFeedback(recommendation.id, "rejected")}
                data-testid={`button-reject-${recommendation.id}`}
              >
                <ThumbsDown className="h-4 w-4 mr-1" />
                Reject
              </Button>
            </div>
          )}
          {recommendation.status !== "pending" && (
            <Badge variant={recommendation.status === "accepted" ? "default" : "secondary"}>
              {recommendation.status}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-4">{recommendation.content}</p>

        <Accordion type="single" collapsible>
          <AccordionItem value="evidence">
            <AccordionTrigger className="text-sm">
              View Evidence ({recommendation.evidenceSources.length} sources)
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                {recommendation.evidenceSources.map((source, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="h-3 w-3 flex-shrink-0" />
                    <span>{source}</span>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="reasoning">
            <AccordionTrigger className="text-sm">
              View Reasoning Chain
            </AccordionTrigger>
            <AccordionContent>
              <ol className="list-decimal list-inside space-y-1">
                {recommendation.reasoningChain.map((step, i) => (
                  <li key={i} className="text-sm text-muted-foreground">{step}</li>
                ))}
              </ol>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}

function RiskAlertCard({ alert }: { alert: RiskAlert }) {
  const severityStyles = {
    info: "border-l-blue-500 bg-blue-500/5",
    warning: "border-l-yellow-500 bg-yellow-500/5",
    critical: "border-l-destructive bg-destructive/5",
  };

  const severityIcons = {
    info: "text-blue-500",
    warning: "text-yellow-500",
    critical: "text-destructive",
  };

  return (
    <Card className={`border-l-4 ${severityStyles[alert.severity]}`} data-testid={`card-alert-${alert.id}`}>
      <CardContent className="py-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className={`h-5 w-5 flex-shrink-0 ${severityIcons[alert.severity]}`} />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium">{alert.title}</h4>
              <Badge variant="outline" className="text-xs capitalize">{alert.type.replace("-", " ")}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-2">{alert.description}</p>
            {alert.recommendation && (
              <div className="bg-background rounded-md p-2 mt-2">
                <p className="text-xs font-medium">Recommended Action:</p>
                <p className="text-xs text-muted-foreground">{alert.recommendation}</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PatientSummaryPanel({ patient }: { patient: Patient }) {
  return (
    <Card className="sticky top-4">
      <CardHeader>
        <CardTitle className="text-lg">Patient Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">Name</p>
          <p className="font-medium">
            {patient.demographics.firstName} {patient.demographics.lastName}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">MRN</p>
          <p className="font-mono">{patient.demographics.mrn}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Date of Birth</p>
          <p>{patient.demographics.dateOfBirth}</p>
        </div>

        <Separator />

        <div>
          <p className="text-sm font-medium mb-2">Active Conditions ({patient.diagnoses.length})</p>
          <div className="space-y-1">
            {patient.diagnoses.slice(0, 3).map((dx) => (
              <Badge key={dx.id} variant="secondary" className="mr-1 mb-1 text-xs">
                {dx.display}
              </Badge>
            ))}
            {patient.diagnoses.length > 3 && (
              <p className="text-xs text-muted-foreground">+{patient.diagnoses.length - 3} more</p>
            )}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium mb-2">Allergies ({patient.allergies.length})</p>
          <div className="space-y-1">
            {patient.allergies.map((allergy) => (
              <Badge
                key={allergy.id}
                variant={allergy.severity === "severe" || allergy.severity === "life-threatening" ? "destructive" : "secondary"}
                className="mr-1 mb-1 text-xs"
              >
                {allergy.substance}
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium mb-2">Current Medications ({patient.medications.length})</p>
          <div className="space-y-1 text-sm">
            {patient.medications.slice(0, 3).map((med) => (
              <p key={med.id} className="text-muted-foreground">
                {med.name} {med.dosage}
              </p>
            ))}
            {patient.medications.length > 3 && (
              <p className="text-xs text-muted-foreground">+{patient.medications.length - 3} more</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CaseDetail() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: caseData, isLoading: caseLoading, isError, error } = useQuery<{ success: boolean; data: ClinicalCase }, Error, ClinicalCase>({
    queryKey: ["/api/cases", id],
    enabled: !!id,
    select: (response) => response.data,
    retry: false,
  });

  const { data: patient, isLoading: patientLoading } = useQuery<{ success: boolean; data: Patient }, Error, Patient>({
    queryKey: ["/api/patients", caseData?.patientId],
    enabled: !!caseData?.patientId,
    select: (response) => response.data,
  });

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/cases/${id}/analyze`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", id] });
      toast({
        title: "Analysis started",
        description: "The AI agents are now analyzing this case.",
      });
    },
  });

  const feedbackMutation = useMutation({
    mutationFn: async ({ recId, status }: { recId: string; status: string }) => {
      await apiRequest("POST", `/api/recommendations/${recId}/feedback`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", id] });
      toast({
        title: "Feedback recorded",
        description: "Your feedback has been saved.",
      });
    },
  });

  const handleFeedback = (recId: string, status: "accepted" | "rejected") => {
    feedbackMutation.mutate({ recId, status });
  };

  if (!id) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-semibold mb-2">Invalid Case ID</h1>
        <p className="text-muted-foreground mb-4">No case ID was provided in the URL.</p>
        <Button asChild>
          <Link href="/cases">Back to Cases</Link>
        </Button>
      </div>
    );
  }

  if (caseLoading) {
    return (
      <div className="p-6">
        <Skeleton className="h-10 w-64 mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (isError || !caseData) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-semibold mb-2">Error Loading Case</h1>
        <p className="text-muted-foreground mb-4">
          {error?.message || "The requested case could not be found or you don't have permission to view it."}
        </p>
        <Button asChild>
          <Link href="/cases">Back to Cases</Link>
        </Button>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    draft: "bg-gray-500",
    submitted: "bg-blue-500",
    analyzing: "bg-yellow-500",
    "review-ready": "bg-green-500",
    reviewed: "bg-purple-500",
    closed: "bg-gray-400",
    active: "bg-green-500",
  };

  // Safe access to arrays
  const recommendations = caseData.recommendations ?? [];
  const riskAlerts = caseData.riskAlerts ?? [];
  const agentOutputs = caseData.agentOutputs ?? [];

  const criticalAlerts = riskAlerts.filter(a => a.severity === "critical");
  const warningAlerts = riskAlerts.filter(a => a.severity === "warning");

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => navigate("/cases")} data-testid="button-back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-semibold">Case #{caseData.id.slice(0, 8)}</h1>
            <Badge variant="secondary" className="gap-1.5">
              <span className={`w-2 h-2 rounded-full ${statusColors[caseData.status] || "bg-gray-500"}`} />
              {caseData.status.replace("-", " ")}
            </Badge>
          </div>
          <p className="text-muted-foreground">{caseData.caseType.replace("-", " ")} case</p>
        </div>
        <div className="flex items-center gap-2">
          {caseData.status === "submitted" && (
            <Button
              onClick={() => analyzeMutation.mutate()}
              disabled={analyzeMutation.isPending}
              data-testid="button-start-analysis"
            >
              <Brain className="h-4 w-4 mr-2" />
              {analyzeMutation.isPending ? "Starting..." : "Start Analysis"}
            </Button>
          )}
          <Button variant="outline" data-testid="button-download-report">
            <Download className="h-4 w-4 mr-2" />
            Download Report
          </Button>
        </div>
      </div>

      {criticalAlerts.length > 0 && (
        <Card className="bg-destructive/10 border-destructive/20 mb-6">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-medium text-destructive">
                  {criticalAlerts.length} Critical Alert{criticalAlerts.length > 1 ? "s" : ""} Detected
                </p>
                <p className="text-sm text-muted-foreground">
                  Review safety concerns before proceeding with recommendations.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList>
              <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
              <TabsTrigger value="agents" data-testid="tab-agents">Agent Analysis</TabsTrigger>
              <TabsTrigger value="recommendations" data-testid="tab-recommendations">
                Recommendations
                {recommendations.length > 0 && (
                  <Badge variant="secondary" className="ml-2">{recommendations.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="alerts" data-testid="tab-alerts">
                Risk Alerts
                {riskAlerts.length > 0 && (
                  <Badge variant={criticalAlerts.length > 0 ? "destructive" : "secondary"} className="ml-2">
                    {riskAlerts.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Clinical Question</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{caseData.clinicalQuestion || caseData.description || "No clinical question provided."}</p>
                </CardContent>
              </Card>

              {caseData.summary && (
                <Card>
                  <CardHeader>
                    <CardTitle>Executive Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{caseData.summary}</p>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Agent Status Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {agentOutputs.length === 0 ? (
                      <p className="text-sm text-muted-foreground col-span-full">No agents active.</p>
                    ) : (
                      agentOutputs.map((output) => {
                        const info = agentInfo[output.agentType];
                        const Icon = info.icon;
                        return (
                          <div key={output.agentType} className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
                            <Icon className={`h-5 w-5 ${info.color}`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{info.name.replace(" Agent", "")}</p>
                              <p className="text-xs text-muted-foreground capitalize">{output.status}</p>
                            </div>
                            {output.confidence !== undefined && (
                              <Badge variant="outline" className="text-xs">{output.confidence}%</Badge>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="agents" className="space-y-4">
              {agentOutputs.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-medium mb-2">No Agent Analysis Yet</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Start the analysis to see agent outputs.
                    </p>
                    {caseData.status === "submitted" && (
                      <Button onClick={() => analyzeMutation.mutate()}>
                        <Brain className="h-4 w-4 mr-2" />
                        Start Analysis
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                agentOutputs.map((output) => (
                  <AgentOutputCard key={output.agentType} output={output} />
                ))
              )}
            </TabsContent>

            <TabsContent value="recommendations" className="space-y-4">
              {recommendations.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-medium mb-2">No Recommendations Yet</h3>
                    <p className="text-sm text-muted-foreground">
                      Recommendations will appear after AI analysis is complete.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                recommendations.map((rec) => (
                  <RecommendationCard
                    key={rec.id}
                    recommendation={rec}
                    onFeedback={handleFeedback}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="alerts" className="space-y-4">
              {riskAlerts.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <h3 className="font-medium mb-2">No Risk Alerts</h3>
                    <p className="text-sm text-muted-foreground">
                      No safety concerns have been identified for this case.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {criticalAlerts.map((alert) => (
                    <RiskAlertCard key={alert.id} alert={alert} />
                  ))}
                  {warningAlerts.map((alert) => (
                    <RiskAlertCard key={alert.id} alert={alert} />
                  ))}
                  {riskAlerts
                    .filter(a => a.severity === "info")
                    .map((alert) => (
                      <RiskAlertCard key={alert.id} alert={alert} />
                    ))}
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          {patient && <PatientSummaryPanel patient={patient} />}

          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Decision Support Only</p>
                  <p className="text-xs text-muted-foreground">
                    This system provides AI-assisted recommendations.
                    All outputs must be reviewed by qualified healthcare professionals.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
