import { useQuery } from "@tanstack/react-query";
import {
  FolderOpen,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Activity,
  Brain,
  FileText,
  Shield,
  Beaker,
  MessageSquare,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import type { DashboardStats, ClinicalCase, RiskAlert, AgentType } from "@shared/schema";

const agentInfo: Record<AgentType, { name: string; icon: typeof Brain; color: string }> = {
  "patient-context": { name: "Patient Context", icon: Users, color: "text-blue-500" },
  "labs-reports": { name: "Labs & Reports", icon: Beaker, color: "text-green-500" },
  "research-guidelines": { name: "Research", icon: FileText, color: "text-purple-500" },
  "risk-safety": { name: "Risk & Safety", icon: Shield, color: "text-red-500" },
  "clinician-interaction": { name: "Clinician", icon: MessageSquare, color: "text-orange-500" },
  "orchestrator": { name: "Orchestrator", icon: Brain, color: "text-primary" },
};

function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  loading,
}: {
  title: string;
  value: number | string;
  icon: typeof FolderOpen;
  trend?: string;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-16 mb-2" />
          <Skeleton className="h-3 w-20" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold" data-testid={`stat-${title.toLowerCase().replace(/\s+/g, '-')}`}>{value}</div>
        {trend && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
            <TrendingUp className="h-3 w-3 text-green-500" />
            {trend}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function AgentStatusGrid({ loading }: { loading?: boolean }) {
  const agents: AgentType[] = [
    "orchestrator",
    "patient-context",
    "labs-reports",
    "research-guidelines",
    "risk-safety",
    "clinician-interaction",
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {agents.map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-8 w-8 rounded-md mb-3" />
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-3 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {agents.map((agentType) => {
        const info = agentInfo[agentType];
        const Icon = info.icon;
        return (
          <Card key={agentType} className="hover-elevate" data-testid={`card-agent-${agentType}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-md bg-muted`}>
                  <Icon className={`h-4 w-4 ${info.color}`} />
                </div>
                <Badge variant="outline" className="text-xs">
                  <span className="w-2 h-2 rounded-full bg-green-500 mr-1.5" />
                  Ready
                </Badge>
              </div>
              <h4 className="font-medium text-sm">{info.name}</h4>
              <p className="text-xs text-muted-foreground">Agent</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function RecentCasesList({ cases, loading }: { cases?: ClinicalCase[]; loading?: boolean }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4 p-3 rounded-md border">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-6 w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (!cases || cases.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <FolderOpen className="h-12 w-12 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">No cases yet</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/cases/new" data-testid="link-create-first-case">Create First Case</Link>
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
  };

  return (
    <div className="space-y-3">
      {cases.slice(0, 5).map((caseItem) => (
        <Link
          key={caseItem.id}
          href={`/cases/${caseItem.id}`}
          data-testid={`link-case-${caseItem.id}`}
        >
          <div className="flex items-center gap-4 p-3 rounded-md border hover-elevate cursor-pointer">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <FolderOpen className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                Case #{caseItem.id.slice(0, 8)}
              </p>
              <p className="text-xs text-muted-foreground capitalize">
                {caseItem.caseType.replace("-", " ")}
              </p>
            </div>
            <Badge
              variant="secondary"
              className="capitalize"
            >
              <span className={`w-2 h-2 rounded-full ${statusColors[caseItem.status]} mr-1.5`} />
              {caseItem.status.replace("-", " ")}
            </Badge>
          </div>
        </Link>
      ))}
    </div>
  );
}

function AlertsList({ alerts, loading }: { alerts?: RiskAlert[]; loading?: boolean }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="p-3 rounded-md border-l-4 border-l-destructive bg-destructive/5">
            <Skeleton className="h-4 w-40 mb-2" />
            <Skeleton className="h-3 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (!alerts || alerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <CheckCircle className="h-12 w-12 text-green-500 mb-3" />
        <p className="text-sm text-muted-foreground">No active alerts</p>
      </div>
    );
  }

  const severityStyles = {
    info: "border-l-blue-500 bg-blue-500/5",
    warning: "border-l-yellow-500 bg-yellow-500/5",
    critical: "border-l-destructive bg-destructive/5",
  };

  return (
    <div className="space-y-3">
      {alerts.slice(0, 5).map((alert) => (
        <div
          key={alert.id}
          className={`p-3 rounded-md border-l-4 ${severityStyles[alert.severity]}`}
          data-testid={`alert-${alert.id}`}
        >
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className={`h-4 w-4 ${
              alert.severity === "critical" ? "text-destructive" :
              alert.severity === "warning" ? "text-yellow-500" : "text-blue-500"
            }`} />
            <span className="text-sm font-medium">{alert.title}</span>
          </div>
          <p className="text-xs text-muted-foreground">{alert.description}</p>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: recentCases, isLoading: casesLoading } = useQuery<ClinicalCase[]>({
    queryKey: ["/api/cases"],
  });

  const { data: alerts, isLoading: alertsLoading } = useQuery<RiskAlert[]>({
    queryKey: ["/api/alerts"],
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold">Dashboard</h1>
          <p className="text-muted-foreground">Clinical care orchestration overview</p>
        </div>
        <Button asChild data-testid="button-new-case">
          <Link href="/cases/new">
            <FolderOpen className="h-4 w-4 mr-2" />
            New Case
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Cases"
          value={stats?.totalCases ?? 0}
          icon={FolderOpen}
          trend="+12% this week"
          loading={statsLoading}
        />
        <StatCard
          title="Active Cases"
          value={stats?.activeCases ?? 0}
          icon={Activity}
          loading={statsLoading}
        />
        <StatCard
          title="Pending Reviews"
          value={stats?.pendingReviews ?? 0}
          icon={Clock}
          loading={statsLoading}
        />
        <StatCard
          title="Critical Alerts"
          value={stats?.criticalAlerts ?? 0}
          icon={AlertTriangle}
          loading={statsLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle className="text-lg">Agent Status</CardTitle>
            <Badge variant="outline">
              <span className="w-2 h-2 rounded-full bg-green-500 mr-1.5" />
              All Systems Operational
            </Badge>
          </CardHeader>
          <CardContent>
            <AgentStatusGrid loading={statsLoading} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle className="text-lg">Active Alerts</CardTitle>
            <Badge variant={alerts && alerts.length > 0 ? "destructive" : "secondary"}>
              {alerts?.length ?? 0}
            </Badge>
          </CardHeader>
          <CardContent>
            <AlertsList alerts={alerts} loading={alertsLoading} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle className="text-lg">Recent Cases</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/cases" data-testid="link-view-all-cases">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <RecentCasesList cases={recentCases} loading={casesLoading} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">AI Confidence Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Average Confidence</span>
                <span className="text-sm font-medium">{stats?.avgConfidenceScore ?? 0}%</span>
              </div>
              <Progress value={stats?.avgConfidenceScore ?? 0} className="h-2" />
            </div>
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground mb-3">
                Confidence scores reflect AI certainty in recommendations. 
                Higher scores indicate stronger evidence support.
              </p>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span>High (80-100%)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <span>Medium (50-79%)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span>Low (&lt;50%)</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium">Clinical Decision Support System</p>
              <p className="text-xs text-muted-foreground">
                This system provides AI-assisted recommendations for clinical decision support only. 
                All outputs must be reviewed by qualified healthcare professionals before any clinical action.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
