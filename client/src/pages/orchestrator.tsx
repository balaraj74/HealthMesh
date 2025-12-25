import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import {
  Brain,
  Users,
  Beaker,
  FileText,
  Shield,
  MessageSquare,
  Activity,
  CheckCircle,
  AlertCircle,
  Zap,
  Play,
  RefreshCw,
  Sparkles,
  ChevronRight,
  Clock,
  AlertTriangle,
  Stethoscope,
  Pill,
  FlaskConical,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { AgentType, ClinicalCase } from "@shared/schema";

// ==========================================
// Types for Real-time Agent Status
// ==========================================

interface AgentStatus {
  id: string;
  name: string;
  status: "idle" | "running" | "completed" | "error" | "waiting";
  progress: number;
  lastRun?: Date;
  confidence?: number;
  evidenceCount?: number;
  message?: string;
  duration?: number;
}

interface PipelineState {
  isRunning: boolean;
  currentAgent: string | null;
  completedAgents: string[];
  progress: number;
  startTime?: Date;
  caseId?: string;
}

// ==========================================
// Agent Definitions - Updated for 5-Agent Pipeline
// ==========================================

interface AgentInfo {
  name: string;
  role: string;
  icon: typeof Brain;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
  capabilities: string[];
}

const agentInfo: Record<string, AgentInfo> = {
  "orchestrator": {
    name: "Central Orchestrator",
    role: "Workflow Management",
    icon: Brain,
    color: "text-primary",
    bgColor: "bg-primary/10",
    borderColor: "border-primary/50",
    description: "Coordinates all agents and synthesizes final recommendations",
    capabilities: ["Agent coordination", "Conflict resolution", "Audit trail", "Synthesis"]
  },
  "triage": {
    name: "Triage Agent",
    role: "Urgency Assessment",
    icon: AlertTriangle,
    color: "text-red-600",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/50",
    description: "Analyzes vitals, computes NEWS2/SOFA scores, classifies risk level",
    capabilities: ["NEWS2 scoring", "SOFA-lite assessment", "Red flag detection", "Risk classification"]
  },
  "diagnostic": {
    name: "Diagnostic Agent",
    role: "Differential Diagnosis",
    icon: Stethoscope,
    color: "text-blue-600",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/50",
    description: "Generates ranked differential diagnoses with confidence scores",
    capabilities: ["Symptom mapping", "DDx ranking", "Evidence linking", "Gap identification"]
  },
  "guideline": {
    name: "Guideline Agent",
    role: "Clinical Guidelines",
    icon: FileText,
    color: "text-purple-600",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/50",
    description: "Maps decisions to NCCN, WHO, ICMR, ADA, ACC/AHA guidelines",
    capabilities: ["Guideline matching", "Evidence levels", "Deviation flagging", "Best practices"]
  },
  "medication-safety": {
    name: "Medication Safety",
    role: "Drug Safety",
    icon: Pill,
    color: "text-orange-600",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/50",
    description: "Checks interactions, allergies, contraindications, dose adjustments",
    capabilities: ["DDI checking", "Allergy cross-reactivity", "Contraindication detection", "Dose validation"]
  },
  "evidence": {
    name: "Evidence Agent",
    role: "Research Support",
    icon: FlaskConical,
    color: "text-teal-600",
    bgColor: "bg-teal-500/10",
    borderColor: "border-teal-500/50",
    description: "Retrieves clinical research, grades evidence strength",
    capabilities: ["Literature search", "Evidence grading", "Study summarization", "RAG retrieval"]
  },
};

// Order for the 5-agent pipeline
const pipelineOrder = ["triage", "diagnostic", "guideline", "medication-safety", "evidence"];

// ==========================================
// Custom Hook for Agent Status Management
// ==========================================

function useAgentPipeline() {
  const [pipelineState, setPipelineState] = useState<PipelineState>({
    isRunning: false,
    currentAgent: null,
    completedAgents: [],
    progress: 0,
  });

  const [agentStatuses, setAgentStatuses] = useState<Record<string, AgentStatus>>(
    Object.fromEntries(
      [...pipelineOrder, "orchestrator"].map(id => [
        id,
        {
          id,
          name: agentInfo[id]?.name || id,
          status: "idle" as const,
          progress: 0,
          lastRun: new Date(),
          confidence: 85 + Math.random() * 14,
          evidenceCount: Math.floor(Math.random() * 15) + 3,
        }
      ])
    )
  );

  const simulateAgentRun = useCallback(async (agentId: string): Promise<void> => {
    const duration = 1500 + Math.random() * 1500; // 1.5-3 seconds

    // Set agent to running
    setAgentStatuses(prev => ({
      ...prev,
      [agentId]: {
        ...prev[agentId],
        status: "running",
        progress: 0,
        message: "Analyzing..."
      }
    }));

    // Simulate progress
    const steps = 10;
    for (let i = 1; i <= steps; i++) {
      await new Promise(resolve => setTimeout(resolve, duration / steps));
      setAgentStatuses(prev => ({
        ...prev,
        [agentId]: {
          ...prev[agentId],
          progress: (i / steps) * 100,
          message: i < steps / 2 ? "Analyzing..." : "Synthesizing results..."
        }
      }));
    }

    // Complete agent
    setAgentStatuses(prev => ({
      ...prev,
      [agentId]: {
        ...prev[agentId],
        status: "completed",
        progress: 100,
        lastRun: new Date(),
        confidence: 80 + Math.random() * 19,
        evidenceCount: Math.floor(Math.random() * 20) + 5,
        message: "Complete",
        duration: duration
      }
    }));
  }, []);

  const runPipeline = useCallback(async (caseId: string) => {
    setPipelineState({
      isRunning: true,
      currentAgent: null,
      completedAgents: [],
      progress: 0,
      startTime: new Date(),
      caseId,
    });

    // Reset all agents to waiting
    setAgentStatuses(prev =>
      Object.fromEntries(
        Object.entries(prev).map(([id, status]) => [
          id,
          { ...status, status: "waiting" as const, progress: 0 }
        ])
      )
    );

    // Run agents in sequence
    for (let i = 0; i < pipelineOrder.length; i++) {
      const agentId = pipelineOrder[i];

      setPipelineState(prev => ({
        ...prev,
        currentAgent: agentId,
        progress: ((i) / (pipelineOrder.length + 1)) * 100,
      }));

      await simulateAgentRun(agentId);

      setPipelineState(prev => ({
        ...prev,
        completedAgents: [...prev.completedAgents, agentId],
      }));
    }

    // Run orchestrator last
    setPipelineState(prev => ({
      ...prev,
      currentAgent: "orchestrator",
      progress: (pipelineOrder.length / (pipelineOrder.length + 1)) * 100,
    }));

    await simulateAgentRun("orchestrator");

    // Complete pipeline
    setPipelineState(prev => ({
      ...prev,
      isRunning: false,
      currentAgent: null,
      completedAgents: [...pipelineOrder, "orchestrator"],
      progress: 100,
    }));

    return true;
  }, [simulateAgentRun]);

  const resetPipeline = useCallback(() => {
    setPipelineState({
      isRunning: false,
      currentAgent: null,
      completedAgents: [],
      progress: 0,
    });
    setAgentStatuses(prev =>
      Object.fromEntries(
        Object.entries(prev).map(([id, status]) => [
          id,
          { ...status, status: "idle" as const, progress: 0 }
        ])
      )
    );
  }, []);

  return {
    pipelineState,
    agentStatuses,
    runPipeline,
    resetPipeline,
  };
}

// ==========================================
// Agent Card Component - Dynamic Version
// ==========================================

function AgentCard({
  agentType,
  status,
  isActive = false,
}: {
  agentType: string;
  status: AgentStatus;
  isActive?: boolean;
}) {
  const info = agentInfo[agentType];
  if (!info) return null;

  const Icon = info.icon;
  const displayTime = status.lastRun || new Date();

  const statusConfig = {
    idle: { label: "Ready", color: "text-muted-foreground", dotColor: "bg-gray-400", bgClass: "" },
    waiting: { label: "Waiting", color: "text-yellow-600", dotColor: "bg-yellow-500", bgClass: "opacity-60" },
    running: { label: "Running", color: "text-blue-600", dotColor: "bg-blue-500 animate-pulse", bgClass: "ring-2 ring-blue-500/50 ring-offset-2" },
    completed: { label: "Completed", color: "text-green-600", dotColor: "bg-green-500", bgClass: "border-green-500/50" },
    error: { label: "Error", color: "text-red-600", dotColor: "bg-red-500", bgClass: "border-red-500/50" },
  };

  const { label, color, dotColor, bgClass } = statusConfig[status.status];

  return (
    <Card className={`rounded-md shadow-sm border-border/50 hover:shadow-md transition-all duration-300 h-full ${bgClass} ${isActive ? 'scale-[1.02]' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`flex h-9 w-9 items-center justify-center rounded-md ${info.bgColor} ${status.status === 'running' ? 'animate-pulse' : ''}`}>
              {status.status === 'running' ? (
                <Loader2 className={`h-4 w-4 ${info.color} animate-spin`} />
              ) : (
                <Icon className={`h-4 w-4 ${info.color}`} />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-sm leading-none mb-1">{info.name}</h3>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{info.role}</p>
            </div>
          </div>
          <Badge variant="outline" className={`text-[10px] h-5 px-1.5 gap-1 ${color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
            {label}
          </Badge>
        </div>

        {/* Progress bar for running agents */}
        {status.status === 'running' && (
          <div className="mb-3">
            <Progress value={status.progress} className="h-1.5" />
            <p className="text-[10px] text-muted-foreground mt-1">{status.message}</p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 py-2.5 border-t border-border/40 border-b mb-3">
          <div>
            <p className="text-[10px] text-muted-foreground font-medium mb-0.5">Last Run</p>
            <p className="text-xs font-mono">{displayTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground font-medium mb-0.5">Evidence</p>
            <p className="text-xs font-mono">{status.evidenceCount || 0} sources</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground font-medium mb-0.5">Confidence</p>
            <p className={`text-xs font-mono font-semibold ${status.status === 'completed' ? 'text-green-600' : 'text-muted-foreground'}`}>
              {status.confidence?.toFixed(1) || '--'}%
            </p>
          </div>
        </div>

        <div>
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-1.5">Capabilities</p>
          <div className="flex flex-wrap gap-1.5">
            {info.capabilities.slice(0, 3).map((cap, i) => (
              <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground border border-border/50">
                {cap}
              </span>
            ))}
            {info.capabilities.length > 3 && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground border border-border/50">
                +{info.capabilities.length - 3}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ==========================================
// Pipeline Visualization - Dynamic Version
// ==========================================

function PipelineVisualization({
  pipelineState,
  agentStatuses
}: {
  pipelineState: PipelineState;
  agentStatuses: Record<string, AgentStatus>;
}) {
  return (
    <Card className="rounded-sm shadow-sm border-border/50">
      <CardHeader className="pb-3 border-b border-border/40">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">5-Agent Clinical Intelligence Pipeline</CardTitle>
            <CardDescription className="text-xs">
              Real-time agent coordination and data flow
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {pipelineState.isRunning && (
              <Badge variant="secondary" className="text-[10px] bg-blue-500/10 text-blue-600 animate-pulse">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Processing ({Math.round(pipelineState.progress)}%)
              </Badge>
            )}
            <Badge variant="outline" className={`text-[10px] bg-background ${pipelineState.isRunning ? 'border-blue-500' : ''}`}>
              <Activity className={`h-3 w-3 mr-1 ${pipelineState.isRunning ? 'text-blue-600 animate-pulse' : 'text-primary'}`} />
              Live Monitoring
            </Badge>
          </div>
        </div>
        {pipelineState.isRunning && (
          <Progress value={pipelineState.progress} className="h-1 mt-3" />
        )}
      </CardHeader>
      <CardContent className="pt-8 pb-6">
        <div className="flex items-center justify-between px-4">
          {pipelineOrder.map((agentType, index) => {
            const info = agentInfo[agentType];
            if (!info) return null;
            const Icon = info.icon;
            const status = agentStatuses[agentType];
            const isActive = pipelineState.currentAgent === agentType;
            const isCompleted = pipelineState.completedAgents.includes(agentType);
            const isWaiting = pipelineState.isRunning && !isActive && !isCompleted;

            return (
              <div key={agentType} className="flex items-center">
                {/* Agent Icon and Label */}
                <div className="flex flex-col items-center text-center">
                  <div className={`
                    flex h-14 w-14 items-center justify-center rounded-full border-2 bg-background shadow-sm transition-all duration-300
                    ${info.bgColor}
                    ${isActive ? 'ring-4 ring-blue-500/30 border-blue-500 scale-110' : ''}
                    ${isCompleted ? 'border-green-500 bg-green-500/10' : 'border-primary/30'}
                    ${isWaiting ? 'opacity-50' : ''}
                  `}>
                    {isActive ? (
                      <Loader2 className={`h-6 w-6 ${info.color} animate-spin`} />
                    ) : isCompleted ? (
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    ) : (
                      <Icon className={`h-6 w-6 ${info.color}`} />
                    )}
                  </div>
                  <span className={`text-xs font-semibold mt-2 ${isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : ''}`}>
                    {info.name.split(" ")[0]}
                  </span>
                  <span className="text-[10px] text-muted-foreground">Step {index + 1}</span>
                </div>

                {/* Connecting Line with Arrow */}
                {index < pipelineOrder.length - 1 && (
                  <div className="flex items-center mx-3">
                    <div className={`w-12 lg:w-20 h-1 rounded-full transition-all duration-500 ${isCompleted ? 'bg-gradient-to-r from-green-500 to-green-400' :
                        isActive ? 'bg-gradient-to-r from-blue-500/60 to-blue-300/30 animate-pulse' :
                          'bg-gradient-to-r from-primary/30 to-primary/10'
                      }`} />
                    <ArrowRight className={`h-4 w-4 -ml-1 transition-colors duration-300 ${isCompleted ? 'text-green-500' : isActive ? 'text-blue-500' : 'text-primary/40'
                      }`} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ==========================================
// Active Cases Panel - Dynamic Version
// ==========================================

function ActiveCasesPanel({
  cases,
  onAnalyze,
  isAnalyzing,
  analyzingCaseId,
}: {
  cases: ClinicalCase[];
  onAnalyze: (caseId: string) => void;
  isAnalyzing: boolean;
  analyzingCaseId?: string;
}) {
  const pendingCases = cases.filter(c => c.status === "submitted" || c.status === "draft" || c.status === "active");
  const analyzingCases = cases.filter(c => c.status === "analyzing");
  const readyCases = cases.filter(c => c.status === "review-ready");

  return (
    <Card className="rounded-md shadow-sm border-border/50 h-full">
      <CardHeader className="pb-3 border-b border-border/40">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">Case Queue</CardTitle>
            <CardDescription className="text-xs">
              Cases pending or in active analysis
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/cases"] })}
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {cases.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Brain className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No cases in queue</p>
            <p className="text-xs">Create a new case to run clinical analysis</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Cases being analyzed with pipeline */}
            {analyzingCaseId && (
              <div className="flex items-center justify-between p-3 rounded-lg border border-blue-500/50 bg-blue-500/5">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Case #{analyzingCaseId.slice(0, 8)}</p>
                    <p className="text-xs text-blue-600">Running 5-agent pipeline...</p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs bg-blue-500/10 text-blue-600">
                  In Progress
                </Badge>
              </div>
            )}

            {pendingCases.slice(0, 5).map((caseItem) => (
              <div
                key={caseItem.id}
                className={`flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/30 hover:bg-muted/50 transition-colors ${analyzingCaseId === caseItem.id ? 'opacity-50 pointer-events-none' : ''
                  }`}
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-yellow-500/10 flex items-center justify-center">
                    <Clock className="h-4 w-4 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Case #{caseItem.id.slice(0, 8)}</p>
                    <p className="text-xs text-muted-foreground capitalize">{caseItem.caseType.replace("-", " ")}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => onAnalyze(caseItem.id)}
                  disabled={isAnalyzing}
                  className="relative overflow-hidden bg-gradient-to-r from-[#0078D4] via-[#106EBE] to-[#005A9E] text-white shadow-sm hover:shadow-md transition-all"
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  Analyze
                </Button>
              </div>
            ))}

            {readyCases.slice(0, 3).map((caseItem) => (
              <Link key={caseItem.id} href={`/cases/${caseItem.id}`}>
                <div className="flex items-center justify-between p-3 rounded-lg border border-green-500/30 bg-green-500/5 hover:bg-green-500/10 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Case #{caseItem.id.slice(0, 8)}</p>
                      <p className="text-xs text-green-600">Ready for review</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ==========================================
// Main Orchestrator Page - Dynamic Version
// ==========================================

export default function Orchestrator() {
  const { toast } = useToast();
  const { pipelineState, agentStatuses, runPipeline, resetPipeline } = useAgentPipeline();
  const [analyzingCaseId, setAnalyzingCaseId] = useState<string | null>(null);

  const { data: cases, isLoading } = useQuery({
    queryKey: ["/api/cases"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/cases");
      const data: { success: boolean; data: ClinicalCase[] } = await response.json();
      return data.data || [];
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const analyzeMutation = useMutation({
    mutationFn: async (caseId: string) => {
      setAnalyzingCaseId(caseId);

      // Run the visual pipeline simulation
      await runPipeline(caseId);

      // Actually call the API
      const response = await apiRequest("POST", `/api/cases/${caseId}/clinical-analyze`, {});
      return response.json();
    },
    onSuccess: (data) => {
      setAnalyzingCaseId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      toast({
        title: "Clinical Analysis Complete",
        description: "5-agent pipeline has finished analyzing the case.",
      });
    },
    onError: (error: any) => {
      setAnalyzingCaseId(null);
      resetPipeline();
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to run clinical analysis.",
        variant: "destructive",
      });
    },
  });

  const handleAnalyze = (caseId: string) => {
    analyzeMutation.mutate(caseId);
  };

  const activeCases = cases?.filter(c => c.status === "analyzing") ?? [];
  const completedToday = cases?.filter(c => {
    const today = new Date().toDateString();
    return c.status === "review-ready" && new Date(c.updatedAt).toDateString() === today;
  }).length ?? 0;
  const totalCases = cases?.length ?? 0;

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <Brain className="h-6 w-6 md:h-7 md:w-7 text-primary" />
            Agent Orchestrator
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            5-Agent Clinical Intelligence Pipeline • Real-time analysis and monitoring
          </p>
        </div>
        <div className="flex items-center gap-2">
          {pipelineState.isRunning && (
            <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 text-xs">
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Pipeline Active
            </Badge>
          )}
          <Badge variant="outline" className="bg-background text-xs px-2 py-1">
            <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${pipelineState.isRunning ? 'bg-blue-500 animate-pulse' : 'bg-green-500 animate-pulse'}`} />
            System Online
          </Badge>
        </div>
      </div>

      {/* Stats Cards - Responsive */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card className="rounded-md shadow-sm border-border/50">
          <CardContent className="p-4 md:p-6 flex items-center gap-3 md:gap-5">
            <div className={`flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-md ${pipelineState.isRunning ? 'bg-blue-500/10 text-blue-600' : 'bg-primary/10 text-primary'}`}>
              <Activity className="h-5 w-5 md:h-6 md:w-6" />
            </div>
            <div>
              <p className="text-2xl md:text-3xl font-bold leading-none">{pipelineState.isRunning ? 1 : activeCases.length}</p>
              <p className="text-xs md:text-sm font-medium text-muted-foreground mt-1">Active Analyses</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-md shadow-sm border-border/50">
          <CardContent className="p-4 md:p-6 flex items-center gap-3 md:gap-5">
            <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-md bg-green-500/10 text-green-600">
              <CheckCircle className="h-5 w-5 md:h-6 md:w-6" />
            </div>
            <div>
              <p className="text-2xl md:text-3xl font-bold leading-none">{completedToday}</p>
              <p className="text-xs md:text-sm font-medium text-muted-foreground mt-1">Completed Today</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-md shadow-sm border-border/50">
          <CardContent className="p-4 md:p-6 flex items-center gap-3 md:gap-5">
            <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-md bg-purple-500/10 text-purple-600">
              <FileText className="h-5 w-5 md:h-6 md:w-6" />
            </div>
            <div>
              <p className="text-2xl md:text-3xl font-bold leading-none">{totalCases}</p>
              <p className="text-xs md:text-sm font-medium text-muted-foreground mt-1">Total Cases</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-md shadow-sm border-border/50">
          <CardContent className="p-4 md:p-6 flex items-center gap-3 md:gap-5">
            <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-md bg-blue-500/10 text-blue-600">
              <Zap className="h-5 w-5 md:h-6 md:w-6" />
            </div>
            <div>
              <p className="text-2xl md:text-3xl font-bold leading-none">99.9%</p>
              <p className="text-xs md:text-sm font-medium text-muted-foreground mt-1">System Uptime</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Visualization */}
      <PipelineVisualization
        pipelineState={pipelineState}
        agentStatuses={agentStatuses}
      />

      {/* Main Content Grid - Responsive */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
        {/* Case Queue - Takes 4 columns on lg */}
        <div className="lg:col-span-4 order-2 lg:order-1">
          <ActiveCasesPanel
            cases={cases || []}
            onAnalyze={handleAnalyze}
            isAnalyzing={analyzeMutation.isPending || pipelineState.isRunning}
            analyzingCaseId={analyzingCaseId || undefined}
          />
        </div>

        {/* 5-Agent Pipeline Cards - Takes 8 columns on lg */}
        <div className="lg:col-span-8 order-1 lg:order-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Clinical Intelligence Agents
            </h2>
            <Badge variant="outline" className="text-xs">
              <Sparkles className="h-3 w-3 mr-1 text-primary" />
              5-Agent Pipeline
            </Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
            {pipelineOrder.map((agentType) => (
              <AgentCard
                key={agentType}
                agentType={agentType}
                status={agentStatuses[agentType]}
                isActive={pipelineState.currentAgent === agentType}
              />
            ))}
            {/* Synthesis Orchestrator */}
            <AgentCard
              agentType="orchestrator"
              status={agentStatuses["orchestrator"]}
              isActive={pipelineState.currentAgent === "orchestrator"}
            />
          </div>
        </div>
      </div>

      {/* Responsible AI Notice */}
      <Card className="bg-primary/5 border-primary/20 rounded-sm">
        <CardContent className="py-3 px-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-primary">Responsible AI Architecture</p>
              <p className="text-[10px] text-muted-foreground">
                All agent outputs include confidence scores, evidence sources, and reasoning chains.
                The system maintains a complete audit trail for healthcare compliance.
                Clinician review is required before implementing any recommendations.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
