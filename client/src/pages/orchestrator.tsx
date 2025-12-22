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
  Database,
  Search,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { apiRequest } from "@/lib/queryClient";
import type { AgentType, ClinicalCase } from "@shared/schema";

const agentInfo: Record<AgentType, {
  name: string;
  role: string;
  icon: typeof Brain;
  color: string;
  description: string;
  capabilities: string[];
}> = {
  "orchestrator": {
    name: "Central Orchestrator",
    role: "Workflow Management",
    icon: Brain,
    color: "text-primary",
    description: "Coordinates all agents and synthesizes final recommendations",
    capabilities: [
      "Agent coordination",
      "Conflict resolution",
      "Audit trail",
      "Synthesis"
    ]
  },
  "patient-context": {
    name: "Patient Context",
    role: "History & Vitals",
    icon: Users,
    color: "text-blue-600",
    description: "Analyzes patient demographics, history, and current conditions",
    capabilities: [
      "FHIR ingestion",
      "History analysis",
      "Pattern recognition",
      "Reconciliation"
    ]
  },
  "labs-reports": {
    name: "Labs & Reports",
    role: "Pathology & Imaging",
    icon: Beaker,
    color: "text-teal-600",
    description: "Processes lab results and identifies abnormalities",
    capabilities: [
      "Report parsing",
      "Abnormality detection",
      "Trend analysis",
      "Critical flagging"
    ]
  },
  "research-guidelines": {
    name: "Research & Guidelines",
    role: "Clinical Evidence",
    icon: FileText,
    color: "text-purple-600",
    description: "Searches medical literature and clinical guidelines",
    capabilities: [
      "Literature search",
      "Guideline matching",
      "Evidence grading",
      "Citation"
    ]
  },
  "risk-safety": {
    name: "Risk & Safety",
    role: "Contraindications",
    icon: Shield,
    color: "text-red-600",
    description: "Checks drug interactions and safety concerns",
    capabilities: [
      "Interaction check",
      "Contraindication",
      "Dosage verification",
      "Risk assessment"
    ]
  },
  "clinician-interaction": {
    name: "Clinician Interface",
    role: "Interaction",
    icon: MessageSquare,
    color: "text-orange-600",
    description: "Provides conversational interface for clarification",
    capabilities: [
      "Natural language",
      "Explanation",
      "Feedback",
      "Clarification"
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

  // Mock operational data
  const lastExec = new Date();
  lastExec.setMinutes(lastExec.getMinutes() - Math.floor(Math.random() * 60));
  const evidenceCount = Math.floor(Math.random() * 15) + 3;
  const confidence = (85 + Math.random() * 14).toFixed(1);

  const isRunning = status === "active" || agentType === "orchestrator"; // Mock active state for demo

  return (
    <Card className="rounded-md shadow-sm border-border/50 hover:border-primary/50 transition-colors">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-4">
            <div className={`flex h-10 w-10 items-center justify-center rounded-md bg-muted/50`}>
              <Icon className={`h-5 w-5 ${info.color}`} />
            </div>
            <div>
              <h3 className="font-semibold text-base leading-none mb-1.5">{info.name}</h3>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{info.role}</p>
            </div>
          </div>
          <Badge variant="outline" className={`text-xs h-6 px-2 gap-1.5 ${isRunning ? "border-green-500/30 text-green-600 bg-green-500/5" : "text-muted-foreground"}`}>
            <span className={`w-2 h-2 rounded-full ${isRunning ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
            {isRunning ? "Running" : "Ready"}
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-4 py-3 border-t border-border/40 border-b mb-4">
          <div>
            <p className="text-xs text-muted-foreground font-medium mb-1">Last Run</p>
            <p className="text-sm font-mono">{lastExec.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium mb-1">Evidence</p>
            <p className="text-sm font-mono">{evidenceCount} sources</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium mb-1">Confidence</p>
            <p className="text-sm font-mono text-green-600 font-semibold">{confidence}%</p>
          </div>
        </div>

        <div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2">Capabilities</p>
          <div className="flex flex-wrap gap-2">
            {info.capabilities.slice(0, 3).map((cap, i) => (
              <span key={i} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-muted text-muted-foreground border border-border/50">
                {cap}
              </span>
            ))}
            {info.capabilities.length > 3 && (
              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-muted text-muted-foreground border border-border/50">
                +{info.capabilities.length - 3}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function OrchestratorFlow() {
  return (
    <Card className="rounded-sm shadow-sm border-border/50">
      <CardHeader className="pb-3 border-b border-border/40">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">Workflow Visualization</CardTitle>
            <CardDescription className="text-xs">
              Real-time agent coordination and data flow
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-[10px] bg-background">
            <Activity className="h-3 w-3 mr-1 text-primary" />
            Live Monitoring
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="relative">
          {/* Connecting Line */}
          <div className="absolute top-5 left-0 right-0 h-0.5 bg-border/50 -z-10 hidden md:block" />

          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            {agentOrder.map((agentType, index) => {
              const info = agentInfo[agentType];
              const Icon = info.icon;
              const isOrchestrator = agentType === "orchestrator";

              return (
                <div key={agentType} className="flex flex-col items-center text-center relative">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 bg-background z-10 mb-2 ${isOrchestrator ? "border-primary text-primary" : "border-muted-foreground/20 text-muted-foreground"}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-semibold">{info.name.split(" ")[0]}</span>
                  <span className="text-[10px] text-muted-foreground">{index + 1}</span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Orchestrator() {
  const { data: cases, isLoading } = useQuery({
    queryKey: ["/api/cases"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/cases");
      const data: { success: boolean; data: ClinicalCase[] } = await response.json();
      return data.data;
    },
  });

  const activeCases = cases?.filter(c => c.status === "analyzing") ?? [];
  const completedToday = cases?.filter(c => {
    const today = new Date().toDateString();
    return c.status === "review-ready" && new Date(c.updatedAt).toDateString() === today;
  }).length ?? 0;

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Agent Orchestrator</h1>
          <p className="text-xs text-muted-foreground mt-1">System status and agent performance metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-background text-xs px-2 py-1">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse" />
            System Online
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-md shadow-sm border-border/50">
          <CardContent className="p-6 flex items-center gap-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <p className="text-3xl font-bold leading-none">{activeCases.length}</p>
              <p className="text-sm font-medium text-muted-foreground mt-1">Active Analyses</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-md shadow-sm border-border/50">
          <CardContent className="p-6 flex items-center gap-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-green-500/10 text-green-600">
              <CheckCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-3xl font-bold leading-none">{completedToday}</p>
              <p className="text-sm font-medium text-muted-foreground mt-1">Completed Today</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-md shadow-sm border-border/50">
          <CardContent className="p-6 flex items-center gap-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-blue-500/10 text-blue-600">
              <Zap className="h-6 w-6" />
            </div>
            <div>
              <p className="text-3xl font-bold leading-none">98.5%</p>
              <p className="text-sm font-medium text-muted-foreground mt-1">System Uptime</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <OrchestratorFlow />

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Active Agents</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {agentOrder.map((agentType) => (
            <AgentCard key={agentType} agentType={agentType} status="idle" />
          ))}
        </div>
      </div>

      <Card className="bg-primary/5 border-primary/20 rounded-sm">
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-4 w-4 text-primary shrink-0" />
            <div>
              <p className="text-xs font-semibold text-primary">Responsible AI Architecture</p>
              <p className="text-[10px] text-muted-foreground">
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
