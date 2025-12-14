import { useQuery } from "@tanstack/react-query";
import {
  Brain,
  Users,
  Beaker,
  FileText,
  Shield,
  MessageSquare,
  ArrowRight,
  Activity,
  Clock,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import type { AgentType, ClinicalCase } from "@shared/schema";

const agentInfo: Record<AgentType, { 
  name: string; 
  shortName: string;
  icon: typeof Brain; 
  color: string;
  bgColor: string;
  description: string;
  capabilities: string[];
}> = {
  "orchestrator": { 
    name: "Central Orchestrator", 
    shortName: "Orchestrator",
    icon: Brain, 
    color: "text-primary",
    bgColor: "bg-primary/10",
    description: "Coordinates all agents and synthesizes final recommendations",
    capabilities: [
      "Agent coordination and task delegation",
      "Output merging and conflict resolution",
      "Audit trail maintenance",
      "Explainability synthesis"
    ]
  },
  "patient-context": { 
    name: "Patient Context Agent", 
    shortName: "Patient",
    icon: Users, 
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    description: "Analyzes patient demographics, history, and current conditions",
    capabilities: [
      "FHIR data ingestion and normalization",
      "Demographics and history analysis",
      "Diagnosis pattern recognition",
      "Medication reconciliation"
    ]
  },
  "labs-reports": { 
    name: "Labs & Reports Agent", 
    shortName: "Labs",
    icon: Beaker, 
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    description: "Processes lab results and identifies abnormalities",
    capabilities: [
      "Lab report parsing (PDF/images)",
      "Abnormal value detection",
      "Critical value flagging",
      "Trend analysis over time"
    ]
  },
  "research-guidelines": { 
    name: "Research & Guidelines Agent", 
    shortName: "Research",
    icon: FileText, 
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    description: "Searches medical literature and clinical guidelines",
    capabilities: [
      "Medical literature search",
      "Clinical guideline matching",
      "Treatment comparison",
      "Evidence citation and grading"
    ]
  },
  "risk-safety": { 
    name: "Risk & Safety Agent", 
    shortName: "Safety",
    icon: Shield, 
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    description: "Checks drug interactions and safety concerns",
    capabilities: [
      "Drug-drug interaction checking",
      "Contraindication detection",
      "Dosage limit verification",
      "Patient-specific risk assessment"
    ]
  },
  "clinician-interaction": { 
    name: "Clinician Interaction Agent", 
    shortName: "Clinician",
    icon: MessageSquare, 
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    description: "Provides conversational interface for clarification",
    capabilities: [
      "Natural language interaction",
      "AI reasoning explanation",
      "Feedback collection",
      "Clarification requests"
    ]
  },
};

const agentOrder: AgentType[] = [
  "orchestrator",
  "patient-context",
  "labs-reports",
  "research-guidelines",
  "risk-safety",
  "clinician-interaction",
];

function AgentCard({ agentType, status }: { agentType: AgentType; status: "idle" | "active" | "completed" }) {
  const info = agentInfo[agentType];
  const Icon = info.icon;

  const statusConfig = {
    idle: { label: "Ready", color: "bg-gray-500", icon: Clock },
    active: { label: "Processing", color: "bg-yellow-500 animate-pulse", icon: Activity },
    completed: { label: "Completed", color: "bg-green-500", icon: CheckCircle },
  };

  const currentStatus = statusConfig[status];
  const StatusIcon = currentStatus.icon;

  return (
    <Card className={`${info.bgColor} border-0`} data-testid={`card-agent-${agentType}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-md bg-background`}>
            <Icon className={`h-5 w-5 ${info.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h3 className="font-medium text-sm">{info.shortName}</h3>
              <Badge variant="secondary" className="gap-1 text-xs">
                <span className={`w-2 h-2 rounded-full ${currentStatus.color}`} />
                {currentStatus.label}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{info.description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AgentDetailCard({ agentType }: { agentType: AgentType }) {
  const info = agentInfo[agentType];
  const Icon = info.icon;

  return (
    <Card data-testid={`card-agent-detail-${agentType}`}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className={`flex h-12 w-12 items-center justify-center rounded-md ${info.bgColor}`}>
            <Icon className={`h-6 w-6 ${info.color}`} />
          </div>
          <div>
            <CardTitle className="text-lg">{info.name}</CardTitle>
            <CardDescription>{info.description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <h4 className="text-sm font-medium mb-3">Capabilities</h4>
        <ul className="space-y-2">
          {info.capabilities.map((cap, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
              {cap}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function OrchestratorFlow() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Agent Orchestration Flow</CardTitle>
        <CardDescription>
          How agents coordinate to analyze clinical cases
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <div className="flex items-center justify-center gap-2 overflow-x-auto pb-4">
            {agentOrder.map((agentType, index) => {
              const info = agentInfo[agentType];
              const Icon = info.icon;
              
              return (
                <div key={agentType} className="flex items-center">
                  <div className={`flex flex-col items-center p-3 rounded-lg ${info.bgColor} min-w-24`}>
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-background mb-2`}>
                      <Icon className={`h-5 w-5 ${info.color}`} />
                    </div>
                    <span className="text-xs font-medium text-center">{info.shortName}</span>
                  </div>
                  {index < agentOrder.length - 1 && (
                    <ArrowRight className="h-4 w-4 text-muted-foreground mx-1 flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
        
        <Separator className="my-6" />
        
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-2">Workflow Steps</h4>
            <ol className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">1</span>
                <div>
                  <p className="text-sm font-medium">Case Intake</p>
                  <p className="text-xs text-muted-foreground">Orchestrator receives case and delegates to specialized agents</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">2</span>
                <div>
                  <p className="text-sm font-medium">Parallel Analysis</p>
                  <p className="text-xs text-muted-foreground">Patient Context, Labs, and Research agents analyze simultaneously</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">3</span>
                <div>
                  <p className="text-sm font-medium">Safety Check</p>
                  <p className="text-xs text-muted-foreground">Risk & Safety agent reviews all findings for potential concerns</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">4</span>
                <div>
                  <p className="text-sm font-medium">Synthesis & Review</p>
                  <p className="text-xs text-muted-foreground">Orchestrator compiles recommendations for clinician review</p>
                </div>
              </li>
            </ol>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Orchestrator() {
  const { data: cases, isLoading } = useQuery<ClinicalCase[]>({
    queryKey: ["/api/cases"],
  });

  const activeCases = cases?.filter(c => c.status === "analyzing") ?? [];
  const completedToday = cases?.filter(c => {
    const today = new Date().toDateString();
    return c.status === "review-ready" && new Date(c.updatedAt).toDateString() === today;
  }).length ?? 0;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Agent Orchestrator</h1>
        <p className="text-muted-foreground">Multi-agent AI coordination system</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10">
                <Activity className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeCases.length}</p>
                <p className="text-sm text-muted-foreground">Active Analyses</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-green-500/10">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completedToday}</p>
                <p className="text-sm text-muted-foreground">Completed Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-blue-500/10">
                <Brain className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">6</p>
                <p className="text-sm text-muted-foreground">Active Agents</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {agentOrder.map((agentType) => (
          <AgentCard key={agentType} agentType={agentType} status="idle" />
        ))}
      </div>

      <OrchestratorFlow />

      <div>
        <h2 className="text-xl font-semibold mb-4">Agent Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {agentOrder.map((agentType) => (
            <AgentDetailCard key={agentType} agentType={agentType} />
          ))}
        </div>
      </div>

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium">Responsible AI Architecture</p>
              <p className="text-xs text-muted-foreground">
                All agent outputs include confidence scores, evidence sources, and reasoning chains. 
                The system maintains a complete audit trail for healthcare compliance.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
